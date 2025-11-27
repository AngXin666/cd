# 开发者指南

## 目录
- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [开发环境搭建](#开发环境搭建)
- [核心概念](#核心概念)
- [开发规范](#开发规范)
- [常见开发任务](#常见开发任务)
- [调试技巧](#调试技巧)
- [部署指南](#部署指南)

---

## 项目概述

车队管家是一款基于 Taro + React + TypeScript 开发的微信小程序，采用 Supabase 作为后端服务，实现了多租户物理隔离架构。

### 核心特性

- **多租户架构**：每个租户拥有独立的数据库 Schema
- **物理隔离**：租户数据完全隔离，安全性高
- **多角色权限**：支持系统管理员、老板、车队长、司机四种角色
- **实时通知**：基于 Supabase Realtime 的实时通知系统
- **响应式设计**：适配不同尺寸的移动设备

---

## 技术栈

### 前端
- **框架**：Taro 3.x + React 18
- **语言**：TypeScript 5.x
- **样式**：Tailwind CSS 3.x
- **状态管理**：Zustand
- **认证**：miaoda-auth-taro

### 后端
- **数据库**：Supabase (PostgreSQL)
- **认证**：Supabase Auth
- **存储**：Supabase Storage
- **实时通信**：Supabase Realtime
- **Edge Functions**：Deno

### 开发工具
- **包管理器**：pnpm
- **代码检查**：Biome
- **类型检查**：TypeScript
- **版本控制**：Git

---

## 项目结构

```
app-7cdqf07mbu9t/
├── src/
│   ├── app.config.ts          # 应用配置
│   ├── app.scss               # 全局样式
│   ├── app.tsx                # 应用入口
│   ├── client/                # 客户端配置
│   │   └── supabase.ts        # Supabase 客户端
│   ├── components/            # 公共组件
│   ├── contexts/              # React Context
│   ├── db/                    # 数据库相关
│   │   ├── api.ts             # 数据库 API
│   │   ├── notificationApi.ts # 通知 API
│   │   ├── tenant-utils.ts    # 租户工具
│   │   └── types.ts           # 类型定义
│   ├── pages/                 # 页面
│   │   ├── central-admin/     # 系统管理员页面
│   │   ├── super-admin/       # 超级管理员页面
│   │   ├── manager/           # 管理端页面
│   │   ├── driver/            # 司机端页面
│   │   ├── common/            # 公共页面
│   │   └── login/             # 登录页面
│   ├── services/              # 业务服务
│   ├── store/                 # 状态管理
│   └── utils/                 # 工具函数
├── supabase/
│   ├── functions/             # Edge Functions
│   │   └── create-tenant/     # 创建租户函数
│   └── migrations/            # 数据库迁移
├── docs/                      # 文档
├── scripts/                   # 脚本
├── .env                       # 环境变量
├── package.json               # 项目配置
├── tailwind.config.ts         # Tailwind 配置
└── tsconfig.json              # TypeScript 配置
```

---

## 开发环境搭建

### 1. 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- 微信开发者工具

### 2. 克隆项目

```bash
git clone <repository-url>
cd app-7cdqf07mbu9t
```

### 3. 安装依赖

```bash
pnpm install
```

### 4. 配置环境变量

复制 `.env.example` 到 `.env`，并填写配置：

```env
TARO_APP_NAME=车队管家
TARO_APP_APP_ID=your-app-id
TARO_APP_SUPABASE_URL=your-supabase-url
TARO_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 5. 启动开发服务器

```bash
# 微信小程序
pnpm run dev:weapp

# H5
pnpm run dev:h5
```

### 6. 打开微信开发者工具

1. 打开微信开发者工具
2. 导入项目，选择 `dist` 目录
3. 开始开发

---

## 核心概念

### 1. 多租户架构

系统采用物理隔离架构，每个租户拥有独立的数据库 Schema：

```
public (公共 Schema)
├── tenants (租户表)
├── system_admins (系统管理员表)
└── profiles (全局用户档案表)

tenant_001 (租户 Schema)
├── profiles (租户用户档案表)
├── vehicles (车辆表)
├── warehouses (仓库表)
├── attendance (考勤表)
├── leave_requests (请假申请表)
├── piecework_records (计件记录表)
└── notifications (通知表)

tenant_002 (租户 Schema)
├── ...
```

### 2. 认证系统

使用 `miaoda-auth-taro` 提供的认证功能：

```typescript
import { useAuth } from 'miaoda-auth-taro'

const MyComponent: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth()
  
  if (!isAuthenticated) {
    return <View>请先登录</View>
  }
  
  return <View>欢迎，{user?.email}</View>
}
```

### 3. 权限控制

基于角色的权限控制（RBAC）：

```typescript
type UserRole = 'boss' | 'peer' | 'fleet_leader' | 'driver'

// 权限检查
const hasPermission = (role: UserRole, action: string) => {
  const permissions = {
    boss: ['*'],
    peer: ['read', 'write'],
    fleet_leader: ['read', 'write:own'],
    driver: ['read:own']
  }
  
  return permissions[role].includes(action)
}
```

### 4. 数据隔离

通过 RLS (Row Level Security) 策略实现数据隔离：

```sql
-- 用户只能查看自己的数据
CREATE POLICY "用户查看自己的数据" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 管理员可以查看所有数据
CREATE POLICY "管理员查看所有数据" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('boss', 'peer', 'fleet_leader')
    )
  );
```

---

## 开发规范

### 1. 代码风格

- 使用 TypeScript 严格模式
- 使用 2 空格缩进
- 使用 Biome 进行代码检查
- 遵循 React Hooks 规则

### 2. 命名规范

```typescript
// 组件：PascalCase
const UserProfile: React.FC = () => {}

// 函数：camelCase
const getUserProfile = () => {}

// 常量：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3

// 类型：PascalCase
type UserProfile = {
  id: string
  name: string
}

// 接口：PascalCase，以 I 开头
interface IUserProfile {
  id: string
  name: string
}
```

### 3. 文件组织

```typescript
// 导入顺序
import React from 'react'                    // 1. React 相关
import { View, Text } from '@tarojs/components'  // 2. Taro 组件
import Taro from '@tarojs/taro'              // 3. Taro API
import { useAuth } from 'miaoda-auth-taro'   // 4. 第三方库
import { supabase } from '@/client/supabase' // 5. 项目内部模块
import type { Profile } from '@/db/types'    // 6. 类型定义
import './index.scss'                        // 7. 样式文件
```

### 4. 组件规范

```typescript
// 组件模板
import React, { useState, useEffect, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

interface MyComponentProps {
  title: string
  onSubmit?: () => void
}

const MyComponent: React.FC<MyComponentProps> = ({ title, onSubmit }) => {
  // 1. State
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // 2. Callbacks
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 加载数据
    } catch (error) {
      console.error('加载失败:', error)
      Taro.showToast({ title: '加载失败', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 3. Effects
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // 4. Render
  return (
    <View className="container">
      <Text>{title}</Text>
    </View>
  )
}

export default MyComponent
```

### 5. API 调用规范

```typescript
// ✅ 推荐：使用封装的 API 函数
import { getAllWarehouses } from '@/db/api'

const warehouses = await getAllWarehouses()

// ❌ 不推荐：直接使用 Supabase 客户端
const { data } = await supabase.from('warehouses').select('*')
```

### 6. 错误处理规范

```typescript
try {
  const result = await someApiFunction()
  
  if (!result) {
    throw new Error('操作失败')
  }
  
  Taro.showToast({
    title: '操作成功',
    icon: 'success'
  })
} catch (error) {
  console.error('操作失败:', error)
  Taro.showToast({
    title: error.message || '操作失败',
    icon: 'error'
  })
}
```

---

## 常见开发任务

### 1. 添加新页面

#### 步骤 1：创建页面文件

```bash
mkdir -p src/pages/my-page
touch src/pages/my-page/index.tsx
touch src/pages/my-page/index.config.ts
```

#### 步骤 2：编写页面代码

```typescript
// src/pages/my-page/index.tsx
import React from 'react'
import { View, Text } from '@tarojs/components'

const MyPage: React.FC = () => {
  return (
    <View className="container">
      <Text>我的页面</Text>
    </View>
  )
}

export default MyPage
```

#### 步骤 3：配置页面

```typescript
// src/pages/my-page/index.config.ts
export default definePageConfig({
  navigationBarTitleText: '我的页面'
})
```

#### 步骤 4：注册路由

```typescript
// src/app.config.ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/my-page/index',  // 添加新页面
    // ...
  ]
})
```

### 2. 添加新的数据库表

#### 步骤 1：创建迁移文件

```sql
-- supabase/migrations/add_my_table.sql
CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加 RLS 策略
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户查看自己的数据" ON my_table
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

#### 步骤 2：应用迁移

```bash
# 使用 supabase_apply_migration 工具
```

#### 步骤 3：添加类型定义

```typescript
// src/db/types.ts
export interface MyTable {
  id: string
  name: string
  created_at: string
  updated_at: string
}
```

#### 步骤 4：添加 API 函数

```typescript
// src/db/api.ts
export async function getAllMyTable(): Promise<MyTable[]> {
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('获取数据失败:', error)
    throw error
  }
  
  return data || []
}
```

### 3. 添加新的通知类型

#### 步骤 1：更新类型定义

```typescript
// src/db/types.ts
export type NotificationType = 
  | 'system'
  | 'leave_request'
  | 'vehicle_approval'
  | 'attendance'
  | 'piecework'
  | 'my_new_type'  // 添加新类型
```

#### 步骤 2：创建通知

```typescript
import { createNotification } from '@/db/notificationApi'

await createNotification({
  receiver_id: userId,
  title: '新通知',
  content: '这是一条新类型的通知',
  type: 'my_new_type'
})
```

---

## 调试技巧

### 1. 使用 console.log

```typescript
console.log('[MyComponent] 数据加载:', data)
console.error('[MyComponent] 错误:', error)
console.warn('[MyComponent] 警告:', warning)
```

### 2. 使用 Taro.showToast

```typescript
Taro.showToast({
  title: '调试信息',
  icon: 'none',
  duration: 3000
})
```

### 3. 使用 React DevTools

在 H5 模式下，可以使用 React DevTools 进行调试。

### 4. 使用微信开发者工具

- 查看 Console 输出
- 查看 Network 请求
- 查看 Storage 数据
- 使用断点调试

### 5. 数据库调试

```typescript
// 打印 SQL 查询
const { data, error } = await supabase
  .from('warehouses')
  .select('*')

console.log('查询结果:', data)
console.log('查询错误:', error)
```

---

## 部署指南

### 1. 构建项目

```bash
# 构建微信小程序
pnpm run build:weapp

# 构建 H5
pnpm run build:h5
```

### 2. 部署 Edge Functions

```bash
# 部署创建租户函数
supabase functions deploy create-tenant
```

### 3. 应用数据库迁移

```bash
# 应用所有迁移
supabase db push
```

### 4. 上传小程序

1. 打开微信开发者工具
2. 点击"上传"按钮
3. 填写版本号和备注
4. 提交审核

### 5. 发布小程序

1. 登录微信公众平台
2. 进入"版本管理"
3. 提交审核
4. 审核通过后发布

---

## 相关文档

- [API 参考文档](./API_REFERENCE.md)
- [用户手册](./USER_MANUAL.md)
- [数据库架构](./DATABASE_ARCHITECTURE.md)
- [权限系统](./PERMISSION_SYSTEM.md)

---

## 更新日志

### 2025-11-27
- 创建完整的开发者指南
- 添加项目结构说明
- 添加开发规范和最佳实践
- 添加常见开发任务指南
