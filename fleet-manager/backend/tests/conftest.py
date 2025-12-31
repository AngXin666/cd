"""
pytest 配置文件
提供测试夹具（fixtures）和测试数据库配置

主要功能：
- 配置 SQLite 内存数据库用于测试
- 提供 TestClient 夹具
- 提供数据库会话夹具
- 覆盖 FastAPI 依赖注入
"""

import pytest
from typing import Generator, Dict
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool

# 导入应用和依赖
import sys
import os

# 添加父目录到路径，以便导入后端模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 设置测试环境变量（必须在导入 main 之前设置）
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
os.environ.setdefault("DEBUG", "true")

# 清除可能导致问题的环境变量
for key in list(os.environ.keys()):
    if key.startswith(("TARO_APP_", "VITE_", "SUPABASE_")):
        del os.environ[key]

from fastapi.testclient import TestClient
from main import app
from database import get_session
from models import (
    User, UserRole, Warehouse
)
from auth import hash_password, create_access_token


# ==================== 测试数据库配置 ====================

# 使用 SQLite 内存数据库进行测试
# 优点：速度快、隔离性好、无需清理
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(name="engine")
def engine_fixture():
    """
    创建测试数据库引擎
    使用 SQLite 内存数据库，每次测试都是全新的数据库

    Returns:
        Engine: SQLAlchemy 数据库引擎
    """
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False  # 设为 True 可查看 SQL 语句
    )
    # 创建所有表
    SQLModel.metadata.create_all(engine)
    yield engine
    # 测试结束后清理
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine) -> Generator[Session, None, None]:
    """
    创建测试数据库会话
    每个测试函数都会获得一个独立的会话

    Args:
        engine: 数据库引擎夹具

    Yields:
        Session: 数据库会话对象
    """
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator[TestClient, None, None]:
    """
    创建测试客户端
    覆盖 FastAPI 的数据库依赖，使用测试数据库

    Args:
        session: 测试数据库会话

    Yields:
        TestClient: FastAPI 测试客户端
    """
    def get_session_override():
        """覆盖数据库会话依赖"""
        return session

    # 覆盖依赖
    app.dependency_overrides[get_session] = get_session_override

    # 创建测试客户端
    with TestClient(app) as client:
        yield client

    # 清理依赖覆盖
    app.dependency_overrides.clear()


# ==================== 用户相关夹具 ====================

@pytest.fixture(name="test_password")
def test_password_fixture() -> str:
    """
    测试用密码

    Returns:
        str: 测试密码明文
    """
    return "test123456"


@pytest.fixture(name="test_password_hash")
def test_password_hash_fixture(test_password: str) -> str:
    """
    测试用密码哈希

    Args:
        test_password: 测试密码明文

    Returns:
        str: 密码哈希值
    """
    return hash_password(test_password)


@pytest.fixture(name="super_admin_user")
def super_admin_user_fixture(session: Session, test_password_hash: str) -> User:
    """
    创建老板用户（原超级管理员，现在老板是最高权限角色）
    保留 super_admin_user 名称以保持测试兼容性

    Args:
        session: 数据库会话
        test_password_hash: 密码哈希

    Returns:
        User: 老板用户对象（系统最高权限）

    Requirements: 3.1 - 删除超级管理员后，老板成为最高权限角色
    """
    user = User(
        username="superadmin",
        password_hash=test_password_hash,
        name="系统管理员",
        phone="13800000000",
        role=UserRole.BOSS,  # 改为 BOSS 角色
        is_active=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="boss_user")
def boss_user_fixture(session: Session, test_password_hash: str) -> User:
    """
    创建老板用户

    Args:
        session: 数据库会话
        test_password_hash: 密码哈希

    Returns:
        User: 老板用户对象
    """
    user = User(
        username="boss",
        password_hash=test_password_hash,
        name="老板",
        phone="13800000001",
        role=UserRole.BOSS,
        is_active=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="manager_user")
def manager_user_fixture(session: Session, test_password_hash: str) -> User:
    """
    创建车队长用户

    Args:
        session: 数据库会话
        test_password_hash: 密码哈希

    Returns:
        User: 车队长用户对象
    """
    user = User(
        username="manager",
        password_hash=test_password_hash,
        name="车队长",
        phone="13800000002",
        role=UserRole.MANAGER,
        is_active=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="driver_user")
def driver_user_fixture(session: Session, test_password_hash: str) -> User:
    """
    创建司机用户

    Args:
        session: 数据库会话
        test_password_hash: 密码哈希

    Returns:
        User: 司机用户对象
    """
    user = User(
        username="driver",
        password_hash=test_password_hash,
        name="司机",
        phone="13800000003",
        role=UserRole.DRIVER,
        is_active=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="peer_admin_user")
def peer_admin_user_fixture(session: Session, test_password_hash: str) -> User:
    """
    创建调度用户

    Args:
        session: 数据库会话
        test_password_hash: 密码哈希

    Returns:
        User: 调度用户对象
    """
    user = User(
        username="peer_admin",
        password_hash=test_password_hash,
        name="调度",
        phone="13800000004",
        role=UserRole.PEER_ADMIN,
        is_active=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="disabled_user")
def disabled_user_fixture(session: Session, test_password_hash: str) -> User:
    """
    创建禁用用户

    Args:
        session: 数据库会话
        test_password_hash: 密码哈希

    Returns:
        User: 禁用用户对象
    """
    user = User(
        username="disabled_user",
        password_hash=test_password_hash,
        name="禁用用户",
        phone="13800000005",
        role=UserRole.DRIVER,
        is_active=False
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


# ==================== Token 相关夹具 ====================

@pytest.fixture(name="super_admin_token")
def super_admin_token_fixture(super_admin_user: User) -> str:
    """
    创建老板 Token（原超级管理员 Token）
    保留 super_admin_token 名称以保持测试兼容性

    Args:
        super_admin_user: 老板用户（系统最高权限）

    Returns:
        str: JWT Token

    Requirements: 3.1 - 删除超级管理员后，老板成为最高权限角色
    """
    return create_access_token(data={"sub": str(super_admin_user.id)})


@pytest.fixture(name="boss_token")
def boss_token_fixture(boss_user: User) -> str:
    """
    创建老板 Token

    Args:
        boss_user: 老板用户

    Returns:
        str: JWT Token
    """
    return create_access_token(data={"sub": str(boss_user.id)})


@pytest.fixture(name="manager_token")
def manager_token_fixture(manager_user: User) -> str:
    """
    创建车队长 Token

    Args:
        manager_user: 车队长用户

    Returns:
        str: JWT Token
    """
    return create_access_token(data={"sub": str(manager_user.id)})


@pytest.fixture(name="driver_token")
def driver_token_fixture(driver_user: User) -> str:
    """
    创建司机 Token

    Args:
        driver_user: 司机用户

    Returns:
        str: JWT Token
    """
    return create_access_token(data={"sub": str(driver_user.id)})


@pytest.fixture(name="peer_admin_token")
def peer_admin_token_fixture(peer_admin_user: User) -> str:
    """
    创建调度 Token

    Args:
        peer_admin_user: 调度用户

    Returns:
        str: JWT Token
    """
    return create_access_token(data={"sub": str(peer_admin_user.id)})


# ==================== 仓库相关夹具 ====================

@pytest.fixture(name="test_warehouse")
def test_warehouse_fixture(session: Session) -> Warehouse:
    """
    创建测试仓库

    Args:
        session: 数据库会话

    Returns:
        Warehouse: 仓库对象
    """
    warehouse = Warehouse(
        name="测试仓库",
        address="测试地址",
        is_active=True
    )
    session.add(warehouse)
    session.commit()
    session.refresh(warehouse)
    return warehouse


@pytest.fixture(name="test_warehouse_2")
def test_warehouse_2_fixture(session: Session) -> Warehouse:
    """
    创建第二个测试仓库

    Args:
        session: 数据库会话

    Returns:
        Warehouse: 仓库对象
    """
    warehouse = Warehouse(
        name="测试仓库2",
        address="测试地址2",
        is_active=True
    )
    session.add(warehouse)
    session.commit()
    session.refresh(warehouse)
    return warehouse


# ==================== 辅助函数 ====================

def get_auth_headers(token: str) -> Dict[str, str]:
    """
    获取认证请求头

    Args:
        token: JWT Token

    Returns:
        Dict[str, str]: 包含 Authorization 头的字典
    """
    return {"Authorization": f"Bearer {token}"}
