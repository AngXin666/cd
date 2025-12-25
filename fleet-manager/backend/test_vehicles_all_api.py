"""
GET /api/vehicles/all 端点测试脚本
测试获取所有车辆列表 API（管理员用）
Requirements: 3.1, 3.2, 3.3, 3.4, 3.5

运行方式：
    python test_vehicles_all_api.py

测试内容：
    - 验证管理权限
    - 支持 warehouse_id 过滤
    - 支持 status 过滤
    - 支持分页
"""

import httpx
import sys
import random
import string
from datetime import datetime
from typing import Optional, Dict

# 后端服务地址
BASE_URL = "http://localhost:8000"

# 测试结果统计
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}


def log_test(name: str, passed: bool, message: str = ""):
    """记录测试结果"""
    status = "✅ PASS" if passed else "❌ FAIL"
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
    
    print(f"{status}: {name}")
    if message:
        print(f"       {message}")
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "message": message
    })


def api_request(
    method: str,
    endpoint: str,
    token: Optional[str] = None,
    json_data: Optional[Dict] = None,
    params: Optional[Dict] = None,
    timeout: int = 10
) -> httpx.Response:
    """发送 API 请求"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    url = f"{BASE_URL}{endpoint}"
    
    if method.upper() == "GET":
        return httpx.get(url, headers=headers, params=params, timeout=timeout)
    elif method.upper() == "POST":
        return httpx.post(url, headers=headers, json=json_data, timeout=timeout)
    elif method.upper() == "PUT":
        return httpx.put(url, headers=headers, json=json_data, timeout=timeout)
    elif method.upper() == "DELETE":
        return httpx.delete(url, headers=headers, timeout=timeout)
    else:
        raise ValueError(f"Unsupported method: {method}")


def generate_license_plate() -> str:
    """生成随机车牌号"""
    provinces = ["京", "沪", "粤", "苏", "浙", "鲁", "川", "渝"]
    letters = string.ascii_uppercase
    digits = string.digits
    
    province = random.choice(provinces)
    letter = random.choice(letters)
    suffix = ''.join(random.choices(digits + letters, k=5))
    
    return f"{province}{letter}{suffix}"


def get_tokens() -> Dict[str, str]:
    """获取各角色的 Token"""
    tokens = {}
    
    test_accounts = [
        ("admin", "admin123", "老板"),
        ("manager", "manager123", "车队长"),
        ("driver", "driver123", "司机"),
    ]
    
    for username, password, role_name in test_accounts:
        try:
            response = api_request("POST", "/api/auth/login", json_data={
                "username": username,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    tokens[username] = data["access_token"]
                    print(f"✅ {role_name}登录成功 ({username})")
        except Exception as e:
            print(f"❌ {role_name}登录失败: {str(e)}")
    
    return tokens


def test_get_all_vehicles_api(tokens: Dict[str, str]):
    """测试 GET /api/vehicles/all 端点"""
    print("\n" + "=" * 60)
    print("测试 GET /api/vehicles/all 端点")
    print("Requirements: 3.1, 3.2, 3.3, 3.4, 3.5")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin")
    manager_token = tokens.get("manager")
    
    # 测试 1: 管理员可以访问 (Requirement 3.1)
    print("\n--- 测试 1: 管理员可以访问 GET /api/vehicles/all ---")
    if admin_token:
        try:
            response = api_request("GET", "/api/vehicles/all", token=admin_token)
            
            if response.status_code == 200:
                vehicles = response.json()
                log_test("管理员访问 /api/vehicles/all", True, f"返回车辆数: {len(vehicles)}")
                
                # 验证返回数据结构
                if vehicles:
                    first_vehicle = vehicles[0]
                    required_fields = ["id", "user_id", "license_plate", "status"]
                    missing_fields = [f for f in required_fields if f not in first_vehicle]
                    if missing_fields:
                        log_test("返回数据结构", False, f"缺少字段: {missing_fields}")
                    else:
                        log_test("返回数据结构", True, "所有必需字段都存在")
            else:
                log_test("管理员访问 /api/vehicles/all", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("管理员访问 /api/vehicles/all", False, f"异常: {str(e)}")
    else:
        log_test("管理员访问 /api/vehicles/all", False, "无管理员 Token")
    
    # 测试 2: 车队长可以访问（管理权限）
    print("\n--- 测试 2: 车队长可以访问 GET /api/vehicles/all ---")
    if manager_token:
        try:
            response = api_request("GET", "/api/vehicles/all", token=manager_token)
            
            if response.status_code == 200:
                vehicles = response.json()
                log_test("车队长访问 /api/vehicles/all", True, f"返回车辆数: {len(vehicles)}")
            else:
                log_test("车队长访问 /api/vehicles/all", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("车队长访问 /api/vehicles/all", False, f"异常: {str(e)}")
    else:
        log_test("车队长访问 /api/vehicles/all", False, "无车队长 Token")
    
    # 测试 3: 司机无权访问 (Requirement 3.5)
    print("\n--- 测试 3: 司机无权访问 GET /api/vehicles/all ---")
    if driver_token:
        try:
            response = api_request("GET", "/api/vehicles/all", token=driver_token)
            
            if response.status_code == 403:
                log_test("司机无权访问返回 403", True, "正确拒绝司机访问")
            else:
                log_test("司机无权访问返回 403", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("司机无权访问返回 403", False, f"异常: {str(e)}")
    else:
        log_test("司机无权访问返回 403", False, "无司机 Token")
    
    # 测试 4: 无 Token 访问
    print("\n--- 测试 4: 无 Token 访问 ---")
    try:
        response = api_request("GET", "/api/vehicles/all")
        
        if response.status_code in [401, 403]:
            log_test("无 Token 访问返回 401/403", True)
        else:
            log_test("无 Token 访问返回 401/403", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("无 Token 访问返回 401/403", False, f"异常: {str(e)}")
    
    # 测试 5: 按状态过滤 (Requirement 3.3)
    print("\n--- 测试 5: 按状态过滤 ---")
    if admin_token:
        try:
            response = api_request("GET", "/api/vehicles/all", token=admin_token, params={"status": "active"})
            
            if response.status_code == 200:
                vehicles = response.json()
                # 验证所有返回的车辆都是 active 状态
                all_active = all(v.get("status") == "active" for v in vehicles)
                if all_active or len(vehicles) == 0:
                    log_test("按状态过滤 (active)", True, f"返回 active 车辆数: {len(vehicles)}")
                else:
                    log_test("按状态过滤 (active)", False, "返回了非 active 状态的车辆")
            else:
                log_test("按状态过滤 (active)", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("按状态过滤 (active)", False, f"异常: {str(e)}")
    
    # 测试 6: 按 warehouse_id 过滤 (Requirement 3.2)
    print("\n--- 测试 6: 按 warehouse_id 过滤 ---")
    if admin_token:
        try:
            # 使用一个不存在的仓库 ID，应该返回空列表
            response = api_request("GET", "/api/vehicles/all", token=admin_token, params={"warehouse_id": 99999})
            
            if response.status_code == 200:
                vehicles = response.json()
                # 不存在的仓库应该返回空列表
                if len(vehicles) == 0:
                    log_test("按 warehouse_id 过滤 (不存在的仓库)", True, "返回空列表")
                else:
                    # 验证所有返回的车辆都属于该仓库
                    all_match = all(v.get("warehouse_id") == 99999 for v in vehicles if v.get("warehouse_id") is not None)
                    if all_match:
                        log_test("按 warehouse_id 过滤 (不存在的仓库)", True, f"返回车辆数: {len(vehicles)}")
                    else:
                        log_test("按 warehouse_id 过滤 (不存在的仓库)", False, "返回了不属于该仓库的车辆")
            else:
                log_test("按 warehouse_id 过滤 (不存在的仓库)", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("按 warehouse_id 过滤 (不存在的仓库)", False, f"异常: {str(e)}")
    
    # 测试 7: 分页功能 (Requirement 3.4)
    print("\n--- 测试 7: 分页功能 ---")
    if admin_token:
        try:
            # 测试 skip 和 limit 参数
            response = api_request("GET", "/api/vehicles/all", token=admin_token, params={"skip": 0, "limit": 5})
            
            if response.status_code == 200:
                vehicles = response.json()
                if len(vehicles) <= 5:
                    log_test("分页功能 (limit=5)", True, f"返回车辆数: {len(vehicles)}")
                else:
                    log_test("分页功能 (limit=5)", False, f"返回车辆数超过 limit: {len(vehicles)}")
            else:
                log_test("分页功能 (limit=5)", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("分页功能 (limit=5)", False, f"异常: {str(e)}")
    
    # 测试 8: 组合过滤（状态 + 分页）
    print("\n--- 测试 8: 组合过滤（状态 + 分页） ---")
    if admin_token:
        try:
            response = api_request("GET", "/api/vehicles/all", token=admin_token, params={
                "status": "reviewing",
                "skip": 0,
                "limit": 10
            })
            
            if response.status_code == 200:
                vehicles = response.json()
                # 验证所有返回的车辆都是 reviewing 状态
                all_reviewing = all(v.get("status") == "reviewing" for v in vehicles)
                if (all_reviewing or len(vehicles) == 0) and len(vehicles) <= 10:
                    log_test("组合过滤（状态 + 分页）", True, f"返回 reviewing 车辆数: {len(vehicles)}")
                else:
                    log_test("组合过滤（状态 + 分页）", False, "过滤或分页不正确")
            else:
                log_test("组合过滤（状态 + 分页）", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("组合过滤（状态 + 分页）", False, f"异常: {str(e)}")


def print_summary():
    """打印测试结果汇总"""
    print("\n" + "=" * 60)
    print("GET /api/vehicles/all 测试结果汇总")
    print("=" * 60)
    
    total = test_results["passed"] + test_results["failed"]
    print(f"总测试数: {total}")
    print(f"✅ 通过: {test_results['passed']}")
    print(f"❌ 失败: {test_results['failed']}")
    
    # 失败的测试
    if test_results["failed"] > 0:
        print("\n失败的测试:")
        print("-" * 40)
        for test in test_results["tests"]:
            if not test["passed"]:
                print(f"  {test['name']}")
                if test["message"]:
                    print(f"    -> {test['message']}")
    
    print("=" * 60)
    
    # 计算通过率
    if total > 0:
        pass_rate = (test_results["passed"] / total) * 100
        print(f"通过率: {pass_rate:.1f}%")


def main():
    """主函数"""
    print("=" * 60)
    print("GET /api/vehicles/all 端点测试")
    print("Requirements: 3.1, 3.2, 3.3, 3.4, 3.5")
    print("=" * 60)
    print(f"后端地址: {BASE_URL}")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 检查服务是否可用
    print("\n检查后端服务...")
    try:
        response = httpx.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ 后端服务正常运行")
        else:
            print(f"❌ 后端服务异常: {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ 无法连接后端服务: {str(e)}")
        print("\n请确保后端服务已启动:")
        print("  cd fleet-manager/backend")
        print("  python main.py")
        sys.exit(1)
    
    # 获取 Token
    print("\n获取测试账号 Token...")
    tokens = get_tokens()
    
    if not tokens:
        print("\n❌ 无法获取任何 Token，终止测试")
        sys.exit(1)
    
    # 运行测试
    test_get_all_vehicles_api(tokens)
    
    # 打印汇总
    print_summary()
    
    # 返回退出码
    return 0 if test_results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
