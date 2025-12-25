"""
OCR 和健康检查模块 API 测试脚本
测试 OCR 服务状态、驾驶证识别、健康检查等 API 功能
Requirements: 1.9, 1.10

运行方式：
    python test_ocr_health_api.py

测试内容：
    任务 10.1: 测试 OCR API
        - GET /api/ocr/status 检查 OCR 服务状态
        - POST /api/ocr/driving-license 测试驾驶证识别（如已配置）
    任务 10.2: 测试健康检查 API
        - GET /api/health 健康检查
        - GET /api/health/live 存活检查
        - GET /api/health/ready 就绪检查
"""

import httpx
import sys

# 后端服务地址
BASE_URL = "http://localhost:8000"

# 测试结果统计
test_results = {
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "tests": []
}


def log_test(name: str, passed: bool, message: str = "", skipped: bool = False):
    """记录测试结果"""
    if skipped:
        status = "⏭️ SKIP"
        test_results["skipped"] += 1
    elif passed:
        status = "✅ PASS"
        test_results["passed"] += 1
    else:
        status = "❌ FAIL"
        test_results["failed"] += 1
    
    print(f"{status}: {name}")
    if message:
        print(f"       {message}")
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "skipped": skipped,
        "message": message
    })


def get_token(username: str = "admin", password: str = "admin123") -> str:
    """获取登录 Token"""
    try:
        response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": username, "password": password},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()["access_token"]
    except Exception as e:
        print(f"获取 Token 失败: {e}")
    return None


# ==================== 任务 10.1: 测试 OCR API ====================

def test_ocr_status(token: str):
    """
    测试 10.1.1: 获取 OCR 服务状态
    GET /api/ocr/status 检查 OCR 服务状态
    """
    print("\n" + "=" * 60)
    print("测试 10.1.1: OCR 服务状态检查")
    print("=" * 60)
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/ocr/status",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "configured" in data and "provider" in data:
                configured = "已配置" if data["configured"] else "未配置"
                log_test("OCR 状态检查", True, f"OCR 服务 {configured}")
                return data["configured"]
            else:
                log_test("OCR 状态检查", False, f"响应缺少必要字段")
        else:
            log_test("OCR 状态检查", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("OCR 状态检查", False, f"异常: {str(e)}")
    
    return False


def test_ocr_status_no_auth():
    """
    测试 10.1.2: 无认证访问 OCR 状态
    GET /api/ocr/status 测试无 Token 访问应返回 401
    """
    print("\n" + "=" * 60)
    print("测试 10.1.2: OCR 状态检查 - 未授权访问")
    print("=" * 60)
    
    try:
        response = httpx.get(f"{BASE_URL}/api/ocr/status", timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 401:
            log_test("OCR 状态检查 - 未授权", True, "正确返回 401 未授权")
        else:
            log_test("OCR 状态检查 - 未授权", False, f"期望 401，实际: {response.status_code}")
    except Exception as e:
        log_test("OCR 状态检查 - 未授权", False, f"异常: {str(e)}")


def test_ocr_driving_license(token: str, ocr_configured: bool):
    """
    测试 10.1.3: 驾驶证识别
    POST /api/ocr/driving-license 测试驾驶证识别（如已配置）
    """
    print("\n" + "=" * 60)
    print("测试 10.1.3: 驾驶证识别 - OCR " + ("已配置" if ocr_configured else "未配置"))
    print("=" * 60)
    
    try:
        # 使用一个简单的测试图片（1x1 白色像素的 base64）
        test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = httpx.post(
            f"{BASE_URL}/api/ocr/driving-license",
            headers={"Authorization": f"Bearer {token}"},
            json={"image": test_image},
            timeout=30
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if not ocr_configured:
                # OCR 未配置时，应返回 success=False 和错误信息
                if data.get("success") == False and data.get("error"):
                    log_test("驾驶证识别 - OCR 未配置", True, f"正确返回错误: {data['error']}")
                else:
                    log_test("驾驶证识别 - OCR 未配置", False, f"未配置时应返回错误")
            else:
                # OCR 已配置时，检查响应格式
                if "success" in data:
                    if data["success"]:
                        log_test("驾驶证识别 - OCR 已配置", True, f"识别成功")
                    else:
                        # 测试图片不是真正的驾驶证，识别失败是正常的
                        log_test("驾驶证识别 - OCR 已配置", True, f"API 正常（测试图片非驾驶证）")
                else:
                    log_test("驾驶证识别", False, f"响应格式错误")
        else:
            log_test("驾驶证识别", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("驾驶证识别", False, f"异常: {str(e)}")


def test_ocr_driving_license_no_auth():
    """
    测试 10.1.4: 无认证访问驾驶证识别
    POST /api/ocr/driving-license 测试无 Token 访问应返回 401
    """
    print("\n" + "=" * 60)
    print("测试 10.1.4: 驾驶证识别 - 未授权访问")
    print("=" * 60)
    
    try:
        test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = httpx.post(
            f"{BASE_URL}/api/ocr/driving-license",
            json={"image": test_image},
            timeout=10
        )
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 401:
            log_test("驾驶证识别 - 未授权", True, "正确返回 401 未授权")
        else:
            log_test("驾驶证识别 - 未授权", False, f"期望 401，实际: {response.status_code}")
    except Exception as e:
        log_test("驾驶证识别 - 未授权", False, f"异常: {str(e)}")


# ==================== 任务 10.2: 测试健康检查 API ====================

def test_health_check():
    """
    测试 10.2.1: 健康检查
    GET /api/health 健康检查
    """
    print("\n" + "=" * 60)
    print("测试 10.2.1: 健康检查 API")
    print("=" * 60)
    
    try:
        response = httpx.get(f"{BASE_URL}/api/health", timeout=10)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["status", "database", "version"]
            missing = [f for f in required_fields if f not in data]
            
            if not missing:
                log_test("健康检查", True, f"服务状态: {data['status']}, 版本: {data['version']}")
            else:
                log_test("健康检查", False, f"缺少字段: {missing}")
        else:
            log_test("健康检查", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("健康检查", False, f"异常: {str(e)}")


def test_liveness_check():
    """
    测试 10.2.2: 存活检查
    GET /api/health/live 存活检查
    """
    print("\n" + "=" * 60)
    print("测试 10.2.2: 存活检查 API")
    print("=" * 60)
    
    try:
        response = httpx.get(f"{BASE_URL}/api/health/live", timeout=10)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "alive":
                log_test("存活检查", True, "服务存活状态正常")
            else:
                log_test("存活检查", False, f"状态不正确: {data.get('status')}")
        else:
            log_test("存活检查", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("存活检查", False, f"异常: {str(e)}")


def test_readiness_check():
    """
    测试 10.2.3: 就绪检查
    GET /api/health/ready 就绪检查
    """
    print("\n" + "=" * 60)
    print("测试 10.2.3: 就绪检查 API")
    print("=" * 60)
    
    try:
        response = httpx.get(f"{BASE_URL}/api/health/ready", timeout=10)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ready":
                log_test("就绪检查", True, "服务就绪状态正常")
            else:
                log_test("就绪检查", False, f"状态不正确: {data.get('status')}")
        elif response.status_code == 503:
            # 503 表示服务未就绪，这也是有效的响应
            log_test("就绪检查", True, "服务返回 503 未就绪（数据库可能未连接）")
        else:
            log_test("就绪检查", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("就绪检查", False, f"异常: {str(e)}")


def test_root_endpoint():
    """
    测试 10.2.4: 根路径
    GET / 根路径返回 API 信息
    """
    print("\n" + "=" * 60)
    print("测试 10.2.4: 根路径 API")
    print("=" * 60)
    
    try:
        response = httpx.get(f"{BASE_URL}/", timeout=10)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "name" in data and "version" in data:
                log_test("根路径", True, f"API 名称: {data['name']}, 版本: {data['version']}")
            else:
                log_test("根路径", False, "响应缺少必要字段")
        else:
            log_test("根路径", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("根路径", False, f"异常: {str(e)}")


# ==================== 测试报告和主函数 ====================

def print_summary():
    """打印测试结果汇总"""
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    total = test_results["passed"] + test_results["failed"] + test_results["skipped"]
    print(f"通过: {test_results['passed']}")
    print(f"失败: {test_results['failed']}")
    print(f"跳过: {test_results['skipped']}")
    print(f"总计: {total}")
    
    if test_results["failed"] > 0:
        print("\n失败的测试:")
        for test in test_results["tests"]:
            if not test["passed"] and not test.get("skipped"):
                print(f"  - {test['name']}: {test['message']}")
    
    if test_results["failed"] == 0:
        print("\n✅ 所有测试通过！")
    else:
        print(f"\n❌ 有 {test_results['failed']} 个测试失败")
    
    return test_results["failed"] == 0


def main():
    """主测试函数"""
    print("=" * 60)
    print("OCR 和健康检查 API 测试")
    print("Requirements: 1.9, 1.10")
    print("=" * 60)
    
    # 检查后端服务是否运行
    print("\n检查后端服务...")
    try:
        response = httpx.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ 后端服务正常运行")
        else:
            print(f"⚠️ 后端服务响应异常: {response.status_code}")
    except httpx.ConnectError:
        print("❌ 无法连接到后端服务")
        print(f"   请确保后端服务已启动: python main.py")
        print(f"   服务地址: {BASE_URL}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 检查后端服务时出错: {e}")
        sys.exit(1)
    
    # 获取认证 Token
    print("\n获取认证 Token...")
    token = get_token("admin", "admin123")
    
    if token:
        print("✅ 获取认证 Token 成功")
    else:
        print("❌ 无法获取认证 Token")
        sys.exit(1)
    
    # ==================== 一、OCR API 测试 ====================
    print("\n" + "=" * 60)
    print("一、OCR API 测试 (Requirements: 1.9)")
    print("=" * 60)
    
    ocr_configured = test_ocr_status(token)
    test_ocr_status_no_auth()
    test_ocr_driving_license(token, ocr_configured)
    test_ocr_driving_license_no_auth()
    
    # ==================== 二、健康检查 API 测试 ====================
    print("\n" + "=" * 60)
    print("二、健康检查 API 测试 (Requirements: 1.10)")
    print("=" * 60)
    
    test_health_check()
    test_liveness_check()
    test_readiness_check()
    test_root_endpoint()
    
    # 打印测试摘要
    success = print_summary()
    
    # 返回退出码
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
