"""
图片上传 API 测试模块
测试 POST /api/upload/image 端点的功能
包括格式验证、大小验证、上传成功等场景
"""

import pytest
import io
from fastapi.testclient import TestClient
from main import app

# 创建测试客户端
client = TestClient(app)


# ==================== 测试辅助函数 ====================

def get_auth_token() -> str:
    """
    获取测试用的认证 Token
    使用默认管理员账号登录
    
    Returns:
        str: JWT Token
    """
    response = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    # 如果 admin 不存在，尝试 superadmin
    response = client.post("/api/auth/login", json={
        "username": "superadmin",
        "password": "123456"
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    raise Exception("无法获取认证 Token")


def create_test_image(format: str = "jpeg", size_kb: int = 10) -> bytes:
    """
    创建测试用的图片数据
    
    Args:
        format: 图片格式 (jpeg, png, webp)
        size_kb: 图片大小（KB）
        
    Returns:
        bytes: 图片数据
    """
    # JPEG 文件头
    if format == "jpeg":
        header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
    # PNG 文件头
    elif format == "png":
        header = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
    # WebP 文件头
    elif format == "webp":
        header = b'RIFF\x00\x00\x00\x00WEBP'
    else:
        header = b''
    
    # 填充数据到指定大小
    padding_size = size_kb * 1024 - len(header)
    if padding_size > 0:
        return header + b'\x00' * padding_size
    return header


# ==================== 测试用例 ====================

class TestUploadImageAPI:
    """图片上传 API 测试类"""
    
    def test_upload_image_unauthorized(self):
        """
        测试未登录时上传图片
        应该返回 401 错误
        """
        # 创建测试图片
        image_data = create_test_image("jpeg", 10)
        files = {"file": ("test.jpg", io.BytesIO(image_data), "image/jpeg")}
        
        # 不带 Token 上传
        response = client.post("/api/upload/image", files=files)
        
        # 验证返回 401
        assert response.status_code == 401
    
    def test_upload_image_success_jpeg(self):
        """
        测试成功上传 JPEG 图片
        应该返回 200 和图片 URL
        """
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # 创建测试图片
        image_data = create_test_image("jpeg", 10)
        files = {"file": ("test.jpg", io.BytesIO(image_data), "image/jpeg")}
        
        # 上传图片
        response = client.post(
            "/api/upload/image",
            files=files,
            headers=headers,
            params={"category": "vehicle"}
        )
        
        # 验证响应
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["url"].startswith("/uploads/images/vehicle/")
        assert data["url"].endswith(".jpg")
        assert data["size"] > 0
        assert data["filename"] != ""
    
    def test_upload_image_success_png(self):
        """
        测试成功上传 PNG 图片
        应该返回 200 和图片 URL
        """
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # 创建测试图片
        image_data = create_test_image("png", 10)
        files = {"file": ("test.png", io.BytesIO(image_data), "image/png")}
        
        # 上传图片
        response = client.post(
            "/api/upload/image",
            files=files,
            headers=headers,
            params={"category": "document"}
        )
        
        # 验证响应
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["url"].startswith("/uploads/images/document/")
        assert data["url"].endswith(".png")
    
    def test_upload_image_invalid_format(self):
        """
        测试上传不支持的图片格式
        应该返回 400 错误
        """
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # 创建一个 GIF 文件（不支持的格式）
        gif_data = b'GIF89a\x01\x00\x01\x00\x00\x00\x00!'
        files = {"file": ("test.gif", io.BytesIO(gif_data), "image/gif")}
        
        # 上传图片
        response = client.post(
            "/api/upload/image",
            files=files,
            headers=headers
        )
        
        # 验证返回 400
        assert response.status_code == 400
        assert "不支持的图片格式" in response.json()["detail"]
    
    def test_upload_image_invalid_content(self):
        """
        测试上传内容不是有效图片的文件
        应该返回 400 错误
        """
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # 创建一个假的 JPEG 文件（扩展名是 jpg 但内容不是图片）
        fake_data = b'This is not a real image file content'
        files = {"file": ("fake.jpg", io.BytesIO(fake_data), "image/jpeg")}
        
        # 上传图片
        response = client.post(
            "/api/upload/image",
            files=files,
            headers=headers
        )
        
        # 验证返回 400
        assert response.status_code == 400
        assert "不是有效的图片" in response.json()["detail"]
    
    def test_upload_image_different_categories(self):
        """
        测试上传到不同分类目录
        验证分类参数正确工作
        """
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        categories = ["vehicle", "document", "other"]
        
        for category in categories:
            # 创建测试图片
            image_data = create_test_image("jpeg", 5)
            files = {"file": (f"test_{category}.jpg", io.BytesIO(image_data), "image/jpeg")}
            
            # 上传图片
            response = client.post(
                "/api/upload/image",
                files=files,
                headers=headers,
                params={"category": category}
            )
            
            # 验证响应
            assert response.status_code == 200
            data = response.json()
            assert f"/uploads/images/{category}/" in data["url"]


class TestStaticFileServing:
    """静态文件服务测试类"""
    
    def test_access_uploaded_image(self):
        """
        测试访问上传的图片
        上传后应该能通过 URL 访问
        """
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # 上传图片
        image_data = create_test_image("jpeg", 5)
        files = {"file": ("access_test.jpg", io.BytesIO(image_data), "image/jpeg")}
        
        upload_response = client.post(
            "/api/upload/image",
            files=files,
            headers=headers,
            params={"category": "vehicle"}
        )
        
        assert upload_response.status_code == 200
        url = upload_response.json()["url"]
        
        # 访问上传的图片
        access_response = client.get(url)
        
        # 验证能够访问
        assert access_response.status_code == 200


# ==================== 运行测试 ====================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
