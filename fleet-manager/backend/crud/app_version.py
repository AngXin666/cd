"""
应用版本 CRUD 操作模块

实现应用版本的增删改查操作，支持热更新（wgt）和整包更新（apk）。
包含版本检查、版本比较、下载统计等功能。

Requirements:
    - 2.1: 版本比较逻辑
    - 2.6: 最低兼容版本逻辑
    - 6.5: 版本历史记录
    - 7.3: 按平台筛选版本
    - 7.4: 下载统计
"""

from datetime import datetime
from typing import Optional, List
from sqlmodel import Session, select

from models import AppVersion
from schemas import VersionCreate, VersionCheckResponse


def create_version(
    session: Session,
    version_data: VersionCreate,
    created_by: Optional[int] = None
) -> AppVersion:
    """
    创建新版本记录
    
    Args:
        session: 数据库会话
        version_data: 版本创建数据
        created_by: 创建人ID（可选）
        
    Returns:
        AppVersion: 创建的版本对象
        
    Requirements: 7.1, 7.2 - 版本信息持久化
    
    Example:
        >>> from schemas import VersionCreate
        >>> data = VersionCreate(
        ...     version_name="1.3.0",
        ...     version_code=130,
        ...     platform="android",
        ...     update_type="wgt",
        ...     download_url="https://example.com/update.wgt",
        ...     file_size=1024000,
        ...     md5="abc123..."
        ... )
        >>> version = create_version(session, data, created_by=1)
    """
    version = AppVersion(
        version_name=version_data.version_name,
        version_code=version_data.version_code,
        platform=version_data.platform,
        update_type=version_data.update_type,
        download_url=version_data.download_url,
        file_size=version_data.file_size,
        md5=version_data.md5,
        description=version_data.description,
        is_force_update=version_data.is_force_update,
        min_compatible_version=version_data.min_compatible_version,
        download_count=0,
        is_active=True,
        created_at=datetime.now(),
        created_by=created_by
    )
    session.add(version)
    session.commit()
    session.refresh(version)
    return version


def get_latest_version(
    session: Session,
    platform: str
) -> Optional[AppVersion]:
    """
    获取指定平台的最新版本
    
    Args:
        session: 数据库会话
        platform: 平台类型（android、ios）
        
    Returns:
        AppVersion: 最新版本对象，不存在则返回 None
        
    Requirements: 7.3 - 按平台筛选版本
    
    Example:
        >>> latest = get_latest_version(session, "android")
        >>> if latest:
        ...     print(f"最新版本: {latest.version_name}")
    """
    statement = (
        select(AppVersion)
        .where(AppVersion.platform == platform)
        .where(AppVersion.is_active == True)
        .order_by(AppVersion.version_code.desc())
    )
    return session.exec(statement).first()


def get_version_history(
    session: Session,
    platform: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
) -> List[AppVersion]:
    """
    获取版本历史记录
    
    Args:
        session: 数据库会话
        platform: 平台类型筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        
    Returns:
        List[AppVersion]: 版本列表，按版本号降序排列
        
    Requirements: 6.5 - 版本历史记录
    
    Example:
        >>> # 获取所有平台的版本历史
        >>> history = get_version_history(session)
        >>> # 获取 Android 平台的版本历史
        >>> android_history = get_version_history(session, platform="android")
    """
    statement = select(AppVersion)
    
    # 按平台筛选
    if platform:
        statement = statement.where(AppVersion.platform == platform)
    
    # 按版本号降序排列，分页
    statement = (
        statement
        .order_by(AppVersion.version_code.desc())
        .offset(skip)
        .limit(limit)
    )
    
    return list(session.exec(statement).all())


def increment_download_count(
    session: Session,
    version_id: int
) -> Optional[AppVersion]:
    """
    增加版本下载次数
    
    Args:
        session: 数据库会话
        version_id: 版本ID
        
    Returns:
        AppVersion: 更新后的版本对象，版本不存在则返回 None
        
    Requirements: 7.4 - 下载统计累加
    
    Example:
        >>> version = increment_download_count(session, version_id=1)
        >>> if version:
        ...     print(f"下载次数: {version.download_count}")
    """
    version = session.get(AppVersion, version_id)
    if not version:
        return None
    
    version.download_count += 1
    session.add(version)
    session.commit()
    session.refresh(version)
    return version


def check_update(
    session: Session,
    current_version_code: int,
    platform: str
) -> VersionCheckResponse:
    """
    检查是否有可用更新
    
    根据当前版本号和平台检查是否有新版本可用。
    如果客户端版本低于最低兼容版本，则强制返回整包更新（apk）。
    
    Args:
        session: 数据库会话
        current_version_code: 当前版本号（整数）
        platform: 平台类型（android、ios）
        
    Returns:
        VersionCheckResponse: 版本检查响应
        
    Requirements:
        - 2.1: 版本比较逻辑
        - 2.6: 最低兼容版本逻辑
        - 8.2: 有更新时返回 has_update: true
        - 8.3: 无更新时返回 has_update: false
        
    Example:
        >>> response = check_update(session, current_version_code=100, platform="android")
        >>> if response.has_update:
        ...     print(f"有新版本: {response.latest_version}")
        ...     print(f"更新类型: {response.update_type}")
    """
    # 获取最新版本
    latest = get_latest_version(session, platform)
    
    # 无可用版本或当前版本已是最新
    if not latest or latest.version_code <= current_version_code:
        return VersionCheckResponse(has_update=False)
    
    # 确定更新类型
    # 如果当前版本低于最低兼容版本，必须整包更新
    update_type = latest.update_type
    if latest.min_compatible_version > 0 and current_version_code < latest.min_compatible_version:
        update_type = "apk"
    
    return VersionCheckResponse(
        has_update=True,
        update_type=update_type,
        latest_version=latest.version_name,
        latest_version_code=latest.version_code,
        download_url=latest.download_url,
        file_size=latest.file_size,
        md5=latest.md5,
        description=latest.description,
        is_force_update=latest.is_force_update
    )


def get_version_by_id(
    session: Session,
    version_id: int
) -> Optional[AppVersion]:
    """
    根据ID获取版本
    
    Args:
        session: 数据库会话
        version_id: 版本ID
        
    Returns:
        AppVersion: 版本对象，不存在则返回 None
    """
    return session.get(AppVersion, version_id)


def update_version_status(
    session: Session,
    version_id: int,
    is_active: bool
) -> Optional[AppVersion]:
    """
    更新版本启用状态
    
    Args:
        session: 数据库会话
        version_id: 版本ID
        is_active: 是否启用
        
    Returns:
        AppVersion: 更新后的版本对象，版本不存在则返回 None
    """
    version = session.get(AppVersion, version_id)
    if not version:
        return None
    
    version.is_active = is_active
    session.add(version)
    session.commit()
    session.refresh(version)
    return version
