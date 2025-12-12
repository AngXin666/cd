# 🧹 项目清理指南

## 📊 当前项目大小分析

**总大小**: 6.6GB  
**主要占用**:
- `node_modules`: **6.4GB** (97%)
- `.git`: 81MB (1.2%)
- `android`: 33MB (0.5%)
- `src`: 3.5MB (0.05%)
- `dist`: 2.2MB (0.03%)

---

## 🎯 清理建议

### 1. 立即可删除（节省 6.5GB+）

#### 方案A：完全清理（推荐）
```bash
# 删除依赖（可重新安装）
rm -rf node_modules

# 删除构建输出
rm -rf dist

# 删除Android构建缓存
rm -rf android/app/build
rm -rf android/.gradle

# 删除编译缓存
rm -rf .swc

# 删除备份文件
rm -rf backup

# 重新安装依赖（需要时）
pnpm install
```

**节省空间**: ~6.5GB → 剩余约100MB

#### 方案B：保留依赖（推荐开发中）
```bash
# 只删除构建输出和缓存
rm -rf dist
rm -rf android/app/build
rm -rf android/.gradle
rm -rf .swc
rm -rf backup
```

**节省空间**: ~30MB

### 2. 未使用的函数（可选清理）

发现 **33个未使用的导出函数**，可以考虑删除：

#### attendance.ts (1个)
- `deleteAttendanceRule`

#### dashboard.ts (1个)
- `getWarehouseDataVolume`

#### leave.ts (3个)
- `submitDraftLeaveApplication`
- `submitDraftResignationApplication`
- `getResignationApplicationsByWarehouse`

#### notifications.ts (2个)
- `createNotificationRecord`
- `getNotifications`

#### peer-accounts.ts (1个)
- `isPrimaryAccount`

#### permission-context.ts (4个)
- `getDriverPermissionContext`
- `getManagerPermissionContext`
- `getSchedulerPermissionContext`
- `getAdminPermissionContext`

#### permission-strategy.ts (6个)
- `isPeerAdminWithFullControl`
- `isPeerAdminViewOnly`
- `isManagerWithFullControl`
- `isManagerViewOnly`
- `isSchedulerFullControl`
- `isSchedulerViewOnly`

#### piecework.ts (3个)
- `getAllPieceWorkRecords`
- `getCategoryPrice`
- `deleteCategoryPrice`

#### users.ts (5个)
- `getManagerProfiles`
- `getManagerWarehouseIds`
- `updateManagerPermissionsEnabled`
- `getManagerPermissionsEnabled`
- `deleteTenantWithLog`

#### vehicles.ts (5个)
- `getVehiclesByDriverId`
- `deleteVehicle`
- `updateDriverLicense`
- `getPendingReviewVehicles`
- `lockVehiclePhotos`

#### warehouses.ts (7个)
- `getActiveWarehouses`
- `getWarehousesWithRules`
- `assignWarehouseToDriver`
- `removeWarehouseFromDriver`
- `getAllDriverWarehouses`
- `getWarehouseCategories`
- `setWarehouseCategories`

---

## 🚀 快速清理脚本

### 一键清理（保留依赖）

```bash
#!/bin/bash
echo "🧹 开始清理项目..."

# 删除构建输出
echo "删除 dist..."
rm -rf dist

# 删除Android构建缓存
echo "删除 Android 构建缓存..."
rm -rf android/app/build
rm -rf android/.gradle

# 删除编译缓存
echo "删除 .swc 缓存..."
rm -rf .swc

# 删除备份文件
echo "删除 backup..."
rm -rf backup

# 删除临时文件
echo "删除临时文件..."
rm -f *.log
rm -f ts_errors.log

echo "✅ 清理完成！"
echo "节省空间约 30MB"
```

### 完全清理（包括依赖）

```bash
#!/bin/bash
echo "🧹 开始完全清理项目..."

# 删除所有可重建的文件
rm -rf node_modules
rm -rf dist
rm -rf android/app/build
rm -rf android/.gradle
rm -rf .swc
rm -rf backup
rm -f *.log

echo "✅ 清理完成！"
echo "节省空间约 6.5GB"
echo ""
echo "重新安装依赖："
echo "  pnpm install"
```

---

## ⚠️ 注意事项

### 不要删除的目录

- ❌ `src/` - 源代码
- ❌ `.git/` - Git历史记录
- ❌ `android/app/src/` - Android源代码
- ❌ `docs/` - 文档
- ❌ `scripts/` - 脚本工具
- ❌ `config/` - 配置文件

### 可以删除的目录

- ✅ `node_modules/` - 可用 `pnpm install` 重新安装
- ✅ `dist/` - 可用 `npm run build:weapp` 重新构建
- ✅ `android/app/build/` - 可用 `npm run build:android` 重新构建
- ✅ `.swc/` - 编译缓存，会自动重建
- ✅ `backup/` - 备份文件

---

## 📈 清理后的效果

### 清理前
```
总大小: 6.6GB
├── node_modules: 6.4GB
├── .git: 81MB
├── android: 33MB
├── src: 3.5MB
└── 其他: ~10MB
```

### 清理后（保留依赖）
```
总大小: 6.6GB
├── node_modules: 6.4GB
├── .git: 81MB
├── src: 3.5MB
└── 其他: ~5MB
```

### 清理后（完全清理）
```
总大小: ~100MB
├── .git: 81MB
├── src: 3.5MB
├── android/app/src: ~10MB
└── 其他: ~5MB
```

---

## 🔧 维护建议

### 1. 定期清理

```bash
# 每周清理一次缓存
npm run clean  # 如果有这个命令
# 或手动清理
rm -rf dist .swc android/app/build
```

### 2. 使用 .gitignore

确保以下目录在 `.gitignore` 中：
```
node_modules/
dist/
.swc/
android/app/build/
android/.gradle/
*.log
backup/
```

### 3. 优化依赖

```bash
# 检查未使用的依赖
npx depcheck

# 清理依赖缓存
pnpm store prune
```

---

## 📝 清理检查清单

- [ ] 备份重要数据（如果有）
- [ ] 提交当前代码到Git
- [ ] 删除 `dist/` 目录
- [ ] 删除 `android/app/build/` 目录
- [ ] 删除 `.swc/` 目录
- [ ] 删除 `backup/` 目录
- [ ] 删除 `*.log` 文件
- [ ] （可选）删除 `node_modules/` 并重新安装
- [ ] 验证项目仍可正常运行

---

**清理完成时间**: 2025-12-12  
**预计节省空间**: 30MB - 6.5GB  
**维护团队**: 车队管家开发团队
