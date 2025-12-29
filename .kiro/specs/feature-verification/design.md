# Design Document - 功能验证测试

## Introduction

本设计文档定义了车队管家系统功能验证测试的技术实现方案，包括测试架构、测试策略、测试用例设计和验证流程。

## Design Overview

### 测试架构

```
┌─────────────────────────────────────────────────────────────┐
│                    功能验证测试架构                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  API 测试   │  │  集成测试   │  │  E2E 测试   │         │
│  │  (pytest)   │  │  (pytest)   │  │ (Playwright)│         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         ▼                ▼                ▼                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   测试数据层                         │   │
│  │  - 测试数据库 (SQLite)                              │   │
│  │  - 测试夹具 (Fixtures)                              │   │
│  │  - Mock 数据生成器                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   验证报告层                         │   │
│  │  - 测试覆盖率报告                                    │   │
│  │  - 功能验证清单                                      │   │
│  │  - 数据同步验证报告                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 测试分层策略

| 层级 | 测试类型 | 覆盖范围 | 工具 |
|------|----------|----------|------|
| L1 | API 单元测试 | 单个 API 端点 | pytest + httpx |
| L2 | 集成测试 | 多 API 协作流程 | pytest + TestClient |
| L3 | E2E 测试 | 完整用户流程 | Playwright |
| L4 | SSE 测试 | 实时数据同步 | pytest + asyncio |

## Detailed Design

### 1. 测试基础设施设计

#### 1.1 测试配置文件

```python
# tests/conftest.py
"""
测试配置和夹具
提供测试数据库、测试客户端、测试用户等基础设施
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# 测试数据库配置
TEST_DATABASE_URL = "sqlite://"  # 内存数据库

@pytest.fixture(name="engine")
def engine_fixture():
    """创建测试数据库引擎"""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    return engine

@pytest.fixture(name="session")
def session_fixture(engine):
    """创建测试数据库会话"""
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session):
    """创建测试客户端"""
    # 覆盖依赖注入
    def get_session_override():
        return session
    
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
```

#### 1.2 测试数据工厂

```python
# tests/factories.py
"""
测试数据工厂
生成各种测试数据
"""

from faker import Faker
from models import User, Warehouse, Vehicle, UserRole

fake = Faker('zh_CN')

class UserFactory:
    """用户数据工厂"""
    
    @staticmethod
    def create_driver(session, **kwargs):
        """创建测试司机"""
        user = User(
            username=kwargs.get('username', fake.user_name()),
            name=kwargs.get('name', fake.name()),
            phone=kwargs.get('phone', fake.phone_number()),
            role=UserRole.DRIVER,
            hashed_password=get_password_hash('test123'),
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    
    @staticmethod
    def create_manager(session, **kwargs):
        """创建测试车队长"""
        # 类似实现...
        pass
    
    @staticmethod
    def create_boss(session, **kwargs):
        """创建测试老板"""
        # 类似实现...
        pass

class WarehouseFactory:
    """仓库数据工厂"""
    
    @staticmethod
    def create(session, **kwargs):
        """创建测试仓库"""
        warehouse = Warehouse(
            name=kwargs.get('name', f'测试仓库-{fake.city()}'),
            address=kwargs.get('address', fake.address()),
            is_active=True,
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        return warehouse

class VehicleFactory:
    """车辆数据工厂"""
    
    @staticmethod
    def create(session, user_id, **kwargs):
        """创建测试车辆"""
        # 实现...
        pass
```

### 2. 认证系统测试设计

#### 2.1 登录测试

```python
# tests/test_auth.py
"""
认证系统测试
验证登录、Token、权限等功能
"""

class TestAuthLogin:
    """登录功能测试"""
    
    def test_login_success(self, client, session):
        """测试正确凭据登录成功"""
        # 准备测试用户
        user = UserFactory.create_driver(session, username='testdriver', password='test123')
        
        # 执行登录
        response = client.post('/api/auth/login', json={
            'username': 'testdriver',
            'password': 'test123'
        })
        
        # 验证结果
        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
        assert data['token_type'] == 'bearer'
    
    def test_login_wrong_password(self, client, session):
        """测试错误密码登录失败"""
        user = UserFactory.create_driver(session, username='testdriver')
        
        response = client.post('/api/auth/login', json={
            'username': 'testdriver',
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 401
        assert response.json()['detail'] == 'Incorrect username or password'
    
    def test_login_nonexistent_user(self, client):
        """测试不存在用户登录失败"""
        response = client.post('/api/auth/login', json={
            'username': 'nonexistent',
            'password': 'test123'
        })
        
        assert response.status_code == 401
    
    def test_login_disabled_user(self, client, session):
        """测试禁用用户登录失败"""
        user = UserFactory.create_driver(session, is_active=False)
        
        response = client.post('/api/auth/login', json={
            'username': user.username,
            'password': 'test123'
        })
        
        assert response.status_code == 401

class TestAuthToken:
    """Token 验证测试"""
    
    def test_valid_token_access(self, client, session):
        """测试有效 Token 访问成功"""
        user = UserFactory.create_driver(session)
        token = create_access_token(data={'sub': user.username})
        
        response = client.get('/api/auth/me', headers={
            'Authorization': f'Bearer {token}'
        })
        
        assert response.status_code == 200
        assert response.json()['username'] == user.username
    
    def test_expired_token_access(self, client, session):
        """测试过期 Token 访问失败"""
        user = UserFactory.create_driver(session)
        # 创建已过期的 Token
        token = create_access_token(
            data={'sub': user.username},
            expires_delta=timedelta(seconds=-1)
        )
        
        response = client.get('/api/auth/me', headers={
            'Authorization': f'Bearer {token}'
        })
        
        assert response.status_code == 401
    
    def test_invalid_token_access(self, client):
        """测试无效 Token 访问失败"""
        response = client.get('/api/auth/me', headers={
            'Authorization': 'Bearer invalid_token'
        })
        
        assert response.status_code == 401
```

### 3. 用户管理测试设计

#### 3.1 用户 CRUD 测试

```python
# tests/test_users.py
"""
用户管理测试
验证用户 CRUD 操作
"""

class TestUserCreate:
    """用户创建测试"""
    
    def test_boss_create_driver(self, client, session, boss_token):
        """测试老板创建司机"""
        response = client.post('/api/users', 
            headers={'Authorization': f'Bearer {boss_token}'},
            json={
                'username': 'newdriver',
                'name': '新司机',
                'phone': '13800138000',
                'role': 'driver',
                'password': 'driver123'
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['username'] == 'newdriver'
        assert data['role'] == 'driver'
    
    def test_create_duplicate_username(self, client, session, boss_token):
        """测试创建重复用户名失败"""
        UserFactory.create_driver(session, username='existinguser')
        
        response = client.post('/api/users',
            headers={'Authorization': f'Bearer {boss_token}'},
            json={
                'username': 'existinguser',
                'name': '重复用户',
                'role': 'driver',
                'password': 'test123'
            }
        )
        
        assert response.status_code == 400
    
    def test_driver_cannot_create_user(self, client, session, driver_token):
        """测试司机无权创建用户"""
        response = client.post('/api/users',
            headers={'Authorization': f'Bearer {driver_token}'},
            json={
                'username': 'newuser',
                'name': '新用户',
                'role': 'driver',
                'password': 'test123'
            }
        )
        
        assert response.status_code == 403

class TestUserUpdate:
    """用户更新测试"""
    
    def test_update_user_info(self, client, session, boss_token):
        """测试更新用户信息"""
        user = UserFactory.create_driver(session)
        
        response = client.put(f'/api/users/{user.id}',
            headers={'Authorization': f'Bearer {boss_token}'},
            json={'name': '更新后的名字', 'phone': '13900139000'}
        )
        
        assert response.status_code == 200
        assert response.json()['name'] == '更新后的名字'
    
    def test_non_super_admin_cannot_update_boss(self, client, session, boss_token):
        """测试非超管无法更新老板账号"""
        another_boss = UserFactory.create_boss(session)
        
        response = client.put(f'/api/users/{another_boss.id}',
            headers={'Authorization': f'Bearer {boss_token}'},
            json={'name': '尝试更新'}
        )
        
        assert response.status_code == 403
```

### 4. SSE 实时数据同步测试设计

#### 4.1 SSE 事件测试

```python
# tests/test_sse.py
"""
SSE 实时数据同步测试
验证事件推送和接收
"""

import asyncio
from httpx import AsyncClient

class TestSSEVehicleUpdate:
    """车辆更新 SSE 测试"""
    
    @pytest.mark.asyncio
    async def test_vehicle_review_triggers_sse(self, async_client, session):
        """测试车辆审核触发 SSE 事件"""
        # 准备数据
        driver = UserFactory.create_driver(session)
        vehicle = VehicleFactory.create(session, user_id=driver.id, status='reviewing')
        boss = UserFactory.create_boss(session)
        
        # 启动 SSE 监听
        events_received = []
        
        async def listen_sse():
            async with async_client.stream(
                'GET', 
                '/api/notifications/stream',
                headers={'Authorization': f'Bearer {driver_token}'}
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith('data:'):
                        events_received.append(json.loads(line[5:]))
                        if len(events_received) >= 1:
                            break
        
        # 并行执行：监听 SSE + 审核车辆
        listener_task = asyncio.create_task(listen_sse())
        await asyncio.sleep(0.1)  # 等待连接建立
        
        # 执行审核
        response = await async_client.put(
            f'/api/vehicles/{vehicle.id}/review',
            headers={'Authorization': f'Bearer {boss_token}'},
            json={'status': 'active', 'review_note': '审核通过'}
        )
        
        await asyncio.wait_for(listener_task, timeout=5.0)
        
        # 验证
        assert len(events_received) == 1
        assert events_received[0]['type'] == 'vehicle_update'
        assert events_received[0]['data']['vehicle_id'] == vehicle.id

class TestSSELeaveUpdate:
    """请假更新 SSE 测试"""
    
    @pytest.mark.asyncio
    async def test_leave_approval_triggers_sse(self, async_client, session):
        """测试请假审批触发 SSE 事件"""
        # 类似实现...
        pass
```

### 5. 数据完整性测试设计

#### 5.1 约束测试

```python
# tests/test_data_integrity.py
"""
数据完整性测试
验证数据库约束和关联
"""

class TestForeignKeyConstraints:
    """外键约束测试"""
    
    def test_delete_warehouse_with_users(self, client, session, boss_token):
        """测试删除有用户的仓库"""
        warehouse = WarehouseFactory.create(session)
        user = UserFactory.create_driver(session)
        # 分配用户到仓库
        assign_user_to_warehouse(session, user.id, warehouse.id)
        
        response = client.delete(
            f'/api/warehouses/{warehouse.id}',
            headers={'Authorization': f'Bearer {boss_token}'}
        )
        
        # 应该返回约束错误或级联删除
        assert response.status_code in [400, 200]
    
    def test_create_record_with_invalid_foreign_key(self, client, session, driver_token):
        """测试创建引用不存在记录的数据"""
        response = client.post('/api/piece-work/records',
            headers={'Authorization': f'Bearer {driver_token}'},
            json={
                'category_id': 99999,  # 不存在的分类
                'warehouse_id': 1,
                'quantity': 10
            }
        )
        
        assert response.status_code == 400

class TestUniqueConstraints:
    """唯一约束测试"""
    
    def test_duplicate_username(self, client, session, boss_token):
        """测试重复用户名"""
        UserFactory.create_driver(session, username='duplicate')
        
        response = client.post('/api/users',
            headers={'Authorization': f'Bearer {boss_token}'},
            json={
                'username': 'duplicate',
                'name': '重复用户',
                'role': 'driver',
                'password': 'test123'
            }
        )
        
        assert response.status_code == 400
```

### 6. 权限系统测试设计

#### 6.1 角色权限测试

```python
# tests/test_permissions.py
"""
权限系统测试
验证各角色的访问控制
"""

class TestDriverPermissions:
    """司机权限测试"""
    
    def test_driver_cannot_access_admin_api(self, client, driver_token):
        """测试司机无法访问管理 API"""
        admin_endpoints = [
            ('GET', '/api/users'),
            ('POST', '/api/users'),
            ('GET', '/api/warehouses'),
            ('POST', '/api/warehouses'),
        ]
        
        for method, endpoint in admin_endpoints:
            if method == 'GET':
                response = client.get(endpoint, headers={'Authorization': f'Bearer {driver_token}'})
            else:
                response = client.post(endpoint, headers={'Authorization': f'Bearer {driver_token}'}, json={})
            
            assert response.status_code == 403, f'{method} {endpoint} should return 403'
    
    def test_driver_can_access_own_data(self, client, session, driver_token, driver_user):
        """测试司机可以访问自己的数据"""
        # 创建司机的车辆
        vehicle = VehicleFactory.create(session, user_id=driver_user.id)
        
        response = client.get(
            f'/api/vehicles/{vehicle.id}',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        
        assert response.status_code == 200
    
    def test_driver_cannot_access_others_vehicle(self, client, session, driver_token):
        """测试司机无法访问他人车辆"""
        other_driver = UserFactory.create_driver(session)
        vehicle = VehicleFactory.create(session, user_id=other_driver.id)
        
        response = client.get(
            f'/api/vehicles/{vehicle.id}',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        
        assert response.status_code == 403

class TestManagerPermissions:
    """车队长权限测试"""
    
    def test_manager_can_access_assigned_warehouse(self, client, session, manager_token, manager_user):
        """测试车队长可以访问分配的仓库"""
        warehouse = WarehouseFactory.create(session)
        assign_user_to_warehouse(session, manager_user.id, warehouse.id)
        
        response = client.get(
            f'/api/warehouses/{warehouse.id}/users',
            headers={'Authorization': f'Bearer {manager_token}'}
        )
        
        assert response.status_code == 200
    
    def test_manager_cannot_access_unassigned_warehouse(self, client, session, manager_token):
        """测试车队长无法访问未分配的仓库"""
        warehouse = WarehouseFactory.create(session)
        # 不分配给车队长
        
        response = client.get(
            f'/api/warehouses/{warehouse.id}/users',
            headers={'Authorization': f'Bearer {manager_token}'}
        )
        
        assert response.status_code == 403
```

### 7. 业务流程集成测试设计

#### 7.1 考勤打卡流程

```python
# tests/test_attendance_flow.py
"""
考勤打卡流程测试
验证完整的打卡流程
"""

class TestAttendanceFlow:
    """考勤流程测试"""
    
    def test_complete_attendance_flow(self, client, session, driver_token):
        """测试完整的打卡流程"""
        # 1. 上班打卡
        response = client.post('/api/attendance/clock-in',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        assert response.status_code == 200
        clock_in_time = response.json()['clock_in']
        
        # 2. 查询今日状态
        response = client.get('/api/attendance/today',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        assert response.status_code == 200
        assert response.json()['clock_in'] == clock_in_time
        assert response.json()['clock_out'] is None
        
        # 3. 下班打卡
        response = client.post('/api/attendance/clock-out',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        assert response.status_code == 200
        assert response.json()['clock_out'] is not None
        
        # 4. 验证工时计算
        assert response.json()['work_hours'] is not None
    
    def test_clock_out_without_clock_in(self, client, driver_token):
        """测试未上班打卡就下班打卡"""
        response = client.post('/api/attendance/clock-out',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        
        assert response.status_code == 400
```

#### 7.2 车辆审核流程

```python
# tests/test_vehicle_flow.py
"""
车辆审核流程测试
验证完整的车辆管理流程
"""

class TestVehicleReviewFlow:
    """车辆审核流程测试"""
    
    def test_complete_vehicle_flow(self, client, session, driver_token, boss_token):
        """测试完整的车辆审核流程"""
        # 1. 司机添加车辆
        response = client.post('/api/vehicles',
            headers={'Authorization': f'Bearer {driver_token}'},
            json={
                'license_plate': '京A12345',
                'brand': '比亚迪',
                'model': '秦Plus',
                'photos': ['photo1.jpg', 'photo2.jpg']
            }
        )
        assert response.status_code == 200
        vehicle_id = response.json()['id']
        assert response.json()['status'] == 'reviewing'
        
        # 2. 老板审核通过
        response = client.put(f'/api/vehicles/{vehicle_id}/review',
            headers={'Authorization': f'Bearer {boss_token}'},
            json={'status': 'active', 'review_note': '审核通过'}
        )
        assert response.status_code == 200
        assert response.json()['status'] == 'active'
        
        # 3. 司机查看车辆状态
        response = client.get(f'/api/vehicles/{vehicle_id}',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        assert response.status_code == 200
        assert response.json()['status'] == 'active'
```

## Test Coverage Goals

| 模块 | 目标覆盖率 | 测试类型 |
|------|------------|----------|
| 认证系统 | 90% | API + 集成 |
| 用户管理 | 85% | API + 集成 |
| 仓库管理 | 85% | API + 集成 |
| 考勤打卡 | 90% | API + 集成 |
| 计件功能 | 85% | API + 集成 |
| 请假审批 | 85% | API + 集成 |
| 车辆管理 | 85% | API + 集成 |
| 通知系统 | 80% | API + SSE |
| SSE 同步 | 80% | SSE + 集成 |
| 权限系统 | 90% | API |
| 数据完整性 | 85% | 集成 |

## Implementation Notes

### 测试执行顺序

1. **基础设施测试**：数据库连接、配置加载
2. **认证测试**：登录、Token 验证
3. **权限测试**：各角色权限验证
4. **CRUD 测试**：各模块的增删改查
5. **业务流程测试**：完整业务流程
6. **SSE 测试**：实时数据同步
7. **数据完整性测试**：约束和关联

### 测试数据管理

- 每个测试用例使用独立的测试数据
- 测试完成后自动清理数据
- 使用工厂模式生成测试数据
- 避免测试用例之间的数据依赖

### 测试报告

- 使用 pytest-html 生成 HTML 报告
- 使用 pytest-cov 生成覆盖率报告
- 记录每个测试用例的执行时间
- 标记失败测试的详细错误信息
