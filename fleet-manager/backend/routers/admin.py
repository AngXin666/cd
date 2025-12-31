"""
系统管理路由模块
提供老板管理员和权限配置功能

包含的端点：
- GET /api/admin/system-info - 获取系统信息
- GET /api/admin/roles - 获取可创建的角色列表
- POST /api/admin/reset-password/{user_id} - 重置用户密码
- GET /api/admin/all-users - 获取所有用户列表
- GET /api/permissions - 获取所有权限配置
- GET /api/permissions/{role} - 获取指定角色的权限配置
- PUT /api/permissions/{role} - 更新角色权限配置
- POST /api/permissions/{role}/reset - 重置角色权限为默认配置

Requirements: 9.1 - 创建 routers/ 目录包含各功能模块路由
Requirements: 3.1 - 删除超级管理员后，老板成为最高权限角色
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from database import get_session
from models import User, UserRole
from auth import (
    require_admin, require_boss,
    get_role_display_name, get_creatable_roles
)
from events import emit_permission_update
import crud

from schemas import (
    UserResponse, MessageResponse,
    RolePermissionUpdate, RolePermissionResponse,
    PermissionItem, PermissionGroupResponse, AllPermissionsResponse
)


# 创建路由器
router = APIRouter()


# ==================== 权限配置 ====================

# 权限分组配置（与前端保持一致）
PERMISSION_GROUPS = [
    {
        "key": "attendance",
        "name": "考勤管理",
        "icon": "⏰",
        "permissions": [
            {"key": "attendance.clock", "name": "打卡", "description": "上下班打卡功能"},
            {"key": "attendance.view_own", "name": "查看个人考勤", "description": "查看自己的考勤记录"},
            {"key": "attendance.view_all", "name": "查看所有考勤", "description": "查看所有人的考勤记录"},
        ],
    },
    {
        "key": "piece_work",
        "name": "计件管理",
        "icon": "📦",
        "permissions": [
            {"key": "piece_work.entry", "name": "计件录入", "description": "录入计件数据"},
            {"key": "piece_work.view_own", "name": "查看个人计件", "description": "查看自己的计件记录"},
            {"key": "piece_work.view_all", "name": "查看所有计件", "description": "查看所有人的计件记录"},
            {"key": "piece_work.manage", "name": "计件管理", "description": "管理计件分类和单价"},
        ],
    },
    {
        "key": "leave",
        "name": "请假管理",
        "icon": "📝",
        "permissions": [
            {"key": "leave.apply", "name": "申请请假", "description": "提交请假申请"},
            {"key": "leave.view_own", "name": "查看个人请假", "description": "查看自己的请假记录"},
            {"key": "leave.approve", "name": "审批请假", "description": "审批他人的请假申请"},
            {"key": "leave.view_all", "name": "查看所有请假", "description": "查看所有人的请假记录"},
        ],
    },
    {
        "key": "vehicle",
        "name": "车辆管理",
        "icon": "🚛",
        "permissions": [
            {"key": "vehicle.view_own", "name": "查看个人车辆", "description": "查看自己的车辆信息"},
            {"key": "vehicle.add", "name": "添加车辆", "description": "添加新车辆"},
            {"key": "vehicle.return", "name": "还车", "description": "提交还车申请"},
            {"key": "vehicle.view_all", "name": "查看所有车辆", "description": "查看所有车辆信息"},
            {"key": "vehicle.review", "name": "审核车辆", "description": "审核车辆信息"},
            {"key": "vehicle.assign", "name": "分配车辆", "description": "将车辆分配给司机"},
        ],
    },
    {
        "key": "warehouse",
        "name": "仓库管理",
        "icon": "🏭",
        "permissions": [
            {"key": "warehouse.view", "name": "查看仓库", "description": "查看仓库列表"},
            {"key": "warehouse.manage", "name": "管理仓库", "description": "创建、编辑、删除仓库"},
            {"key": "warehouse.assign", "name": "分配仓库", "description": "将用户分配到仓库"},
        ],
    },
    {
        "key": "user",
        "name": "用户管理",
        "icon": "👥",
        "permissions": [
            {"key": "user.view", "name": "查看用户", "description": "查看用户列表"},
            {"key": "user.manage", "name": "管理用户", "description": "创建、编辑、删除用户"},
            {"key": "user.permission", "name": "权限配置", "description": "配置用户权限"},
        ],
    },
    {
        "key": "notification",
        "name": "通知管理",
        "icon": "🔔",
        "permissions": [
            {"key": "notification.receive", "name": "接收通知", "description": "接收系统通知"},
            {"key": "notification.send", "name": "发送通知", "description": "向其他用户发送通知"},
            {"key": "notification.manage", "name": "管理通知", "description": "管理通知模板和定时通知"},
        ],
    },
    {
        "key": "stats",
        "name": "统计报表",
        "icon": "📊",
        "permissions": [
            {"key": "stats.view_own", "name": "查看个人统计", "description": "查看自己的统计数据"},
            {"key": "stats.view_all", "name": "查看所有统计", "description": "查看所有统计报表"},
        ],
    },
]


def get_all_permission_keys() -> List[str]:
    """
    获取所有权限键

    Returns:
        List[str]: 所有权限键列表
    """
    keys = []
    for group in PERMISSION_GROUPS:
        for perm in group["permissions"]:
            keys.append(perm["key"])
    return keys


# 默认角色权限配置
DEFAULT_ROLE_PERMISSIONS = {
    UserRole.DRIVER: [
        "attendance.clock", "attendance.view_own",
        "piece_work.entry", "piece_work.view_own",
        "leave.apply", "leave.view_own",
        "vehicle.view_own", "vehicle.add", "vehicle.return",
        "notification.receive",
        "stats.view_own",
    ],
    UserRole.MANAGER: [
        "attendance.clock", "attendance.view_own", "attendance.view_all",
        "piece_work.entry", "piece_work.view_own", "piece_work.view_all",
        "leave.apply", "leave.view_own", "leave.approve", "leave.view_all",
        "vehicle.view_own", "vehicle.view_all", "vehicle.add", "vehicle.return",
        "warehouse.view",
        "user.view",
        "notification.receive", "notification.send",
        "stats.view_own", "stats.view_all",
    ],
    UserRole.PEER_ADMIN: [
        "attendance.view_all",
        "piece_work.view_all", "piece_work.manage",
        "leave.view_all", "leave.approve",
        "vehicle.view_all", "vehicle.review", "vehicle.assign",
        "warehouse.view", "warehouse.manage", "warehouse.assign",
        "user.view",
        "notification.receive", "notification.send", "notification.manage",
        "stats.view_all",
    ],
    UserRole.BOSS: get_all_permission_keys(),  # 老板是系统最高权限角色
}

# 内存中存储角色权限配置（实际项目中应存储到数据库）
role_permissions_store = {role: list(perms) for role, perms in DEFAULT_ROLE_PERMISSIONS.items()}


# ==================== 老板管理员 API ====================

@router.get("/api/admin/system-info", tags=["系统管理"])
async def get_system_info(
    current_user: User = Depends(require_boss),
    session: Session = Depends(get_session)
):
    """
    获取系统信息（仅老板可访问）

    返回系统统计信息，包括用户数量、各角色数量等

    Args:
        current_user: 当前登录用户（必须是老板）
        session: 数据库会话

    Returns:
        dict: 系统统计信息

    Requirements: 3.1 - 删除超级管理员后，老板成为最高权限角色
    """
    # 统计各角色用户数量
    role_counts = {}
    for role in UserRole:
        count = len(crud.get_users(session, role=role))
        role_counts[role.value] = {
            "count": count,
            "display_name": get_role_display_name(role)
        }

    # 统计总用户数
    total_users = len(crud.get_users(session))
    active_users = len(crud.get_users(session, is_active=True))

    # 统计仓库数量
    total_warehouses = len(crud.get_warehouses(session))
    active_warehouses = len(crud.get_warehouses(session, is_active=True))

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "by_role": role_counts
        },
        "warehouses": {
            "total": total_warehouses,
            "active": active_warehouses
        },
        "version": "1.0.0"
    }


@router.get("/api/admin/roles", tags=["系统管理"])
async def get_available_roles(
    current_user: User = Depends(require_admin)
):
    """
    获取当前用户可创建的角色列表（管理员级别可访问）

    根据当前用户的角色返回可以创建的角色列表

    Args:
        current_user: 当前登录用户

    Returns:
        dict: 当前角色和可创建的角色列表
    """
    creatable_roles = get_creatable_roles(current_user.role)

    return {
        "current_role": {
            "value": current_user.role.value,
            "display_name": get_role_display_name(current_user.role)
        },
        "creatable_roles": [
            {
                "value": role.value,
                "display_name": get_role_display_name(role)
            }
            for role in creatable_roles
        ]
    }


@router.post("/api/admin/reset-password/{user_id}", response_model=MessageResponse, tags=["系统管理"])
async def admin_reset_password(
    user_id: int,
    current_user: User = Depends(require_boss),
    session: Session = Depends(get_session)
):
    """
    重置用户密码（仅老板可操作）

    将用户密码重置为默认密码 "123456"

    Args:
        user_id: 用户ID
        current_user: 当前登录用户（必须是老板）
        session: 数据库会话

    Returns:
        MessageResponse: 重置成功消息

    Raises:
        HTTPException 404: 用户不存在

    Requirements: 3.1 - 删除超级管理员后，老板成为最高权限角色
    """
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 重置密码为默认密码
    crud.change_user_password(session, user, "123456")

    return MessageResponse(message=f"用户 {user.name} 的密码已重置为 123456")


@router.get("/api/admin/all-users", response_model=List[UserResponse], tags=["系统管理"])
async def get_all_users_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    current_user: User = Depends(require_boss),
    session: Session = Depends(get_session)
):
    """
    获取所有用户列表（仅老板可访问）

    不受角色限制，可以查看所有用户

    Args:
        skip: 跳过记录数
        limit: 返回记录数
        current_user: 当前登录用户（必须是老板）
        session: 数据库会话

    Returns:
        List[UserResponse]: 用户列表

    Requirements: 3.1 - 删除超级管理员后，老板成为最高权限角色
    """
    users = crud.get_users(session, skip=skip, limit=limit)
    return users


# ==================== 权限配置 API ====================

@router.get("/api/permissions", response_model=AllPermissionsResponse, tags=["权限配置"])
async def get_all_permissions(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取所有权限配置（管理员级别可访问：调度、老板、超级管理员）
    返回权限分组列表和各角色的权限配置

    Args:
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        AllPermissionsResponse: 权限配置信息

    Requirements: 6.1, 6.2
    """
    # 构建权限分组响应
    groups = []
    for group in PERMISSION_GROUPS:
        permissions = [
            PermissionItem(
                key=perm["key"],
                name=perm["name"],
                description=perm["description"],
                group=group["key"]
            )
            for perm in group["permissions"]
        ]
        groups.append(PermissionGroupResponse(
            key=group["key"],
            name=group["name"],
            icon=group["icon"],
            permissions=permissions
        ))

    # 构建角色权限映射
    role_perms = {}
    for role in UserRole:
        role_perms[role.value] = role_permissions_store.get(role, [])

    return AllPermissionsResponse(
        groups=groups,
        role_permissions=role_perms
    )


@router.get("/api/permissions/{role}", response_model=RolePermissionResponse, tags=["权限配置"])
async def get_role_permissions(
    role: UserRole,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取指定角色的权限配置（管理员级别可访问：调度、老板、超级管理员）

    Args:
        role: 用户角色
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        RolePermissionResponse: 角色权限配置

    Requirements: 6.2
    """
    permissions = role_permissions_store.get(role, [])

    return RolePermissionResponse(
        role=role,
        permissions=permissions,
        updated_at=datetime.now()
    )


@router.put("/api/permissions/{role}", response_model=RolePermissionResponse, tags=["权限配置"])
async def update_role_permissions(
    role: UserRole,
    request: RolePermissionUpdate,
    current_user: User = Depends(require_boss),
    session: Session = Depends(get_session)
):
    """
    更新角色权限配置（仅老板和超级管理员可操作）

    当老板修改某个角色的权限时，系统会向该角色的所有用户推送权限更新事件，
    让用户无需手动刷新即可看到最新的权限状态。

    重构说明：
    - 提取角色权限验证逻辑到 validate_role_permissions_update
    - 提取权限键验证逻辑到 validate_permission_keys
    - 提取权限组合验证逻辑到 validate_permission_combinations
    - 降低函数复杂度，提升可维护性

    Args:
        role: 用户角色
        request: 权限更新请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        RolePermissionResponse: 更新后的角色权限配置

    Requirements: 2.5, 6.1, 6.2, 6.3, 6.4 - 权限变更实时数据同步
    """
    # 导入辅助函数
    from helpers import (
        validate_role_permissions_update,
        validate_permission_keys,
        validate_permission_combinations
    )

    # 验证角色权限是否可修改
    validate_role_permissions_update(role, request.permissions)

    # 验证权限键是否有效
    all_keys = set(get_all_permission_keys())
    validate_permission_keys(request.permissions, all_keys)

    # 验证权限组合合理性
    validate_permission_combinations(request.permissions)

    # 更新权限配置
    role_permissions_store[role] = list(request.permissions)

    # 获取该角色的所有用户，向他们推送权限更新事件
    users_with_role = crud.get_users(session, role=role, is_active=True)
    for user in users_with_role:
        # 触发权限更新事件
        emit_permission_update(
            user_id=user.id,
            permissions=list(request.permissions)
        )

    return RolePermissionResponse(
        role=role,
        permissions=request.permissions,
        updated_at=datetime.now()
    )


@router.post("/api/permissions/{role}/reset", response_model=RolePermissionResponse, tags=["权限配置"])
async def reset_role_permissions(
    role: UserRole,
    current_user: User = Depends(require_boss),
    session: Session = Depends(get_session)
):
    """
    重置角色权限为默认配置（仅老板可操作）

    当老板重置某个角色的权限时，系统会向该角色的所有用户推送权限更新事件，
    让用户无需手动刷新即可看到最新的权限状态。

    Args:
        role: 用户角色
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        RolePermissionResponse: 重置后的角色权限配置

    Requirements: 6.1, 6.2 - 权限变更实时数据同步
    Requirements: 3.1 - 删除超级管理员后，老板成为最高权限角色
    """
    # 老板的权限不可修改（老板是系统最高权限角色）
    if role == UserRole.BOSS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="老板的权限不可修改"
        )

    # 重置为默认权限
    default_perms = DEFAULT_ROLE_PERMISSIONS.get(role, [])
    role_permissions_store[role] = list(default_perms)

    # 获取该角色的所有用户，向他们推送权限更新事件
    users_with_role = crud.get_users(session, role=role, is_active=True)
    for user in users_with_role:
        # 触发权限更新事件
        emit_permission_update(
            user_id=user.id,
            permissions=list(default_perms)
        )

    return RolePermissionResponse(
        role=role,
        permissions=default_perms,
        updated_at=datetime.now()
    )
