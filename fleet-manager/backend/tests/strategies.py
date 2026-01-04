"""
Hypothesis 测试策略模块
提供属性测试所需的数据生成策略

主要功能：
- 基础数据策略（用户名、密码、姓名、手机号）
- 角色策略（各角色可创建/更新的角色范围）
- 用户数据策略（有效/无效用户数据）
- 权限辅助函数
"""

from hypothesis import strategies as st
from typing import List
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import UserRole

# ==================== 基础策略 ====================

username_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Nd')),
    min_size=3, max_size=20
).filter(lambda x: len(x) >= 3 and x[0].isalpha())

password_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Nd', 'P')),
    min_size=6, max_size=20
)

name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Lo')),
    min_size=2, max_size=20
).filter(lambda x: len(x) >= 2)

phone_strategy = st.from_regex(r'1[3-9][0-9]{9}', fullmatch=True)

# ==================== 角色策略 ====================

all_roles_strategy = st.sampled_from([
    UserRole.DRIVER, UserRole.MANAGER, UserRole.PEER_ADMIN, UserRole.BOSS
])

admin_roles_strategy = st.sampled_from([UserRole.PEER_ADMIN, UserRole.BOSS])

creatable_by_boss_strategy = st.sampled_from([
    UserRole.DRIVER, UserRole.MANAGER, UserRole.PEER_ADMIN, UserRole.BOSS
])

creatable_by_peer_admin_strategy = st.sampled_from([
    UserRole.DRIVER, UserRole.MANAGER
])

creatable_by_manager_strategy = st.sampled_from([UserRole.DRIVER])

driver_type_strategy = st.sampled_from(['pure', 'with_vehicle'])

# 可被管理员（老板、调度）更新的角色
updatable_by_boss_strategy = st.sampled_from([
    UserRole.DRIVER, UserRole.MANAGER, UserRole.PEER_ADMIN, UserRole.BOSS
])

updatable_by_peer_admin_strategy = st.sampled_from([
    UserRole.DRIVER, UserRole.MANAGER
])

# ==================== 权限辅助函数 ====================


def can_create_role(creator_role: UserRole, target_role: UserRole) -> bool:
    """
    检查创建者角色是否可以创建目标角色

    Args:
        creator_role: 创建者角色
        target_role: 目标角色

    Returns:
        bool: 是否可以创建
    """
    if creator_role == UserRole.BOSS:
        return True  # 老板可以创建任何角色
    elif creator_role == UserRole.PEER_ADMIN:
        return target_role in [UserRole.DRIVER, UserRole.MANAGER]
    elif creator_role == UserRole.MANAGER:
        return target_role == UserRole.DRIVER
    return False


def can_update_user(updater_role: UserRole, target_role: UserRole) -> bool:
    """
    检查更新者角色是否可以更新目标角色的用户

    权限规则：
    - 老板：可以更新任何角色（包括其他老板）
    - 调度：可以更新车队长和司机
    - 车队长：只能更新司机（且需要仓库权限检查）
    - 司机：无法更新任何用户

    Args:
        updater_role: 更新者角色
        target_role: 目标用户角色

    Returns:
        bool: 是否可以更新
    """
    if updater_role == UserRole.BOSS:
        return True  # 老板可以更新任何角色
    elif updater_role == UserRole.PEER_ADMIN:
        return target_role in [UserRole.DRIVER, UserRole.MANAGER]
    elif updater_role == UserRole.MANAGER:
        return target_role == UserRole.DRIVER
    return False


def get_creatable_roles_for(role: UserRole) -> List[UserRole]:
    """
    获取指定角色可以创建的角色列表

    Args:
        role: 创建者角色

    Returns:
        List[UserRole]: 可创建的角色列表
    """
    if role == UserRole.BOSS:
        return [UserRole.DRIVER, UserRole.MANAGER, UserRole.PEER_ADMIN, UserRole.BOSS]
    elif role == UserRole.PEER_ADMIN:
        return [UserRole.DRIVER, UserRole.MANAGER]
    elif role == UserRole.MANAGER:
        return [UserRole.DRIVER]
    return []


def get_updatable_roles_for(role: UserRole) -> List[UserRole]:
    """
    获取指定角色可以更新的用户角色列表

    Args:
        role: 更新者角色

    Returns:
        List[UserRole]: 可更新的用户角色列表
    """
    if role == UserRole.BOSS:
        return [UserRole.DRIVER, UserRole.MANAGER, UserRole.PEER_ADMIN, UserRole.BOSS]
    elif role == UserRole.PEER_ADMIN:
        return [UserRole.DRIVER, UserRole.MANAGER]
    elif role == UserRole.MANAGER:
        return [UserRole.DRIVER]
    return []



# ==================== 用户数据策略 ====================

def user_create_data_strategy():
    """
    生成用户创建数据策略

    Returns:
        st.SearchStrategy: 用户创建数据策略
    """
    return st.fixed_dictionaries({
        "username": username_strategy,
        "password": password_strategy,
        "name": name_strategy,
        "phone": phone_strategy,
        "role": st.sampled_from(["driver", "manager", "peer_admin", "boss"])
    })


def valid_user_create_data_strategy():
    """
    生成有效的用户创建数据策略

    Returns:
        st.SearchStrategy: 有效用户创建数据策略
    """
    return st.fixed_dictionaries({
        "username": username_strategy,
        "password": password_strategy,
        "name": name_strategy,
        "phone": phone_strategy,
        "role": st.sampled_from(["driver", "manager", "peer_admin", "boss"])
    })


def invalid_role_user_data_strategy():
    """
    生成包含无效角色的用户数据策略

    Returns:
        st.SearchStrategy: 无效角色用户数据策略
    """
    return st.fixed_dictionaries({
        "username": username_strategy,
        "password": password_strategy,
        "name": name_strategy,
        "phone": phone_strategy,
        "role": st.sampled_from(["invalid_role", "admin", "superuser", "root", "guest"])
    })


def missing_field_user_data_strategy():
    """
    生成缺少必填字段的用户数据策略

    Returns:
        st.SearchStrategy: 缺少字段的用户数据策略
    """
    # 随机选择要包含的字段（确保至少缺少一个必填字段）
    return st.one_of(
        # 缺少 username
        st.fixed_dictionaries({
            "password": password_strategy,
            "name": name_strategy,
            "phone": phone_strategy,
            "role": st.just("driver")
        }),
        # 缺少 password
        st.fixed_dictionaries({
            "username": username_strategy,
            "name": name_strategy,
            "phone": phone_strategy,
            "role": st.just("driver")
        }),
        # 缺少 name
        st.fixed_dictionaries({
            "username": username_strategy,
            "password": password_strategy,
            "phone": phone_strategy,
            "role": st.just("driver")
        })
    )


def user_update_data_strategy():
    """
    生成用户更新数据策略

    Returns:
        st.SearchStrategy: 用户更新数据策略
    """
    return st.fixed_dictionaries({
        "name": st.one_of(st.none(), name_strategy),
        "phone": st.one_of(st.none(), phone_strategy),
        "is_active": st.one_of(st.none(), st.booleans())
    }).filter(lambda d: any(v is not None for v in d.values()))


def valid_user_update_data_strategy():
    """
    生成有效的用户更新数据策略（至少包含一个非空字段）

    Returns:
        st.SearchStrategy: 有效用户更新数据策略
    """
    return st.fixed_dictionaries({
        "name": name_strategy,
        "phone": phone_strategy
    })
