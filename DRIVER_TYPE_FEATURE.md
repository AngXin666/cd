# 司机类型识别与智能价格填充功能

## 功能概述

本功能实现了司机类型的自动识别和计件录入时的智能价格填充，确保不同类型的司机（纯司机/带车司机）在录入计件时能够自动获取管理员设置的对应价格。

## 核心功能

### 1. 司机类型识别

- **类型定义**：
  - `driver`：纯司机（不带车）
  - `driver_with_vehicle`：带车司机（自带车辆）

- **类型显示**：
  - 在司机端计件录入页面顶部显示当前司机类型
  - 使用醒目的标签展示（纯司机/带车司机）

### 2. 智能价格填充

#### 2.1 自动价格加载

当司机在计件录入页面添加新的计件项时：

1. 系统自动读取当前选择的仓库和品类
2. 查询管理员为该仓库和品类设置的价格配置
3. 根据司机类型（纯司机/带车司机）选择对应的价格
4. 自动填充到单价输入框

#### 2.2 价格锁定机制

- **管理员已设置价格**：
  - 单价输入框自动填充价格
  - 输入框变为禁用状态（灰色背景）
  - 显示提示文字："（管理员已设置，不可修改）"
  - 司机无法修改价格

- **管理员未设置价格**：
  - 单价输入框为空
  - 输入框保持可编辑状态
  - 司机可以手动输入价格

#### 2.3 动态价格更新

当司机切换仓库或品类时：

1. 系统自动重新查询价格配置
2. 更新所有已添加的计件项的价格
3. 根据新的价格配置更新锁定状态

## 数据库结构

### 1. 司机类型字段

```sql
-- profiles 表中的 driver_type 字段
driver_type driver_type_enum DEFAULT 'driver'::driver_type_enum

-- 枚举类型定义
CREATE TYPE driver_type_enum AS ENUM ('driver', 'driver_with_vehicle');
```

### 2. 品类价格配置表

```sql
-- category_prices 表
CREATE TABLE category_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES warehouses(id),
  category_id uuid REFERENCES piece_work_categories(id),
  driver_price numeric(10,2) NOT NULL,              -- 纯司机价格
  driver_with_vehicle_price numeric(10,2) NOT NULL, -- 带车司机价格
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## API 函数

### getCategoryPriceForDriver

获取指定仓库和品类的价格配置。

```typescript
async function getCategoryPriceForDriver(
  warehouseId: string,
  categoryId: string
): Promise<CategoryPrice | null>
```

**返回值**：
- `driverPrice`: 纯司机价格
- `driverWithVehiclePrice`: 带车司机价格

## 用户界面

### 司机端计件录入页面

#### 1. 司机类型显示

在页面顶部标题卡片中显示：

```
┌─────────────────────────────────────┐
│ 计件录入              [纯司机]      │
│ 支持批量录入，一次提交多条记录      │
└─────────────────────────────────────┘
```

#### 2. 单价输入框

**价格已锁定**：
```
单价（元/件，最多两位小数）（管理员已设置，不可修改）
┌─────────────────────────────────────┐
│ 5.50                                │  [灰色背景，禁用状态]
└─────────────────────────────────────┘
```

**价格未锁定**：
```
单价（元/件，最多两位小数）
┌─────────────────────────────────────┐
│ 请输入单价                          │  [白色背景，可编辑]
└─────────────────────────────────────┘
```

## 管理端配置

### 设置品类价格

超级管理员可以在品类价格配置页面为每个仓库的每个品类设置：

1. **纯司机价格**：纯司机录入该品类时使用的单价
2. **带车司机价格**：带车司机录入该品类时使用的单价

### 设置司机类型

超级管理员可以在用户管理页面编辑司机信息时设置司机类型：

1. 选择角色为"纯司机"或"带车司机"
2. 系统自动设置对应的 `driver_type` 字段

## 使用流程

### 管理员配置流程

1. 登录超级管理端
2. 进入"品类价格配置"页面
3. 选择仓库和品类
4. 设置纯司机价格和带车司机价格
5. 保存配置

### 司机使用流程

1. 登录司机端
2. 进入"计件录入"页面
3. 查看页面顶部显示的司机类型
4. 选择仓库和品类
5. 点击"添加计件项"
6. 系统自动填充单价（如果管理员已设置）
7. 如果价格被锁定，无法修改；否则可以手动输入
8. 填写其他信息（件数、是否上楼等）
9. 提交计件记录

## 技术实现

### 前端实现

1. **司机信息加载**：
   ```typescript
   const [driverProfile, setDriverProfile] = useState<Profile | null>(null)
   
   const loadData = useCallback(async () => {
     const profile = await getUserById(user.id)
     setDriverProfile(profile)
   }, [user?.id])
   ```

2. **价格自动填充**：
   ```typescript
   const handleAddItem = async () => {
     const priceConfig = await getCategoryPriceForDriver(warehouseId, categoryId)
     if (priceConfig) {
       const price = driverProfile.driver_type === 'driver_with_vehicle'
         ? priceConfig.driverWithVehiclePrice
         : priceConfig.driverPrice
       
       // 添加计件项，价格已锁定
       setPieceWorkItems([...items, {
         unitPrice: price.toString(),
         unitPriceLocked: true
       }])
     }
   }
   ```

3. **动态价格更新**：
   ```typescript
   useEffect(() => {
     const updatePrices = async () => {
       const priceConfig = await getCategoryPriceForDriver(warehouseId, categoryId)
       setPieceWorkItems(items => items.map(item => ({
         ...item,
         unitPrice: priceConfig ? price.toString() : '',
         unitPriceLocked: !!priceConfig
       })))
     }
     updatePrices()
   }, [warehouseId, categoryId, driverProfile])
   ```

### 后端实现

```typescript
export async function getCategoryPriceForDriver(
  warehouseId: string,
  categoryId: string
): Promise<CategoryPrice | null> {
  const {data, error} = await supabase
    .from('category_prices')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('category_id', categoryId)
    .maybeSingle()

  if (error) {
    console.error('获取品类价格失败:', error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    warehouseId: data.warehouse_id,
    categoryId: data.category_id,
    driverPrice: Number(data.driver_price),
    driverWithVehiclePrice: Number(data.driver_with_vehicle_price),
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}
```

## 注意事项

1. **数据迁移**：
   - 现有司机的 `driver_type` 会根据是否有车牌号自动设置
   - 有车牌号的司机设置为 `driver_with_vehicle`
   - 没有车牌号的司机设置为 `driver`

2. **价格配置**：
   - 管理员必须同时设置纯司机价格和带车司机价格
   - 价格必须大于 0
   - 价格最多保留两位小数

3. **兼容性**：
   - 旧的枚举值（`pure`, `with_vehicle`）仍然保留在数据库中以保持向后兼容
   - 但前端代码已全部更新为使用新值（`driver`, `driver_with_vehicle`）

## 测试建议

### 功能测试

1. **司机类型显示测试**：
   - 使用纯司机账号登录，检查页面顶部是否显示"纯司机"
   - 使用带车司机账号登录，检查页面顶部是否显示"带车司机"

2. **价格自动填充测试**：
   - 管理员设置某个品类的价格
   - 司机添加该品类的计件项
   - 检查单价是否自动填充
   - 检查输入框是否被禁用

3. **价格锁定测试**：
   - 尝试修改已锁定的价格，确认无法修改
   - 检查是否显示"管理员已设置，不可修改"提示

4. **动态更新测试**：
   - 添加多个计件项
   - 切换仓库或品类
   - 检查所有计件项的价格是否自动更新

5. **手动输入测试**：
   - 选择管理员未设置价格的品类
   - 检查是否可以手动输入价格
   - 检查输入框是否为可编辑状态

### 边界测试

1. 管理员未设置价格时的行为
2. 司机类型为 null 时的行为
3. 切换仓库/品类时的价格更新
4. 多个计件项同时更新价格

## 未来优化方向

1. **批量价格设置**：允许管理员一次性为多个品类设置价格
2. **价格历史记录**：记录价格变更历史，便于追溯
3. **价格模板**：支持创建价格模板，快速应用到多个仓库
4. **价格审批流程**：价格变更需要审批后才能生效
5. **价格差异提醒**：当不同仓库的同一品类价格差异较大时提醒管理员
