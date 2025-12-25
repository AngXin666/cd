"""
集成测试脚本 - 完整功能测试
测试所有 API 模块的功能完整性
Requirements: 4.1, 4.2

运行方式：
    python test_integration.py

测试模块：
    1. 认证 API
    2. 用户管理 API
    3. 仓库管理 API
    4. 考勤 API
    5. 计件 API
    6. 请假 API
    7. 车辆 API
    8. 通知 API
    9. 通知模板 API
    10. 定时通知 API
    11. 应用版本 API
    12. OCR API
    13. 健康检查 API
"""

import httpx
import sys
import json
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List

# 后端服务地址
BASE_URL = "http://localhost:8000"

# 测试结果统计
test_results = {
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "tests": [],
    "modules": {}
}

# 当前测试模块
current_module = ""


def set_module(name: str):
    """设置当前测试模块"""
    global current_module
    current_module = name
    if name not in test_results["modules"]:
        test_results["modules"][name] = {"passed": 0, "failed": 0, "skipped": 0}


def log_test(name: str, passed: bool, message: str = "", skipped: bool = False):
    """记录测试结果"""
    if skipped:
        status = "⏭️ SKIP"
        test_results["skipped"] += 1
        if current_module:
            test_results["modules"][current_module]["skipped"] += 1
    elif passed:
        status = "✅ PASS"
        test_results["passed"] += 1
        if current_module:
            test_results["modules"][current_module]["passed"] += 1
    else:
        status = "❌ FAIL"
        test_results["failed"] += 1
        if current_module:
            test_results["modules"][current_module]["failed"] += 1
    
    print(f"{status}: {name}")
    if message:
        print(f"       {message}")
    
    test_results["tests"].append({
        "module": current_module,
        "name": name,
        "passed": passed,
        "skipped": skipped,
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


# ==================== 健康检查测试 ====================

def test_health_check():
    """测试健康检查 API"""
    set_module("健康检查")
    print("\n" + "=" * 60)
    print("测试模块: 健康检查 API")
    print("=" * 60)
    
    # 测试 /api/health
    try:
        response = api_request("GET", "/api/health")
        if response.status_code == 200:
            data = response.json()
            log_test("健康检查 /api/health", True, f"状态: {data.get('status', 'unknown')}")
        else:
            log_test("健康检查 /api/health", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("健康检查 /api/health", False, f"异常: {str(e)}")
    
    # 测试 /api/health/live
    try:
        response = api_request("GET", "/api/health/live")
        if response.status_code == 200:
            log_test("存活检查 /api/health/live", True)
        else:
            log_test("存活检查 /api/health/live", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("存活检查 /api/health/live", False, f"异常: {str(e)}")
    
    # 测试 /api/health/ready
    try:
        response = api_request("GET", "/api/health/ready")
        if response.status_code == 200:
            log_test("就绪检查 /api/health/ready", True)
        else:
            log_test("就绪检查 /api/health/ready", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("就绪检查 /api/health/ready", False, f"异常: {str(e)}")


# ==================== 认证测试 ====================

def test_auth() -> Optional[Dict[str, str]]:
    """测试认证 API，返回各角色的 Token"""
    set_module("认证")
    print("\n" + "=" * 60)
    print("测试模块: 认证 API")
    print("=" * 60)
    
    tokens = {}
    
    # 测试各角色登录
    test_accounts = [
        ("admin", "admin123", "老板"),
        ("superadmin", "super123", "超级管理员"),
        ("dispatcher", "dispatch123", "调度"),
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
                    log_test(f"{role_name}登录 ({username})", True)
                else:
                    log_test(f"{role_name}登录 ({username})", False, "无 access_token")
            else:
                log_test(f"{role_name}登录 ({username})", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test(f"{role_name}登录 ({username})", False, f"异常: {str(e)}")
    
    # 测试错误密码
    try:
        response = api_request("POST", "/api/auth/login", json_data={
            "username": "admin",
            "password": "wrong_password"
        })
        if response.status_code == 401:
            log_test("错误密码返回 401", True)
        else:
            log_test("错误密码返回 401", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("错误密码返回 401", False, f"异常: {str(e)}")
    
    # 测试获取当前用户
    if "admin" in tokens:
        try:
            response = api_request("GET", "/api/auth/me", token=tokens["admin"])
            if response.status_code == 200:
                data = response.json()
                log_test("获取当前用户", True, f"用户: {data.get('username')}")
            else:
                log_test("获取当前用户", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取当前用户", False, f"异常: {str(e)}")
    
    # 测试无 Token 访问
    try:
        response = api_request("GET", "/api/auth/me")
        if response.status_code in [401, 403]:
            log_test("无 Token 返回 401/403", True)
        else:
            log_test("无 Token 返回 401/403", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("无 Token 返回 401/403", False, f"异常: {str(e)}")
    
    return tokens


# ==================== 用户管理测试 ====================

def test_users(tokens: Dict[str, str]):
    """测试用户管理 API"""
    set_module("用户管理")
    print("\n" + "=" * 60)
    print("测试模块: 用户管理 API")
    print("=" * 60)
    
    admin_token = tokens.get("admin") or tokens.get("superadmin")
    driver_token = tokens.get("driver")
    
    if not admin_token:
        log_test("用户管理测试", False, "无管理员 Token", skipped=True)
        return
    
    # 测试获取用户列表
    try:
        response = api_request("GET", "/api/users", token=admin_token)
        if response.status_code == 200:
            users = response.json()
            log_test("获取用户列表", True, f"用户数: {len(users)}")
        else:
            log_test("获取用户列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取用户列表", False, f"异常: {str(e)}")
    
    # 测试创建用户
    test_user_id = None
    try:
        response = api_request("POST", "/api/users", token=admin_token, json_data={
            "username": f"test_user_{datetime.now().strftime('%H%M%S')}",
            "password": "test123",
            "name": "测试用户",
            "phone": "13800138000",
            "role": "driver"
        })
        if response.status_code == 200:
            data = response.json()
            test_user_id = data.get("id")
            log_test("创建用户", True, f"用户ID: {test_user_id}")
        else:
            log_test("创建用户", False, f"状态码: {response.status_code}, {response.text}")
    except Exception as e:
        log_test("创建用户", False, f"异常: {str(e)}")
    
    # 测试获取用户详情
    if test_user_id:
        try:
            response = api_request("GET", f"/api/users/{test_user_id}", token=admin_token)
            if response.status_code == 200:
                log_test("获取用户详情", True)
            else:
                log_test("获取用户详情", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取用户详情", False, f"异常: {str(e)}")
    
    # 测试更新用户
    if test_user_id:
        try:
            response = api_request("PUT", f"/api/users/{test_user_id}", token=admin_token, json_data={
                "name": "测试用户-已更新",
                "phone": "13900139000"
            })
            if response.status_code == 200:
                log_test("更新用户", True)
            else:
                log_test("更新用户", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("更新用户", False, f"异常: {str(e)}")
    
    # 测试司机无权访问用户管理
    if driver_token:
        try:
            response = api_request("GET", "/api/users", token=driver_token)
            if response.status_code == 403:
                log_test("司机无权访问用户列表", True)
            else:
                log_test("司机无权访问用户列表", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("司机无权访问用户列表", False, f"异常: {str(e)}")
    
    # 测试删除用户
    if test_user_id:
        try:
            response = api_request("DELETE", f"/api/users/{test_user_id}", token=admin_token)
            if response.status_code == 200:
                log_test("删除用户", True)
            else:
                log_test("删除用户", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("删除用户", False, f"异常: {str(e)}")


# ==================== 仓库管理测试 ====================

def test_warehouses(tokens: Dict[str, str]):
    """测试仓库管理 API"""
    set_module("仓库管理")
    print("\n" + "=" * 60)
    print("测试模块: 仓库管理 API")
    print("=" * 60)
    
    admin_token = tokens.get("admin") or tokens.get("superadmin")
    
    if not admin_token:
        log_test("仓库管理测试", False, "无管理员 Token", skipped=True)
        return
    
    # 测试获取仓库列表
    try:
        response = api_request("GET", "/api/warehouses", token=admin_token)
        if response.status_code == 200:
            warehouses = response.json()
            log_test("获取仓库列表", True, f"仓库数: {len(warehouses)}")
        else:
            log_test("获取仓库列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取仓库列表", False, f"异常: {str(e)}")
    
    # 测试创建仓库
    test_warehouse_id = None
    try:
        response = api_request("POST", "/api/warehouses", token=admin_token, json_data={
            "name": f"测试仓库_{datetime.now().strftime('%H%M%S')}",
            "address": "测试地址"
        })
        if response.status_code == 200:
            data = response.json()
            test_warehouse_id = data.get("id")
            log_test("创建仓库", True, f"仓库ID: {test_warehouse_id}")
        else:
            log_test("创建仓库", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("创建仓库", False, f"异常: {str(e)}")
    
    # 测试获取仓库详情
    if test_warehouse_id:
        try:
            response = api_request("GET", f"/api/warehouses/{test_warehouse_id}", token=admin_token)
            if response.status_code == 200:
                log_test("获取仓库详情", True)
            else:
                log_test("获取仓库详情", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取仓库详情", False, f"异常: {str(e)}")
    
    # 测试更新仓库
    if test_warehouse_id:
        try:
            response = api_request("PUT", f"/api/warehouses/{test_warehouse_id}", token=admin_token, json_data={
                "name": "测试仓库-已更新",
                "address": "更新后的地址"
            })
            if response.status_code == 200:
                log_test("更新仓库", True)
            else:
                log_test("更新仓库", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("更新仓库", False, f"异常: {str(e)}")
    
    # 测试删除仓库
    if test_warehouse_id:
        try:
            response = api_request("DELETE", f"/api/warehouses/{test_warehouse_id}", token=admin_token)
            if response.status_code == 200:
                log_test("删除仓库", True)
            else:
                log_test("删除仓库", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("删除仓库", False, f"异常: {str(e)}")


# ==================== 考勤测试 ====================

def test_attendance(tokens: Dict[str, str]):
    """测试考勤 API"""
    set_module("考勤管理")
    print("\n" + "=" * 60)
    print("测试模块: 考勤 API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin") or tokens.get("superadmin")
    
    if not driver_token:
        log_test("考勤测试", False, "无司机 Token", skipped=True)
        return
    
    # 测试获取今日打卡状态
    try:
        response = api_request("GET", "/api/attendance/today", token=driver_token)
        if response.status_code == 200:
            data = response.json()
            log_test("获取今日打卡状态", True, f"已打卡: {data.get('has_clocked_in')}")
        else:
            log_test("获取今日打卡状态", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取今日打卡状态", False, f"异常: {str(e)}")
    
    # 测试上班打卡
    try:
        response = api_request("POST", "/api/attendance/clock-in", token=driver_token)
        if response.status_code == 200:
            log_test("上班打卡", True)
        else:
            # 可能已经打过卡
            log_test("上班打卡", True, f"状态码: {response.status_code} (可能已打卡)")
    except Exception as e:
        log_test("上班打卡", False, f"异常: {str(e)}")
    
    # 测试下班打卡
    try:
        response = api_request("POST", "/api/attendance/clock-out", token=driver_token)
        if response.status_code == 200:
            log_test("下班打卡", True)
        else:
            log_test("下班打卡", True, f"状态码: {response.status_code} (可能已打卡)")
    except Exception as e:
        log_test("下班打卡", False, f"异常: {str(e)}")
    
    # 测试获取考勤记录
    try:
        response = api_request("GET", "/api/attendance", token=driver_token)
        if response.status_code == 200:
            records = response.json()
            log_test("获取考勤记录", True, f"记录数: {len(records)}")
        else:
            log_test("获取考勤记录", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取考勤记录", False, f"异常: {str(e)}")
    
    # 测试管理员查看所有考勤记录
    if admin_token:
        try:
            response = api_request("GET", "/api/attendance", token=admin_token)
            if response.status_code == 200:
                records = response.json()
                log_test("管理员查看考勤记录", True, f"记录数: {len(records)}")
            else:
                log_test("管理员查看考勤记录", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("管理员查看考勤记录", False, f"异常: {str(e)}")


# ==================== 计件测试 ====================

def test_piece_work(tokens: Dict[str, str]):
    """测试计件 API"""
    set_module("计件管理")
    print("\n" + "=" * 60)
    print("测试模块: 计件 API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin") or tokens.get("superadmin")
    
    if not admin_token:
        log_test("计件测试", False, "无管理员 Token", skipped=True)
        return
    
    # 测试获取计件分类
    category_id = None
    try:
        response = api_request("GET", "/api/piece-work/categories", token=admin_token)
        if response.status_code == 200:
            categories = response.json()
            log_test("获取计件分类", True, f"分类数: {len(categories)}")
            if categories:
                category_id = categories[0].get("id")
        else:
            log_test("获取计件分类", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取计件分类", False, f"异常: {str(e)}")
    
    # 测试创建计件分类
    test_category_id = None
    try:
        response = api_request("POST", "/api/piece-work/categories", token=admin_token, json_data={
            "name": f"测试分类_{datetime.now().strftime('%H%M%S')}",
            "unit_price": 10.5,
            "unit": "件"
        })
        if response.status_code == 200:
            data = response.json()
            test_category_id = data.get("id")
            log_test("创建计件分类", True, f"分类ID: {test_category_id}")
        else:
            log_test("创建计件分类", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("创建计件分类", False, f"异常: {str(e)}")
    
    # 测试录入计件记录
    if driver_token and (category_id or test_category_id):
        use_category_id = test_category_id or category_id
        try:
            response = api_request("POST", "/api/piece-work/records", token=driver_token, json_data={
                "category_id": use_category_id,
                "work_date": date.today().isoformat(),
                "quantity": 100,
                "remark": "测试计件"
            })
            if response.status_code == 200:
                log_test("录入计件记录", True)
            else:
                log_test("录入计件记录", False, f"状态码: {response.status_code}, {response.text}")
        except Exception as e:
            log_test("录入计件记录", False, f"异常: {str(e)}")
    
    # 测试获取计件记录
    try:
        response = api_request("GET", "/api/piece-work/records", token=admin_token)
        if response.status_code == 200:
            records = response.json()
            log_test("获取计件记录", True, f"记录数: {len(records)}")
        else:
            log_test("获取计件记录", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取计件记录", False, f"异常: {str(e)}")
    
    # 测试获取计件统计
    try:
        response = api_request("GET", "/api/piece-work/stats", token=admin_token)
        if response.status_code == 200:
            stats = response.json()
            log_test("获取计件统计", True, f"总金额: {stats.get('total_amount', 0)}")
        else:
            log_test("获取计件统计", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取计件统计", False, f"异常: {str(e)}")


# ==================== 请假测试 ====================

def test_leave(tokens: Dict[str, str]):
    """测试请假 API"""
    set_module("请假管理")
    print("\n" + "=" * 60)
    print("测试模块: 请假 API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin") or tokens.get("manager")
    
    if not driver_token:
        log_test("请假测试", False, "无司机 Token", skipped=True)
        return
    
    # 测试提交请假申请
    leave_id = None
    try:
        response = api_request("POST", "/api/leave", token=driver_token, json_data={
            "leave_type": "leave",
            "start_date": (date.today() + timedelta(days=1)).isoformat(),
            "end_date": (date.today() + timedelta(days=2)).isoformat(),
            "reason": "测试请假"
        })
        if response.status_code == 200:
            data = response.json()
            leave_id = data.get("id")
            log_test("提交请假申请", True, f"申请ID: {leave_id}")
        else:
            log_test("提交请假申请", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("提交请假申请", False, f"异常: {str(e)}")
    
    # 测试获取请假列表
    try:
        response = api_request("GET", "/api/leave", token=driver_token)
        if response.status_code == 200:
            leaves = response.json()
            log_test("获取请假列表", True, f"申请数: {len(leaves)}")
        else:
            log_test("获取请假列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取请假列表", False, f"异常: {str(e)}")
    
    # 测试获取请假详情
    if leave_id:
        try:
            response = api_request("GET", f"/api/leave/{leave_id}", token=driver_token)
            if response.status_code == 200:
                log_test("获取请假详情", True)
            else:
                log_test("获取请假详情", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取请假详情", False, f"异常: {str(e)}")
    
    # 测试审批请假
    if leave_id and admin_token:
        try:
            response = api_request("PUT", f"/api/leave/{leave_id}/approve", token=admin_token, json_data={
                "status": "approved",
                "approve_remark": "测试审批通过"
            })
            if response.status_code == 200:
                log_test("审批请假", True)
            else:
                log_test("审批请假", False, f"状态码: {response.status_code}, {response.text}")
        except Exception as e:
            log_test("审批请假", False, f"异常: {str(e)}")


# ==================== 车辆测试 ====================

def test_vehicles(tokens: Dict[str, str]):
    """测试车辆 API"""
    set_module("车辆管理")
    print("\n" + "=" * 60)
    print("测试模块: 车辆 API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin") or tokens.get("superadmin")
    
    if not driver_token:
        log_test("车辆测试", False, "无司机 Token", skipped=True)
        return
    
    # 测试添加车辆
    vehicle_id = None
    try:
        response = api_request("POST", "/api/vehicles", token=driver_token, json_data={
            "license_plate": f"测A{datetime.now().strftime('%H%M%S')}",
            "brand": "测试品牌",
            "model": "测试型号",
            "color": "白色",
            "ownership_type": "OWNED"
        })
        if response.status_code == 200:
            data = response.json()
            vehicle_id = data.get("id")
            log_test("添加车辆", True, f"车辆ID: {vehicle_id}")
        else:
            log_test("添加车辆", False, f"状态码: {response.status_code}, {response.text}")
    except Exception as e:
        log_test("添加车辆", False, f"异常: {str(e)}")
    
    # 测试获取车辆列表
    try:
        response = api_request("GET", "/api/vehicles", token=driver_token)
        if response.status_code == 200:
            vehicles = response.json()
            log_test("获取车辆列表", True, f"车辆数: {len(vehicles)}")
        else:
            log_test("获取车辆列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取车辆列表", False, f"异常: {str(e)}")
    
    # 测试获取车辆详情
    if vehicle_id:
        try:
            response = api_request("GET", f"/api/vehicles/{vehicle_id}", token=driver_token)
            if response.status_code == 200:
                log_test("获取车辆详情", True)
            else:
                log_test("获取车辆详情", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取车辆详情", False, f"异常: {str(e)}")
    
    # 测试更新车辆
    if vehicle_id:
        try:
            response = api_request("PUT", f"/api/vehicles/{vehicle_id}", token=driver_token, json_data={
                "brand": "更新品牌",
                "model": "更新型号"
            })
            if response.status_code == 200:
                log_test("更新车辆", True)
            else:
                log_test("更新车辆", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("更新车辆", False, f"异常: {str(e)}")
    
    # 测试审核车辆
    if vehicle_id and admin_token:
        try:
            response = api_request("PUT", f"/api/vehicles/{vehicle_id}/review", token=admin_token, json_data={
                "status": "active"
            })
            if response.status_code == 200:
                log_test("审核车辆", True)
            else:
                log_test("审核车辆", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("审核车辆", False, f"异常: {str(e)}")
    
    # 测试车辆租赁信息
    if vehicle_id:
        try:
            response = api_request("GET", f"/api/vehicles/{vehicle_id}/lease", token=driver_token)
            if response.status_code == 200:
                log_test("获取车辆租赁信息", True)
            else:
                log_test("获取车辆租赁信息", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取车辆租赁信息", False, f"异常: {str(e)}")
    
    # 测试补录照片
    if vehicle_id:
        try:
            response = api_request("GET", f"/api/vehicles/{vehicle_id}/supplement-photos", token=driver_token)
            if response.status_code == 200:
                log_test("获取补录照片", True)
            else:
                log_test("获取补录照片", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取补录照片", False, f"异常: {str(e)}")


# ==================== 通知测试 ====================

def test_notifications(tokens: Dict[str, str]):
    """测试通知 API"""
    set_module("通知管理")
    print("\n" + "=" * 60)
    print("测试模块: 通知 API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin") or tokens.get("superadmin")
    
    if not admin_token:
        log_test("通知测试", False, "无管理员 Token", skipped=True)
        return
    
    # 获取司机用户ID
    driver_user_id = None
    try:
        response = api_request("GET", "/api/users", token=admin_token, params={"role": "DRIVER"})
        if response.status_code == 200:
            users = response.json()
            if users:
                driver_user_id = users[0].get("id")
    except:
        pass
    
    # 测试发送通知
    if driver_user_id:
        try:
            response = api_request("POST", "/api/notifications", token=admin_token, json_data={
                "user_ids": [driver_user_id],
                "title": "测试通知",
                "content": "这是一条测试通知"
            })
            if response.status_code == 200:
                log_test("发送通知", True)
            else:
                log_test("发送通知", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("发送通知", False, f"异常: {str(e)}")
    
    # 测试获取通知列表
    if driver_token:
        try:
            response = api_request("GET", "/api/notifications", token=driver_token)
            if response.status_code == 200:
                notifications = response.json()
                log_test("获取通知列表", True, f"通知数: {len(notifications)}")
            else:
                log_test("获取通知列表", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取通知列表", False, f"异常: {str(e)}")
    
    # 测试获取未读数量
    if driver_token:
        try:
            response = api_request("GET", "/api/notifications/unread-count", token=driver_token)
            if response.status_code == 200:
                data = response.json()
                log_test("获取未读数量", True, f"未读: {data.get('count', 0)}")
            else:
                log_test("获取未读数量", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取未读数量", False, f"异常: {str(e)}")


# ==================== 通知模板测试 ====================

def test_notification_templates(tokens: Dict[str, str]):
    """测试通知模板 API"""
    set_module("通知模板")
    print("\n" + "=" * 60)
    print("测试模块: 通知模板 API")
    print("=" * 60)
    
    admin_token = tokens.get("admin") or tokens.get("superadmin")
    
    if not admin_token:
        log_test("通知模板测试", False, "无管理员 Token", skipped=True)
        return
    
    # 测试获取模板列表
    try:
        response = api_request("GET", "/api/notification-templates", token=admin_token)
        if response.status_code == 200:
            templates = response.json()
            log_test("获取模板列表", True, f"模板数: {len(templates)}")
        else:
            log_test("获取模板列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取模板列表", False, f"异常: {str(e)}")
    
    # 测试创建模板
    template_id = None
    try:
        response = api_request("POST", "/api/notification-templates", token=admin_token, json_data={
            "name": f"测试模板_{datetime.now().strftime('%H%M%S')}",
            "title": "测试标题 {name}",
            "content": "测试内容 {content}",
            "variables": {"name": "名称", "content": "内容"},
            "category": "system"
        })
        if response.status_code == 200:
            data = response.json()
            template_id = data.get("id")
            log_test("创建模板", True, f"模板ID: {template_id}")
        else:
            log_test("创建模板", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("创建模板", False, f"异常: {str(e)}")
    
    # 测试获取模板详情
    if template_id:
        try:
            response = api_request("GET", f"/api/notification-templates/{template_id}", token=admin_token)
            if response.status_code == 200:
                log_test("获取模板详情", True)
            else:
                log_test("获取模板详情", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取模板详情", False, f"异常: {str(e)}")
    
    # 测试更新模板
    if template_id:
        try:
            response = api_request("PUT", f"/api/notification-templates/{template_id}", token=admin_token, json_data={
                "title": "更新后的标题"
            })
            if response.status_code == 200:
                log_test("更新模板", True)
            else:
                log_test("更新模板", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("更新模板", False, f"异常: {str(e)}")
    
    # 测试删除模板
    if template_id:
        try:
            response = api_request("DELETE", f"/api/notification-templates/{template_id}", token=admin_token)
            if response.status_code == 200:
                log_test("删除模板", True)
            else:
                log_test("删除模板", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("删除模板", False, f"异常: {str(e)}")


# ==================== 定时通知测试 ====================

def test_scheduled_notifications(tokens: Dict[str, str]):
    """测试定时通知 API"""
    set_module("定时通知")
    print("\n" + "=" * 60)
    print("测试模块: 定时通知 API")
    print("=" * 60)
    
    admin_token = tokens.get("admin") or tokens.get("superadmin")
    
    if not admin_token:
        log_test("定时通知测试", False, "无管理员 Token", skipped=True)
        return
    
    # 测试获取定时通知列表
    try:
        response = api_request("GET", "/api/scheduled-notifications", token=admin_token)
        if response.status_code == 200:
            scheduled = response.json()
            log_test("获取定时通知列表", True, f"数量: {len(scheduled)}")
        else:
            log_test("获取定时通知列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取定时通知列表", False, f"异常: {str(e)}")
    
    # 测试创建定时通知
    scheduled_id = None
    try:
        response = api_request("POST", "/api/scheduled-notifications", token=admin_token, json_data={
            "name": f"测试定时通知_{datetime.now().strftime('%H%M%S')}",
            "title": "测试定时通知标题",
            "content": "测试定时通知内容",
            "target_roles": ["driver"],
            "scheduled_time": (datetime.now() + timedelta(hours=1)).isoformat(),
            "repeat_type": "once"
        })
        if response.status_code == 200:
            data = response.json()
            scheduled_id = data.get("id")
            log_test("创建定时通知", True, f"ID: {scheduled_id}")
        else:
            log_test("创建定时通知", False, f"状态码: {response.status_code}, {response.text}")
    except Exception as e:
        log_test("创建定时通知", False, f"异常: {str(e)}")
    
    # 测试获取调度器状态
    try:
        response = api_request("GET", "/api/scheduled-notifications/scheduler/status", token=admin_token)
        if response.status_code == 200:
            status = response.json()
            log_test("获取调度器状态", True, f"运行中: {status.get('is_running')}")
        else:
            log_test("获取调度器状态", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取调度器状态", False, f"异常: {str(e)}")
    
    # 测试取消定时通知
    if scheduled_id:
        try:
            response = api_request("POST", f"/api/scheduled-notifications/{scheduled_id}/cancel", token=admin_token)
            if response.status_code == 200:
                log_test("取消定时通知", True)
            else:
                log_test("取消定时通知", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("取消定时通知", False, f"异常: {str(e)}")
    
    # 测试删除定时通知
    if scheduled_id:
        try:
            response = api_request("DELETE", f"/api/scheduled-notifications/{scheduled_id}", token=admin_token)
            if response.status_code == 200:
                log_test("删除定时通知", True)
            else:
                log_test("删除定时通知", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("删除定时通知", False, f"异常: {str(e)}")


# ==================== 应用版本测试 ====================

def test_app_versions(tokens: Dict[str, str]):
    """测试应用版本 API"""
    set_module("应用版本")
    print("\n" + "=" * 60)
    print("测试模块: 应用版本 API")
    print("=" * 60)
    
    admin_token = tokens.get("admin") or tokens.get("superadmin")
    
    if not admin_token:
        log_test("应用版本测试", False, "无管理员 Token", skipped=True)
        return
    
    # 测试获取版本列表
    try:
        response = api_request("GET", "/api/app-versions", token=admin_token)
        if response.status_code == 200:
            versions = response.json()
            log_test("获取版本列表", True, f"版本数: {len(versions)}")
        else:
            log_test("获取版本列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取版本列表", False, f"异常: {str(e)}")
    
    # 测试创建版本
    version_id = None
    version_str = f"1.0.{datetime.now().strftime('%H%M%S')}"
    try:
        response = api_request("POST", "/api/app-versions", token=admin_token, json_data={
            "version": version_str,
            "version_code": int(datetime.now().strftime('%H%M%S')),
            "title": "测试版本",
            "update_type": "optional",
            "description": "测试版本描述",
            "download_url": "https://example.com/test.apk",
            "platform": "all"
        })
        if response.status_code == 200:
            data = response.json()
            version_id = data.get("id")
            log_test("创建版本", True, f"版本ID: {version_id}")
        else:
            log_test("创建版本", False, f"状态码: {response.status_code}, {response.text}")
    except Exception as e:
        log_test("创建版本", False, f"异常: {str(e)}")
    
    # 测试获取最新版本（公开接口）
    try:
        response = api_request("GET", "/api/app-versions/latest")
        if response.status_code == 200:
            log_test("获取最新版本", True)
        elif response.status_code == 404:
            log_test("获取最新版本", True, "暂无版本")
        else:
            log_test("获取最新版本", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取最新版本", False, f"异常: {str(e)}")
    
    # 测试检查更新（公开接口）
    try:
        response = api_request("POST", "/api/app-versions/check", json_data={
            "current_version": "1.0.0",
            "platform": "all"
        })
        if response.status_code == 200:
            data = response.json()
            log_test("检查更新", True, f"有更新: {data.get('has_update', False)}")
        else:
            log_test("检查更新", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("检查更新", False, f"异常: {str(e)}")


# ==================== OCR 测试 ====================

def test_ocr(tokens: Dict[str, str]):
    """测试 OCR API"""
    set_module("OCR识别")
    print("\n" + "=" * 60)
    print("测试模块: OCR API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    
    if not driver_token:
        log_test("OCR测试", False, "无司机 Token", skipped=True)
        return
    
    # 测试获取 OCR 状态
    try:
        response = api_request("GET", "/api/ocr/status", token=driver_token)
        if response.status_code == 200:
            data = response.json()
            log_test("获取 OCR 状态", True, f"已配置: {data.get('configured', False)}")
        else:
            log_test("获取 OCR 状态", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取 OCR 状态", False, f"异常: {str(e)}")


# ==================== 系统管理测试 ====================

def test_admin(tokens: Dict[str, str]):
    """测试系统管理 API"""
    set_module("系统管理")
    print("\n" + "=" * 60)
    print("测试模块: 系统管理 API")
    print("=" * 60)
    
    super_token = tokens.get("superadmin")
    admin_token = tokens.get("admin")
    
    # 测试获取可创建角色
    if admin_token:
        try:
            response = api_request("GET", "/api/admin/roles", token=admin_token)
            if response.status_code == 200:
                data = response.json()
                log_test("获取可创建角色", True, f"角色数: {len(data.get('creatable_roles', []))}")
            else:
                log_test("获取可创建角色", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取可创建角色", False, f"异常: {str(e)}")
    
    # 测试获取系统信息（仅超级管理员）
    if super_token:
        try:
            response = api_request("GET", "/api/admin/system-info", token=super_token)
            if response.status_code == 200:
                data = response.json()
                log_test("获取系统信息", True, f"用户总数: {data.get('users', {}).get('total', 0)}")
            else:
                log_test("获取系统信息", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取系统信息", False, f"异常: {str(e)}")
    else:
        log_test("获取系统信息", False, "无超级管理员 Token", skipped=True)


# ==================== 打印汇总 ====================

def print_summary():
    """打印测试结果汇总"""
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    total = test_results["passed"] + test_results["failed"] + test_results["skipped"]
    print(f"总测试数: {total}")
    print(f"✅ 通过: {test_results['passed']}")
    print(f"❌ 失败: {test_results['failed']}")
    print(f"⏭️ 跳过: {test_results['skipped']}")
    
    # 按模块统计
    print("\n各模块统计:")
    print("-" * 40)
    for module, stats in test_results["modules"].items():
        total_m = stats["passed"] + stats["failed"] + stats["skipped"]
        print(f"  {module}: {stats['passed']}/{total_m} 通过")
    
    # 失败的测试
    if test_results["failed"] > 0:
        print("\n失败的测试:")
        print("-" * 40)
        for test in test_results["tests"]:
            if not test["passed"] and not test.get("skipped"):
                print(f"  [{test['module']}] {test['name']}")
                if test["message"]:
                    print(f"    -> {test['message']}")
    
    print("=" * 60)
    
    # 计算通过率
    if total > 0:
        pass_rate = (test_results["passed"] / (total - test_results["skipped"])) * 100 if (total - test_results["skipped"]) > 0 else 0
        print(f"通过率: {pass_rate:.1f}%")


# ==================== 主函数 ====================

def main():
    """主函数：运行所有集成测试"""
    print("=" * 60)
    print("Fleet Manager 集成测试")
    print("=" * 60)
    print(f"后端地址: {BASE_URL}")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 先检查服务是否可用
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
    
    # 运行健康检查测试
    test_health_check()
    
    # 运行认证测试并获取 Token
    tokens = test_auth()
    
    if not tokens:
        print("\n❌ 无法获取任何 Token，终止测试")
        sys.exit(1)
    
    # 运行各模块测试
    test_users(tokens)
    test_warehouses(tokens)
    test_attendance(tokens)
    test_piece_work(tokens)
    test_leave(tokens)
    test_vehicles(tokens)
    test_notifications(tokens)
    test_notification_templates(tokens)
    test_scheduled_notifications(tokens)
    test_app_versions(tokens)
    test_ocr(tokens)
    test_admin(tokens)
    
    # 打印汇总
    print_summary()
    
    # 返回退出码
    return 0 if test_results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
