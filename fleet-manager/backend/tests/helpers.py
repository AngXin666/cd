"""
测试辅助函数模块
提供测试中常用的辅助函数

主要功能：
- Token 生成和验证
- 请求头构建
- 响应断言
- 数据比较
"""

from datetime import timedelta
from typing import Dict, Any, Optional, List
from fastapi.testclient import TestClient

# 导入认证模块
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth import create_access_token


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
