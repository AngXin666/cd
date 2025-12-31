"""
图片上传路由模块
提供图片文件上传功能，支持车辆照片、证件照片、头像等分类

包含的端点：
- POST /api/upload/image - 通用图片上传（带分类参数）
- POST /api/upload - 通用图片上传（默认分类）
- POST /api/upload/vehicle - 上传车辆照片
- POST /api/upload/document - 上传证件照片
- POST /api/upload/avatar - 上传用户头像

Requirements: 8.4 - 创建图片上传 API
"""

import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Query

from models import User
from auth import get_current_user

from schemas import ImageUploadResponse


# 创建路由器
router = APIRouter(tags=["图片上传"])


# ==================== 配置 ====================

# 图片存储配置
UPLOAD_DIR = Path("uploads/images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 支持的图片格式
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# 最大文件大小（10MB）
MAX_FILE_SIZE = 10 * 1024 * 1024


# ==================== 辅助函数 ====================

def get_file_extension(filename: str) -> str:
    """
    获取文件扩展名（小写）

    Args:
        filename: 文件名

    Returns:
        str: 小写的文件扩展名，如 ".jpg"
    """
    return Path(filename).suffix.lower()


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


def is_valid_image_content(content: bytes, ext: str) -> bool:
    """
    验证文件内容是否为有效的图片
    通过检查文件头（magic bytes）来验证

    Args:
        content: 文件内容
        ext: 文件扩展名

    Returns:
        bool: 是否为有效图片
    """
    if len(content) < 8:
        return False

    # JPEG: FF D8 FF
    if ext in [".jpg", ".jpeg"]:
        return content[:3] == b'\xff\xd8\xff'

    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if ext == ".png":
        return content[:8] == b'\x89PNG\r\n\x1a\n'

    # WebP: RIFF....WEBP
    if ext == ".webp":
        return content[:4] == b'RIFF' and content[8:12] == b'WEBP'

    return False


async def _upload_image_internal(
    file: UploadFile,
    category: str,
    current_user: User
) -> ImageUploadResponse:
    """
    内部图片上传处理函数
    被多个上传端点复用

    Args:
        file: 上传的图片文件
        category: 图片分类
        current_user: 当前登录用户

    Returns:
        ImageUploadResponse: 上传结果

    Raises:
        HTTPException 400: 图片格式不支持、文件大小超限或文件无效
    """
    # 验证文件扩展名
    ext = get_file_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的图片格式。支持的格式：{', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 读取文件内容
    content = await file.read()
    file_size = len(content)

    # 验证文件大小
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"图片大小超过限制（最大 {MAX_FILE_SIZE // (1024 * 1024)}MB）"
        )

    # 验证文件不为空
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="图片文件为空"
        )

    # 验证文件内容是否为有效图片
    if not is_valid_image_content(content, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件内容不是有效的图片"
        )

    # 生成唯一文件名
    unique_filename = generate_unique_filename(file.filename or "image.jpg")

    # 创建分类目录
    category_dir = UPLOAD_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)

    # 保存文件
    file_path = category_dir / unique_filename
    with open(file_path, "wb") as f:
        f.write(content)

    # 构建访问 URL
    url = f"/uploads/images/{category}/{unique_filename}"

    return ImageUploadResponse(
        success=True,
        url=url,
        filename=unique_filename,
        size=file_size
    )


# ==================== 上传 API ====================

@router.post("/api/upload/image", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(..., description="图片文件"),
    category: str = Query("vehicle", description="图片分类（vehicle/document/other）"),
    current_user: User = Depends(get_current_user)
):
    """
    上传图片文件

    接收图片文件，验证格式和大小，保存到本地文件系统，返回访问 URL

    支持的图片格式：jpg, jpeg, png, webp
    最大文件大小：10MB

    Args:
        file: 上传的图片文件
        category: 图片分类，用于组织存储目录
        current_user: 当前登录用户

    Returns:
        ImageUploadResponse: 包含图片访问 URL、文件名、大小等信息

    Raises:
        HTTPException 400: 图片格式不支持或文件大小超过限制
    """
    return await _upload_image_internal(file, category, current_user)


@router.post("/api/upload", response_model=ImageUploadResponse)
async def upload_general(
    file: UploadFile = File(..., description="图片文件"),
    current_user: User = Depends(get_current_user)
):
    """
    通用图片上传接口

    上传图片到默认分类目录（other）

    支持的图片格式：jpg, jpeg, png, webp
    最大文件大小：10MB

    Args:
        file: 上传的图片文件
        current_user: 当前登录用户

    Returns:
        ImageUploadResponse: 上传结果
    """
    return await _upload_image_internal(file, "other", current_user)


@router.post("/api/upload/vehicle", response_model=ImageUploadResponse)
async def upload_vehicle_photo(
    file: UploadFile = File(..., description="车辆照片"),
    current_user: User = Depends(get_current_user)
):
    """
    上传车辆照片

    上传车辆相关的照片，如提车照片、还车照片等

    支持的图片格式：jpg, jpeg, png, webp
    最大文件大小：10MB

    Args:
        file: 上传的图片文件
        current_user: 当前登录用户

    Returns:
        ImageUploadResponse: 上传结果
    """
    return await _upload_image_internal(file, "vehicle", current_user)


@router.post("/api/upload/document", response_model=ImageUploadResponse)
async def upload_document_photo(
    file: UploadFile = File(..., description="证件照片"),
    current_user: User = Depends(get_current_user)
):
    """
    上传证件照片

    上传证件相关的照片，如驾驶证、行驶证等

    支持的图片格式：jpg, jpeg, png, webp
    最大文件大小：10MB

    Args:
        file: 上传的图片文件
        current_user: 当前登录用户

    Returns:
        ImageUploadResponse: 上传结果
    """
    return await _upload_image_internal(file, "document", current_user)


@router.post("/api/upload/avatar", response_model=ImageUploadResponse)
async def upload_avatar(
    file: UploadFile = File(..., description="头像图片"),
    current_user: User = Depends(get_current_user)
):
    """
    上传用户头像

    上传用户头像图片

    支持的图片格式：jpg, jpeg, png, webp
    最大文件大小：10MB

    Args:
        file: 上传的图片文件
        current_user: 当前登录用户

    Returns:
        ImageUploadResponse: 上传结果
    """
    return await _upload_image_internal(file, "avatar", current_user)
