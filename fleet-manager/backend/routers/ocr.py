"""
OCR 识别路由模块
提供驾驶证、行驶证等证件的 OCR 识别功能

支持两种 OCR 引擎：
1. 百度 OCR API（需要注册配置）
2. PaddleOCR 本地识别（免费，无需注册）

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
from ocr import recognize_driving_license as baidu_ocr_recognize, is_ocr_configured as is_baidu_configured

# 尝试导入 PaddleOCR
try:
    from ocr_paddle import (
        recognize_driving_license_paddle,
        recognize_vehicle_license_paddle,
        is_paddle_ocr_available
    )
    PADDLE_AVAILABLE = True
except ImportError:
    PADDLE_AVAILABLE = False
    
    async def recognize_driving_license_paddle(image_data: str):
        return {"success": False, "error": "PaddleOCR 未安装", "data": None}
    
    async def recognize_vehicle_license_paddle(image_data: str):
        return {"success": False, "error": "PaddleOCR 未安装", "data": None}
    
    def is_paddle_ocr_available():
        return False

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


async def _get_ocr_engine() -> str:
    """
    获取当前使用的 OCR 引擎
    
    优先级：
    1. 如果百度 OCR 已配置，使用百度
    2. 如果 PaddleOCR 可用，使用 Paddle
    3. 都不可用返回 None
    
    Returns:
        str: "baidu", "paddle" 或 "none"
    """
    if is_baidu_configured():
        return "baidu"
    if PADDLE_AVAILABLE and is_paddle_ocr_available():
        return "paddle"
    return "none"


async def _recognize_driving_license(image_data: str):
    """
    识别驾驶证（自动选择引擎）
    """
    engine = await _get_ocr_engine()
    
    if engine == "baidu":
        return await baidu_ocr_recognize(image_data)
    elif engine == "paddle":
        return await recognize_driving_license_paddle(image_data)
    else:
        return {
            "success": False,
            "error": "OCR 服务未配置。请配置百度 OCR 或安装 PaddleOCR (pip install paddlepaddle paddleocr)",
            "data": None
        }


async def _recognize_vehicle_license(image_data: str):
    """
    识别行驶证（自动选择引擎）
    """
    engine = await _get_ocr_engine()
    
    if engine == "baidu":
        # 百度 OCR 暂时使用驾驶证识别
        return await baidu_ocr_recognize(image_data)
    elif engine == "paddle":
        return await recognize_vehicle_license_paddle(image_data)
    else:
        return {
            "success": False,
            "error": "OCR 服务未配置。请配置百度 OCR 或安装 PaddleOCR (pip install paddlepaddle paddleocr)",
            "data": None
        }


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

    # 调用 OCR 识别（自动选择引擎）
    result = await _recognize_driving_license(image_data)

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

    # 调用 OCR 识别（自动选择引擎）
    result = await _recognize_vehicle_license(image_data)

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
    engine = await _get_ocr_engine()
    
    if engine == "baidu":
        return OCRStatusResponse(configured=True, provider="baidu")
    elif engine == "paddle":
        return OCRStatusResponse(configured=True, provider="paddle")
    else:
        return OCRStatusResponse(configured=False, provider="none")
