"""
应用版本管理路由模块
提供应用版本的增删改查和版本检查功能

@module routers/versions
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import get_session
from models import AppVersion, UpdateType, User
from auth import get_current_user
from schemas import MessageResponse


router = APIRouter(prefix="/app-versions", tags=["版本管理"])


# ==================== 请求/响应模型 ====================

from pydantic import BaseModel


class AppVersionCreate(BaseModel):
    """创建版本请求"""
    version: str
    version_code: int
    update_type: UpdateType = UpdateType.OPTIONAL
    title: Optional[str] = None
    description: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    file_hash: Optional[str] = None
    min_version: Optional[str] = None
    platform: str = "all"
    is_active: bool = True


class AppVersionUpdate(BaseModel):
    """更新版本请求"""
    version: Optional[str] = None
    version_code: Optional[int] = None
    update_type: Optional[UpdateType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    file_hash: Optional[str] = None
    min_version: Optional[str] = None
    platform: Optional[str] = None
    is_active: Optional[bool] = None


class AppVersionCheckRequest(BaseModel):
    """版本检查请求"""
    current_version: str
    current_version_code: int
    platform: str = "all"


class AppVersionCheckResponse(BaseModel):
    """版本检查响应"""
    has_update: bool
    update_type: Optional[str] = None
    version: Optional[str] = None
    version_code: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    file_hash: Optional[str] = None


class AppVersionResponse(BaseModel):
    """版本响应"""
    id: int
    version: str
    version_code: int
    update_type: str
    title: Optional[str]
    description: Optional[str]
    download_url: Optional[str]
    file_size: Optional[int]
    file_hash: Optional[str]
    min_version: Optional[str]
    platform: str
    is_active: bool
    publish_time: datetime
    created_at: datetime
    updated_at: datetime
    creator_id: Optional[int]


# ==================== 路由处理函数 ====================

@router.get("", response_model=List[AppVersionResponse])
async def get_app_versions(
    platform: Optional[str] = Query(None, description="平台筛选"),
    is_active: Optional[bool] = Query(None, description="是否启用"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    获取版本列表
    
    Args:
        platform: 平台筛选
        is_active: 是否启用
        skip: 跳过记录数
        limit: 返回记录数
        
    Returns:
        版本列表
    """
    query = select(AppVersion)
    
    if platform:
        query = query.where(AppVersion.platform.in_([platform, "all"]))
    if is_active is not None:
        query = query.where(AppVersion.is_active == is_active)
    
    query = query.order_by(AppVersion.version_code.desc()).offset(skip).limit(limit)
    versions = session.exec(query).all()
    
    return versions


@router.post("", response_model=AppVersionResponse)
async def create_app_version(
    data: AppVersionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    创建新版本
    
    Args:
        data: 版本信息
        
    Returns:
        创建的版本
    """
    # 检查版本号是否已存在
    existing = session.exec(
        select(AppVersion).where(AppVersion.version == data.version)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="版本号已存在")
    
    # 创建版本
    version = AppVersion(
        **data.model_dump(),
        creator_id=current_user.id,
        publish_time=datetime.now(),
    )
    session.add(version)
    session.commit()
    session.refresh(version)
    
    return version


@router.get("/latest", response_model=Optional[AppVersionResponse])
async def get_latest_version(
    platform: str = Query("all", description="平台"),
    session: Session = Depends(get_session),
):
    """
    获取最新版本
    
    Args:
        platform: 平台
        
    Returns:
        最新版本信息
    """
    query = select(AppVersion).where(
        AppVersion.is_active == True,
        AppVersion.platform.in_([platform, "all"]),
    ).order_by(AppVersion.version_code.desc())
    
    version = session.exec(query).first()
    return version


@router.post("/check", response_model=AppVersionCheckResponse)
async def check_app_update(
    data: AppVersionCheckRequest,
    session: Session = Depends(get_session),
):
    """
    检查应用更新
    
    Args:
        data: 当前版本信息
        
    Returns:
        更新检查结果
    """
    # 获取最新版本
    query = select(AppVersion).where(
        AppVersion.is_active == True,
        AppVersion.platform.in_([data.platform, "all"]),
        AppVersion.version_code > data.current_version_code,
    ).order_by(AppVersion.version_code.desc())
    
    latest = session.exec(query).first()
    
    if not latest:
        return AppVersionCheckResponse(has_update=False)
    
    return AppVersionCheckResponse(
        has_update=True,
        update_type=latest.update_type.value,
        version=latest.version,
        version_code=latest.version_code,
        title=latest.title,
        description=latest.description,
        download_url=latest.download_url,
        file_size=latest.file_size,
        file_hash=latest.file_hash,
    )


@router.get("/{version_id}", response_model=AppVersionResponse)
async def get_app_version(
    version_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    获取版本详情
    
    Args:
        version_id: 版本ID
        
    Returns:
        版本详情
    """
    version = session.get(AppVersion, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="版本不存在")
    return version


@router.put("/{version_id}", response_model=AppVersionResponse)
async def update_app_version(
    version_id: int,
    data: AppVersionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    更新版本信息
    
    Args:
        version_id: 版本ID
        data: 更新数据
        
    Returns:
        更新后的版本
    """
    version = session.get(AppVersion, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="版本不存在")
    
    # 更新字段
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(version, key, value)
    
    version.updated_at = datetime.now()
    session.add(version)
    session.commit()
    session.refresh(version)
    
    return version


@router.delete("/{version_id}", response_model=MessageResponse)
async def delete_app_version(
    version_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    删除版本
    
    Args:
        version_id: 版本ID
        
    Returns:
        删除结果
    """
    version = session.get(AppVersion, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="版本不存在")
    
    session.delete(version)
    session.commit()
    
    return MessageResponse(message="版本已删除")
