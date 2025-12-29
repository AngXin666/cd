"""
认证模块
实现 JWT Token 认证、密码哈希、权限检查、统一权限错误处理

主要功能：
- JWT Token 创建和验证
- 密码哈希和验证
- 角色权限检查
- 统一权限错误代码和响应格式
- 资源所有权检查
- 车辆所有权检查
- 高权限角色操作检查
- 车队长仓库权限检查
"""

import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from config import get_settings
from database import get_session
from models import User, UserRole

# 配置日志
logger = logging.getLogger(__name__)

# 获取配置
settings = get_settings()

# 密码哈希上下文
# 使用 bcrypt 算法进行密码哈希
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer 认证方案
security = HTTPBearer()


# ==================== 权限错误代码枚举 ====================

class PermissionErrorCode(str, Enum):
    """
    权限错误代码枚举
    用于前端区分不同类型的权限错误，以便进行相应的处理
    
    错误代码说明：
    - USER_DISABLED: 用户已被禁用，前端应强制登出
    - ROLE_INSUFFICIENT: 角色权限不足，无法执行此操作
    - RESOURCE_NOT_OWNED: 资源不属于当前用户
    - WAREHOUSE_NOT_ACCESSIBLE: 无权访问该仓库的资源
    - HIGH_ROLE_OPERATION: 需要超级管理员权限操作高权限角色
    """
    USER_DISABLED = "user_disabled"
    ROLE_INSUFFICIENT = "role_insufficient"
    RESOURCE_NOT_OWNED = "resource_not_owned"
    WAREHOUSE_NOT_ACCESSIBLE = "warehouse_not_accessible"
    HIGH_ROLE_OPERATION = "high_role_operation"


class PermissionError(HTTPException):
    """
    权限错误异常类
    继承自 HTTPException，提供统一的权限错误响应格式
    
    Attributes:
        error_code: 权限错误代码
        message: 错误信息
    """
    
    def __init__(
        self,
        error_code: PermissionErrorCode,
        message: str,
        status_code: int = status.HTTP_403_FORBIDDEN
    ):
        """
        初始化权限错误
        
        Args:
            error_code: 权限错误代码枚举值
            message: 错误信息，用于显示给用户
            status_code: HTTP 状态码，默认 403
        """
        super().__init__(
            status_code=status_code,
            detail={
                "error_code": error_code.value,
                "message": message
            }
        )
        self.error_code = error_code
        self.message = message


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
        raise PermissionError(
            error_code=PermissionErrorCode.USER_DISABLED,
            message="用户已被禁用"
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
            PermissionError: 权限不足时抛出 403 错误
        """
        if current_user.role not in allowed_roles:
            logger.warning(
                f"权限拒绝: 用户 {current_user.id} (角色: {current_user.role}) "
                f"尝试访问需要 {allowed_roles} 角色的资源"
            )
            raise PermissionError(
                error_code=PermissionErrorCode.ROLE_INSUFFICIENT,
                message="权限不足，无法执行此操作"
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


# ==================== 统一权限检查函数 ====================

def check_resource_ownership(
    resource: Any,
    current_user: User,
    resource_name: str,
    owner_field: str = "user_id"
) -> None:
    """
    检查资源所有权
    
    管理角色（车队长、调度、老板、超级管理员）可以访问任何资源。
    司机只能访问自己的资源。
    
    Args:
        resource: 要检查的资源对象
        current_user: 当前用户
        resource_name: 资源名称（用于错误信息，如 "车辆"、"计件记录"）
        owner_field: 所有者字段名，默认为 "user_id"
    
    Raises:
        PermissionError: 当用户不是资源所有者且不是管理角色时
    
    Example:
        # 检查计件记录所有权
        check_resource_ownership(record, current_user, "计件记录")
        
        # 检查车辆所有权（使用自定义字段）
        check_resource_ownership(vehicle, current_user, "车辆", "user_id")
    """
    # 管理角色可以访问任何资源
    if has_management_permission(current_user.role):
        return
    
    # 获取资源所有者 ID
    owner_id = getattr(resource, owner_field, None)
    
    # 检查所有权
    if owner_id != current_user.id:
        logger.warning(
            f"权限拒绝: 用户 {current_user.id} (角色: {current_user.role}) "
            f"尝试访问 {resource_name} (owner: {owner_id})"
        )
        raise PermissionError(
            error_code=PermissionErrorCode.RESOURCE_NOT_OWNED,
            message=f"无权操作此{resource_name}"
        )


def check_vehicle_ownership(vehicle: Any, current_user: User) -> None:
    """
    检查车辆所有权
    
    管理角色（车队长、调度、老板、超级管理员）可以访问任何车辆。
    司机只能访问自己的车辆。
    
    Args:
        vehicle: 车辆对象（需要有 user_id 属性）
        current_user: 当前用户
    
    Raises:
        PermissionError: 当司机不是车辆所有者时
    
    Example:
        vehicle = session.get(Vehicle, vehicle_id)
        check_vehicle_ownership(vehicle, current_user)
    """
    check_resource_ownership(vehicle, current_user, "车辆")


def require_super_admin_for_high_roles(
    target_role: UserRole,
    current_user: User,
    operation: str = "操作"
) -> None:
    """
    检查是否需要超级管理员权限操作高权限角色
    
    当目标角色是老板或超级管理员时，只有超级管理员才能执行操作。
    
    Args:
        target_role: 目标角色
        current_user: 当前用户
        operation: 操作描述（用于错误信息，如 "创建"、"修改"、"删除"）
    
    Raises:
        PermissionError: 当非超级管理员尝试操作高权限角色时
    
    Example:
        # 创建用户时检查
        require_super_admin_for_high_roles(user_data.role, current_user, "创建")
        
        # 修改用户时检查
        require_super_admin_for_high_roles(target_user.role, current_user, "修改")
    """
    # 高权限角色：老板和超级管理员
    high_roles = [UserRole.BOSS, UserRole.SUPER_ADMIN]
    
    if target_role in high_roles:
        if current_user.role != UserRole.SUPER_ADMIN:
            logger.warning(
                f"权限拒绝: 用户 {current_user.id} (角色: {current_user.role}) "
                f"尝试{operation}高权限角色 {target_role}"
            )
            raise PermissionError(
                error_code=PermissionErrorCode.HIGH_ROLE_OPERATION,
                message=f"只有超级管理员可以{operation}老板或超级管理员角色"
            )


def check_manager_warehouse_access(
    manager: User,
    target_user: User,
    session: Session
) -> None:
    """
    检查车队长是否有权操作目标用户
    
    车队长只能操作司机，且司机必须属于车队长管理的仓库。
    
    Args:
        manager: 车队长用户
        target_user: 目标用户
        session: 数据库会话
    
    Raises:
        PermissionError: 当车队长无权操作目标用户时
    
    Example:
        if current_user.role == UserRole.MANAGER:
            check_manager_warehouse_access(current_user, target_user, session)
    """
    # 导入 crud 模块（延迟导入避免循环依赖）
    import crud
    
    # 车队长只能操作司机
    if target_user.role != UserRole.DRIVER:
        logger.warning(
            f"权限拒绝: 车队长 {manager.id} 尝试操作非司机用户 {target_user.id} "
            f"(角色: {target_user.role})"
        )
        raise PermissionError(
            error_code=PermissionErrorCode.ROLE_INSUFFICIENT,
            message="车队长只能操作司机"
        )
    
    # 获取车队长管理的仓库
    manager_warehouses = crud.get_user_warehouses(session, manager.id)
    manager_warehouse_ids = set(w.id for w in manager_warehouses)
    
    # 获取司机所属的仓库
    driver_warehouses = crud.get_user_warehouses(session, target_user.id)
    driver_warehouse_ids = set(w.id for w in driver_warehouses)
    
    # 检查是否有交集（司机是否属于车队长管理的仓库）
    if not manager_warehouse_ids & driver_warehouse_ids:
        logger.warning(
            f"权限拒绝: 车队长 {manager.id} 尝试操作不属于其仓库的司机 {target_user.id}"
        )
        raise PermissionError(
            error_code=PermissionErrorCode.WAREHOUSE_NOT_ACCESSIBLE,
            message="无权操作该司机，该司机不属于您管理的仓库"
        )
