"""
考勤模块 API 测试脚本
测试打卡（上班/下班）、获取今日状态、考勤记录查询等 API 功能
Requirements: 1.4
"""

import httpx
import sys
from datetime import date, timedelta

# 后端服务地址
BASE_URL = "http://localhost:8000"

# 测试结果统计
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}


def log_test(name: str, passed: bool, message: str = ""):
    """
    记录测试结果
    
    Args:
        name: 测试名称
        passed: 是否通过
        message: 附加信息
    """
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if message:
        print(f"       {message}")
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "message": message
    })


def get_admin_token() -> str:
    """
    获取管理员 Token
    
    Returns:
        str: 管理员的 JWT Token
    """
    response = httpx.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "admin", "password": "admin123"},
        timeout=10
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    return None


def create_test_driver(token: str) -> dict:
    """
    创建测试司机用户
    
    Args:
        token: 管理员 Token
        
    Returns:
        dict: 包含司机信息和 Token 的字典
    """
    # 创建司机用户
    driver_data = {
        "username": "test_driver_attendance",
        "password": "driver123",
        "name": "测试司机-考勤",
        "phone": "13800138001",
        "role": "driver"
    }
    
    response = httpx.post(
        f"{BASE_URL}/api/users",
        headers={"Authorization": f"Bearer {token}"},
        json=driver_data,
        timeout=10
    )
    
    if response.status_code == 200:
        driver = response.json()
        # 获取司机 Token
        login_response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test_driver_attendance", "password": "driver123"},
            timeout=10
        )
        if login_response.status_code == 200:
            driver_token = login_response.json()["access_token"]
            return {"user": driver, "token": driver_token}
    
    return None


def delete_test_driver(token: str, driver_id: int):
    """
    删除测试司机用户
    
    Args:
        token: 管理员 Token
        driver_id: 司机用户 ID
    """
    httpx.delete(
        f"{BASE_URL}/api/users/{driver_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )


# ==================== 任务 5.1: 测试打卡 API ====================

def test_clock_in_success(driver_token: str):
    """
    测试 5.1.1: 上班打卡成功
    POST /api/attendance/clock-in 上班打卡
    """
    print("\n--- 测试 5.1.1: 上班打卡成功 ---")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/attendance/clock-in",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的考勤记录包含必要字段
            required_fields = ["id", "user_id", "work_date", "clock_in"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test("上班打卡成功", True, 
                        f"打卡时间: {data.get('clock_in')}, 工作日期: {data.get('work_date')}")
                return data
            else:
                log_test("上班打卡成功", False, f"缺少字段: {missing_fields}")
                return None
        else:
            log_test("上班打卡成功", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("上班打卡成功", False, f"请求异常: {str(e)}")
        return None


def test_clock_in_no_token():
    """
    测试 5.1.2: 无 Token 上班打卡返回 401/403
    POST /api/attendance/clock-in 无 Token 访问
    """
    print("\n--- 测试 5.1.2: 无 Token 上班打卡返回 401/403 ---")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/attendance/clock-in",
            timeout=10
        )
        
        if response.status_code in [401, 403]:
            log_test("无 Token 上班打卡返回 401/403", True, 
                    f"状态码: {response.status_code}")
        else:
            log_test("无 Token 上班打卡返回 401/403", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("无 Token 上班打卡返回 401/403", False, f"请求异常: {str(e)}")


def test_clock_out_success(driver_token: str):
    """
    测试 5.1.3: 下班打卡成功
    POST /api/attendance/clock-out 下班打卡
    """
    print("\n--- 测试 5.1.3: 下班打卡成功 ---")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/attendance/clock-out",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的考勤记录包含必要字段
            required_fields = ["id", "user_id", "work_date", "clock_in", "clock_out"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test("下班打卡成功", True, 
                        f"下班时间: {data.get('clock_out')}, 工作时长: {data.get('work_hours')}小时")
                return data
            else:
                log_test("下班打卡成功", False, f"缺少字段: {missing_fields}")
                return None
        else:
            log_test("下班打卡成功", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("下班打卡成功", False, f"请求异常: {str(e)}")
        return None


def test_clock_out_without_clock_in(admin_token: str):
    """
    测试 5.1.4: 未上班打卡直接下班打卡返回 400
    POST /api/attendance/clock-out 未上班打卡时下班打卡
    """
    print("\n--- 测试 5.1.4: 未上班打卡直接下班打卡返回 400 ---")
    
    # 创建一个新的测试用户，确保没有上班打卡记录
    driver_data = {
        "username": "test_driver_no_clockin",
        "password": "driver123",
        "name": "测试司机-无打卡",
        "phone": "13800138099",
        "role": "driver"
    }
    
    try:
        # 创建用户
        create_response = httpx.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=driver_data,
            timeout=10
        )
        
        if create_response.status_code != 200:
            log_test("未上班打卡直接下班打卡返回 400", False, 
                    f"创建测试用户失败: {create_response.text}")
            return
        
        driver = create_response.json()
        
        # 获取司机 Token
        login_response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test_driver_no_clockin", "password": "driver123"},
            timeout=10
        )
        
        if login_response.status_code != 200:
            log_test("未上班打卡直接下班打卡返回 400", False, 
                    f"登录测试用户失败: {login_response.text}")
            # 清理用户
            httpx.delete(
                f"{BASE_URL}/api/users/{driver['id']}",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            return
        
        driver_token = login_response.json()["access_token"]
        
        # 直接尝试下班打卡（未上班打卡）
        response = httpx.post(
            f"{BASE_URL}/api/attendance/clock-out",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        if response.status_code == 400:
            log_test("未上班打卡直接下班打卡返回 400", True, 
                    f"响应: {response.json()}")
        else:
            log_test("未上班打卡直接下班打卡返回 400", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
        
        # 清理测试用户
        httpx.delete(
            f"{BASE_URL}/api/users/{driver['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
    except Exception as e:
        log_test("未上班打卡直接下班打卡返回 400", False, f"请求异常: {str(e)}")


def test_get_today_attendance_success(driver_token: str):
    """
    测试 5.1.5: 获取今日打卡状态成功
    GET /api/attendance/today 获取今日状态
    """
    print("\n--- 测试 5.1.5: 获取今日打卡状态成功 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/attendance/today",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的状态包含必要字段
            required_fields = ["has_clocked_in", "has_clocked_out"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test("获取今日打卡状态成功", True, 
                        f"已上班: {data.get('has_clocked_in')}, "
                        f"已下班: {data.get('has_clocked_out')}, "
                        f"工作时长: {data.get('work_hours')}小时")
                return data
            else:
                log_test("获取今日打卡状态成功", False, f"缺少字段: {missing_fields}")
                return None
        else:
            log_test("获取今日打卡状态成功", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("获取今日打卡状态成功", False, f"请求异常: {str(e)}")
        return None


def test_get_today_attendance_no_record(admin_token: str):
    """
    测试 5.1.6: 获取今日打卡状态（无记录）
    GET /api/attendance/today 获取今日状态（新用户无打卡记录）
    """
    print("\n--- 测试 5.1.6: 获取今日打卡状态（无记录） ---")
    
    # 创建一个新的测试用户
    driver_data = {
        "username": "test_driver_no_record",
        "password": "driver123",
        "name": "测试司机-无记录",
        "phone": "13800138098",
        "role": "driver"
    }
    
    try:
        # 创建用户
        create_response = httpx.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=driver_data,
            timeout=10
        )
        
        if create_response.status_code != 200:
            log_test("获取今日打卡状态（无记录）", False, 
                    f"创建测试用户失败: {create_response.text}")
            return
        
        driver = create_response.json()
        
        # 获取司机 Token
        login_response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test_driver_no_record", "password": "driver123"},
            timeout=10
        )
        
        if login_response.status_code != 200:
            log_test("获取今日打卡状态（无记录）", False, 
                    f"登录测试用户失败: {login_response.text}")
            httpx.delete(
                f"{BASE_URL}/api/users/{driver['id']}",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            return
        
        driver_token = login_response.json()["access_token"]
        
        # 获取今日打卡状态
        response = httpx.get(
            f"{BASE_URL}/api/attendance/today",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 新用户应该没有打卡记录
            if data.get("has_clocked_in") == False and data.get("has_clocked_out") == False:
                log_test("获取今日打卡状态（无记录）", True, 
                        f"已上班: {data.get('has_clocked_in')}, "
                        f"已下班: {data.get('has_clocked_out')}")
            else:
                log_test("获取今日打卡状态（无记录）", False, 
                        f"新用户不应有打卡记录: {data}")
        else:
            log_test("获取今日打卡状态（无记录）", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
        
        # 清理测试用户
        httpx.delete(
            f"{BASE_URL}/api/users/{driver['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
    except Exception as e:
        log_test("获取今日打卡状态（无记录）", False, f"请求异常: {str(e)}")
