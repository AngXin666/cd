# 车队管家权限管理系统设计文档

## 1. 核心理念

### 1.1 独立数据库架构
- 每个老板拥有独立的数据库环境
- 数据通过 `boss_id` 进行逻辑隔离
- 不需要在查询时添加 `boss_id` 过滤条件

### 1.2 灵活的权限配置
- **每个老板的权限设置都不一样**
- 权限配置存储在数据库中，而不是硬编码在 RLS 策略中
- 老板可以为车队长、平级账号设置不同的权限

### 1.3 严格的司机权限隔离
- 司机只能查看自己的信息
- 司机可以查看管理员信息（用于提交申请）
- **司机不能查看其他司机的任何数据**

## 2. 数据库设计

### 2.1 权限配置表 (user_permissions)

```sql
CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  boss_id text NOT NULL,
  
  -- 司机管理权限
  can_add_driver boolean DEFAULT false,           -- 可以添加司机
  can_edit_driver boolean DEFAULT false,          -- 可以修改司机信息
  can_delete_driver boolean DEFAULT false,        -- 可以删除司机
  can_disable_driver boolean DEFAULT false,       -- 可以停用司机
  
  -- 审核权限
  can_approve_leave boolean DEFAULT false,        -- 可以审批请假
  can_approve_resignation boolean DEFAULT false,  -- 可以审批离职
  can_approve_vehicle boolean DEFAULT false,      -- 可以审批车辆
  can_approve_realname boolean DEFAULT false,     -- 可以审批实名
  
  -- 查看权限
  can_view_all_drivers boolean DEFAULT false,     -- 可以查看所有司机
  can_view_all_data boolean DEFAULT false,        -- 可以查看所有数据
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, boss_id)
);
```

### 2.2 通知配置表 (notification_config)

```sql
CREATE TABLE notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id text NOT NULL,
  
  -- 通知类型
  notification_type text NOT NULL, -- 'leave_request', 'resignation_request', 'vehicle_audit', 'realname_audit', 'driver_add', 'driver_edit', 'driver_delete', 'driver_disable'
  
  -- 接收者角色
  notify_boss boolean DEFAULT true,              -- 通知老板
  notify_peer_admins boolean DEFAULT true,       -- 通知平级账号
  notify_managers boolean DEFAULT true,          -- 通知车队长
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(boss_id, notification_type)
);
```

## 3. RLS 策略设计

### 3.1 profiles 表的 RLS 策略

```sql
-- 策略 1: 老板和平级账号可以查看所有用户
CREATE POLICY "Boss and peer admin can view all users"
ON profiles FOR SELECT TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

-- 策略 2: 车队长根据权限配置查看用户
CREATE POLICY "Manager can view users based on permissions"
ON profiles FOR SELECT TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND (
    -- 可以查看所有司机
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.can_view_all_drivers = true
    )
    OR
    -- 或者查看管辖范围内的司机
    (
      role = 'driver'
      AND warehouse_id IN (
        SELECT unnest(managed_warehouse_ids)
        FROM profiles
        WHERE id = auth.uid()
      )
    )
    OR
    -- 或者查看管理员
    role IN ('super_admin', 'peer_admin', 'manager')
  )
);

-- 策略 3: 司机可以查看自己
CREATE POLICY "Driver can view self"
ON profiles FOR SELECT TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND id = auth.uid()
);

-- 策略 4: 司机可以查看管理员（用于提交申请）
CREATE POLICY "Driver can view admins"
ON profiles FOR SELECT TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND role IN ('super_admin', 'peer_admin', 'manager')
);

-- 策略 5: 老板和平级账号可以管理所有用户
CREATE POLICY "Boss and peer admin can manage all users"
ON profiles FOR ALL TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

-- 策略 6: 车队长根据权限配置管理司机
CREATE POLICY "Manager can manage drivers based on permissions"
ON profiles FOR ALL TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND role = 'driver'
  AND (
    -- 检查是否有相应的权限
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND (
        (up.can_add_driver = true) OR
        (up.can_edit_driver = true) OR
        (up.can_delete_driver = true) OR
        (up.can_disable_driver = true)
      )
    )
  )
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND role = 'driver'
);

-- 策略 7: 用户可以管理自己的信息
CREATE POLICY "User can manage self"
ON profiles FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

### 3.2 通知表的 RLS 策略

保持简单，只关注角色：

```sql
-- 老板和平级账号可以查看所有通知
CREATE POLICY "Boss and peer admin can view all notifications"
ON notifications FOR SELECT TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

-- 车队长可以查看自己的通知
CREATE POLICY "Manager can view own notifications"
ON notifications FOR SELECT TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND (recipient_id = auth.uid() OR sender_id = auth.uid())
);

-- 司机可以查看自己的通知
CREATE POLICY "Driver can view own notifications"
ON notifications FOR SELECT TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND (recipient_id = auth.uid() OR sender_id = auth.uid())
);

-- 所有人都可以创建通知
CREATE POLICY "All users can create notifications"
ON notifications FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

-- 用户可以更新自己接收的通知
CREATE POLICY "User can update own notifications"
ON notifications FOR UPDATE TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());
```

## 4. 通知系统设计

### 4.1 通知触发场景

#### 4.1.1 司机操作触发通知
- 提交请假申请
- 提交离职申请
- 提交车辆审核申请
- 提交实名审核申请

**通知接收方**：
1. 老板账号
2. 所有平级账号
3. 司机所属管辖区的车队长

#### 4.1.2 车队长操作触发通知
- 添加司机账号
- 修改司机信息（分配仓库、修改类型）
- 停用司机账号
- 删除司机账号
- 审核操作（通过/驳回）

**通知接收方**：
1. 老板账号
2. 所有平级账号
3. 被操作的司机本人

#### 4.1.3 老板/平级账号操作触发通知
- 调整车队长管辖范围
- 调整司机分配
- 审核操作（通过/驳回）

**通知接收方**：
1. 相关车队长
2. 被操作的司机本人

### 4.2 通知发送函数

```typescript
// 发送通知给老板、平级账号和相关车队长
async function sendNotificationToAdmins(
  bossId: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  type: string,
  title: string,
  content: string,
  warehouseId?: string
) {
  // 1. 获取老板
  const {data: boss} = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'super_admin')
    .eq('id', bossId)
    .maybeSingle()

  // 2. 获取所有平级账号
  const {data: peerAdmins} = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'peer_admin')
    .eq('boss_id', bossId)

  // 3. 获取相关车队长（如果有仓库ID）
  let managers = []
  if (warehouseId) {
    const {data} = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'manager')
      .eq('boss_id', bossId)
      .contains('managed_warehouse_ids', [warehouseId])
    managers = data || []
  }

  // 4. 组装接收者列表
  const recipients = [
    boss,
    ...(peerAdmins || []),
    ...managers
  ].filter(Boolean)

  // 5. 批量发送通知
  const notifications = recipients.map(recipient => ({
    recipient_id: recipient.id,
    sender_id: senderId,
    sender_name: senderName,
    sender_role: senderRole,
    type,
    title,
    content,
    boss_id: bossId,
    is_read: false
  }))

  await supabase.from('notifications').insert(notifications)
}
```

## 5. 权限检查函数

### 5.1 检查用户权限

```typescript
// 检查用户是否有特定权限
async function checkUserPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const {data} = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return false

  return data[permission] === true
}

// 使用示例
const canEditDriver = await checkUserPermission(user.id, 'can_edit_driver')
if (!canEditDriver) {
  showToast({title: '您没有修改司机信息的权限', icon: 'none'})
  return
}
```

### 5.2 初始化用户权限

```typescript
// 创建用户时初始化权限
async function initUserPermissions(
  userId: string,
  bossId: string,
  role: string
) {
  // 根据角色设置默认权限
  let permissions = {
    user_id: userId,
    boss_id: bossId,
    can_add_driver: false,
    can_edit_driver: false,
    can_delete_driver: false,
    can_disable_driver: false,
    can_approve_leave: false,
    can_approve_resignation: false,
    can_approve_vehicle: false,
    can_approve_realname: false,
    can_view_all_drivers: false,
    can_view_all_data: false
  }

  // 老板和平级账号拥有所有权限
  if (role === 'super_admin' || role === 'peer_admin') {
    permissions = {
      ...permissions,
      can_add_driver: true,
      can_edit_driver: true,
      can_delete_driver: true,
      can_disable_driver: true,
      can_approve_leave: true,
      can_approve_resignation: true,
      can_approve_vehicle: true,
      can_approve_realname: true,
      can_view_all_drivers: true,
      can_view_all_data: true
    }
  }

  // 车队长默认只有查看权限
  if (role === 'manager') {
    permissions = {
      ...permissions,
      can_view_all_drivers: true
    }
  }

  await supabase.from('user_permissions').insert(permissions)
}
```

## 6. 前端权限管理界面

### 6.1 权限配置页面

```typescript
// 权限配置组件
const PermissionConfig: React.FC<{userId: string}> = ({userId}) => {
  const [permissions, setPermissions] = useState<any>(null)

  useEffect(() => {
    loadPermissions()
  }, [userId])

  const loadPermissions = async () => {
    const {data} = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setPermissions(data)
  }

  const updatePermission = async (key: string, value: boolean) => {
    await supabase
      .from('user_permissions')
      .update({[key]: value})
      .eq('user_id', userId)
    
    await loadPermissions()
    showToast({title: '权限更新成功', icon: 'success'})
  }

  return (
    <View className="p-4">
      <Text className="text-lg font-bold mb-4">权限配置</Text>
      
      <View className="bg-white rounded-lg p-4 mb-4">
        <Text className="font-bold mb-2">司机管理权限</Text>
        <Switch
          checked={permissions?.can_add_driver}
          onChange={(e) => updatePermission('can_add_driver', e.detail.value)}
        >
          可以添加司机
        </Switch>
        <Switch
          checked={permissions?.can_edit_driver}
          onChange={(e) => updatePermission('can_edit_driver', e.detail.value)}
        >
          可以修改司机信息
        </Switch>
        <Switch
          checked={permissions?.can_delete_driver}
          onChange={(e) => updatePermission('can_delete_driver', e.detail.value)}
        >
          可以删除司机
        </Switch>
        <Switch
          checked={permissions?.can_disable_driver}
          onChange={(e) => updatePermission('can_disable_driver', e.detail.value)}
        >
          可以停用司机
        </Switch>
      </View>

      <View className="bg-white rounded-lg p-4">
        <Text className="font-bold mb-2">审核权限</Text>
        <Switch
          checked={permissions?.can_approve_leave}
          onChange={(e) => updatePermission('can_approve_leave', e.detail.value)}
        >
          可以审批请假
        </Switch>
        <Switch
          checked={permissions?.can_approve_resignation}
          onChange={(e) => updatePermission('can_approve_resignation', e.detail.value)}
        >
          可以审批离职
        </Switch>
        <Switch
          checked={permissions?.can_approve_vehicle}
          onChange={(e) => updatePermission('can_approve_vehicle', e.detail.value)}
        >
          可以审批车辆
        </Switch>
        <Switch
          checked={permissions?.can_approve_realname}
          onChange={(e) => updatePermission('can_approve_realname', e.detail.value)}
        >
          可以审批实名
        </Switch>
      </View>
    </View>
  )
}
```

## 7. 总结

### 7.1 核心优势
1. **灵活的权限配置**：每个老板可以为自己的车队长、平级账号设置不同的权限
2. **严格的司机隔离**：司机只能查看自己的信息，不能查看其他司机
3. **完整的通知系统**：所有关键操作都会发送通知给相关人员
4. **独立数据库架构**：每个老板的数据完全隔离

### 7.2 实现步骤
1. 创建 `user_permissions` 表
2. 创建 `notification_config` 表
3. 更新 RLS 策略，使用权限配置表
4. 实现通知发送函数
5. 实现权限检查函数
6. 创建前端权限配置界面

### 7.3 注意事项
1. 所有查询都在当前老板的独立数据库中进行
2. 不需要在查询时添加 `boss_id` 过滤条件
3. RLS 策略会自动根据权限配置表判断权限
4. 通知系统会自动发送给相关人员
