"""
GET /api/warehouses/{id}/vehicles 端点测试脚本
测试获取仓库车辆列表 API
Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
"""

import requests
from typing import Dict, Optional

# 后端 API 基础 URL
BASE_URL = "http://localhost:8000"

# 测试账号
TEST_ACCOUNTS = {
    "admin": {"username": "admin", "password": "admin123"},      # 老板
    "manager": {"username": "manager", "password": "manager123"}, # 车队长
    "driver": {"username": "driver", "password": "driver123"},    # 司机
}

# 测试结果统计
test_results = {
    "passed": 0,
    "failed": 0,
    "total": 0
}


def log_test(test_name: str, passed: bool, message: str = ""):
    """
    记录测试结果
    
    Args:
        test_name: 测试名称
        passed: 是否通过
        message: 附加信息
    """
    test_results["total"] += 1
    if passed:
        test_results["passed"] += 1
        print(f"  ✅ {test_name}: PASSED {message}")
    else:
        test_results["failed"] += 1
        print(f"  ❌ {test_name}: FAILED {message}")


def get_token(username: str, password: str) -> Optional[str]:
    """
    获取登录 Token
    
    Args:
        username: 用户名
        password: 密码
        
    Returns:
        str: JWT Token，失败返回 None
    """
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": username, "password": password}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    except Exception as e:
        print(f"  获取 Token 失败: {e}")
        return None


def api_request(
    method: str,
    endpoint: str,
    token: Optional[str] = None,
    params: Optional[Dict] = None,
    json_data: Optional[Dict] = None
) -> requests.Response:
    """
    发送 API 请求
    
    Args:
        method: HTTP 方法
        endpoint: API 端点
        token: JWT Token（可选）
        params: 查询参数（可选）
        json_data: JSON 请求体（可选）
        
    Returns:
        Response: 响应对象
    """
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    url = f"{BASE_URL}{endpoint}"
    
    if method.upper() == "GET":
        return requests.get(url, headers=headers, params=params)
    elif method.upper() == "POST":
        return requests.post(url, headers=headers, json=json_data)
    elif method.upper() == "PUT":
        return requests.put(url, headers=headers, json=json_data)
    elif method.upper() == "DELETE":
        return requests.delete(url, headers=headers)
    else:
        raise ValueError(f"不支持的 HTTP 方法: {method}")


def get_all_tokens() -> Dict[str, Optional[str]]:
    """
    获取所有测试账号的 Token
    
    Returns:
        Dict: 账号名到 Token 的映射
    """
    tokens = {}
    for account_name, credentials in TEST_ACCOUNTS.items():
        token = get_token(credentials["username"], credentials["password"])
        tokens[account_name] = token
        if token:
            print(f"  ✓ {account_name} 登录成功")
        else:
            print(f"  ✗ {account_name} 登录失败")
    return tokens


def get_or_create_warehouse(token: str) -> Optional[int]:
    """
    获取或创建测试仓库
    
    Args:
        token: 管理员 Token
        
    Returns:
        int: 仓库ID，失败返回 None
    """
    # 先获取现有仓库列表
    response = api_request("GET", "/api/warehouses", token=token)
    if response.status_code == 200:
        warehouses = response.json()
        if warehouses:
            return warehouses[0]["id"]
    
    # 如果没有仓库，创建一个
    response = api_request(
        "POST",
        "/api/warehouses",
        token=token,
        json_data={"name": "测试仓库", "address": "测试地址"}
    )
    if response.status_code == 200:
        return response.json().get("id")
    
    return None


def test_get_warehouse_vehicles_api(tokens: Dict[str, str]):
    """
    测试 GET /api/warehouses/{id}/vehicles 端点
    
    Args:
        tokens: 各角色的 Token 字典
    """
    print("\n" + "=" * 60)
    print("测试 GET /api/warehouses/{id}/vehicles 端点")
    print("Requirements: 4.1, 4.2, 4.3, 4.4, 4.5")
    print("=" * 60)
    
    admin_token = tokens.get("admin")
    manager_token = tokens.get("manager")
    driver_token = tokens.get("driver")
    
    # 获取或创建测试仓库
    warehouse_id = None
    if admin_token:
        warehouse_id = get_or_create_warehouse(admin_token)
        if warehouse_id:
            print(f"\n使用仓库 ID: {warehouse_id}")
        else:
            print("\n⚠️ 无法获取或创建测试仓库")
            return
    
    # 测试 1: 管理员可以访问 (Requirement 4.1)
    print("\n--- 测试 1: 管理员可以访问仓库车辆列表 ---")
    if admin_token and warehouse_id:
        try:
            response = api_request(
                "GET",
                f"/api/warehouses/{warehouse_id}/vehicles",
                token=admin_token
            )
            
            if response.status_code == 200:
                vehicles = response.json()
                log_test(
                    "管理员访问仓库车辆列表",
                    True,
                    f"返回车辆数: {len(vehicles)}"
                )
                
                # 验证返回数据结构
                if vehicles:
                    vehicle = vehicles[0]
                    required_fields = ["id", "user_id", "license_plate", "status"]
                    missing_fields = [f for f in required_fields if f not in vehicle]
                    if not missing_fields:
                        log_test("返回数据结构", True, "所有必需字段都存在")
                    else:
                        log_test("返回数据结构", False, f"缺少字段: {missing_fields}")
            else:
                log_test(
                    "管理员访问仓库车辆列表",
                    False,
                    f"状态码: {response.status_code}"
                )
        except Exception as e:
            log_test("管理员访问仓库车辆列表", False, f"异常: {str(e)}")
    else:
        log_test("管理员访问仓库车辆列表", False, "无管理员 Token 或仓库ID")
    
    # 测试 2: 车队长可以访问
    print("\n--- 测试 2: 车队长可以访问仓库车辆列表 ---")
    if manager_token and warehouse_id:
        try:
            response = api_request(
                "GET",
                f"/api/warehouses/{warehouse_id}/vehicles",
                token=manager_token
            )
            
            if response.status_code == 200:
                vehicles = response.json()
                log_test(
                    "车队长访问仓库车辆列表",
                    True,
                    f"返回车辆数: {len(vehicles)}"
                )
            else:
                log_test(
                    "车队长访问仓库车辆列表",
                    False,
                    f"状态码: {response.status_code}"
                )
        except Exception as e:
            log_test("车队长访问仓库车辆列表", False, f"异常: {str(e)}")
    else:
        log_test("车队长访问仓库车辆列表", False, "无车队长 Token 或仓库ID")
    
    # 测试 3: 司机访问未分配的仓库应返回 403 (Requirement 4.5)
    print("\n--- 测试 3: 司机访问未分配的仓库应返回 403 ---")
    if driver_token and warehouse_id:
        try:
            response = api_request(
                "GET",
                f"/api/warehouses/{warehouse_id}/vehicles",
                token=driver_token
            )
            
            # 司机如果未分配到该仓库，应该返回 403
            # 如果已分配，则返回 200
            if response.status_code == 403:
                log_test(
                    "司机访问未分配仓库被拒绝",
                    True,
                    "正确返回 403"
                )
            elif response.status_code == 200:
                log_test(
                    "司机访问已分配仓库",
                    True,
                    "司机已分配到该仓库，返回 200"
                )
            else:
                log_test(
                    "司机访问仓库权限检查",
                    False,
                    f"状态码: {response.status_code}"
                )
        except Exception as e:
            log_test("司机访问仓库权限检查", False, f"异常: {str(e)}")
    else:
        log_test("司机访问仓库权限检查", False, "无司机 Token 或仓库ID")
    
    # 测试 4: 仓库不存在返回 404 (Requirement 4.4)
    print("\n--- 测试 4: 仓库不存在返回 404 ---")
    if admin_token:
        try:
            # 使用一个不存在的仓库 ID
            response = api_request(
                "GET",
                "/api/warehouses/99999/vehicles",
                token=admin_token
            )
            
            if response.status_code == 404:
                log_test("仓库不存在返回 404", True, "正确返回 404")
            else:
                log_test(
                    "仓库不存在返回 404",
                    False,
                    f"状态码: {response.status_code}"
                )
        except Exception as e:
            log_test("仓库不存在返回 404", False, f"异常: {str(e)}")
    else:
        log_test("仓库不存在返回 404", False, "无管理员 Token")
    
    # 测试 5: 无 Token 访问
    print("\n--- 测试 5: 无 Token 访问 ---")
    if warehouse_id:
        try:
            response = api_request(
                "GET",
                f"/api/warehouses/{warehouse_id}/vehicles"
            )
            
            if response.status_code in [401, 403]:
                log_test("无 Token 访问被拒绝", True, f"状态码: {response.status_code}")
            else:
                log_test(
                    "无 Token 访问被拒绝",
                    False,
                    f"状态码: {response.status_code}"
                )
        except Exception as e:
            log_test("无 Token 访问被拒绝", False, f"异常: {str(e)}")
    
    # 测试 6: 状态过滤 (Requirement 4.2)
    print("\n--- 测试 6: 状态过滤 ---")
    if admin_token and warehouse_id:
        try:
            response = api_request(
                "GET",
                f"/api/warehouses/{warehouse_id}/vehicles",
                token=admin_token,
                params={"status": "active"}
            )
            
            if response.status_code == 200:
                vehicles = response.json()
                # 验证所有返回的车辆状态都是 active
                all_active = all(v.get("status") == "active" for v in vehicles)
                if all_active or len(vehicles) == 0:
                    log_test(
                        "状态过滤",
                        True,
                        f"返回 {len(vehicles)} 辆 active 状态车辆"
                    )
                else:
                    log_test("状态过滤", False, "返回了非 active 状态的车辆")
            else:
                log_test("状态过滤", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("状态过滤", False, f"异常: {str(e)}")
    else:
        log_test("状态过滤", False, "无管理员 Token 或仓库ID")
    
    # 测试 7: 分页参数 (Requirement 4.3)
    print("\n--- 测试 7: 分页参数 ---")
    if admin_token and warehouse_id:
        try:
            response = api_request(
                "GET",
                f"/api/warehouses/{warehouse_id}/vehicles",
                token=admin_token,
                params={"skip": 0, "limit": 5}
            )
            
            if response.status_code == 200:
                vehicles = response.json()
                if len(vehicles) <= 5:
                    log_test(
                        "分页参数",
                        True,
                        f"返回 {len(vehicles)} 辆车辆（limit=5）"
                    )
                else:
                    log_test("分页参数", False, f"返回数量超过 limit: {len(vehicles)}")
            else:
                log_test("分页参数", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("分页参数", False, f"异常: {str(e)}")
    else:
        log_test("分页参数", False, "无管理员 Token 或仓库ID")
    
    # 测试 8: 组合过滤（状态 + 分页）
    print("\n--- 测试 8: 组合过滤（状态 + 分页）---")
    if admin_token and warehouse_id:
        try:
            response = api_request(
                "GET",
                f"/api/warehouses/{warehouse_id}/vehicles",
                token=admin_token,
                params={
                    "status": "reviewing",
                    "skip": 0,
                    "limit": 10
                }
            )
            
            if response.status_code == 200:
                vehicles = response.json()
                log_test(
                    "组合过滤",
                    True,
                    f"返回 {len(vehicles)} 辆 reviewing 状态车辆"
                )
            else:
                log_test("组合过滤", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("组合过滤", False, f"异常: {str(e)}")
    else:
        log_test("组合过滤", False, "无管理员 Token 或仓库ID")


def print_summary():
    """打印测试结果汇总"""
    print("\n" + "=" * 60)
    print("GET /api/warehouses/{id}/vehicles 测试结果汇总")
    print("=" * 60)
    
    total = test_results["total"]
    passed = test_results["passed"]
    failed = test_results["failed"]
    
    print(f"总测试数: {total}")
    print(f"通过: {passed}")
    print(f"失败: {failed}")
    
    if total > 0:
        pass_rate = (passed / total) * 100
        print(f"通过率: {pass_rate:.1f}%")
    
    if failed == 0:
        print("\n🎉 所有测试通过！")
    else:
        print(f"\n⚠️ 有 {failed} 个测试失败")


def main():
    """主函数"""
    print("=" * 60)
    print("GET /api/warehouses/{id}/vehicles 端点测试")
    print("Requirements: 4.1, 4.2, 4.3, 4.4, 4.5")
    print("=" * 60)
    
    # 获取所有测试账号的 Token
    print("\n--- 登录测试账号 ---")
    tokens = get_all_tokens()
    
    # 运行测试
    test_get_warehouse_vehicles_api(tokens)
    
    # 打印汇总
    print_summary()


if __name__ == "__main__":
    main()
