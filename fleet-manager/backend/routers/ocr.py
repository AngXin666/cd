"""
OCR 识别路由模块
提供驾驶证、行驶证等证件的 OCR 识别功能

包含的端点：
- POST /api/ocr/driving-license - 识别驾驶证
- POST /api/ocr/vehicle-license - 识别行驶证
- GET /api/ocr/status - 获取 OCR 服务状态

Requirements: 8.1 - 创建 OCR 识别 API
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile

from models import User
from auth import get_current_user
from ocr import recognize_driving_license as ocr_recognize, is_ocr_configured

from schemas import (
    OCRDrivingLicenseRequest, OCRDrivingLicenseResponse, OCRDrivingLicenseData,
    OCRStatusResponse
)


# 创建路由器
router = APIRouter(tags=["OCR识别"])


# ==================== 辅助函数 ====================

async def _process_ocr_image(file: UploadFile) -> str:
    """
    处理上传的图片文件，转换为 Base64 编码

    Args:
        file: 上传的图片文件

    Returns:
        str: Base64 编码的图片数据

    Raises:
        HTTPException: 文件格式不支持或文件为空
    """
    import base64

    # 验证文件类型
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的图片格式，仅支持 JPEG 和 PNG"
        )

    # 读取文件内容
    content = await file.read()

    # 验证文件不为空
    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="图片文件为空"
        )

    # 转换为 Base64
    return base64.b64encode(content).decode("utf-8")


# ==================== OCR API ====================

@router.post("/api/ocr/driving-license", response_model=OCRDrivingLicenseResponse)
async def recognize_driving_license(
    file: Optional[UploadFile] = File(None, description="驾驶证图片文件"),
    request: Optional[OCRDrivingLicenseRequest] = None,
    current_user: User = Depends(get_current_user)
):
    """
    识别驾驶证

    支持两种方式上传图片：
    1. 文件上传：通过 multipart/form-data 上传图片文件
    2. JSON 请求：通过 JSON 请求体传递 Base64 编码或图片 URL

    识别字段包括：
    - 姓名、性别、国籍、住址
    - 出生日期、初次领证日期
    - 准驾车型、证号
    - 有效期限

    Args:
        file: 上传的图片文件（可选）
        request: JSON 请求体（可选）
        current_user: 当前登录用户

    Returns:
        OCRDrivingLicenseResponse: 识别结果

    Raises:
        HTTPException 400: 未提供图片数据
    """
    # 确定图片数据来源
    image_data = None

    if file is not None and file.filename:
        # 文件上传方式
        image_data = await _process_ocr_image(file)
    elif request is not None and request.image:
        # JSON 请求方式
        image_data = request.image
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请上传图片文件或提供图片数据"
        )

    # 调用 OCR 识别
    result = await ocr_recognize(image_data)

    # 构建响应
    if result["success"]:
        return OCRDrivingLicenseResponse(
            success=True,
            data=OCRDrivingLicenseData(**result["data"]),
            error=None
        )
    else:
        return OCRDrivingLicenseResponse(
            success=False,
            data=None,
            error=result["error"]
        )


@router.post("/api/ocr/vehicle-license", response_model=OCRDrivingLicenseResponse)
async def recognize_vehicle_license(
    file: Optional[UploadFile] = File(None, description="行驶证图片文件"),
    request: Optional[OCRDrivingLicenseRequest] = None,
    current_user: User = Depends(get_current_user)
):
    """
    识别行驶证

    支持两种方式上传图片：
    1. 文件上传：通过 multipart/form-data 上传图片文件
    2. JSON 请求：通过 JSON 请求体传递 Base64 编码或图片 URL

    注意：当前使用驾驶证识别模型，行驶证识别功能待完善

    Args:
        file: 上传的图片文件（可选）
        request: JSON 请求体（可选）
        current_user: 当前登录用户

    Returns:
        OCRDrivingLicenseResponse: 识别结果

    Raises:
        HTTPException 400: 未提供图片数据
    """
    # 确定图片数据来源
    image_data = None

    if file is not None and file.filename:
        # 文件上传方式
        image_data = await _process_ocr_image(file)
    elif request is not None and request.image:
        # JSON 请求方式
        image_data = request.image
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请上传图片文件或提供图片数据"
        )

    # 调用 OCR 识别（暂时使用驾驶证识别）
    result = await ocr_recognize(image_data)

    # 构建响应
    if result["success"]:
        return OCRDrivingLicenseResponse(
            success=True,
            data=OCRDrivingLicenseData(**result["data"]),
            error=None
        )
    else:
        return OCRDrivingLicenseResponse(
            success=False,
            data=None,
            error=result["error"]
        )


@router.get("/api/ocr/status", response_model=OCRStatusResponse)
async def get_ocr_status(
    current_user: User = Depends(get_current_user)
):
    """
    获取 OCR 服务状态

    检查 OCR 服务是否已配置

    Args:
        current_user: 当前登录用户

    Returns:
        OCRStatusResponse: OCR 服务状态
    """
    return OCRStatusResponse(
        configured=is_ocr_configured(),
        provider="baidu"
    )
