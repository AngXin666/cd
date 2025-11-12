# 行驶证识别功能调试指南

## 问题排查步骤

### 1. 检查浏览器控制台

打开浏览器开发者工具（F12），查看Console标签页中的日志信息：

#### 正常流程的日志：
```
准备插入车辆数据: { user_id: "...", plate_number: "...", ... }
insertVehicle - 开始插入车辆数据
insertVehicle - 插入成功: { id: "...", ... }
车辆信息保存成功: { id: "...", ... }
```

#### 如果出现错误，会看到：
```
添加车辆失败 - Supabase错误: {
  message: "错误信息",
  details: "详细信息",
  hint: "提示信息",
  code: "错误代码"
}
```

### 2. 常见错误及解决方案

#### 错误1: 字段类型不匹配
**症状**: 错误信息包含 "invalid input syntax" 或 "type mismatch"

**原因**: 数据类型与数据库定义不匹配

**解决方案**:
- 检查数字字段是否传入了字符串
- 检查日期字段格式是否正确（YYYY-MM-DD）
- 确保null值正确传递

#### 错误2: 必填字段缺失
**症状**: 错误信息包含 "null value in column" 或 "violates not-null constraint"

**原因**: 必填字段没有提供值

**解决方案**:
- 确保车牌号、品牌、型号已识别
- 检查user_id是否正确传递
- 验证所有必填字段都有值

#### 错误3: 照片上传失败
**症状**: 错误信息包含 "storage" 或 "upload"

**原因**: 图片上传到Supabase Storage失败

**解决方案**:
- 检查网络连接
- 确认Storage bucket已创建
- 验证文件大小是否超过限制
- 检查文件格式是否支持

#### 错误4: 权限问题
**症状**: 错误信息包含 "permission denied" 或 "RLS"

**原因**: Row Level Security策略阻止了操作

**解决方案**:
- 确认用户已登录
- 检查RLS策略是否正确配置
- 验证用户角色权限

### 3. 数据验证检查清单

在提交前，确保以下条件满足：

- [ ] 已拍摄行驶证主页
- [ ] 已拍摄行驶证副页
- [ ] 已拍摄行驶证副页背页
- [ ] 已识别主页信息（至少包含车牌号、品牌、型号）
- [ ] 已拍摄所有7个角度的车辆照片
- [ ] 用户已登录

### 4. 手动测试步骤

1. **测试OCR识别**
   - 拍摄行驶证主页 → 点击"识别主页" → 检查识别结果
   - 拍摄行驶证副页 → 点击"识别副页" → 检查识别结果
   - 拍摄行驶证副页背页 → 点击"识别副页背页" → 检查识别结果

2. **测试照片上传**
   - 依次拍摄7个角度的车辆照片
   - 确认每张照片都已成功拍摄

3. **测试数据提交**
   - 点击"提交"按钮
   - 观察加载提示
   - 查看控制台日志
   - 确认成功或失败提示

### 5. 数据库检查

如果需要直接检查数据库：

```sql
-- 查看最新添加的车辆
SELECT * FROM vehicles 
ORDER BY created_at DESC 
LIMIT 1;

-- 检查字段值
SELECT 
  plate_number,
  brand,
  model,
  engine_number,
  archive_number,
  total_mass,
  approved_passengers,
  inspection_valid_until,
  mandatory_scrap_date
FROM vehicles 
WHERE plate_number = '你的车牌号';
```

### 6. 识别结果验证

#### 主页字段：
- 车牌号码 (plate_number)
- 车辆类型 (vehicle_type)
- 品牌 (brand)
- 型号 (model)
- VIN码 (vin)
- 发动机号码 (engine_number)
- 所有人 (owner_name)
- 使用性质 (use_character)
- 注册日期 (register_date)
- 发证日期 (issue_date)

#### 副页字段：
- 档案编号 (archive_number)
- 总质量 (total_mass) - 数字，单位kg
- 核定载人数 (approved_passengers) - 数字
- 整备质量 (curb_weight) - 数字，单位kg
- 核定载质量 (approved_load) - 数字，单位kg
- 外廓尺寸长 (overall_dimension_length) - 数字，单位mm
- 外廓尺寸宽 (overall_dimension_width) - 数字，单位mm
- 外廓尺寸高 (overall_dimension_height) - 数字，单位mm
- 检验有效期 (inspection_valid_until) - 日期格式

#### 副页背页字段：
- 强制报废期 (mandatory_scrap_date) - 日期格式

### 7. 联系支持

如果以上步骤都无法解决问题，请提供以下信息：

1. 浏览器控制台的完整错误日志
2. 识别结果的截图
3. 操作步骤的详细描述
4. 使用的浏览器和版本

## 已知限制

1. OCR识别准确率取决于照片质量
2. 建议在光线充足的环境下拍摄
3. 避免照片模糊、反光或倾斜
4. 数字字段如果识别失败会显示为0或空
5. 日期字段必须是YYYY-MM-DD格式

## 最佳实践

1. **拍摄技巧**
   - 保持手机稳定
   - 确保证件平整
   - 避免阴影和反光
   - 包含所有文字信息

2. **识别顺序**
   - 先拍摄主页并识别
   - 确认主页信息正确后再拍摄副页
   - 最后拍摄副页背页

3. **数据检查**
   - 识别后仔细核对每个字段
   - 特别注意数字字段的准确性
   - 确认日期格式正确

4. **错误处理**
   - 如果识别失败，重新拍摄照片
   - 确保照片清晰度足够
   - 必要时可以手动修改识别结果
