# 车辆表字段使用详细说明

## 概述

车辆管理系统将原来的1个大表（66列）拆分为2个职责清晰的表：
- **vehicles表**（22列）：存储车辆核心信息，用于高频查询
- **vehicle_documents表**（48列）：存储车辆扩展信息，按需查询

---

## 一、vehicles表（核心信息表）

### 表职责
存储车辆的核心业务信息，用于日常高频查询，如车辆列表、司机车辆查询等。

### 字段详细说明

#### 1. 基础标识字段（3列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `id` | uuid | 车辆唯一标识（主键） | 所有查询 | `550e8400-e29b-41d4-a716-446655440000` |
| `plate_number` | text | 车牌号码 | 车辆搜索、列表显示 | `京A12345` |
| `vin` | text | 车架号（车辆识别代码） | 车辆详细信息查询 | `LSVAA4182E2123456` |

**查询示例：**
```typescript
// 根据车牌号查询车辆
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .eq('plate_number', '京A12345')
  .maybeSingle()

// 根据车架号查询车辆
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .eq('vin', 'LSVAA4182E2123456')
  .maybeSingle()
```

---

#### 2. 车辆基本信息字段（5列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `brand` | text | 品牌 | 车辆列表、筛选 | `东风` |
| `model` | text | 型号 | 车辆列表、筛选 | `小康C51` |
| `color` | text | 颜色 | 车辆列表显示 | `白色` |
| `vehicle_type` | text | 车辆类型 | 车辆分类、统计 | `货车`、`面包车` |
| `purchase_date` | date | 购买日期 | 车辆年限计算 | `2023-01-15` |

**查询示例：**
```typescript
// 查询所有东风品牌的车辆
const { data } = await supabase
  .from('vehicles')
  .select('plate_number, brand, model, color')
  .eq('brand', '东风')
  .order('created_at', { ascending: false })

// 按车辆类型统计
const { data } = await supabase
  .from('vehicles')
  .select('vehicle_type, count')
  .group('vehicle_type')
```

---

#### 3. 关联关系字段（5列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `owner_id` | uuid | 车主ID（关联users表） | 查询车主的所有车辆 | `550e8400-...` |
| `current_driver_id` | uuid | 当前司机ID（关联users表） | 查询司机当前使用的车辆 | `660e8400-...` |
| `driver_id` | uuid | 分配的司机ID（关联users表） | 查询司机分配的车辆 | `770e8400-...` |
| `user_id` | uuid | 用户ID（关联users表） | 用户车辆关联 | `880e8400-...` |
| `warehouse_id` | uuid | 仓库ID（关联warehouses表） | 查询仓库的所有车辆 | `990e8400-...` |

**查询示例：**
```typescript
// 查询某个司机的所有车辆
const { data } = await supabase
  .from('vehicles')
  .select(`
    *,
    driver:users!driver_id(id, name, phone)
  `)
  .eq('driver_id', driverId)

// 查询某个仓库的所有车辆
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .eq('warehouse_id', warehouseId)

// 查询当前正在使用车辆的司机
const { data } = await supabase
  .from('vehicles')
  .select(`
    *,
    current_driver:users!current_driver_id(id, name, phone)
  `)
  .not('current_driver_id', 'is', null)
```

---

#### 4. 状态管理字段（4列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例值 |
|--------|------|------|----------|--------|
| `is_active` | boolean | 是否启用 | 筛选可用车辆 | `true`、`false` |
| `status` | text | 车辆状态 | 车辆状态筛选 | `active`、`inactive`、`maintenance` |
| `review_status` | text | 审核状态 | 审核流程管理 | `drafting`、`pending`、`approved`、`rejected` |
| `ownership_type` | text | 所有权类型 | 车辆分类统计 | `company`（公司）、`personal`（个人） |

**查询示例：**
```typescript
// 查询所有可用的车辆
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .eq('is_active', true)
  .eq('status', 'active')

// 查询待审核的车辆
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .eq('review_status', 'pending')

// 按所有权类型统计车辆
const { data } = await supabase
  .from('vehicles')
  .select('ownership_type, count')
  .group('ownership_type')
```

---

#### 5. 审核信息字段（2列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `reviewed_at` | timestamptz | 审核时间 | 审核记录查询 | `2025-11-05 10:30:00+08` |
| `reviewed_by` | uuid | 审核人ID（关联users表） | 审核人查询 | `aa0e8400-...` |

**查询示例：**
```typescript
// 查询某个审核人审核的所有车辆
const { data } = await supabase
  .from('vehicles')
  .select(`
    *,
    reviewer:users!reviewed_by(id, name)
  `)
  .eq('reviewed_by', reviewerId)
  .order('reviewed_at', { ascending: false })

// 查询最近审核的车辆
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .not('reviewed_at', 'is', null)
  .order('reviewed_at', { ascending: false })
  .limit(10)
```

---

#### 6. 系统字段（3列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `created_at` | timestamptz | 创建时间 | 时间排序、统计 | `2025-11-05 09:00:00+08` |
| `updated_at` | timestamptz | 更新时间 | 最近更新查询 | `2025-11-05 10:00:00+08` |
| `notes` | text | 备注 | 车辆备注信息 | `此车辆需要定期保养` |

**查询示例：**
```typescript
// 查询最新添加的车辆
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10)

// 查询最近更新的车辆
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .order('updated_at', { ascending: false })
  .limit(10)
```

---

### vehicles表常用查询场景总结

| 查询场景 | 使用字段 | 说明 |
|----------|----------|------|
| **车辆列表** | `plate_number`, `brand`, `model`, `color`, `status` | 显示车辆基本信息 |
| **司机车辆** | `driver_id`, `current_driver_id` | 查询司机的车辆 |
| **仓库车辆** | `warehouse_id` | 查询仓库的所有车辆 |
| **车辆搜索** | `plate_number`, `vin`, `brand`, `model` | 按关键字搜索 |
| **状态筛选** | `is_active`, `status`, `review_status` | 按状态筛选车辆 |
| **审核管理** | `review_status`, `reviewed_at`, `reviewed_by` | 审核流程 |
| **统计分析** | `vehicle_type`, `ownership_type`, `status` | 车辆统计 |

---

## 二、vehicle_documents表（扩展信息表）

### 表职责
存储车辆的详细证件、照片、租赁等扩展信息，按需查询，不影响列表查询性能。

### 字段详细说明

#### 1. 关联字段（2列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `id` | uuid | 文档记录唯一标识（主键） | 所有查询 | `bb0e8400-...` |
| `vehicle_id` | uuid | 关联的车辆ID（外键） | JOIN查询 | `550e8400-...` |

**查询示例：**
```typescript
// 查询车辆的完整信息（包含扩展信息）
const { data } = await supabase
  .from('vehicles')
  .select(`
    *,
    document:vehicle_documents(*)
  `)
  .eq('id', vehicleId)
  .maybeSingle()
```

---

#### 2. 行驶证基本信息字段（6列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `owner_name` | text | 车主姓名 | 行驶证信息显示 | `张三` |
| `use_character` | text | 使用性质 | 车辆用途分类 | `营运`、`非营运` |
| `register_date` | date | 注册日期 | 车辆年限计算 | `2023-01-15` |
| `issue_date` | date | 发证日期 | 证件有效期管理 | `2023-01-20` |
| `engine_number` | text | 发动机号 | 车辆识别 | `E4G16123456` |
| `archive_number` | text | 档案编号 | 车辆档案管理 | `123456789` |

**查询示例：**
```typescript
// 查询营运车辆
const { data } = await supabase
  .from('vehicles')
  .select(`
    *,
    document:vehicle_documents!inner(use_character)
  `)
  .eq('document.use_character', '营运')

// 查询车龄超过3年的车辆
const threeYearsAgo = new Date()
threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(*)
  `)
  .lt('register_date', threeYearsAgo.toISOString())
```

---

#### 3. 行驶证技术参数字段（7列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `total_mass` | numeric | 总质量（kg） | 车辆载重能力 | `4500` |
| `approved_passengers` | integer | 核定载客人数 | 客运车辆管理 | `7` |
| `curb_weight` | numeric | 整备质量（kg） | 车辆自重 | `1800` |
| `approved_load` | numeric | 核定载质量（kg） | 货运车辆管理 | `2700` |
| `overall_dimension_length` | numeric | 外廓尺寸-长（mm） | 车辆尺寸管理 | `5995` |
| `overall_dimension_width` | numeric | 外廓尺寸-宽（mm） | 车辆尺寸管理 | `2000` |
| `overall_dimension_height` | numeric | 外廓尺寸-高（mm） | 车辆尺寸管理 | `2300` |

**查询示例：**
```typescript
// 查询载重超过2吨的车辆
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(plate_number, brand, model)
  `)
  .gte('approved_load', 2000)

// 查询7座以上的客运车辆
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(*)
  `)
  .gte('approved_passengers', 7)
```

---

#### 4. 检验和报废信息字段（3列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `inspection_valid_until` | date | 检验有效期至 | 年检提醒 | `2025-12-31` |
| `inspection_date` | date | 检验日期 | 年检记录 | `2024-12-15` |
| `mandatory_scrap_date` | date | 强制报废日期 | 报废提醒 | `2033-01-15` |

**查询示例：**
```typescript
// 查询即将到期的车辆（30天内）
const thirtyDaysLater = new Date()
thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(plate_number, brand, model)
  `)
  .lte('inspection_valid_until', thirtyDaysLater.toISOString())
  .gte('inspection_valid_until', new Date().toISOString())

// 查询已过期的车辆
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(*)
  `)
  .lt('inspection_valid_until', new Date().toISOString())
```

---

#### 5. 行驶证照片字段（4列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `driving_license_main_photo` | text | 行驶证主页照片URL | 证件查看 | `https://...` |
| `driving_license_sub_photo` | text | 行驶证副页照片URL | 证件查看 | `https://...` |
| `driving_license_back_photo` | text | 行驶证背面照片URL | 证件查看 | `https://...` |
| `driving_license_sub_back_photo` | text | 行驶证副页背面照片URL | 证件查看 | `https://...` |

**查询示例：**
```typescript
// 查询车辆的行驶证照片
const { data } = await supabase
  .from('vehicle_documents')
  .select('driving_license_main_photo, driving_license_sub_photo, driving_license_back_photo, driving_license_sub_back_photo')
  .eq('vehicle_id', vehicleId)
  .maybeSingle()

// 查询缺少行驶证照片的车辆
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(plate_number)
  `)
  .or('driving_license_main_photo.is.null,driving_license_sub_photo.is.null')
```

---

#### 6. 车辆照片字段（7列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `left_front_photo` | text | 左前45度照片URL | 车辆外观查看 | `https://...` |
| `right_front_photo` | text | 右前45度照片URL | 车辆外观查看 | `https://...` |
| `left_rear_photo` | text | 左后45度照片URL | 车辆外观查看 | `https://...` |
| `right_rear_photo` | text | 右后45度照片URL | 车辆外观查看 | `https://...` |
| `dashboard_photo` | text | 仪表盘照片URL | 车辆内部查看 | `https://...` |
| `rear_door_photo` | text | 后门照片URL | 车辆内部查看 | `https://...` |
| `cargo_box_photo` | text | 货箱照片URL | 货运车辆查看 | `https://...` |

**查询示例：**
```typescript
// 查询车辆的所有照片
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    left_front_photo,
    right_front_photo,
    left_rear_photo,
    right_rear_photo,
    dashboard_photo,
    rear_door_photo,
    cargo_box_photo
  `)
  .eq('vehicle_id', vehicleId)
  .maybeSingle()

// 查询照片不完整的车辆（缺少任何一张必需照片）
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(plate_number)
  `)
  .or('left_front_photo.is.null,right_front_photo.is.null,left_rear_photo.is.null,right_rear_photo.is.null')
```

---

#### 7. 租赁信息字段（9列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `lessor_name` | text | 出租方名称 | 租赁车辆管理 | `某某租赁公司` |
| `lessor_contact` | text | 出租方联系方式 | 联系出租方 | `13800138000` |
| `lessee_name` | text | 承租方名称 | 租赁车辆管理 | `某某物流公司` |
| `lessee_contact` | text | 承租方联系方式 | 联系承租方 | `13900139000` |
| `monthly_rent` | numeric | 月租金（元） | 租金管理 | `5000` |
| `lease_start_date` | date | 租赁开始日期 | 租期管理 | `2024-01-01` |
| `lease_end_date` | date | 租赁结束日期 | 租期管理 | `2025-12-31` |
| `rent_payment_day` | integer | 租金支付日（每月几号） | 租金提醒 | `5` |

**查询示例：**
```typescript
// 查询所有租赁车辆
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(plate_number, brand, model)
  `)
  .not('lessor_name', 'is', null)

// 查询即将到期的租赁车辆（30天内）
const thirtyDaysLater = new Date()
thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(*)
  `)
  .lte('lease_end_date', thirtyDaysLater.toISOString())
  .gte('lease_end_date', new Date().toISOString())

// 查询本月需要支付租金的车辆
const today = new Date()
const currentDay = today.getDate()

const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(plate_number)
  `)
  .eq('rent_payment_day', currentDay)
  .not('monthly_rent', 'is', null)
```

---

#### 8. 审核相关字段（3列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `review_notes` | text | 审核备注 | 审核意见查看 | `照片不清晰，需要重新上传` |
| `locked_photos` | jsonb | 锁定的照片 | 审核流程管理 | `{"left_front_photo": true}` |
| `required_photos` | text[] | 必需的照片列表 | 审核流程管理 | `["left_front_photo", "right_front_photo"]` |

**查询示例：**
```typescript
// 查询审核备注
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    review_notes,
    vehicle:vehicles(plate_number, review_status)
  `)
  .eq('vehicle_id', vehicleId)
  .maybeSingle()

// 查询有锁定照片的车辆
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(*)
  `)
  .not('locked_photos', 'eq', '{}')
```

---

#### 9. 其他照片和时间字段（6列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `damage_photos` | text[] | 损坏照片数组 | 车辆损坏记录 | `["https://...", "https://..."]` |
| `pickup_photos` | text[] | 提车照片数组 | 提车记录 | `["https://...", "https://..."]` |
| `pickup_time` | timestamptz | 提车时间 | 提车记录 | `2025-11-05 09:00:00+08` |
| `registration_photos` | text[] | 登记照片数组 | 登记记录 | `["https://...", "https://..."]` |
| `return_photos` | text[] | 还车照片数组 | 还车记录 | `["https://...", "https://..."]` |
| `return_time` | timestamptz | 还车时间 | 还车记录 | `2025-11-05 18:00:00+08` |

**查询示例：**
```typescript
// 查询有损坏记录的车辆
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    damage_photos,
    vehicle:vehicles(plate_number, brand, model)
  `)
  .not('damage_photos', 'is', null)
  .neq('damage_photos', '{}')

// 查询提车记录
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    pickup_time,
    pickup_photos,
    vehicle:vehicles(plate_number)
  `)
  .not('pickup_time', 'is', null)
  .order('pickup_time', { ascending: false })

// 查询还车记录
const { data } = await supabase
  .from('vehicle_documents')
  .select(`
    return_time,
    return_photos,
    vehicle:vehicles(plate_number)
  `)
  .not('return_time', 'is', null)
  .order('return_time', { ascending: false })
```

---

#### 10. 系统字段（2列）

| 字段名 | 类型 | 说明 | 查询场景 | 示例 |
|--------|------|------|----------|------|
| `created_at` | timestamptz | 创建时间 | 时间排序 | `2025-11-05 09:00:00+08` |
| `updated_at` | timestamptz | 更新时间 | 最近更新查询 | `2025-11-05 10:00:00+08` |

---

### vehicle_documents表常用查询场景总结

| 查询场景 | 使用字段 | 说明 |
|----------|----------|------|
| **行驶证信息** | `owner_name`, `use_character`, `register_date`, `issue_date`, `engine_number` | 显示行驶证详细信息 |
| **车辆技术参数** | `total_mass`, `approved_load`, `approved_passengers`, `overall_dimension_*` | 显示车辆技术规格 |
| **年检提醒** | `inspection_valid_until`, `inspection_date` | 年检到期提醒 |
| **报废提醒** | `mandatory_scrap_date` | 强制报废提醒 |
| **证件照片** | `driving_license_*_photo` | 查看行驶证照片 |
| **车辆照片** | `*_photo`（7个照片字段） | 查看车辆外观和内部照片 |
| **租赁管理** | `lessor_*`, `lessee_*`, `monthly_rent`, `lease_*_date`, `rent_payment_day` | 租赁车辆管理 |
| **审核管理** | `review_notes`, `locked_photos`, `required_photos` | 审核流程管理 |
| **提车还车** | `pickup_*`, `return_*` | 提车还车记录 |
| **损坏记录** | `damage_photos` | 车辆损坏记录 |

---

## 三、两表联合查询场景

### 1. 车辆列表（只需核心信息）

**场景**：显示车辆列表，不需要详细信息

**查询表**：只查询 `vehicles` 表

**使用字段**：
- `plate_number`（车牌号）
- `brand`（品牌）
- `model`（型号）
- `color`（颜色）
- `status`（状态）
- `driver_id`（司机）

```typescript
const { data } = await supabase
  .from('vehicles')
  .select(`
    id,
    plate_number,
    brand,
    model,
    color,
    status,
    driver:users!driver_id(id, name)
  `)
  .eq('is_active', true)
  .order('created_at', { ascending: false })
```

**性能**：快速，只扫描22列

---

### 2. 车辆详情（需要完整信息）

**场景**：查看车辆详细信息，包括行驶证、照片等

**查询表**：`vehicles` 表 JOIN `vehicle_documents` 表

**使用字段**：
- vehicles表的所有字段（22列）
- vehicle_documents表的所有字段（48列）

```typescript
const { data } = await supabase
  .from('vehicles')
  .select(`
    *,
    document:vehicle_documents(*),
    driver:users!driver_id(id, name, phone),
    warehouse:warehouses(id, name)
  `)
  .eq('id', vehicleId)
  .maybeSingle()
```

**性能**：稍慢，但只在需要时使用

---

### 3. 车辆审核（需要照片和审核信息）

**场景**：审核车辆信息和照片

**查询表**：`vehicles` 表 JOIN `vehicle_documents` 表

**使用字段**：
- vehicles表：`plate_number`, `brand`, `model`, `review_status`, `reviewed_at`
- vehicle_documents表：所有照片字段、`review_notes`, `locked_photos`, `required_photos`

```typescript
const { data } = await supabase
  .from('vehicles')
  .select(`
    id,
    plate_number,
    brand,
    model,
    review_status,
    reviewed_at,
    document:vehicle_documents(
      left_front_photo,
      right_front_photo,
      left_rear_photo,
      right_rear_photo,
      dashboard_photo,
      rear_door_photo,
      cargo_box_photo,
      driving_license_main_photo,
      driving_license_sub_photo,
      driving_license_back_photo,
      driving_license_sub_back_photo,
      review_notes,
      locked_photos,
      required_photos
    )
  `)
  .eq('review_status', 'pending')
```

---

### 4. 年检提醒（需要检验信息）

**场景**：查询即将到期需要年检的车辆

**查询表**：`vehicles` 表 JOIN `vehicle_documents` 表

**使用字段**：
- vehicles表：`plate_number`, `brand`, `model`
- vehicle_documents表：`inspection_valid_until`, `inspection_date`

```typescript
const thirtyDaysLater = new Date()
thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

const { data } = await supabase
  .from('vehicles')
  .select(`
    id,
    plate_number,
    brand,
    model,
    document:vehicle_documents!inner(
      inspection_valid_until,
      inspection_date
    )
  `)
  .lte('document.inspection_valid_until', thirtyDaysLater.toISOString())
  .gte('document.inspection_valid_until', new Date().toISOString())
```

---

### 5. 租赁管理（需要租赁信息）

**场景**：管理租赁车辆和租金

**查询表**：`vehicles` 表 JOIN `vehicle_documents` 表

**使用字段**：
- vehicles表：`plate_number`, `brand`, `model`, `ownership_type`
- vehicle_documents表：`lessor_name`, `lessee_name`, `monthly_rent`, `lease_start_date`, `lease_end_date`, `rent_payment_day`

```typescript
const { data } = await supabase
  .from('vehicles')
  .select(`
    id,
    plate_number,
    brand,
    model,
    ownership_type,
    document:vehicle_documents!inner(
      lessor_name,
      lessor_contact,
      lessee_name,
      lessee_contact,
      monthly_rent,
      lease_start_date,
      lease_end_date,
      rent_payment_day
    )
  `)
  .eq('ownership_type', 'personal')
  .not('document.lessor_name', 'is', null)
```

---

### 6. 司机车辆详情（需要司机和车辆信息）

**场景**：查看司机使用的车辆详细信息

**查询表**：`vehicles` 表 JOIN `vehicle_documents` 表 JOIN `users` 表

**使用字段**：
- vehicles表：所有核心字段
- vehicle_documents表：行驶证信息、车辆照片
- users表：司机信息

```typescript
const { data } = await supabase
  .from('vehicles')
  .select(`
    *,
    document:vehicle_documents(
      owner_name,
      use_character,
      register_date,
      inspection_valid_until,
      left_front_photo,
      right_front_photo,
      dashboard_photo
    ),
    driver:users!driver_id(
      id,
      name,
      phone,
      email
    )
  `)
  .eq('driver_id', driverId)
```

---

### 7. 车辆统计报表（需要多维度数据）

**场景**：生成车辆统计报表

**查询表**：`vehicles` 表 JOIN `vehicle_documents` 表

**使用字段**：
- vehicles表：`vehicle_type`, `status`, `ownership_type`, `brand`
- vehicle_documents表：`use_character`, `approved_load`, `monthly_rent`

```typescript
// 按车辆类型统计
const { data: typeStats } = await supabase
  .from('vehicles')
  .select('vehicle_type, count')
  .group('vehicle_type')

// 按使用性质统计
const { data: useStats } = await supabase
  .from('vehicle_documents')
  .select('use_character, count')
  .group('use_character')

// 租赁车辆租金统计
const { data: rentStats } = await supabase
  .from('vehicle_documents')
  .select('monthly_rent')
  .not('monthly_rent', 'is', null)
```

---

## 四、查询性能优化建议

### 1. 只查询需要的字段

❌ **不推荐**：查询所有字段
```typescript
const { data } = await supabase
  .from('vehicles')
  .select('*, document:vehicle_documents(*)')
```

✅ **推荐**：只查询需要的字段
```typescript
const { data } = await supabase
  .from('vehicles')
  .select(`
    plate_number,
    brand,
    model,
    document:vehicle_documents(
      inspection_valid_until,
      inspection_date
    )
  `)
```

---

### 2. 列表查询不要JOIN

❌ **不推荐**：列表查询JOIN扩展表
```typescript
// 列表查询不需要扩展信息
const { data } = await supabase
  .from('vehicles')
  .select('*, document:vehicle_documents(*)')
```

✅ **推荐**：列表查询只查核心表
```typescript
// 列表只需要核心信息
const { data } = await supabase
  .from('vehicles')
  .select('plate_number, brand, model, status')
```

---

### 3. 详情查询按需JOIN

✅ **推荐**：根据页面需求选择性JOIN
```typescript
// 如果只需要行驶证信息
const { data } = await supabase
  .from('vehicles')
  .select(`
    *,
    document:vehicle_documents(
      owner_name,
      use_character,
      register_date,
      inspection_valid_until
    )
  `)

// 如果只需要照片
const { data } = await supabase
  .from('vehicles')
  .select(`
    *,
    document:vehicle_documents(
      left_front_photo,
      right_front_photo,
      dashboard_photo
    )
  `)
```

---

### 4. 使用索引字段进行筛选

✅ **推荐**：使用已建立索引的字段
```typescript
// vehicle_id有索引，查询快
const { data } = await supabase
  .from('vehicle_documents')
  .select('*')
  .eq('vehicle_id', vehicleId)
```

---

## 五、总结

### vehicles表（22列）- 高频查询
**适用场景**：
- ✅ 车辆列表显示
- ✅ 车辆搜索
- ✅ 司机车辆查询
- ✅ 仓库车辆查询
- ✅ 车辆状态筛选
- ✅ 车辆统计分析

**性能**：快速，只扫描22列

---

### vehicle_documents表（48列）- 按需查询
**适用场景**：
- ✅ 车辆详情页
- ✅ 行驶证信息查看
- ✅ 车辆照片查看
- ✅ 租赁信息管理
- ✅ 年检提醒
- ✅ 审核流程
- ✅ 提车还车记录

**性能**：稍慢，但只在需要时使用

---

### 查询策略
1. **列表查询**：只查 `vehicles` 表（性能提升40%）
2. **详情查询**：JOIN `vehicle_documents` 表（按需加载）
3. **特定功能**：只JOIN需要的字段（最优性能）

---

**文档版本**：1.0  
**最后更新**：2025-11-05  
**维护者**：车队管理系统开发团队
