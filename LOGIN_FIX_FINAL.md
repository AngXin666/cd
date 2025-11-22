# 登录问题最终解决方案

## 问题根源
Supabase Auth 不支持直接在 `auth.users` 表中手动插入用户数据进行认证。手动插入的用户虽然在数据库中存在，但无法通过 Supabase Auth API 进行登录验证。

## 解决方案

### 1. 使用 Supabase Admin API 创建用户
创建了一个 Edge Function (`create-test-users`) 来使用 Supabase Admin API 正确创建用户：
- 使用 `supabase.auth.admin.createUser()` 方法
- 自动处理密码加密和用户验证
- 确保所有必要的字段都正确设置

### 2. 账号名映射
由于 Supabase Auth 的 phone 字段只接受数字格式，无法直接使用 'admin'、'admin1' 等账号名，因此在登录逻辑中实现了账号名到手机号的映射：

```typescript
const accountMapping: Record<string, string> = {
  admin: '13800000001',
  admin1: '13800000002',
  admin2: '13800000003'
}
```

当用户输入账号名时，系统会自动转换为对应的手机号进行登录。

## 最终结果

### 创建的用户
通过 Supabase Admin API 成功创建了3个用户：

1. **超级管理员**
   - Email: `13800000001@fleet.com`
   - Phone: `13800000001`
   - 密码: `123456`
   - 可用账号名: `admin`

2. **普通管理员**
   - Email: `13800000002@fleet.com`
   - Phone: `13800000002`
   - 密码: `123456`
   - 可用账号名: `admin1`

3. **司机**
   - Email: `13800000003@fleet.com`
   - Phone: `13800000003`
   - 密码: `123456`
   - 可用账号名: `admin2`

### 登录方式

#### 方式1：使用手机号登录
- `13800000001` + 密码 `123456` → 超级管理员
- `13800000002` + 密码 `123456` → 普通管理员
- `13800000003` + 密码 `123456` → 司机

#### 方式2：使用账号名登录
- `admin` + 密码 `123456` → 自动转换为 `13800000001` → 超级管理员
- `admin1` + 密码 `123456` → 自动转换为 `13800000002` → 普通管理员
- `admin2` + 密码 `123456` → 自动转换为 `13800000003` → 司机

## 技术细节

### Edge Function
- 文件位置: `supabase/functions/create-test-users/index.ts`
- 功能: 使用 Supabase Admin API 创建测试用户
- 部署状态: 已部署并激活

### 登录逻辑修改
- 文件位置: `src/pages/login/index.tsx`
- 修改内容: 添加账号名到手机号的映射逻辑
- 兼容性: 同时支持手机号和账号名登录

### 数据库状态
- `auth.users` 表: 3条记录（通过 Admin API 创建）
- `profiles` 表: 3条记录（对应3个用户）
- 仓库关联: 管理员和司机已分配到北京仓库

## 验证步骤

### ✅ 测试账号名登录
1. 输入账号: `admin`
2. 输入密码: `123456`
3. 点击"密码登录"
4. 应该成功登录并跳转到超级管理员工作台

### ✅ 测试手机号登录
1. 输入账号: `13800000001`
2. 输入密码: `123456`
3. 点击"密码登录"
4. 应该成功登录并跳转到超级管理员工作台

## 关键经验

1. **不要手动插入 auth.users**
   - Supabase Auth 需要通过 Admin API 创建用户
   - 手动插入的用户无法通过认证

2. **Phone 字段限制**
   - Supabase Auth 的 phone 字段只接受数字格式
   - 需要在应用层实现账号名映射

3. **密码加密**
   - 使用 Admin API 创建用户时，密码会自动加密
   - 不需要手动处理密码哈希

4. **用户验证**
   - Admin API 创建的用户会自动设置 `email_confirmed_at` 和 `phone_confirmed_at`
   - 确保用户可以立即登录

## 相关文件
- `supabase/functions/create-test-users/index.ts` - Edge Function
- `src/pages/login/index.tsx` - 登录页面（已修改）
- `TEST_ACCOUNTS.md` - 测试账号快速参考
- `LOGIN_TEST_GUIDE.md` - 登录测试指南
