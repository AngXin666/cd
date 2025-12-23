"""
OCR 识别模块
提供驾驶证识别功能，支持百度 OCR API
"""

import base64
import httpx
from typing import Optional, Dict, Any
from datetime import datetime
from functools import lru_cache

from config import get_settings

# 获取配置
settings = get_settings()


class BaiduOCRClient:
    """
    百度 OCR 客户端
    封装百度 OCR API 调用，提供驾驶证识别功能
    
    使用方法：
    1. 在 .env 文件中配置百度 OCR 的 APP_ID、API_KEY、SECRET_KEY
    2. 调用 recognize_driving_license 方法识别驾驶证
    
    百度 OCR 申请地址：https://cloud.baidu.com/product/ocr
    """
    
    # 百度 OCR API 地址
    TOKEN_URL = "https://aip.baidubce.com/oauth/2.0/token"
    DRIVING_LICENSE_URL = "https://aip.baidubce.com/rest/2.0/ocr/v1/driving_license"
    
    def __init__(self):
        """初始化 OCR 客户端"""
        self.app_id = settings.baidu_ocr_app_id
        self.api_key = settings.baidu_ocr_api_key
        self.secret_key = settings.baidu_ocr_secret_key
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
    
    def is_configured(self) -> bool:
        """
        检查 OCR 是否已配置
        
        Returns:
            bool: 是否已配置百度 OCR 凭据
        """
        return bool(self.api_key and self.secret_key)
    
    async def get_access_token(self) -> str:
        """
        获取百度 OCR 访问令牌
        令牌有效期为 30 天，会自动缓存
        
        Returns:
            str: 访问令牌
            
        Raises:
            Exception: 获取令牌失败时抛出异常
        """
        # 检查缓存的令牌是否有效
        if self._access_token and self._token_expires_at:
            if datetime.now() < self._token_expires_at:
                return self._access_token
        
        # 请求新令牌
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                params={
                    "grant_type": "client_credentials",
                    "client_id": self.api_key,
                    "client_secret": self.secret_key,
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"获取百度 OCR 令牌失败: {response.text}")
            
            data = response.json()
            
            if "access_token" not in data:
                raise Exception(f"获取百度 OCR 令牌失败: {data.get('error_description', '未知错误')}")
            
            # 缓存令牌（有效期 30 天，提前 1 天刷新）
            self._access_token = data["access_token"]
            expires_in = data.get("expires_in", 2592000)  # 默认 30 天
            from datetime import timedelta
            self._token_expires_at = datetime.now() + timedelta(seconds=expires_in - 86400)
            
            return self._access_token
    
    async def recognize_driving_license(
        self,
        image_data: str,
        detect_direction: bool = True
    ) -> Dict[str, Any]:
        """
        识别驾驶证
        
        Args:
            image_data: 图片数据，支持以下格式：
                - Base64 编码的图片数据
                - 图片 URL（以 http:// 或 https:// 开头）
            detect_direction: 是否检测图片朝向，默认 True
            
        Returns:
            dict: 识别结果，包含以下字段：
                - success: 是否识别成功
                - data: 识别到的信息（成功时）
                    - name: 姓名
                    - sex: 性别
                    - nationality: 国籍
                    - address: 住址
                    - birthday: 出生日期
                    - issue_date: 初次领证日期
                    - vehicle_type: 准驾车型
                    - license_number: 证号
                    - valid_from: 有效期起始
                    - valid_to: 有效期截止
                - error: 错误信息（失败时）
                - raw: 原始响应数据
                
        Raises:
            Exception: API 调用失败时抛出异常
        """
        # 检查配置
        if not self.is_configured():
            return {
                "success": False,
                "error": "百度 OCR 未配置，请在 .env 文件中配置 BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET_KEY",
                "raw": None
            }
        
        # 获取访问令牌
        try:
            access_token = await self.get_access_token()
        except Exception as e:
            return {
                "success": False,
                "error": f"获取 OCR 令牌失败: {str(e)}",
                "raw": None
            }
        
        # 构建请求参数
        params = {
            "access_token": access_token
        }
        
        # 判断是 URL 还是 Base64
        if image_data.startswith(("http://", "https://")):
            data = {
                "url": image_data,
                "detect_direction": str(detect_direction).lower()
            }
        else:
            # 移除可能的 data:image/xxx;base64, 前缀
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]
            
            data = {
                "image": image_data,
                "detect_direction": str(detect_direction).lower()
            }
        
        # 调用 OCR API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.DRIVING_LICENSE_URL,
                params=params,
                data=data,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"OCR API 调用失败: HTTP {response.status_code}",
                    "raw": response.text
                }
            
            result = response.json()
            
            # 检查是否有错误
            if "error_code" in result:
                return {
                    "success": False,
                    "error": f"OCR 识别失败: {result.get('error_msg', '未知错误')} (错误码: {result.get('error_code')})",
                    "raw": result
                }
            
            # 解析识别结果
            words_result = result.get("words_result", {})
            
            # 提取各字段
            parsed_data = {
                "name": self._get_field(words_result, "姓名"),
                "sex": self._get_field(words_result, "性别"),
                "nationality": self._get_field(words_result, "国籍"),
                "address": self._get_field(words_result, "住址"),
                "birthday": self._get_field(words_result, "出生日期"),
                "issue_date": self._get_field(words_result, "初次领证日期"),
                "vehicle_type": self._get_field(words_result, "准驾车型"),
                "license_number": self._get_field(words_result, "证号"),
                "valid_from": self._get_field(words_result, "有效期限", "至"),
                "valid_to": self._get_field(words_result, "有效期限", "至", is_end=True),
            }
            
            return {
                "success": True,
                "data": parsed_data,
                "raw": result
            }
    
    def _get_field(
        self,
        words_result: Dict[str, Any],
        field_name: str,
        split_by: Optional[str] = None,
        is_end: bool = False
    ) -> Optional[str]:
        """
        从识别结果中提取字段值
        
        Args:
            words_result: 识别结果字典
            field_name: 字段名称
            split_by: 分隔符（用于提取有效期限等复合字段）
            is_end: 是否取分隔后的后半部分
            
        Returns:
            str: 字段值，不存在则返回 None
        """
        field_data = words_result.get(field_name, {})
        value = field_data.get("words", "")
        
        if not value:
            return None
        
        # 处理复合字段
        if split_by and split_by in value:
            parts = value.split(split_by)
            if is_end and len(parts) > 1:
                return parts[1].strip()
            return parts[0].strip()
        
        return value


# 创建全局 OCR 客户端实例
ocr_client = BaiduOCRClient()


async def recognize_driving_license(image_data: str) -> Dict[str, Any]:
    """
    识别驾驶证（便捷函数）
    
    Args:
        image_data: 图片数据（Base64 或 URL）
        
    Returns:
        dict: 识别结果
    """
    return await ocr_client.recognize_driving_license(image_data)


def is_ocr_configured() -> bool:
    """
    检查 OCR 是否已配置
    
    Returns:
        bool: 是否已配置
    """
    return ocr_client.is_configured()

