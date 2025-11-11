# 司机类型系统重构说明

## 业务需求变更

### 之前的理解（错误）
- **纯司机**：没有车牌号的司机（vehicle_plate = null）
- **带车司机**：有车牌号的司机（vehicle_plate = '京A12345'）

### 正确的业务逻辑
- **纯司机**：没有自己的车，开公司分配的车辆（车辆所有权属于公司）
- **带车司机**：自己有车，开自己的车（车辆所有权属于司机）

**关键点**：两种司机都可以有车牌号，区别在于车辆的所有权！

## 数据库变更

### 1. 新增枚举类型

```sql
CREATE TYPE driver_type_enum AS ENUM ('pure', 'with_vehicle');
```

- `pure`：纯司机（开公司的车）
- `with_vehicle`：带车司机（开自己的车）

### 2. 新增字段

在 `profiles` 表中添加 `driver_type` 字段：

```sql
ALTER TABLE profiles 
ADD COLUMN driver_type driver_type_enum DEFAULT NULL;
```

### 3. 约束条件

```sql
ALTER TABLE profiles
ADD CONSTRAINT check_driver_type_only_for_drivers
CHECK (
    (role = 'driver'::user_role AND driver_type IS NOT NULL)
    OR
    (role != 'driver'::user_role AND driver_type IS NULL)
);
```

**约束说明**：
- 司机用户必须有 `driver_type`
- 非司机用户的 `driver_type` 必须为 `NULL`

### 4. 数据迁移

```sql
UPDATE profiles
SET driver_type = CASE
    WHEN vehicle_plate IS NOT NULL AND vehicle_plate != '' THEN 'with_vehicle'::driver_type_enum
    ELSE 'pure'::driver_type_enum
END
WHERE role = 'driver'::user_role;
```

**迁移逻辑**：
- 如果现有司机有车牌号 → 设为 `with_vehicle`（带车司机）
- 如果现有司机没有车牌号 → 设为 `pure`（纯司机）

## 数据结构对比

### 之前的数据结构

| 字段 | 纯司机 | 带车司机 | 管理员 |
|------|--------|----------|--------|
| role | 'driver' | 'driver' | 'manager' |
| vehicle_plate | NULL | '京A12345' | NULL |

**问题**：无法区分"纯司机有车牌号"和"带车司机有车牌号"的情况

### 现在的数据结构

| 字段 | 纯司机（无车） | 纯司机（有车） | 带车司机（无车） | 带车司机（有车） | 管理员 |
|------|---------------|---------------|-----------------|-----------------|--------|
| role | 'driver' | 'driver' | 'driver' | 'driver' | 'manager' |
| driver_type | 'pure' | 'pure' | 'with_vehicle' | 'with_vehicle' | NULL |
| vehicle_plate | NULL | '京A12345' | NULL | '京B67890' | NULL |

**优势**：
- 明确区分司机类型（纯司机 vs 带车司机）
- 两种司机都可以有车牌号
- 车牌号字段独立，可以随时更新

## 代码变更

### 1. TypeScript 类型定义（src/db/types.ts）

```typescript
// 新增司机类型
export type DriverType = 'pure' | 'with_vehicle'

// Profile 接口添加 driver_type 字段
export interface Profile {
  // ... 其他字段
  role: UserRole
  driver_type: DriverType | null  // 新增
  vehicle_plate: string | null
  // ... 其他字段
}

// ProfileUpdate 接口添加 driver_type 字段
export interface ProfileUpdate {
  // ... 其他字段
  role?: UserRole
  driver_type?: DriverType | null  // 新增
  vehicle_plate?: string | null
  // ... 其他字段
}
```

### 2. API 函数（src/db/api.ts）

```typescript
// updateUserInfo 函数支持 driver_type 参数
export async function updateUserInfo(
  userId: string,
  updates: {
    name?: string
    phone?: string
    email?: string
    role?: UserRole
    driver_type?: DriverType | null  // 新增
    login_account?: string
    vehicle_plate?: string | null
    join_date?: string
  }
): Promise<boolean> {
  // ... 实现
}
```

### 3. 编辑用户页面（src/pages/super-admin/edit-user/index.tsx）

#### 加载用户信息时

```typescript
// 根据 driver_type 判断司机类型
if (data.role === 'driver') {
  if (data.driver_type === 'with_vehicle') {
    roleIndex = 1  // 带车司机
    roleLabel = '带车司机'
  } else {
    roleIndex = 0  // 纯司机
    roleLabel = '纯司机'
  }
}
```

#### 保存用户信息时

```typescript
let finalDriverType: 'pure' | 'with_vehicle' | null = null
let finalVehiclePlate: string | null = null

if (selectedLabel === '纯司机') {
  finalDriverType = 'pure'
  finalVehiclePlate = vehiclePlate.trim() || null  // 保留用户输入
} else if (selectedLabel === '带车司机') {
  finalDriverType = 'with_vehicle'
  finalVehiclePlate = vehiclePlate.trim() || null  // 保留用户输入
} else if (selectedLabel === '管理员') {
  finalDriverType = null
  finalVehiclePlate = null
}

const updateData = {
  // ... 其他字段
  driver_type: finalDriverType,
  vehicle_plate: finalVehiclePlate,
  // ... 其他字段
}
```

### 4. 用户管理页面（src/pages/super-admin/user-management/index.tsx）

```typescript
// 根据 driver_type 显示司机类型
const getDriverType = (user: Profile) => {
  if (user.role !== 'driver') return null
  return user.driver_type === 'with_vehicle' ? '带车司机' : '纯司机'
}
```

## 使用场景示例

### 场景 1：纯司机，公司分配车辆

**数据**：
```json
{
  "name": "张三",
  "role": "driver",
  "driver_type": "pure",
  "vehicle_plate": "京A12345"
}
```

**说明**：
- 张三是纯司机（没有自己的车）
- 公司分配给他一辆车牌号为"京A12345"的车
- 如果公司换车，只需要更新 `vehicle_plate` 字段
- `driver_type` 保持为 `pure`

### 场景 2：带车司机，开自己的车

**数据**：
```json
{
  "name": "李四",
  "role": "driver",
  "driver_type": "with_vehicle",
  "vehicle_plate": "京B67890"
}
```

**说明**：
- 李四是带车司机（有自己的车）
- 他开自己的车，车牌号为"京B67890"
- 如果他换车，只需要更新 `vehicle_plate` 字段
- `driver_type` 保持为 `with_vehicle`

### 场景 3：纯司机，暂时没有分配车辆

**数据**：
```json
{
  "name": "王五",
  "role": "driver",
  "driver_type": "pure",
  "vehicle_plate": null
}
```

**说明**：
- 王五是纯司机（没有自己的车）
- 公司暂时还没有分配车辆给他
- 等公司分配车辆后，更新 `vehicle_plate` 字段
- `driver_type` 保持为 `pure`

### 场景 4：带车司机，车辆维修中

**数据**：
```json
{
  "name": "赵六",
  "role": "driver",
  "driver_type": "with_vehicle",
  "vehicle_plate": null
}
```

**说明**：
- 赵六是带车司机（有自己的车）
- 但车辆正在维修，暂时没有车牌号记录
- 维修完成后，更新 `vehicle_plate` 字段
- `driver_type` 保持为 `with_vehicle`

## 优势总结

### 1. 业务逻辑清晰

- 明确区分车辆所有权（公司的车 vs 司机的车）
- 不再依赖车牌号来判断司机类型
- 车牌号可以独立更新，不影响司机类型

### 2. 数据灵活性

- 两种司机都可以有车牌号
- 两种司机都可以暂时没有车牌号
- 车牌号的有无不影响司机类型的判断

### 3. 扩展性强

- 未来可以添加更多司机类型（例如：租车司机）
- 可以记录车辆的详细信息（不仅仅是车牌号）
- 可以记录车辆的变更历史

### 4. 数据完整性

- 数据库约束确保数据一致性
- 司机必须有 `driver_type`
- 非司机不能有 `driver_type`

## 迁移文件

**文件位置**：`supabase/migrations/47_add_driver_type_field.sql`

**应用状态**：✅ 已成功应用到数据库

## 提交记录

**提交哈希**：1358f29

**提交消息**：重构司机类型系统：添加driver_type字段区分纯司机和带车司机

**修改文件**：
- supabase/migrations/47_add_driver_type_field.sql（新增）
- src/db/types.ts
- src/db/api.ts
- src/pages/super-admin/edit-user/index.tsx
- src/pages/super-admin/user-management/index.tsx

## 测试建议

### 1. 测试纯司机

1. 创建一个纯司机用户
2. 不输入车牌号，保存
3. 检查数据库：`driver_type = 'pure'`, `vehicle_plate = null`
4. 编辑用户，输入车牌号，保存
5. 检查数据库：`driver_type = 'pure'`, `vehicle_plate = '京A12345'`
6. 检查页面显示：应该显示"纯司机"标签

### 2. 测试带车司机

1. 创建一个带车司机用户
2. 输入车牌号，保存
3. 检查数据库：`driver_type = 'with_vehicle'`, `vehicle_plate = '京B67890'`
4. 编辑用户，清空车牌号，保存
5. 检查数据库：`driver_type = 'with_vehicle'`, `vehicle_plate = null`
6. 检查页面显示：应该显示"带车司机"标签

### 3. 测试司机类型切换

1. 编辑一个纯司机用户
2. 将角色改为"带车司机"，保存
3. 检查数据库：`driver_type` 应该从 `'pure'` 变为 `'with_vehicle'`
4. 检查页面显示：标签应该从"纯司机"变为"带车司机"

### 4. 测试管理员

1. 创建一个管理员用户
2. 检查数据库：`driver_type = null`, `vehicle_plate = null`
3. 尝试编辑管理员，输入车牌号
4. 保存时应该自动清空车牌号

## 常见问题

### Q1: 为什么不直接用 vehicle_plate 来区分司机类型？

**A**: 因为两种司机都可以有车牌号，也都可以暂时没有车牌号。车牌号的有无不能准确反映司机类型。

### Q2: 如果司机换车了，需要修改 driver_type 吗？

**A**: 不需要。只需要更新 `vehicle_plate` 字段即可。`driver_type` 表示的是车辆所有权，不会因为换车而改变。

### Q3: 纯司机可以没有车牌号吗？

**A**: 可以。纯司机可能暂时没有分配车辆，这种情况下 `vehicle_plate` 为 `null`。

### Q4: 带车司机可以没有车牌号吗？

**A**: 可以。带车司机的车辆可能正在维修或其他原因暂时没有车牌号记录。

### Q5: 如何将纯司机改为带车司机？

**A**: 在编辑用户页面，将角色下拉框从"纯司机"改为"带车司机"，然后保存即可。系统会自动更新 `driver_type` 字段。

## 下一步

1. ✅ 数据库迁移已完成
2. ✅ 代码修改已完成
3. ✅ 类型定义已更新
4. ⏳ 需要测试所有场景
5. ⏳ 需要更新相关文档

## 相关文档

- 司机类型编辑问题修复总结.md
- 司机类型编辑修复验证指南.md
- 司机类型调试指南.md
- 司机类型显示问题排查指南.md
- 保存失败错误排查指南.md
