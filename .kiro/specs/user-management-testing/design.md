# Design Document: 用户管理功能全面测试

## Overview

本设计文档定义了对车队管理系统用户管理功能的全面测试方案。测试采用分层策略，包括单元测试、集成测试和属性测试，覆盖老板端和车队长端的所有用户管理场景。

测试目标：
1. 验证各角色的权限控制正确性
2. 发现潜在的安全漏洞和逻辑错误
3. 检查是否存在过度设计
4. 评估业务逻辑的合理性

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    测试架构                                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 属性测试     │  │ 集成测试     │  │ 单元测试     │         │
│  │ (Hypothesis) │  │ (pytest)    │  │ (pytest)    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         ▼                ▼                ▼                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              测试工厂 (UserFactory)                   │   │
│  │  - 生成随机用户数据                                    │   │
│  │  - 创建测试用户和仓库                                  │   │
│  │  - 设置仓库分配关系                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              测试数据库 (SQLite in-memory)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 测试工厂组件

```python
class UserTestFactory:
    """用户测试数据工厂"""
    
    @staticmethod
    def create_user(session, role, **kwargs) -> User:
        """创建指定角色的测试用户"""
        pass
    
    @staticmethod
    def create_warehouse(session, **kwargs) -> Warehouse:
        """创建测试仓库"""
        pass
    
    @staticmethod
    def assign_warehouse(session, user_id, warehouse_id) -> None:
        """分配用户到仓库"""
        pass
    
    @staticmethod
    def get_auth_token(user) -> str:
        """获取用户认证Token"""
        pass
```

### 2. 权限测试矩阵

| 操作 | 老板 | 调度 | 车队长 | 司机 |
|------|------|------|--------|------|
| 创建老板 | ✓ | ✗ | ✗ | ✗ |
| 创建调度 | ✓ | ✗ | ✗ | ✗ |
| 创建车队长 | ✓ | ✓ | ✗ | ✗ |
| 创建司机 | ✓ | ✓ | ✗ | ✗ |
| 更新老板 | ✓ | ✗ | ✗ | ✗ |
| 更新调度 | ✓ | ✓ | ✗ | ✗ |
| 更新车队长 | ✓ | ✓ | ✗ | ✗ |
| 更新司机 | ✓ | ✓ | ✓* | ✗ |
| 删除用户 | ✓ | ✓** | ✗ | ✗ |
| 查询用户列表 | ✓ | ✓ | ✓ | ✗ |
| 分配仓库 | ✓ | ✓ | ✓* | ✗ |

*: 仅限所辖仓库的司机
**: 不能删除老板

### 3. 测试API端点

```
POST   /api/users              - 创建用户
GET    /api/users              - 获取用户列表
GET    /api/users/{id}         - 获取用户详情
PUT    /api/users/{id}         - 更新用户
DELETE /api/users/{id}         - 删除用户
PUT    /api/users/{id}/driver-info - 更新司机信息
POST   /api/users/{id}/warehouses  - 分配仓库
GET    /api/users/{id}/warehouses  - 获取用户仓库
GET    /api/users/{id}/license     - 获取司机证件
POST   /api/users/{id}/license     - 创建/更新证件
PUT    /api/users/{id}/license     - 更新证件
```

## Data Models

### 测试数据生成策略

```python
from hypothesis import strategies as st

# 用户名策略：字母数字组合，3-20字符
username_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Nd')),
    min_size=3, max_size=20
)

# 角色策略
role_strategy = st.sampled_from(['driver', 'manager', 'peer_admin', 'boss'])

# 手机号策略：11位数字，1开头
phone_strategy = st.from_regex(r'1[3-9]\d{9}', fullmatch=True)

# 司机类型策略
driver_type_strategy = st.sampled_from(['pure', 'with_vehicle'])

# 仓库ID列表策略
warehouse_ids_strategy = st.lists(st.integers(min_value=1, max_value=100), max_size=5)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 管理员创建用户权限

*For any* 管理员角色（老板或调度）和任意有效用户数据，当管理员创建权限范围内的角色用户时，系统应成功创建用户并返回用户信息。

**Validates: Requirements 1.1, 1.2**

### Property 2: 用户名唯一性约束

*For any* 已存在的用户名，当尝试创建相同用户名的用户时，系统应返回用户名重复错误。

**Validates: Requirements 1.6**

### Property 3: 用户创建输入验证

*For any* 无效的角色值或缺失必填字段的请求，系统应返回验证错误。

**Validates: Requirements 1.7, 1.8**

### Property 4: 管理员更新用户权限

*For any* 管理员角色和权限范围内的目标用户，当管理员更新用户信息时，系统应成功更新并返回更新后的信息。

**Validates: Requirements 2.1, 2.3**

### Property 5: 车队长仓库范围权限

*For any* 车队长和其所辖仓库的司机，车队长应能成功更新该司机信息；对于非所辖仓库的司机，应返回仓库权限错误。

**Validates: Requirements 2.5, 2.6**

### Property 6: 管理员删除用户权限

*For any* 管理员角色和权限范围内的目标用户（非自己），当管理员删除用户时，系统应成功删除用户。

**Validates: Requirements 3.1, 3.3**

### Property 7: 用户列表筛选正确性

*For any* 角色筛选条件或激活状态筛选条件，返回的用户列表应只包含满足筛选条件的用户。

**Validates: Requirements 4.2, 4.3**

### Property 8: 用户详情不泄露密码

*For any* 用户详情查询，返回的用户信息不应包含 password 或 password_hash 字段。

**Validates: Requirements 4.6**

### Property 9: 仓库分配替换语义

*For any* 用户和新的仓库ID列表，分配仓库后查询该用户的仓库应返回完全相同的仓库列表（替换而非追加）。

**Validates: Requirements 5.1, 5.2**

### Property 10: 车队长仓库分配范围限制

*For any* 车队长和其管理的仓库集合，车队长只能给司机分配其管理范围内的仓库。

**Validates: Requirements 5.3, 5.4**

### Property 11: 仓库分配查询一致性

*For any* 用户和分配的仓库列表，分配后立即查询应返回相同的仓库列表。

**Validates: Requirements 5.8**

### Property 12: 证件信息管理权限

*For any* 管理角色和司机，管理角色应能成功创建和更新该司机的证件信息。

**Validates: Requirements 7.1, 7.2**

### Property 13: 禁用用户认证拦截

*For any* 被禁用的用户，该用户的任何API请求应返回用户已禁用错误。

**Validates: Requirements 8.1**

### Property 14: 无效Token认证拦截

*For any* 无效或格式错误的Token，API请求应返回认证失败错误。

**Validates: Requirements 8.3**

### Property 15: 用户删除级联清理

*For any* 有仓库分配的用户，删除用户后查询该用户的仓库分配应返回空或用户不存在。

**Validates: Requirements 9.1**

### Property 16: 用户名特殊字符处理

*For any* 包含特殊字符的用户名，系统应一致地接受或拒绝（不应导致系统错误）。

**Validates: Requirements 9.4**

## Error Handling

### 错误码定义

| 错误码 | HTTP状态码 | 描述 |
|--------|-----------|------|
| user_disabled | 403 | 用户已被禁用 |
| role_insufficient | 403 | 角色权限不足 |
| resource_not_owned | 403 | 资源不属于当前用户 |
| warehouse_not_accessible | 403 | 无权访问该仓库的资源 |
| high_role_operation | 403 | 需要更高权限操作高权限角色 |
| user_not_found | 404 | 用户不存在 |
| username_exists | 400 | 用户名已存在 |
| validation_error | 422 | 请求数据验证失败 |

### 错误处理测试用例

1. 验证所有错误码返回正确的HTTP状态码
2. 验证错误响应包含 error_code 和 message 字段
3. 验证错误信息不泄露敏感信息

## Testing Strategy

### 测试框架选择

- **后端测试**: pytest + hypothesis (属性测试)
- **前端测试**: vitest + fast-check (属性测试)

### 测试分层

1. **单元测试**: 测试独立函数和方法
   - 密码哈希验证
   - 角色权限判断函数
   - 数据验证函数

2. **集成测试**: 测试API端点
   - 用户CRUD操作
   - 权限控制
   - 仓库分配

3. **属性测试**: 验证系统属性
   - 权限矩阵正确性
   - 数据一致性
   - 输入验证

### 测试配置

```python
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --tb=short

# hypothesis 配置
from hypothesis import settings
settings.register_profile("ci", max_examples=100)
settings.register_profile("dev", max_examples=10)
```

### 测试覆盖率目标

- 代码覆盖率: >= 80%
- 分支覆盖率: >= 70%
- 权限矩阵覆盖率: 100%

## 过度设计检查清单

### 用户模型字段检查

| 字段 | 是否使用 | 建议 |
|------|---------|------|
| driver_type | ✓ | 保留 |
| is_verified | ✓ | 保留（计算属性） |
| updated_at | ✓ | 保留 |

### API接口检查

| 接口 | 是否必要 | 建议 |
|------|---------|------|
| PUT /users/{id}/driver-info | 可能冗余 | 考虑合并到 PUT /users/{id} |
| POST /users/{id}/license | ✓ | 保留（upsert语义） |
| PUT /users/{id}/license | 可能冗余 | 考虑只保留POST |

### 权限检查逻辑检查

1. `require_super_admin_for_high_roles` 函数名称过时（SUPER_ADMIN已移除）
2. 车队长权限检查逻辑较复杂，但必要

## 逻辑合理性检查清单

### 已确认的业务逻辑

1. **车队长创建司机**: ✅ 应该允许
   - 现状：车队长无法创建用户
   - 决定：允许车队长创建司机并自动分配到其管理的仓库
   - **需要修改代码实现**

2. **司机类型切换**: ✅ 不需要检查车辆状态
   - 现状：直接切换，无额外验证
   - 决定：保持现状，不需要检查车辆状态

3. **用户禁用**: ✅ 禁用后可登录但无法打卡录入数据
   - 现状：禁用后下次请求才会被拦截
   - 决定：禁用后用户可以登录查看，但无法进行打卡、计件等数据录入操作
   - **需要修改权限检查逻辑**

4. **仓库分配为空**: ✅ 允许无仓库分配
   - 现状：允许
   - 决定：保持现状，允许司机无仓库分配

5. **角色变更**: ✅ 保留历史数据
   - 现状：不清理
   - 决定：角色变更时保留历史数据（考勤、计件等业绩数据），避免数据丢失
   - 司机升级为车队长时，历史考勤和计件记录应保留
1