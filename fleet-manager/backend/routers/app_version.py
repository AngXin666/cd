"""
应用版本管理路由模块

提供应用版本的检查、发布和历史查询功能。
支持热更新（wgt）和整包更新（apk）两种更新模式。

API 端点：
- GET  /api/app/version/check   - 检查更新
- GET  /api/app/version/latest  - 获取最新版本
- POST /api/app/version         - 发布新版本（需管理员权限）
- GET  /api/app/version/history - 版本历史
- POST /api/app/version/upload  - 上传更新包（需管理员权限）

Requirements:
    - 6.1: 提供 GET /api/app/version/check 接口用于版本检查
    - 6.2: 提供 POST /api/app/version 接口用于发布新版本（需管理员权限）
    - 6.3: 提供 GET /api/app/version/latest 接口获取最新版本信息
    - 6.4: 发布新版本时支持上传 wgt 包和 APK 文件
"""

import hashlib
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile
from sqlmodel import Session

from database import get_session
from models import User, UserRole, normalize_role
from auth import get_current_user
from schemas import (
    VersionCheckRequest,
    VersionCheckResponse,
    VersionCreate,
    VersionResponse,
    AppUpdateUploadResponse,
)
from crud.app_version import (
    create_version,
    get_latest_version,
    get_version_history,
    check_update,
    increment_download_count,
    get_version_by_id,
)


# 创建路由器，使用 /api/app/version 前缀
router = APIRouter(prefix="/api/app/version", tags=["版本管理"])


# ==================== 配置 ====================

# 更新包存储目录
APP_UPDATES_DIR = Path("uploads/app_updates")
APP_UPDATES_DIR.mkdir(parents=True, exist_ok=True)

# 支持的更新包格式
ALLOWED_UPDATE_EXTENSIONS = {".wgt", ".apk"}

# 最大文件大小（100MB）
MAX_UPDATE_FILE_SIZE = 100 * 1024 * 1024


# ==================== 辅助函数 ====================

def get_file_extension(filename: str) -> str:
    """
    获取文件扩展名（小写）
    
    Args:
        filename: 文件名
        
    Returns:
        str: 小写的文件扩展名，如 ".wgt"
    """
    return Path(filename).suffix.lower()


def calculate_md5(content: bytes) -> str:
    """
    计算文件内容的 MD5 校验值
    
    Args:
        content: 文件内容
        
    Returns:
        str: MD5 校验值（32位十六进制字符串）
    """
    return hashlib.md5(content).hexdigest()


def generate_unique_filename(original_filename: str) -> str:
    """
    生成唯一的文件名
    使用 UUID 和原始扩展名组合
    
    Args:
        original_filename: 原始文件名
        
    Returns:
        str: 唯一的文件名
    """
    ext = get_file_extension(original_filename)
    unique_id = uuid.uuid4().hex[:16]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"{timestamp}_{unique_id}{ext}"


def get_update_type_from_extension(ext: str) -> str:
    """
    根据文件扩展名获取更新类型
    
    Args:
        ext: 文件扩展名
        
    Returns:
        str: 更新类型（wgt/apk）
    """
    if ext == ".wgt":
        return "wgt"
    elif ext == ".apk":
        return "apk"
    return "unknown"


# ==================== 版本检查接口 ====================

@router.get("/check", response_model=VersionCheckResponse)
async def check_app_update(
    current_version: str = Query(..., description="当前版本名称，如 '1.2.0'"),
    current_version_code: int = Query(..., ge=0, description="当前版本号（整数），如 120"),
    platform: str = Query(..., description="平台类型：android、ios、h5"),
    session: Session = Depends(get_session),
):
    """
    检查应用更新（GET 方式）
    
    客户端通过查询参数发送当前版本信息，服务端返回是否有更新。
    此接口无需认证，任何客户端都可以调用。
    
    Args:
        current_version: 当前版本名称，如 "1.2.0"
        current_version_code: 当前版本号（整数），如 120
        platform: 平台类型：android、ios、h5
        session: 数据库会话
        
    Returns:
        VersionCheckResponse: 版本检查响应
        - has_update: 是否有可用更新
        - update_type: 更新类型（wgt/apk）
        - latest_version: 最新版本名称
        - latest_version_code: 最新版本号
        - download_url: 下载地址
        - file_size: 文件大小
        - md5: MD5 校验值
        - description: 更新说明
        - is_force_update: 是否强制更新
        
    Requirements: 6.1 - 提供 GET /api/app/version/check 接口用于版本检查
    
    Example:
        GET /api/app/version/check?current_version=1.2.0&current_version_code=120&platform=android
    """
    return check_update(session, current_version_code, platform)


@router.post("/check", response_model=VersionCheckResponse)
async def check_app_update_post(
    request: VersionCheckRequest,
    session: Session = Depends(get_session),
):
    """
    检查应用更新（POST 方式）
    
    客户端通过请求体发送当前版本信息，服务端返回是否有更新。
    此接口无需认证，任何客户端都可以调用。
    
    Args:
        request: 版本检查请求
            - current_version: 当前版本名称
            - current_version_code: 当前版本号
            - platform: 平台类型
        session: 数据库会话
        
    Returns:
        VersionCheckResponse: 版本检查响应
        
    Requirements: 6.1 - 提供版本检查接口
    
    Example:
        POST /api/app/version/check
        {
            "current_version": "1.2.0",
            "current_version_code": 120,
            "platform": "android"
        }
    """
    return check_update(session, request.current_version_code, request.platform)


# ==================== 获取最新版本接口 ====================

@router.get("/latest", response_model=Optional[VersionResponse])
async def get_latest_app_version(
    platform: str = Query(..., description="平台类型：android、ios"),
    session: Session = Depends(get_session),
):
    """
    获取最新版本信息
    
    获取指定平台的最新可用版本信息。
    此接口无需认证，任何客户端都可以调用。
    
    Args:
        platform: 平台类型：android、ios
        session: 数据库会话
        
    Returns:
        VersionResponse: 最新版本信息，如果没有版本则返回 null
        
    Requirements: 6.3 - 提供 GET /api/app/version/latest 接口获取最新版本信息
    
    Example:
        GET /api/app/version/latest?platform=android
    """
    version = get_latest_version(session, platform)
    if not version:
        return None
    return version


# ==================== 发布新版本接口 ====================

@router.post("", response_model=VersionResponse, status_code=status.HTTP_201_CREATED)
async def publish_new_version(
    version_data: VersionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    发布新版本（需管理员权限）
    
    管理员可以通过此接口发布新版本。
    只有老板（boss）和调度（dispatcher）角色可以发布版本。
    
    Args:
        version_data: 版本创建数据
            - version_name: 版本名称，如 "1.3.0"
            - version_code: 版本号（整数），如 130
            - platform: 平台类型：android、ios
            - update_type: 更新类型：wgt（热更新）、apk（整包更新）
            - download_url: 下载地址
            - file_size: 文件大小（字节）
            - md5: MD5 校验值
            - description: 更新说明（可选）
            - is_force_update: 是否强制更新，默认 False
            - min_compatible_version: 最低兼容版本号，默认 0
        session: 数据库会话
        current_user: 当前登录用户
        
    Returns:
        VersionResponse: 创建的版本信息
        
    Raises:
        HTTPException 403: 无权限发布版本
        HTTPException 400: 版本号已存在
        
    Requirements: 6.2 - 提供 POST /api/app/version 接口用于发布新版本（需管理员权限）
    
    Example:
        POST /api/app/version
        {
            "version_name": "1.3.0",
            "version_code": 130,
            "platform": "android",
            "update_type": "wgt",
            "download_url": "https://example.com/update.wgt",
            "file_size": 1024000,
            "md5": "abc123def456...",
            "description": "修复了一些问题",
            "is_force_update": false,
            "min_compatible_version": 100
        }
    """
    # 检查权限：只有老板和调度可以发布版本
    user_role = normalize_role(current_user.role)
    if user_role not in [UserRole.BOSS.value, UserRole.PEER_ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权限发布版本，只有管理员可以操作"
        )
    
    # 验证更新类型
    if version_data.update_type not in ["wgt", "apk"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="更新类型必须是 'wgt' 或 'apk'"
        )
    
    # 验证平台类型
    if version_data.platform not in ["android", "ios"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="平台类型必须是 'android' 或 'ios'"
        )
    
    # 创建版本
    try:
        version = create_version(session, version_data, created_by=current_user.id)
        return version
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"创建版本失败: {str(e)}"
        )


# ==================== 版本历史接口 ====================

@router.get("/history", response_model=List[VersionResponse])
async def get_version_history_list(
    platform: Optional[str] = Query(None, description="平台类型筛选：android、ios"),
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回记录数上限"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    获取版本历史记录
    
    获取版本发布历史，支持按平台筛选和分页。
    需要登录才能访问。
    
    Args:
        platform: 平台类型筛选（可选）：android、ios
        skip: 跳过记录数，默认 0
        limit: 返回记录数上限，默认 20，最大 100
        session: 数据库会话
        current_user: 当前登录用户
        
    Returns:
        List[VersionResponse]: 版本列表，按版本号降序排列
        
    Requirements: 6.5 - 存储版本历史记录，包括版本号、更新内容、发布时间、下载次数
    
    Example:
        GET /api/app/version/history?platform=android&skip=0&limit=10
    """
    versions = get_version_history(session, platform=platform, skip=skip, limit=limit)
    return versions


# ==================== 下载统计接口 ====================

@router.post("/{version_id}/download", response_model=VersionResponse)
async def record_download(
    version_id: int,
    session: Session = Depends(get_session),
):
    """
    记录版本下载
    
    客户端下载更新包后调用此接口，增加下载次数统计。
    此接口无需认证。
    
    Args:
        version_id: 版本ID
        session: 数据库会话
        
    Returns:
        VersionResponse: 更新后的版本信息
        
    Raises:
        HTTPException 404: 版本不存在
        
    Requirements: 7.4 - 支持查询版本下载统计
    
    Example:
        POST /api/app/version/1/download
    """
    version = increment_download_count(session, version_id)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    return version


# ==================== 获取版本详情接口 ====================

@router.get("/{version_id}", response_model=VersionResponse)
async def get_version_detail(
    version_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    获取版本详情
    
    根据版本ID获取版本详细信息。
    需要登录才能访问。
    
    Args:
        version_id: 版本ID
        session: 数据库会话
        current_user: 当前登录用户
        
    Returns:
        VersionResponse: 版本详细信息
        
    Raises:
        HTTPException 404: 版本不存在
        
    Example:
        GET /api/app/version/1
    """
    version = get_version_by_id(session, version_id)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    return version


# ==================== 更新包上传接口 ====================

@router.post("/upload", response_model=AppUpdateUploadResponse)
async def upload_app_update(
    file: UploadFile = File(..., description="更新包文件（.wgt 或 .apk）"),
    current_user: User = Depends(get_current_user),
):
    """
    上传应用更新包（需管理员权限）
    
    管理员可以通过此接口上传 wgt 热更新包或 apk 整包更新文件。
    上传成功后返回文件的访问 URL、MD5 校验值和文件大小，
    可用于后续发布版本时填写相关信息。
    
    支持的文件格式：
    - .wgt: UniApp 热更新资源包
    - .apk: Android 完整安装包
    
    最大文件大小：100MB
    
    Args:
        file: 上传的更新包文件
        current_user: 当前登录用户
        
    Returns:
        AppUpdateUploadResponse: 上传结果
            - success: 是否上传成功
            - url: 更新包访问 URL
            - filename: 文件名
            - file_size: 文件大小（字节）
            - md5: MD5 校验值
            - update_type: 更新类型（wgt/apk）
        
    Raises:
        HTTPException 403: 无权限上传
        HTTPException 400: 文件格式不支持或文件大小超限
        
    Requirements: 6.4 - 发布新版本时支持上传 wgt 包和 APK 文件
    
    Example:
        POST /api/app/version/upload
        Content-Type: multipart/form-data
        file: <binary data>
    """
    # 检查权限：只有老板和调度可以上传更新包
    user_role = normalize_role(current_user.role)
    if user_role not in [UserRole.BOSS.value, UserRole.PEER_ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权限上传更新包，只有管理员可以操作"
        )
    
    # 验证文件扩展名
    ext = get_file_extension(file.filename or "")
    if ext not in ALLOWED_UPDATE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件格式。支持的格式：{', '.join(ALLOWED_UPDATE_EXTENSIONS)}"
        )
    
    # 读取文件内容
    content = await file.read()
    file_size = len(content)
    
    # 验证文件大小
    if file_size > MAX_UPDATE_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件大小超过限制（最大 {MAX_UPDATE_FILE_SIZE // (1024 * 1024)}MB）"
        )
    
    # 验证文件不为空
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件为空"
        )
    
    # 计算 MD5 校验值
    md5_hash = calculate_md5(content)
    
    # 生成唯一文件名
    unique_filename = generate_unique_filename(file.filename or f"update{ext}")
    
    # 确保目录存在
    APP_UPDATES_DIR.mkdir(parents=True, exist_ok=True)
    
    # 保存文件
    file_path = APP_UPDATES_DIR / unique_filename
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 构建访问 URL
    url = f"/uploads/app_updates/{unique_filename}"
    
    # 获取更新类型
    update_type = get_update_type_from_extension(ext)
    
    return AppUpdateUploadResponse(
        success=True,
        url=url,
        filename=unique_filename,
        file_size=file_size,
        md5=md5_hash,
        update_type=update_type
    )
