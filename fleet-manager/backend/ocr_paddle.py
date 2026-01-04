"""
PaddleOCR 本地识别模块
提供驾驶证、行驶证识别功能，无需注册、完全免费

依赖安装：
pip install paddlepaddle paddleocr

注意：首次运行会自动下载模型文件（约 100MB）
"""

import re
import base64
import tempfile
import os
from typing import Optional, Dict, Any, List

# PaddleOCR 延迟导入，避免未安装时报错
_paddle_ocr = None


def _get_paddle_ocr():
    """
    延迟加载 PaddleOCR 实例
    
    Returns:
        PaddleOCR 实例
    """
    global _paddle_ocr
    if _paddle_ocr is None:
        try:
            from paddleocr import PaddleOCR
            # use_angle_cls=True 启用文字方向分类
            # lang='ch' 使用中文模型
            # show_log=False 关闭日志输出
            _paddle_ocr = PaddleOCR(
                use_angle_cls=True,
                lang='ch',
                show_log=False,
                use_gpu=False  # 默认使用 CPU
            )
        except ImportError:
            raise ImportError(
                "PaddleOCR 未安装，请运行: pip install paddlepaddle paddleocr"
            )
    return _paddle_ocr


def is_paddle_ocr_available() -> bool:
    """
    检查 PaddleOCR 是否可用
    
    Returns:
        bool: 是否可用
    """
    try:
        from paddleocr import PaddleOCR
        return True
    except ImportError:
        return False


def _decode_image(image_data: str) -> str:
    """
    解码图片数据，返回临时文件路径
    
    Args:
        image_data: Base64 编码的图片或图片 URL
        
    Returns:
        str: 临时文件路径
    """
    # 如果是 URL，直接返回（PaddleOCR 支持 URL）
    if image_data.startswith(("http://", "https://")):
        return image_data
    
    # 移除 data:image/xxx;base64, 前缀
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]
    
    # 解码 Base64
    image_bytes = base64.b64decode(image_data)
    
    # 写入临时文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as f:
        f.write(image_bytes)
        return f.name


def _extract_text_lines(ocr_result: List) -> List[str]:
    """
    从 OCR 结果中提取文本行
    
    Args:
        ocr_result: PaddleOCR 返回的结果
        
    Returns:
        List[str]: 文本行列表
    """
    lines = []
    if ocr_result and len(ocr_result) > 0:
        for line in ocr_result[0]:
            if line and len(line) > 1:
                text = line[1][0]  # 获取识别的文字
                lines.append(text)
    return lines


def _parse_driving_license(text_lines: List[str]) -> Dict[str, Optional[str]]:
    """
    解析驾驶证文本
    
    Args:
        text_lines: OCR 识别的文本行
        
    Returns:
        Dict: 解析后的驾驶证信息
    """
    result = {
        "name": None,
        "sex": None,
        "nationality": None,
        "address": None,
        "birthday": None,
        "issue_date": None,
        "vehicle_type": None,
        "license_number": None,
        "valid_from": None,
        "valid_to": None,
    }
    
    full_text = " ".join(text_lines)
    
    for i, line in enumerate(text_lines):
        line = line.strip()
        
        # 姓名
        if "姓名" in line:
            name = line.replace("姓名", "").strip()
            if not name and i + 1 < len(text_lines):
                name = text_lines[i + 1].strip()
            result["name"] = name if name else None
        
        # 性别
        if "性别" in line:
            if "男" in line:
                result["sex"] = "男"
            elif "女" in line:
                result["sex"] = "女"
        
        # 国籍
        if "国籍" in line:
            nationality = line.replace("国籍", "").strip()
            if not nationality and i + 1 < len(text_lines):
                nationality = text_lines[i + 1].strip()
            result["nationality"] = nationality if nationality else "中国"
        
        # 住址
        if "住址" in line:
            address = line.replace("住址", "").strip()
            if not address and i + 1 < len(text_lines):
                address = text_lines[i + 1].strip()
            result["address"] = address if address else None
        
        # 出生日期
        if "出生日期" in line or "出生" in line:
            # 匹配日期格式 YYYY-MM-DD 或 YYYYMMDD
            date_match = re.search(r'(\d{4}[-/]?\d{2}[-/]?\d{2})', line)
            if date_match:
                result["birthday"] = date_match.group(1)
        
        # 初次领证日期
        if "初次领证" in line:
            date_match = re.search(r'(\d{4}[-/]?\d{2}[-/]?\d{2})', line)
            if date_match:
                result["issue_date"] = date_match.group(1)
        
        # 准驾车型
        if "准驾车型" in line:
            vehicle_type = line.replace("准驾车型", "").strip()
            if not vehicle_type:
                # 常见车型
                for vt in ["C1", "C2", "B1", "B2", "A1", "A2", "A3"]:
                    if vt in full_text:
                        vehicle_type = vt
                        break
            result["vehicle_type"] = vehicle_type if vehicle_type else None
        
        # 证号（身份证号）
        if "证号" in line or len(line) == 18:
            # 匹配 18 位身份证号
            id_match = re.search(r'(\d{17}[\dXx])', line)
            if id_match:
                result["license_number"] = id_match.group(1).upper()
        
        # 有效期限
        if "有效期" in line:
            # 匹配日期范围
            dates = re.findall(r'(\d{4}[-/]?\d{2}[-/]?\d{2})', line)
            if len(dates) >= 1:
                result["valid_from"] = dates[0]
            if len(dates) >= 2:
                result["valid_to"] = dates[1]
            elif "长期" in line:
                result["valid_to"] = "长期"
    
    return result


def _parse_vehicle_license(text_lines: List[str]) -> Dict[str, Optional[str]]:
    """
    解析行驶证文本
    
    Args:
        text_lines: OCR 识别的文本行
        
    Returns:
        Dict: 解析后的行驶证信息
    """
    result = {
        "plate_number": None,      # 号牌号码
        "vehicle_type": None,      # 车辆类型
        "owner": None,             # 所有人
        "address": None,           # 住址
        "use_character": None,     # 使用性质
        "model": None,             # 品牌型号
        "vin": None,               # 车辆识别代号
        "engine_number": None,     # 发动机号码
        "register_date": None,     # 注册日期
        "issue_date": None,        # 发证日期
    }
    
    for i, line in enumerate(text_lines):
        line = line.strip()
        
        # 号牌号码
        plate_match = re.search(r'([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼][A-Z][A-Z0-9]{5,6})', line)
        if plate_match:
            result["plate_number"] = plate_match.group(1)
        
        # 车辆类型
        if "车辆类型" in line:
            vtype = line.replace("车辆类型", "").strip()
            result["vehicle_type"] = vtype if vtype else None
        
        # 所有人
        if "所有人" in line:
            owner = line.replace("所有人", "").strip()
            if not owner and i + 1 < len(text_lines):
                owner = text_lines[i + 1].strip()
            result["owner"] = owner if owner else None
        
        # 住址
        if "住址" in line:
            address = line.replace("住址", "").strip()
            result["address"] = address if address else None
        
        # 使用性质
        if "使用性质" in line:
            use_char = line.replace("使用性质", "").strip()
            result["use_character"] = use_char if use_char else None
        
        # 品牌型号
        if "品牌型号" in line:
            model = line.replace("品牌型号", "").strip()
            result["model"] = model if model else None
        
        # VIN
        if "车辆识别代号" in line or "VIN" in line.upper():
            vin_match = re.search(r'([A-Z0-9]{17})', line.upper())
            if vin_match:
                result["vin"] = vin_match.group(1)
        
        # 发动机号
        if "发动机号" in line:
            engine = line.replace("发动机号码", "").replace("发动机号", "").strip()
            result["engine_number"] = engine if engine else None
        
        # 注册日期
        if "注册日期" in line:
            date_match = re.search(r'(\d{4}[-/]?\d{2}[-/]?\d{2})', line)
            if date_match:
                result["register_date"] = date_match.group(1)
        
        # 发证日期
        if "发证日期" in line:
            date_match = re.search(r'(\d{4}[-/]?\d{2}[-/]?\d{2})', line)
            if date_match:
                result["issue_date"] = date_match.group(1)
    
    return result


async def recognize_driving_license_paddle(image_data: str) -> Dict[str, Any]:
    """
    使用 PaddleOCR 识别驾驶证
    
    Args:
        image_data: 图片数据（Base64 或 URL）
        
    Returns:
        dict: 识别结果
            - success: 是否成功
            - data: 识别到的信息
            - error: 错误信息
            - raw: 原始文本行
    """
    temp_file = None
    try:
        # 检查 PaddleOCR 是否可用
        if not is_paddle_ocr_available():
            return {
                "success": False,
                "error": "PaddleOCR 未安装，请运行: pip install paddlepaddle paddleocr",
                "data": None,
                "raw": None
            }
        
        # 获取 OCR 实例
        ocr = _get_paddle_ocr()
        
        # 解码图片
        image_path = _decode_image(image_data)
        if not image_path.startswith("http"):
            temp_file = image_path
        
        # 执行 OCR
        result = ocr.ocr(image_path, cls=True)
        
        # 提取文本
        text_lines = _extract_text_lines(result)
        
        if not text_lines:
            return {
                "success": False,
                "error": "未识别到文字",
                "data": None,
                "raw": []
            }
        
        # 解析驾驶证信息
        parsed_data = _parse_driving_license(text_lines)
        
        return {
            "success": True,
            "data": parsed_data,
            "error": None,
            "raw": text_lines
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"OCR 识别失败: {str(e)}",
            "data": None,
            "raw": None
        }
    finally:
        # 清理临时文件
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except:
                pass


async def recognize_vehicle_license_paddle(image_data: str) -> Dict[str, Any]:
    """
    使用 PaddleOCR 识别行驶证
    
    Args:
        image_data: 图片数据（Base64 或 URL）
        
    Returns:
        dict: 识别结果
    """
    temp_file = None
    try:
        if not is_paddle_ocr_available():
            return {
                "success": False,
                "error": "PaddleOCR 未安装，请运行: pip install paddlepaddle paddleocr",
                "data": None,
                "raw": None
            }
        
        ocr = _get_paddle_ocr()
        image_path = _decode_image(image_data)
        if not image_path.startswith("http"):
            temp_file = image_path
        
        result = ocr.ocr(image_path, cls=True)
        text_lines = _extract_text_lines(result)
        
        if not text_lines:
            return {
                "success": False,
                "error": "未识别到文字",
                "data": None,
                "raw": []
            }
        
        parsed_data = _parse_vehicle_license(text_lines)
        
        return {
            "success": True,
            "data": parsed_data,
            "error": None,
            "raw": text_lines
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"OCR 识别失败: {str(e)}",
            "data": None,
            "raw": None
        }
    finally:
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except:
                pass


async def recognize_general_paddle(image_data: str) -> Dict[str, Any]:
    """
    使用 PaddleOCR 进行通用文字识别
    
    Args:
        image_data: 图片数据（Base64 或 URL）
        
    Returns:
        dict: 识别结果
            - success: 是否成功
            - text: 识别到的全部文字
            - lines: 文字行列表
            - error: 错误信息
    """
    temp_file = None
    try:
        if not is_paddle_ocr_available():
            return {
                "success": False,
                "error": "PaddleOCR 未安装",
                "text": None,
                "lines": None
            }
        
        ocr = _get_paddle_ocr()
        image_path = _decode_image(image_data)
        if not image_path.startswith("http"):
            temp_file = image_path
        
        result = ocr.ocr(image_path, cls=True)
        text_lines = _extract_text_lines(result)
        
        return {
            "success": True,
            "text": "\n".join(text_lines),
            "lines": text_lines,
            "error": None
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": None,
            "lines": None
        }
    finally:
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except:
                pass
