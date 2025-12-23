"""
认证模块
实现 JWT Token 认证、密码哈希、权限检查
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from config import get_settings
from database import get_session
from models import User, UserRole

# 获取配置
settings = get_settings()

# 密码哈希上下文
# 使用 bcrypt 算法进行密码哈希
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer 认证方案
security = HTTPBearer()


def hash_password(password: str) -> str:
    """
    对密码进行哈希处理
    
    Args:
        password: 明文密码
        
    Returns:
        str: 哈希后的密码
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码是否正确
    
    Args:
        plain_password: 明文密码
        hashed_password: 哈希后的密码
        
    Returns:
        bool: 密码是否匹配
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建 JWT 访问令牌
    
    Args:
        data: 要编码到令牌中的数据
        expires_delta: 过期时间增量，默认使用配置中的值
        
    Returns:
        str: JWT 令牌字符串
    """
    to_encode = data.copy()
    
    # 设置过期时间
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    
    # 编码生成 JWT
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """
    解码 JWT 令牌
    
    Args:
        token: JWT 令牌字符串
        
    Returns:
        dict: 解码后的数据，如果无效则返回 None
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """
    获取当前登录用户
    从 JWT 令牌中解析用户信息
    
    Args:
        credentials: HTTP Bearer 认证凭据
        session: 数据库会话
        
    Returns:
        User: 当前登录的用户对象
        
    Raises:
        HTTPException: 认证失败时抛出 401 错误
    """
    # 定义认证异常
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 解码令牌
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise credentials_exception
    
    # 获取用户ID（sub 是字符串，需要转换为整数）
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception
    
    # 查询用户
    user = session.get(User, user_id)
    if user is None:
        raise credentials_exception
    
    # 检查用户是否启用
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用"
        )
    
    return user


def require_roles(allowed_roles: List[UserRole]):
    """
    角色权限检查装饰器工厂
    用于限制只有特定角色的用户才能访问
    
    Args:
        allowed_roles: 允许访问的角色列表
        
    Returns:
        依赖函数，用于 FastAPI 路由
        
    Example:
        @app.get("/admin")
        async def admin_only(user: User = Depends(require_roles([UserRole.BOSS]))):
            return {"message": "只有老板能看到"}
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        """
        检查当前用户是否具有所需角色
        
        Args:
            current_user: 当前登录用户
            
        Returns:
            User: 通过检查的用户对象
            
        Raises:
            HTTPException: 权限不足时抛出 403 错误
        """
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足，无法执行此操作"
            )
        return current_user
    
    return role_checker


# 预定义的角色检查依赖
# 只有超级管理员可以访问
require_super_admin = require_roles([UserRole.SUPER_ADMIN])

# 只有老板可以访问
require_boss = require_roles([UserRole.BOSS])

# 超级管理员和老板可以访问
require_boss_or_super = require_roles([UserRole.BOSS, UserRole.SUPER_ADMIN])

# 老板、调度和超级管理员可以访问（管理员级别）
require_admin = require_roles([UserRole.PEER_ADMIN, UserRole.BOSS, UserRole.SUPER_ADMIN])

# 老板和车队长可以访问
require_manager_or_boss = require_roles([UserRole.MANAGER, UserRole.BOSS])

# 车队长、调度、老板和超级管理员可以访问（管理权限）
require_management = require_roles([UserRole.MANAGER, UserRole.PEER_ADMIN, UserRole.BOSS, UserRole.SUPER_ADMIN])

# 所有角色都可以访问（但必须登录）
require_any_role = require_roles([UserRole.DRIVER, UserRole.MANAGER, UserRole.PEER_ADMIN, UserRole.BOSS, UserRole.SUPER_ADMIN])


def authenticate_user(session: Session, username: str, password: str) -> Optional[User]:
    """
    验证用户登录
    
    Args:
        session: 数据库会话
        username: 用户名
        password: 密码
        
    Returns:
        User: 验证成功返回用户对象，失败返回 None
    """
    # 查询用户
    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()
    
    # 用户不存在
    if not user:
        return None
    
    # 密码不正确
    if not verify_password(password, user.password_hash):
        return None
    
    # 用户被禁用
    if not user.is_active:
        return None
    
    return user


# ==================== 角色辅助函数 ====================

def get_role_display_name(role: UserRole) -> str:
    """
    获取角色的中文显示名称
    
    Args:
        role: 用户角色枚举
        
    Returns:
        str: 角色的中文名称
    """
    role_names = {
        UserRole.DRIVER: "司机",
        UserRole.MANAGER: "车队长",
        UserRole.PEER_ADMIN: "调度",
        UserRole.BOSS: "老板",
        UserRole.SUPER_ADMIN: "超级管理员"
    }
    return role_names.get(role, "未知角色")


def get_creatable_roles(current_role: UserRole) -> List[UserRole]:
    """
    获取当前角色可以创建的角色列表
    
    权限规则：
    - SUPER_ADMIN: 可以创建所有角色
    - BOSS: 可以创建 PEER_ADMIN, MANAGER, DRIVER
    - PEER_ADMIN: 可以创建 MANAGER, DRIVER
    - MANAGER: 可以创建 DRIVER
    - DRIVER: 无法创建任何角色
    
    Args:
        current_role: 当前用户角色
        
    Returns:
        List[UserRole]: 可创建的角色列表
    """
    if current_role == UserRole.SUPER_ADMIN:
        return [UserRole.BOSS, UserRole.PEER_ADMIN, UserRole.MANAGER, UserRole.DRIVER]
    elif current_role == UserRole.BOSS:
        return [UserRole.PEER_ADMIN, UserRole.MANAGER, UserRole.DRIVER]
    elif current_role == UserRole.PEER_ADMIN:
        return [UserRole.MANAGER, UserRole.DRIVER]
    elif current_role == UserRole.MANAGER:
        return [UserRole.DRIVER]
    else:
        return []


def is_admin_role(role: UserRole) -> bool:
    """
    检查是否为管理员角色（PEER_ADMIN、BOSS、SUPER_ADMIN）
    
    Args:
        role: 用户角色
        
    Returns:
        bool: 是否为管理员角色
    """
    return role in [UserRole.PEER_ADMIN, UserRole.BOSS, UserRole.SUPER_ADMIN]


def has_management_permission(role: UserRole) -> bool:
    """
    检查是否具有管理权限（MANAGER、PEER_ADMIN、BOSS、SUPER_ADMIN）
    
    Args:
        role: 用户角色
        
    Returns:
        bool: 是否具有管理权限
    """
    return role in [UserRole.MANAGER, UserRole.PEER_ADMIN, UserRole.BOSS, UserRole.SUPER_ADMIN]


def can_manage_user(manager_role: UserRole, target_role: UserRole) -> bool:
    """
    检查管理者是否可以管理目标用户
    
    权限规则：
    - SUPER_ADMIN: 可以管理所有角色
    - BOSS: 可以管理 PEER_ADMIN, MANAGER, DRIVER
    - PEER_ADMIN: 可以管理 MANAGER, DRIVER
    - MANAGER: 可以管理 DRIVER
    - DRIVER: 无法管理任何角色
    
    Args:
        manager_role: 管理者角色
        target_role: 目标用户角色
        
    Returns:
        bool: 是否可以管理
    """
    # 角色权限等级（数字越大权限越高）
    role_levels = {
        UserRole.DRIVER: 1,
        UserRole.MANAGER: 2,
        UserRole.PEER_ADMIN: 3,
        UserRole.BOSS: 4,
        UserRole.SUPER_ADMIN: 5
    }
    
    manager_level = role_levels.get(manager_role, 0)
    target_level = role_levels.get(target_role, 0)
    
    # 管理者权限等级必须高于目标用户
    return manager_level > target_level
