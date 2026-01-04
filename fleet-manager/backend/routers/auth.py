"""
认证路由模块
提供用户登录、获取当前用户信息、修改密码等认证相关 API

Requirements: 9.1 - 提取认证路由到独立模块
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from database import get_session
from models import User
from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    verify_password
)
import crud
from schemas import (
    LoginRequest,
    TokenResponse,
    PasswordChangeRequest,
    MessageResponse,
    UserResponse
)


# 创建认证路由器
router = APIRouter(
    prefix="/api/auth",
    tags=["认证"]
)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    session: Session = Depends(get_session)
):
    """
    用户登录
    验证用户名密码，返回 JWT Token
    
    支持多种登录方式：
    1. 直接使用用户名登录
    2. 使用手机号登录（自动尝试添加 @fleet.com 后缀）

    Args:
        request: 登录请求，包含用户名和密码
        session: 数据库会话

    Returns:
        TokenResponse: 包含 access_token 的响应

    Raises:
        HTTPException 401: 用户名或密码错误
    """
    # 首先尝试直接使用输入的用户名验证
    user = authenticate_user(session, request.username, request.password)
    
    # 如果直接验证失败，尝试添加 @fleet.com 后缀（支持手机号登录）
    if not user and '@' not in request.username:
        username_with_suffix = f"{request.username}@fleet.com"
        user = authenticate_user(session, username_with_suffix, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    # 创建访问令牌（sub 必须是字符串）
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    获取当前登录用户信息

    Args:
        current_user: 当前登录用户（通过 JWT Token 验证）

    Returns:
        UserResponse: 当前用户信息
    """
    return current_user


@router.put("/password", response_model=MessageResponse)
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    修改当前用户密码

    Args:
        request: 密码修改请求，包含旧密码和新密码
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 操作结果消息

    Raises:
        HTTPException 400: 旧密码错误
    """
    # 验证旧密码
    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="旧密码错误"
        )

    # 更新密码
    crud.change_user_password(session, current_user, request.new_password)

    return MessageResponse(message="密码修改成功")
