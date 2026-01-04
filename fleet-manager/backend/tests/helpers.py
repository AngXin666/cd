"""
测试辅助函数模块
提供测试中常用的辅助函数

主要功能：
- Token 生成和验证
- 请求头构建
- 响应断言
- 数据比较
- 测试数据工厂函数
- 通知断言工具
"""

from datetime import timedelta
from typing import Dict, Any, Optional, List
from fastapi.testclient import TestClient
from sqlmodel import Session, select

# 导入认证模块
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth import create_access_token, hash_password
from models import (
    User, UserRole, Warehouse, WarehouseAssignment,
    Vehicle, VehicleStatus, Notification
)


# ==================== Token 辅助函数 ====================

def create_test_token(
    user_id: int,
    expires_minutes: Optional[int] = None
) -> str:
    """
    创建测试用 JWT Token

    Args:
        user_id: 用户ID
        expires_minutes: 过期时间（分钟），默认使用配置值

    Returns:
        str: JWT Token
    """
    data = {"sub": str(user_id)}

    if expires_minutes is not None:
        expires_delta = timedelta(minutes=expires_minutes)
        return create_access_token(data=data, expires_delta=expires_delta)

    return create_access_token(data=data)


def create_expired_token(user_id: int) -> str:
    """
    创建已过期的 Token

    Args:
        user_id: 用户ID

    Returns:
        str: 已过期的 JWT Token
    """
    # 创建一个负数过期时间的 Token
    return create_test_token(user_id, expires_minutes=-1)


def create_invalid_token() -> str:
    """
    创建无效的 Token

    Returns:
        str: 无效的 Token 字符串
    """
    return "invalid.token.string"


# ==================== 请求头辅助函数 ====================

def get_auth_headers(token: str) -> Dict[str, str]:
    """
    获取认证请求头

    Args:
        token: JWT Token

    Returns:
        Dict[str, str]: 包含 Authorization 头的字典
    """
    return {"Authorization": f"Bearer {token}"}


def get_json_headers() -> Dict[str, str]:
    """
    获取 JSON 请求头

    Returns:
        Dict[str, str]: 包含 Content-Type 头的字典
    """
    return {"Content-Type": "application/json"}


def get_auth_json_headers(token: str) -> Dict[str, str]:
    """
    获取认证和 JSON 请求头

    Args:
        token: JWT Token

    Returns:
        Dict[str, str]: 包含 Authorization 和 Content-Type 头的字典
    """
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


# ==================== 响应断言辅助函数 ====================

def assert_success_response(response, expected_status = 200) -> Dict[str, Any]:
    """
    断言成功响应

    Args:
        response: HTTP 响应对象
        expected_status: 期望的状态码，可以是单个整数或整数列表，默认 200

    Returns:
        Dict[str, Any]: 响应 JSON 数据

    Raises:
        AssertionError: 状态码不匹配时
    """
    # 支持单个状态码或状态码列表
    if isinstance(expected_status, list):
        assert response.status_code in expected_status, \
            f"期望状态码 {expected_status} 之一，实际 {response.status_code}，响应: {response.text}"
    else:
        assert response.status_code == expected_status, \
            f"期望状态码 {expected_status}，实际 {response.status_code}，响应: {response.text}"
    return response.json()


def assert_error_response(
    response,
    expected_status: int,
    expected_detail: Optional[str] = None
) -> Dict[str, Any]:
    """
    断言错误响应

    Args:
        response: HTTP 响应对象
        expected_status: 期望的状态码
        expected_detail: 期望的错误详情（可选）

    Returns:
        Dict[str, Any]: 响应 JSON 数据

    Raises:
        AssertionError: 状态码或错误详情不匹配时
    """
    assert response.status_code == expected_status, \
        f"期望状态码 {expected_status}，实际 {response.status_code}，响应: {response.text}"

    data = response.json()

    if expected_detail:
        assert "detail" in data, f"响应中缺少 detail 字段: {data}"
        # detail 可能是字符串或字典
        if isinstance(data["detail"], str):
            assert expected_detail in data["detail"], \
                f"期望错误详情包含 '{expected_detail}'，实际: {data['detail']}"
        elif isinstance(data["detail"], dict):
            assert expected_detail in str(data["detail"]), \
                f"期望错误详情包含 '{expected_detail}'，实际: {data['detail']}"

    return data


def assert_unauthorized(response) -> Dict[str, Any]:
    """
    断言未授权响应（401）

    Args:
        response: HTTP 响应对象

    Returns:
        Dict[str, Any]: 响应 JSON 数据
    """
    return assert_error_response(response, 401)


def assert_forbidden(response) -> Dict[str, Any]:
    """
    断言禁止访问响应（403）

    Args:
        response: HTTP 响应对象

    Returns:
        Dict[str, Any]: 响应 JSON 数据
    """
    return assert_error_response(response, 403)


def assert_not_found(response) -> Dict[str, Any]:
    """
    断言资源不存在响应（404）

    Args:
        response: HTTP 响应对象

    Returns:
        Dict[str, Any]: 响应 JSON 数据
    """
    return assert_error_response(response, 404)


def assert_validation_error(response) -> Dict[str, Any]:
    """
    断言验证错误响应（422）

    Args:
        response: HTTP 响应对象

    Returns:
        Dict[str, Any]: 响应 JSON 数据
    """
    return assert_error_response(response, 422)


# ==================== 数据比较辅助函数 ====================

def assert_user_data(
    data: Dict[str, Any],
    expected_username: Optional[str] = None,
    expected_name: Optional[str] = None,
    expected_role: Optional[str] = None,
    expected_is_active: Optional[bool] = None
) -> None:
    """
    断言用户数据

    Args:
        data: 用户数据字典
        expected_username: 期望的用户名
        expected_name: 期望的姓名
        expected_role: 期望的角色
        expected_is_active: 期望的启用状态
    """
    if expected_username is not None:
        assert data.get("username") == expected_username, \
            f"期望用户名 '{expected_username}'，实际 '{data.get('username')}'"

    if expected_name is not None:
        assert data.get("name") == expected_name, \
            f"期望姓名 '{expected_name}'，实际 '{data.get('name')}'"

    if expected_role is not None:
        assert data.get("role") == expected_role, \
            f"期望角色 '{expected_role}'，实际 '{data.get('role')}'"

    if expected_is_active is not None:
        assert data.get("is_active") == expected_is_active, \
            f"期望启用状态 {expected_is_active}，实际 {data.get('is_active')}"


def assert_list_response(
    data: List[Dict[str, Any]],
    min_count: Optional[int] = None,
    max_count: Optional[int] = None,
    exact_count: Optional[int] = None
) -> None:
    """
    断言列表响应

    Args:
        data: 列表数据
        min_count: 最小数量
        max_count: 最大数量
        exact_count: 精确数量
    """
    if exact_count is not None:
        assert len(data) == exact_count, \
            f"期望列表长度 {exact_count}，实际 {len(data)}"
    else:
        if min_count is not None:
            assert len(data) >= min_count, \
                f"期望列表长度至少 {min_count}，实际 {len(data)}"
        if max_count is not None:
            assert len(data) <= max_count, \
                f"期望列表长度最多 {max_count}，实际 {len(data)}"


# ==================== API 测试辅助函数 ====================

def login_user(
    client: TestClient,
    username: str,
    password: str
) -> Optional[str]:
    """
    登录用户并返回 Token

    Args:
        client: 测试客户端
        username: 用户名
        password: 密码

    Returns:
        str: JWT Token，登录失败返回 None
    """
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password}
    )

    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")

    return None


def get_current_user(
    client: TestClient,
    token: str
) -> Optional[Dict[str, Any]]:
    """
    获取当前用户信息

    Args:
        client: 测试客户端
        token: JWT Token

    Returns:
        Dict[str, Any]: 用户信息，失败返回 None
    """
    response = client.get(
        "/api/auth/me",
        headers=get_auth_headers(token)
    )

    if response.status_code == 200:
        return response.json()

    return None


# ==================== 权限测试辅助函数 ====================

def test_endpoint_requires_auth(
    client: TestClient,
    method: str,
    url: str,
    json_data: Optional[Dict[str, Any]] = None
) -> bool:
    """
    测试端点是否需要认证

    Args:
        client: 测试客户端
        method: HTTP 方法（GET, POST, PUT, DELETE）
        url: 端点 URL
        json_data: 请求数据（可选）

    Returns:
        bool: 是否需要认证（返回 401 表示需要）
    """
    method = method.upper()

    if method == "GET":
        response = client.get(url)
    elif method == "POST":
        response = client.post(url, json=json_data or {})
    elif method == "PUT":
        response = client.put(url, json=json_data or {})
    elif method == "DELETE":
        response = client.delete(url)
    else:
        raise ValueError(f"不支持的 HTTP 方法: {method}")

    return response.status_code == 401 or response.status_code == 403


def test_endpoint_requires_role(
    client: TestClient,
    method: str,
    url: str,
    token: str,
    json_data: Optional[Dict[str, Any]] = None
) -> bool:
    """
    测试端点是否需要特定角色

    Args:
        client: 测试客户端
        method: HTTP 方法
        url: 端点 URL
        token: JWT Token
        json_data: 请求数据（可选）

    Returns:
        bool: 是否被拒绝访问（返回 403 表示权限不足）
    """
    method = method.upper()
    headers = get_auth_headers(token)

    if method == "GET":
        response = client.get(url, headers=headers)
    elif method == "POST":
        response = client.post(url, json=json_data or {}, headers=headers)
    elif method == "PUT":
        response = client.put(url, json=json_data or {}, headers=headers)
    elif method == "DELETE":
        response = client.delete(url, headers=headers)
    else:
        raise ValueError(f"不支持的 HTTP 方法: {method}")

    return response.status_code == 403



# ==================== 测试数据工厂函数 ====================

def random_string(length: int = 8) -> str:
    """
    生成随机字符串

    Args:
        length: 字符串长度

    Returns:
        str: 随机字符串
    """
    import random
    import string
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def random_phone() -> str:
    """
    生成随机手机号

    Returns:
        str: 随机手机号（138开头）
    """
    import random
    return f"138{random.randint(10000000, 99999999)}"


def random_license_plate() -> str:
    """
    生成随机车牌号

    Returns:
        str: 随机车牌号（如：川A12345）
    """
    import random
    import string
    provinces = ['川', '京', '沪', '粤', '浙', '苏', '鲁', '豫']
    letters = string.ascii_uppercase
    province = random.choice(provinces)
    letter = random.choice(letters)
    numbers = ''.join(random.choices(string.digits, k=5))
    return f"{province}{letter}{numbers}"


def create_test_user(
    session: Session,
    role: str = "driver",
    username: Optional[str] = None,
    name: Optional[str] = None,
    phone: Optional[str] = None,
    password: str = "test123456",
    is_active: bool = True
) -> User:
    """
    创建测试用户

    Args:
        session: 数据库会话
        role: 用户角色 (driver/manager/peer_admin/boss)
        username: 用户名，默认随机生成
        name: 姓名，默认随机生成
        phone: 手机号，默认随机生成
        password: 密码，默认 test123456
        is_active: 是否启用，默认 True

    Returns:
        User: 创建的用户对象
    """
    # 角色映射
    role_map = {
        "driver": UserRole.DRIVER.value,
        "manager": UserRole.MANAGER.value,
        "peer_admin": UserRole.PEER_ADMIN.value,
        "dispatcher": UserRole.PEER_ADMIN.value,  # 别名
        "boss": UserRole.BOSS.value
    }
    
    role_value = role_map.get(role.lower(), UserRole.DRIVER.value)
    
    user = User(
        username=username or f"user_{random_string()}",
        password_hash=hash_password(password),
        name=name or f"测试用户_{random_string(4)}",
        phone=phone or random_phone(),
        role=role_value,
        is_active=is_active
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def create_test_warehouse(
    session: Session,
    name: Optional[str] = None,
    address: Optional[str] = None,
    is_active: bool = True
) -> Warehouse:
    """
    创建测试仓库

    Args:
        session: 数据库会话
        name: 仓库名称，默认随机生成
        address: 仓库地址，默认随机生成
        is_active: 是否启用，默认 True

    Returns:
        Warehouse: 创建的仓库对象
    """
    warehouse = Warehouse(
        name=name or f"仓库_{random_string(4)}",
        address=address or f"测试地址_{random_string(6)}",
        is_active=is_active
    )
    session.add(warehouse)
    session.commit()
    session.refresh(warehouse)
    return warehouse


def assign_user_to_warehouse(
    session: Session,
    user: User,
    warehouse: Warehouse
) -> WarehouseAssignment:
    """
    将用户分配到仓库

    Args:
        session: 数据库会话
        user: 用户对象
        warehouse: 仓库对象

    Returns:
        WarehouseAssignment: 分配记录
    """
    # 检查是否已存在分配
    existing = session.exec(
        select(WarehouseAssignment).where(
            WarehouseAssignment.user_id == user.id,
            WarehouseAssignment.warehouse_id == warehouse.id
        )
    ).first()
    
    if existing:
        return existing
    
    assignment = WarehouseAssignment(
        user_id=user.id,
        warehouse_id=warehouse.id
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment


def create_test_vehicle(
    session: Session,
    user: User,
    warehouse: Optional[Warehouse] = None,
    license_plate: Optional[str] = None,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    color: Optional[str] = None,
    status: str = "reviewing",
    ownership_type: str = "company"
) -> Vehicle:
    """
    创建测试车辆

    Args:
        session: 数据库会话
        user: 车主用户
        warehouse: 所属仓库（可选）
        license_plate: 车牌号，默认随机生成
        brand: 品牌，默认随机
        model: 型号，默认随机
        color: 颜色，默认随机
        status: 状态，默认 reviewing
        ownership_type: 所有权类型，默认 company

    Returns:
        Vehicle: 创建的车辆对象
    """
    import random
    
    # 状态映射
    status_map = {
        "active": VehicleStatus.ACTIVE.value,
        "returned": VehicleStatus.RETURNED.value,
        "reviewing": VehicleStatus.REVIEWING.value,
        "rejected": VehicleStatus.REJECTED.value
    }
    
    brands = ['丰田', '本田', '大众', '比亚迪', '特斯拉']
    colors = ['白色', '黑色', '银色', '红色', '蓝色']
    
    vehicle = Vehicle(
        user_id=user.id,
        warehouse_id=warehouse.id if warehouse else None,
        license_plate=license_plate or random_license_plate(),
        brand=brand or random.choice(brands),
        model=model or f"型号_{random_string(3)}",
        color=color or random.choice(colors),
        status=status_map.get(status.lower(), VehicleStatus.REVIEWING.value),
        ownership_type=ownership_type
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


# ==================== 通知断言工具 ====================

def assert_notification_exists(
    session: Session,
    user_id: int,
    title: Optional[str] = None,
    ref_type: Optional[str] = None,
    ref_id: Optional[int] = None,
    status: Optional[str] = None
) -> Notification:
    """
    断言通知存在

    Args:
        session: 数据库会话
        user_id: 用户ID
        title: 通知标题（可选，部分匹配）
        ref_type: 关联类型（可选）
        ref_id: 关联ID（可选）
        status: 状态（可选）

    Returns:
        Notification: 找到的通知对象

    Raises:
        AssertionError: 通知不存在时
    """
    stmt = select(Notification).where(Notification.user_id == user_id)
    
    if ref_type is not None:
        stmt = stmt.where(Notification.ref_type == ref_type)
    if ref_id is not None:
        stmt = stmt.where(Notification.ref_id == ref_id)
    if status is not None:
        stmt = stmt.where(Notification.status == status)
    
    notifications = list(session.exec(stmt).all())
    
    if title is not None:
        notifications = [n for n in notifications if title in n.title]
    
    assert len(notifications) > 0, \
        f"未找到符合条件的通知: user_id={user_id}, title={title}, ref_type={ref_type}, ref_id={ref_id}, status={status}"
    
    return notifications[0]


def assert_notification_status(
    session: Session,
    notification_id: int,
    expected_status: str
) -> Notification:
    """
    断言通知状态

    Args:
        session: 数据库会话
        notification_id: 通知ID
        expected_status: 期望的状态

    Returns:
        Notification: 通知对象

    Raises:
        AssertionError: 通知不存在或状态不匹配时
    """
    notification = session.get(Notification, notification_id)
    
    assert notification is not None, f"通知不存在: id={notification_id}"
    assert notification.status == expected_status, \
        f"通知状态不匹配: 期望 '{expected_status}'，实际 '{notification.status}'"
    
    return notification


def get_notifications_by_ref(
    session: Session,
    ref_type: str,
    ref_id: int,
    status: Optional[str] = None
) -> List[Notification]:
    """
    按 ref_type/ref_id 查询通知

    Args:
        session: 数据库会话
        ref_type: 关联类型
        ref_id: 关联ID
        status: 状态过滤（可选）

    Returns:
        List[Notification]: 通知列表
    """
    stmt = select(Notification).where(
        Notification.ref_type == ref_type,
        Notification.ref_id == ref_id
    )
    
    if status is not None:
        stmt = stmt.where(Notification.status == status)
    
    return list(session.exec(stmt).all())


def assert_notifications_sent_to_users(
    session: Session,
    user_ids: List[int],
    title: Optional[str] = None,
    ref_type: Optional[str] = None,
    ref_id: Optional[int] = None
) -> List[Notification]:
    """
    断言通知已发送给指定用户列表

    Args:
        session: 数据库会话
        user_ids: 用户ID列表
        title: 通知标题（可选，部分匹配）
        ref_type: 关联类型（可选）
        ref_id: 关联ID（可选）

    Returns:
        List[Notification]: 找到的通知列表

    Raises:
        AssertionError: 有用户未收到通知时
    """
    notifications = []
    missing_users = []
    
    for user_id in user_ids:
        try:
            n = assert_notification_exists(
                session, user_id, title, ref_type, ref_id
            )
            notifications.append(n)
        except AssertionError:
            missing_users.append(user_id)
    
    assert len(missing_users) == 0, \
        f"以下用户未收到通知: {missing_users}"
    
    return notifications


def assert_all_notifications_status_updated(
    session: Session,
    ref_type: str,
    ref_id: int,
    expected_status: str
) -> List[Notification]:
    """
    断言所有相关通知的状态已更新

    Args:
        session: 数据库会话
        ref_type: 关联类型
        ref_id: 关联ID
        expected_status: 期望的状态

    Returns:
        List[Notification]: 通知列表

    Raises:
        AssertionError: 有通知状态未更新时
    """
    notifications = get_notifications_by_ref(session, ref_type, ref_id)
    
    assert len(notifications) > 0, \
        f"未找到相关通知: ref_type={ref_type}, ref_id={ref_id}"
    
    wrong_status = [n for n in notifications if n.status != expected_status]
    
    assert len(wrong_status) == 0, \
        f"以下通知状态未更新为 '{expected_status}': {[n.id for n in wrong_status]}"
    
    return notifications


def get_unread_notifications_count(session: Session, user_id: int) -> int:
    """
    获取用户未读通知数量

    Args:
        session: 数据库会话
        user_id: 用户ID

    Returns:
        int: 未读通知数量
    """
    from sqlmodel import func
    
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user_id,
        Notification.is_read == False
    )
    return session.exec(stmt).first() or 0
