# 司机实名自动同步功能

## 功能概述

当司机完成实名认证后，系统会自动将`profiles.name`字段更新为实名（`driver_licenses.id_card_name`）。这样可以确保所有地方都使用实名，而不是昵称。

## 设计原则

### 1. 姓名显示规则

- **已实名司机**：`profiles.name` = 实名（来自`driver_licenses.id_card_name`）
- **未实名司机**：`profiles.name` = 昵称（用户注册时填写的昵称）

### 2. 自动同步机制

通过数据库触发器实现自动同步：
- 当`driver_licenses`表插入新记录时，自动同步实名到`profiles.name`
- 当`driver_licenses`表更新`id_card_name`字段时，自动同步实名到`profiles.name`
- 只有司机角色才会触发同步
- 只有`id_card_name`不为空时才会同步

## 技术实现

### 1. 数据库触发器

**文件**：`supabase/migrations/sync_driver_real_name_to_profile.sql`

**触发器函数**：
```sql
CREATE OR REPLACE FUNCTION sync_driver_real_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 只有当id_card_name不为空时才同步
  IF NEW.id_card_name IS NOT NULL AND NEW.id_card_name != '' THEN
    -- 更新profiles表的name字段为实名
    UPDATE profiles
    SET name = NEW.id_card_name
    WHERE id = NEW.driver_id AND role = 'driver'::user_role;
    
    -- 记录日志（可选）
    RAISE NOTICE '已同步司机实名: driver_id=%, real_name=%', NEW.driver_id, NEW.id_card_name;
  END IF;
  
  RETURN NEW;
END;
$$;
```

**触发器**：
```sql
CREATE TRIGGER on_driver_license_sync_name
  AFTER INSERT OR UPDATE OF id_card_name
  ON driver_licenses
  FOR EACH ROW
  EXECUTE FUNCTION sync_driver_real_name();
```

### 2. 初始数据同步

迁移文件中包含了初始数据同步的SQL：
```sql
UPDATE profiles p
SET name = dl.id_card_name
FROM driver_licenses dl
WHERE p.id = dl.driver_id
  AND p.role = 'driver'::user_role
  AND dl.id_card_name IS NOT NULL
  AND dl.id_card_name != ''
  AND p.name != dl.id_card_name;
```

这条SQL会将所有已实名但昵称与实名不一致的司机的昵称更新为实名。

### 3. 代码简化

由于`profiles.name`已经自动同步了实名，所以不再需要：
- ❌ `ProfileWithRealName`类型（已删除）
- ❌ `getProfileWithRealName`函数（已删除）
- ✅ 直接使用`getProfileById`获取司机信息
- ✅ 直接使用`profile.name`显示司机姓名

**修改前**：
```typescript
// 类型定义
export interface ProfileWithRealName extends Profile {
  real_name?: string | null
}

// API函数
export async function getProfileWithRealName(id: string): Promise<ProfileWithRealName | null> {
  const profile = await getProfileById(id)
  if (!profile) return null

  if (profile.role === 'driver') {
    const {data: license} = await supabase
      .from('driver_licenses')
      .select('id_card_name')
      .eq('user_id', id)
      .maybeSingle()

    return {
      ...profile,
      real_name: license?.id_card_name || null
    }
  }

  return {
    ...profile,
    real_name: null
  }
}

// 使用
const driver = await getProfileWithRealName(driverId)
const displayName = driver?.real_name || driver?.name || '司机'
```

**修改后**：
```typescript
// 直接使用Profile类型
const driver = await getProfileById(driverId)
const displayName = driver?.name || '司机'
```

## 使用场景

### 场景1：司机注册

1. 司机注册时填写昵称（如"小李"）
2. `profiles.name` = "小李"
3. 此时司机还未实名，显示昵称

### 场景2：司机完成实名认证

1. 司机上传身份证和驾驶证
2. 系统识别出实名（如"李明"）
3. 插入`driver_licenses`表，`id_card_name` = "李明"
4. **触发器自动执行**：`profiles.name` = "李明"
5. 此后所有地方都显示实名"李明"

### 场景3：司机修改实名信息

1. 司机更新身份证信息
2. 更新`driver_licenses.id_card_name` = "李明（新）"
3. **触发器自动执行**：`profiles.name` = "李明（新）"
4. 所有地方自动显示新的实名

### 场景4：管理员查看司机信息

**修改前**：
```typescript
// 需要调用特殊函数获取实名
const driver = await getProfileWithRealName(driverId)
console.log(driver?.real_name || driver?.name) // 显示实名或昵称
```

**修改后**：
```typescript
// 直接获取司机信息，name字段已经是实名
const driver = await getProfileById(driverId)
console.log(driver?.name) // 直接显示实名
```

## 数据验证

### 验证1：查看所有司机的姓名状态

```sql
SELECT 
  p.id,
  p.name AS 当前姓名,
  p.role AS 角色,
  dl.id_card_name AS 实名,
  CASE 
    WHEN dl.id_card_name IS NULL THEN '未实名'
    WHEN p.name = dl.id_card_name THEN '已同步'
    ELSE '不一致'
  END AS 同步状态
FROM profiles p
LEFT JOIN driver_licenses dl ON p.id = dl.driver_id
WHERE p.role = 'driver'
ORDER BY p.created_at;
```

**预期结果**：
- 已实名司机：`同步状态` = "已同步"
- 未实名司机：`同步状态` = "未实名"

### 验证2：测试触发器

```sql
-- 更新实名
UPDATE driver_licenses
SET id_card_name = '测试姓名'
WHERE driver_id = '[司机ID]';

-- 查看profiles表是否同步
SELECT id, name FROM profiles WHERE id = '[司机ID]';
```

**预期结果**：
- `profiles.name` = "测试姓名"

## 影响范围

### 修改的文件

1. **数据库迁移**：
   - `supabase/migrations/sync_driver_real_name_to_profile.sql`（新增）

2. **类型定义**：
   - `src/db/types.ts`
     - 删除`ProfileWithRealName`接口

3. **API函数**：
   - `src/db/api.ts`
     - 删除`getProfileWithRealName`函数
     - 删除`ProfileWithRealName`导入

4. **页面组件**：
   - `src/pages/driver/vehicle-list/index.tsx`
     - 使用`getProfileById`替代`getProfileWithRealName`
     - 使用`Profile`类型替代`ProfileWithRealName`
     - 简化姓名显示逻辑：`driver?.name`

### 不需要修改的地方

所有其他使用`getProfileById`和`profile.name`的地方都不需要修改，因为：
- 已实名司机：`profile.name`已经是实名
- 未实名司机：`profile.name`仍然是昵称

## 优势

### 1. 数据一致性

- **单一数据源**：`profiles.name`是唯一的姓名字段
- **自动同步**：无需手动维护两个字段的一致性
- **实时更新**：实名变更时自动同步

### 2. 代码简化

- **减少类型**：不需要`ProfileWithRealName`
- **减少函数**：不需要`getProfileWithRealName`
- **减少查询**：不需要JOIN `driver_licenses`表
- **减少逻辑**：不需要`real_name || name`的判断

### 3. 性能优化

- **减少JOIN**：不需要每次都JOIN `driver_licenses`表
- **减少查询**：只需要查询`profiles`表
- **数据库层面**：触发器在数据库层面执行，效率更高

### 4. 维护性

- **集中管理**：同步逻辑集中在触发器中
- **易于理解**：`profiles.name`就是显示的姓名
- **易于调试**：不需要追踪多个字段

## 注意事项

### 1. 触发器执行时机

触发器在以下情况下执行：
- ✅ INSERT：插入新的实名记录
- ✅ UPDATE：更新`id_card_name`字段
- ❌ DELETE：删除实名记录（不会恢复昵称）

如果需要在删除实名记录时恢复昵称，需要额外的逻辑。

### 2. 数据迁移

如果系统中已有大量司机数据，迁移文件会自动同步所有已实名司机的姓名。

### 3. 权限控制

触发器函数使用`SECURITY DEFINER`，意味着它以定义者（超级用户）的权限执行，可以绕过RLS策略。

### 4. 日志记录

触发器中使用`RAISE NOTICE`记录同步日志，可以在数据库日志中查看。

## 测试清单

- [x] 1. 验证触发器创建成功
- [x] 2. 验证初始数据同步成功
- [x] 3. 测试INSERT触发器
- [x] 4. 测试UPDATE触发器
- [x] 5. 验证只有司机角色才会同步
- [x] 6. 验证空值不会触发同步
- [x] 7. 删除`ProfileWithRealName`类型
- [x] 8. 删除`getProfileWithRealName`函数
- [x] 9. 更新车辆列表页面
- [x] 10. 运行lint检查

## 总结

通过数据库触发器实现司机实名自动同步，可以：
1. **简化代码**：删除冗余的类型和函数
2. **提高性能**：减少JOIN查询
3. **保证一致性**：自动同步，无需手动维护
4. **易于维护**：逻辑集中，易于理解

这是一个典型的"数据库层面解决问题"的案例，充分利用了数据库的触发器功能，避免了在应用层面维护数据一致性的复杂性。
