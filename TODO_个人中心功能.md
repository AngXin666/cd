# 个人中心和设置模块实现计划

## 任务概述
为车队管家小程序添加完整的个人中心和设置模块，包括个人信息管理、账户安全、帮助反馈等功能。

## 实现步骤

### 1. 数据库设计 ✅
- [ ] 扩展profiles表，添加新字段：
  - avatar_url (text) - 头像URL
  - nickname (text) - 昵称
  - address_province (text) - 省份
  - address_city (text) - 城市
  - address_district (text) - 区县
  - address_detail (text) - 详细地址
  - emergency_contact_name (text) - 紧急联系人姓名
  - emergency_contact_phone (text) - 紧急联系人电话
- [ ] 创建feedback表（意见反馈）
- [ ] 创建Supabase Storage bucket用于头像上传
- [ ] 应用数据库迁移

### 2. API函数实现
- [ ] 在src/db/api.ts中添加：
  - updateProfile() - 更新个人信息
  - uploadAvatar() - 上传头像
  - changePassword() - 修改密码
  - submitFeedback() - 提交反馈
  - getFeedbackList() - 获取反馈列表

### 3. 页面创建

#### 3.1 个人中心主页 (pages/profile/index.tsx)
- [ ] 显示用户头像、姓名、角色
- [ ] 显示个人信息摘要
- [ ] 提供"编辑资料"入口
- [ ] 提供"设置"入口
- [ ] 提供"帮助与反馈"入口

#### 3.2 编辑资料页面 (pages/profile/edit/index.tsx)
- [ ] 头像上传和裁剪功能
- [ ] 姓名/昵称编辑
- [ ] 联系电话编辑（需短信验证）
- [ ] 邮箱地址编辑
- [ ] 居住地址编辑（省/市/区选择器 + 详细地址）
- [ ] 紧急联系人信息编辑
- [ ] 保存按钮和表单验证

#### 3.3 设置页面 (pages/profile/settings/index.tsx)
- [ ] 修改密码入口
- [ ] 账户安全设置
- [ ] 关于我们
- [ ] 退出登录

#### 3.4 修改密码页面 (pages/profile/change-password/index.tsx)
- [ ] 原密码输入和验证
- [ ] 新密码输入
- [ ] 确认新密码
- [ ] 密码强度校验
- [ ] 提交修改

#### 3.5 帮助文档页面 (pages/profile/help/index.tsx)
- [ ] 使用说明文档
- [ ] 常见问题解答
- [ ] 功能介绍

#### 3.6 意见反馈页面 (pages/profile/feedback/index.tsx)
- [ ] 反馈类型选择
- [ ] 反馈内容输入
- [ ] 图片上传（可选）
- [ ] 联系方式
- [ ] 提交反馈
- [ ] 查看历史反馈

### 4. 组件开发
- [ ] AddressPicker组件 - 省市区三级联动选择器
- [ ] AvatarUpload组件 - 头像上传和裁剪
- [ ] PasswordStrength组件 - 密码强度指示器

### 5. 路由配置
- [ ] 在app.config.ts中添加新页面路由
- [ ] 更新底部tabBar，添加"我的"标签

### 6. 测试验证
- [ ] 个人信息编辑功能测试
- [ ] 头像上传功能测试
- [ ] 修改密码功能测试
- [ ] 意见反馈功能测试
- [ ] 权限控制测试
- [ ] 运行pnpm run lint检查

### 7. 文档更新
- [ ] 更新README.md
- [ ] 创建功能使用说明文档
- [ ] 更新API文档

## 技术要点

### 头像上传
- 使用Supabase Storage
- 支持图片裁剪（1:1比例）
- 图片压缩（最大1MB）
- 支持JPEG、PNG格式

### 地址选择
- 使用省市区三级联动
- 数据来源：中国行政区划数据
- 支持搜索和快速定位

### 密码修改
- 原密码验证
- 新密码强度校验（至少8位，包含字母和数字）
- 使用Supabase Auth API

### 短信验证
- 手机号修改时需要验证
- 使用Supabase OTP功能

## 设计规范

### 配色方案
- 主色：深蓝色 #1E3A8A
- 辅助色：橙色 #F97316
- 背景色：浅灰色 #F8FAFC
- 文字色：深灰色 #1F2937

### 布局规范
- 卡片式布局
- 8px圆角
- 轻微阴影效果
- 统一的间距和padding

### 交互规范
- 点击反馈：active:scale-95
- 过渡动画：transition-all
- Toast提示：成功/失败/警告

## 注意事项
1. 所有个人信息修改需要权限验证
2. 敏感操作（修改密码、手机号）需要二次确认
3. 图片上传需要大小和格式限制
4. 表单验证要完善，提供友好的错误提示
5. 考虑不同角色的权限差异
6. 保护用户隐私，不显示完整手机号
