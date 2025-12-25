# Requirements Document

## Introduction

本需求文档定义了 fleet-manager 后端系统需要新增的车辆管理 API 端点。这些 API 用于支持前端的车辆还车、分配和管理功能。前端代码已经准备好调用这些接口，后端需要实现对应的端点。

## Glossary

- **Vehicle**: 车辆实体，包含车牌号、品牌、型号、状态等信息
- **Return Vehicle**: 还车操作，司机归还车辆时需要拍摄车辆照片
- **Assign Vehicle**: 分配车辆，管理员将车辆分配给指定司机
- **Return Photos**: 还车照片，7个角度的车辆照片（左前、右前、左后、右后、仪表盘、后门、货箱）
- **Damage Photos**: 车损照片，记录车辆损坏情况的照片（无数量限制）
- **VehicleStatus**: 车辆状态枚举（active=使用中, returned=已归还, reviewing=审核中）
- **Vehicle History**: 车辆使用历史，包含每次提车、还车的照片和时间记录
- **Photo Comparison**: 照片对比功能，支持选择2张照片并排对比查看

## Requirements

### Requirement 1: 还车 API 端点

**User Story:** As a 司机, I want 通过 API 提交还车信息和照片, so that 系统可以记录车辆归还状态。

#### Acceptance Criteria

1. WHEN 司机调用 PUT /api/vehicles/{id}/return 端点 THEN the system SHALL 验证车辆存在且属于当前用户
2. WHEN 请求包含 return_photos 数组 THEN the system SHALL 验证照片数组包含 7 张照片 URL
3. WHEN 请求包含 damage_photos 数组 THEN the system SHALL 存储车损照片（无数量限制）
4. WHEN 还车成功 THEN the system SHALL 将车辆状态更新为 returned
5. WHEN 还车成功 THEN the system SHALL 记录还车时间 return_time
6. WHEN 车辆不存在或不属于当前用户 THEN the system SHALL 返回 404 或 403 错误

### Requirement 2: 分配车辆 API 端点

**User Story:** As a 管理员, I want 通过 API 将车辆分配给司机, so that 司机可以使用该车辆。

#### Acceptance Criteria

1. WHEN 管理员调用 PUT /api/vehicles/{id}/assign 端点 THEN the system SHALL 验证当前用户具有管理权限
2. WHEN 请求包含 user_id 参数 THEN the system SHALL 将车辆的 user_id 更新为指定用户
3. WHEN 请求包含 warehouse_id 参数 THEN the system SHALL 记录车辆所属仓库
4. WHEN 分配成功 THEN the system SHALL 将车辆状态更新为 active
5. WHEN 目标用户不存在 THEN the system SHALL 返回 404 错误
6. WHEN 当前用户无管理权限 THEN the system SHALL 返回 403 错误

### Requirement 3: 获取所有车辆 API 端点

**User Story:** As a 管理员, I want 获取系统中所有车辆的列表, so that 我可以管理和监控车辆状态。

#### Acceptance Criteria

1. WHEN 管理员调用 GET /api/vehicles/all 端点 THEN the system SHALL 返回所有车辆列表
2. WHEN 请求包含 warehouse_id 参数 THEN the system SHALL 过滤返回指定仓库的车辆
3. WHEN 请求包含 status 参数 THEN the system SHALL 过滤返回指定状态的车辆
4. WHEN 请求包含分页参数 THEN the system SHALL 返回分页后的结果
5. WHEN 当前用户无管理权限 THEN the system SHALL 返回 403 错误

### Requirement 4: 获取仓库车辆 API 端点

**User Story:** As a 车队长, I want 获取我管辖仓库的车辆列表, so that 我可以管理本仓库的车辆。

#### Acceptance Criteria

1. WHEN 用户调用 GET /api/warehouses/{id}/vehicles 端点 THEN the system SHALL 返回该仓库的车辆列表
2. WHEN 请求包含 status 参数 THEN the system SHALL 过滤返回指定状态的车辆
3. WHEN 请求包含分页参数 THEN the system SHALL 返回分页后的结果
4. WHEN 仓库不存在 THEN the system SHALL 返回 404 错误
5. WHEN 当前用户无权访问该仓库 THEN the system SHALL 返回 403 错误

### Requirement 5: 车辆数据模型扩展

**User Story:** As a 开发者, I want 扩展车辆数据模型以支持还车照片, so that 系统可以存储完整的车辆照片信息。

#### Acceptance Criteria

1. WHEN 车辆模型需要存储还车照片 THEN the system SHALL 添加 return_photos 字段（JSON 数组）
2. WHEN 车辆模型需要存储车损照片 THEN the system SHALL 添加 damage_photos 字段（JSON 数组）
3. WHEN 车辆模型需要记录还车时间 THEN the system SHALL 添加 return_time 字段（datetime）
4. WHEN 车辆模型需要关联仓库 THEN the system SHALL 添加 warehouse_id 字段（外键）
5. WHEN 数据库迁移执行 THEN the system SHALL 保留现有数据不丢失

### Requirement 6: 图片上传 API 端点

**User Story:** As a 用户, I want 通过 API 上传图片文件, so that 我可以保存车辆照片到服务器。

#### Acceptance Criteria

1. WHEN 用户调用 POST /api/upload/image 端点 THEN the system SHALL 接收图片文件
2. WHEN 图片上传成功 THEN the system SHALL 返回图片的访问 URL
3. WHEN 图片格式不支持 THEN the system SHALL 返回 400 错误
4. WHEN 图片大小超过限制 THEN the system SHALL 返回 400 错误
5. WHEN 用户未登录 THEN the system SHALL 返回 401 错误

### Requirement 7: 图片本地缓存系统

**User Story:** As a 用户, I want 图片能够缓存到本地, so that 多次查看时可以秒开不用重复下载。

#### Acceptance Criteria

1. WHEN 前端首次加载图片 THEN the system SHALL 下载图片并缓存到本地存储
2. WHEN 前端再次加载相同图片 THEN the system SHALL 优先从本地缓存读取
3. WHEN 本地缓存存在且未过期 THEN the system SHALL 直接返回缓存图片实现秒开
4. WHEN 缓存图片超过有效期（7天） THEN the system SHALL 重新从服务器下载
5. WHEN 本地存储空间不足 THEN the system SHALL 清理最旧的缓存图片
6. WHEN 用户主动清理缓存 THEN the system SHALL 删除所有本地缓存图片

### Requirement 8: 跨平台图片缓存兼容

**User Story:** As a 开发者, I want 图片缓存功能在所有平台都能正常工作, so that H5、小程序、APP 用户都能享受秒开体验。

#### Acceptance Criteria

1. WHEN 在 H5 平台运行 THEN the system SHALL 使用 IndexedDB 或 localStorage 存储缓存图片
2. WHEN 在微信小程序运行 THEN the system SHALL 使用 wx.getFileSystemManager 存储缓存图片
3. WHEN 在 APP（Capacitor）运行 THEN the system SHALL 使用原生文件系统存储缓存图片
4. WHEN 调用缓存 API THEN the system SHALL 自动检测当前平台并使用对应的存储方式
5. WHEN 平台不支持本地存储 THEN the system SHALL 降级为内存缓存

### Requirement 9: 图片预加载优化

**User Story:** As a 用户, I want 进入页面时图片能够预加载, so that 滚动查看时不会出现加载延迟。

#### Acceptance Criteria

1. WHEN 用户进入车辆详情页 THEN the system SHALL 预加载该车辆的所有照片
2. WHEN 用户进入车辆列表页 THEN the system SHALL 预加载可视区域内车辆的缩略图
3. WHEN 预加载完成 THEN the system SHALL 将图片存入本地缓存
4. WHEN 网络较慢 THEN the system SHALL 显示加载占位图并在后台继续加载
5. WHEN 预加载失败 THEN the system SHALL 在用户查看时重试加载

### Requirement 10: 草稿图片本地持久化

**User Story:** As a 司机, I want 录入车辆时拍摄的照片能够随草稿一起保存到本地, so that 突然退出后重新进入时图片不会丢失。

#### Acceptance Criteria

1. WHEN 用户拍摄或选择图片 THEN the system SHALL 立即将图片保存到本地存储
2. WHEN 用户保存草稿 THEN the system SHALL 将图片本地路径与草稿数据关联存储
3. WHEN 用户重新打开草稿 THEN the system SHALL 从本地存储加载图片并正常显示
4. WHEN 本地图片文件存在 THEN the system SHALL 直接显示本地图片而非网络加载
5. WHEN 草稿提交成功 THEN the system SHALL 清理该草稿关联的本地图片文件
6. WHEN 用户删除草稿 THEN the system SHALL 同时删除关联的本地图片文件

### Requirement 11: 提交失败图片保留

**User Story:** As a 司机, I want 提交失败时已拍摄的照片能够保留, so that 我可以重试提交而不需要重新拍照。

#### Acceptance Criteria

1. WHEN 提交车辆信息失败 THEN the system SHALL 保留所有已拍摄的图片在本地
2. WHEN 提交失败 THEN the system SHALL 自动保存当前表单为草稿（包含图片）
3. WHEN 用户点击重试 THEN the system SHALL 使用本地保存的图片重新提交
4. WHEN 网络恢复 THEN the system SHALL 提示用户可以重试提交
5. WHEN 提交部分成功（部分图片上传成功） THEN the system SHALL 记录已上传的图片URL避免重复上传

### Requirement 12: 图片存储路径管理

**User Story:** As a 开发者, I want 统一管理图片的本地存储路径, so that 草稿、缓存、临时图片能够有序管理。

#### Acceptance Criteria

1. WHEN 存储草稿图片 THEN the system SHALL 使用路径格式 /drafts/{draftId}/images/{filename}
2. WHEN 存储缓存图片 THEN the system SHALL 使用路径格式 /cache/images/{hash}
3. WHEN 存储临时图片 THEN the system SHALL 使用路径格式 /temp/images/{timestamp}_{random}
4. WHEN 应用启动 THEN the system SHALL 清理超过24小时的临时图片
5. WHEN 草稿过期（30天未使用） THEN the system SHALL 清理该草稿及关联图片

### Requirement 13: 相册连续选取功能

**User Story:** As a 司机, I want 在相册中滑动连续选取多张照片, so that 我可以快速选择多张车损照片。

#### Acceptance Criteria

1. WHEN 用户打开相册选择器 THEN the system SHALL 支持滑动手势连续选择多张照片
2. WHEN 用户按住并滑动 THEN the system SHALL 自动选中滑动经过的所有照片
3. WHEN 用户选择车损照片 THEN the system SHALL 不限制选择数量
4. WHEN 用户完成选择 THEN the system SHALL 显示已选照片数量和预览
5. WHEN 用户取消选择某张照片 THEN the system SHALL 支持点击取消单张选择

### Requirement 14: 车辆历史照片对比功能

**User Story:** As a 老板, I want 在查看车辆历史时能够对比不同时期的照片, so that 我可以直观了解车辆状况变化。

#### Acceptance Criteria

1. WHEN 老板进入车辆历史页面 THEN the system SHALL 显示车辆的提车照片和还车照片时间线
2. WHEN 老板选择对比模式 THEN the system SHALL 允许选择 2 张照片进行对比
3. WHEN 选中 2 张照片 THEN the system SHALL 并排显示两张照片便于对比
4. WHEN 对比 7 张基本照片 THEN the system SHALL 支持按角度（左前、右前等）自动匹配对比
5. WHEN 对比车损照片 THEN the system SHALL 支持任意选择 2 张车损照片进行对比
6. WHEN 用户查看对比 THEN the system SHALL 支持缩放和平移同步操作

### Requirement 15: 车辆历史记录 API

**User Story:** As a 老板, I want 获取车辆的完整使用历史, so that 我可以追溯车辆的使用情况。

#### Acceptance Criteria

1. WHEN 老板调用 GET /api/vehicles/{id}/history 端点 THEN the system SHALL 返回车辆的使用历史列表
2. WHEN 返回历史记录 THEN the system SHALL 包含每次提车和还车的照片、时间、司机信息
3. WHEN 返回历史记录 THEN the system SHALL 包含每次的车损照片记录
4. WHEN 请求包含分页参数 THEN the system SHALL 返回分页后的历史记录
5. WHEN 当前用户无管理权限 THEN the system SHALL 返回 403 错误

