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


# ==================== 任务 5.2: 测试考勤记录查询 API ====================

def test_get_attendance_records_success(admin_token: str):
    """
    测试 5.2.1: 获取考勤记录列表成功
    GET /api/attendance 获取考勤记录
    """
    print("\n--- 测试 5.2.1: 获取考勤记录列表成功 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/attendance",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的是列表
            if isinstance(data, list):
                log_test("获取考勤记录列表成功", True, 
                        f"返回记录数: {len(data)}")
                # 如果有记录，验证字段
                if len(data) > 0:
                    required_fields = ["id", "user_id", "work_date"]
                    missing_fields = [f for f in required_fields if f not in data[0]]
                    if missing_fields:
                        log_test("考勤记录字段验证", False, f"缺少字段: {missing_fields}")
                    else:
                        log_test("考勤记录字段验证", True, 
                                f"第一条记录: 用户ID={data[0].get('user_id')}, "
                                f"日期={data[0].get('work_date')}")
                return data
            else:
                log_test("获取考勤记录列表成功", False, f"返回数据不是列表: {type(data)}")
                return None
        else:
            log_test("获取考勤记录列表成功", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("获取考勤记录列表成功", False, f"请求异常: {str(e)}")
        return None


def test_get_attendance_records_no_token():
    """
    测试 5.2.2: 无 Token 获取考勤记录返回 401/403
    GET /api/attendance 无 Token 访问
    """
    print("\n--- 测试 5.2.2: 无 Token 获取考勤记录返回 401/403 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/attendance",
            timeout=10
        )
        
        if response.status_code in [401, 403]:
            log_test("无 Token 获取考勤记录返回 401/403", True, 
                    f"状态码: {response.status_code}")
        else:
            log_test("无 Token 获取考勤记录返回 401/403", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("无 Token 获取考勤记录返回 401/403", False, f"请求异常: {str(e)}")


def test_get_attendance_records_date_filter(admin_token: str):
    """
    测试 5.2.3: 日期范围筛选考勤记录
    GET /api/attendance?start_date=xxx&end_date=xxx 测试日期范围筛选
    """
    print("\n--- 测试 5.2.3: 日期范围筛选考勤记录 ---")
    
    try:
        # 使用今天的日期作为筛选条件
        today = date.today()
        start_date = today.isoformat()
        end_date = today.isoformat()
        
        response = httpx.get(
            f"{BASE_URL}/api/attendance",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"start_date": start_date, "end_date": end_date},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的是列表
            if isinstance(data, list):
                # 验证所有记录的日期都在范围内
                all_in_range = True
                for record in data:
                    record_date = record.get("work_date")
                    if record_date:
                        if record_date < start_date or record_date > end_date:
                            all_in_range = False
                            break
                
                if all_in_range:
                    log_test("日期范围筛选考勤记录", True, 
                            f"筛选日期: {start_date} ~ {end_date}, 返回记录数: {len(data)}")
                else:
                    log_test("日期范围筛选考勤记录", False, 
                            f"存在日期不在范围内的记录")
                return data
            else:
                log_test("日期范围筛选考勤记录", False, f"返回数据不是列表: {type(data)}")
                return None
        else:
            log_test("日期范围筛选考勤记录", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("日期范围筛选考勤记录", False, f"请求异常: {str(e)}")
        return None


def test_get_attendance_records_user_filter(admin_token: str, driver_id: int):
    """
    测试 5.2.4: 用户筛选考勤记录
    GET /api/attendance?user_id=xxx 测试用户筛选
    
    Args:
        admin_token: 管理员 Token
        driver_id: 司机用户 ID
    """
    print("\n--- 测试 5.2.4: 用户筛选考勤记录 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/attendance",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"user_id": driver_id},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的是列表
            if isinstance(data, list):
                # 验证所有记录的用户ID都是指定的用户
                all_match = True
                for record in data:
                    if record.get("user_id") != driver_id:
                        all_match = False
                        break
                
                if all_match:
                    log_test("用户筛选考勤记录", True, 
                            f"筛选用户ID: {driver_id}, 返回记录数: {len(data)}")
                else:
                    log_test("用户筛选考勤记录", False, 
                            f"存在用户ID不匹配的记录")
                return data
            else:
                log_test("用户筛选考勤记录", False, f"返回数据不是列表: {type(data)}")
                return None
        else:
            log_test("用户筛选考勤记录", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("用户筛选考勤记录", False, f"请求异常: {str(e)}")
        return None


def test_get_attendance_records_driver_permission(driver_token: str, driver_id: int):
    """
    测试 5.2.5: 司机只能查看自己的考勤记录
    GET /api/attendance 司机权限验证
    
    Args:
        driver_token: 司机 Token
        driver_id: 司机用户 ID
    """
    print("\n--- 测试 5.2.5: 司机只能查看自己的考勤记录 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/attendance",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的是列表
            if isinstance(data, list):
                # 验证所有记录的用户ID都是当前司机
                all_own = True
                for record in data:
                    if record.get("user_id") != driver_id:
                        all_own = False
                        break
                
                if all_own:
                    log_test("司机只能查看自己的考勤记录", True, 
                            f"司机ID: {driver_id}, 返回记录数: {len(data)}, 全部为自己的记录")
                else:
                    log_test("司机只能查看自己的考勤记录", False, 
                            f"存在非本人的考勤记录")
                return data
            else:
                log_test("司机只能查看自己的考勤记录", False, f"返回数据不是列表: {type(data)}")
                return None
        else:
            log_test("司机只能查看自己的考勤记录", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("司机只能查看自己的考勤记录", False, f"请求异常: {str(e)}")
        return None


def test_get_attendance_records_combined_filter(admin_token: str, driver_id: int):
    """
    测试 5.2.6: 组合筛选考勤记录（日期+用户）
    GET /api/attendance?user_id=xxx&start_date=xxx&end_date=xxx 组合筛选
    
    Args:
        admin_token: 管理员 Token
        driver_id: 司机用户 ID
    """
    print("\n--- 测试 5.2.6: 组合筛选考勤记录（日期+用户） ---")
    
    try:
        # 使用今天的日期和指定用户作为筛选条件
        today = date.today()
        start_date = today.isoformat()
        end_date = today.isoformat()
        
        response = httpx.get(
            f"{BASE_URL}/api/attendance",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={
                "user_id": driver_id,
                "start_date": start_date,
                "end_date": end_date
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的是列表
            if isinstance(data, list):
                # 验证所有记录都满足筛选条件
                all_match = True
                for record in data:
                    # 检查用户ID
                    if record.get("user_id") != driver_id:
                        all_match = False
                        break
                    # 检查日期范围
                    record_date = record.get("work_date")
                    if record_date and (record_date < start_date or record_date > end_date):
                        all_match = False
                        break
                
                if all_match:
                    log_test("组合筛选考勤记录", True, 
                            f"筛选条件: 用户ID={driver_id}, 日期={start_date}~{end_date}, "
                            f"返回记录数: {len(data)}")
                else:
                    log_test("组合筛选考勤记录", False, 
                            f"存在不满足筛选条件的记录")
                return data
            else:
                log_test("组合筛选考勤记录", False, f"返回数据不是列表: {type(data)}")
                return None
        else:
            log_test("组合筛选考勤记录", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("组合筛选考勤记录", False, f"请求异常: {str(e)}")
        return None


def test_get_attendance_records_pagination(admin_token: str):
    """
    测试 5.2.7: 分页获取考勤记录
    GET /api/attendance?skip=0&limit=10 分页测试
    """
    print("\n--- 测试 5.2.7: 分页获取考勤记录 ---")
    
    try:
        # 测试分页参数
        response = httpx.get(
            f"{BASE_URL}/api/attendance",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"skip": 0, "limit": 10},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的是列表
            if isinstance(data, list):
                # 验证返回记录数不超过 limit
                if len(data) <= 10:
                    log_test("分页获取考勤记录", True, 
                            f"分页参数: skip=0, limit=10, 返回记录数: {len(data)}")
                else:
                    log_test("分页获取考勤记录", False, 
                            f"返回记录数 {len(data)} 超过 limit 10")
                return data
            else:
                log_test("分页获取考勤记录", False, f"返回数据不是列表: {type(data)}")
                return None
        else:
            log_test("分页获取考勤记录", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("分页获取考勤记录", False, f"请求异常: {str(e)}")
        return None


def test_get_attendance_records_empty_result(admin_token: str):
    """
    测试 5.2.8: 查询无结果时返回空列表
    GET /api/attendance?start_date=1900-01-01&end_date=1900-01-01 查询无结果
    """
    print("\n--- 测试 5.2.8: 查询无结果时返回空列表 ---")
    
    try:
        # 使用一个不可能有记录的日期范围
        response = httpx.get(
            f"{BASE_URL}/api/attendance",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"start_date": "1900-01-01", "end_date": "1900-01-01"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的是空列表
            if isinstance(data, list) and len(data) == 0:
                log_test("查询无结果时返回空列表", True, 
                        f"返回空列表: {data}")
            else:
                log_test("查询无结果时返回空列表", False, 
                        f"预期空列表，实际返回: {data}")
            return data
        else:
            log_test("查询无结果时返回空列表", False, 
                    f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("查询无结果时返回空列表", False, f"请求异常: {str(e)}")
        return None


# ==================== 主测试函数 ====================

def run_task_5_1_tests(admin_token: str, driver_info: dict):
    """
    运行任务 5.1 的所有测试
    
    Args:
        admin_token: 管理员 Token
        driver_info: 司机信息（包含 user 和 token）
    """
    print("\n" + "=" * 60)
    print("任务 5.1: 测试打卡 API")
    print("=" * 60)
    
    driver_token = driver_info["token"]
    
    # 5.1.1 上班打卡成功
    test_clock_in_success(driver_token)
    
    # 5.1.2 无 Token 上班打卡返回 401/403
    test_clock_in_no_token()
    
    # 5.1.3 下班打卡成功
    test_clock_out_success(driver_token)
    
    # 5.1.4 未上班打卡直接下班打卡返回 400
    test_clock_out_without_clock_in(admin_token)
    
    # 5.1.5 获取今日打卡状态成功
    test_get_today_attendance_success(driver_token)
    
    # 5.1.6 获取今日打卡状态（无记录）
    test_get_today_attendance_no_record(admin_token)


def run_task_5_2_tests(admin_token: str, driver_info: dict):
    """
    运行任务 5.2 的所有测试
    
    Args:
        admin_token: 管理员 Token
        driver_info: 司机信息（包含 user 和 token）
    """
    print("\n" + "=" * 60)
    print("任务 5.2: 测试考勤记录查询 API")
    print("=" * 60)
    
    driver_token = driver_info["token"]
    driver_id = driver_info["user"]["id"]
    
    # 5.2.1 获取考勤记录列表成功
    test_get_attendance_records_success(admin_token)
    
    # 5.2.2 无 Token 获取考勤记录返回 401/403
    test_get_attendance_records_no_token()
    
    # 5.2.3 日期范围筛选考勤记录
    test_get_attendance_records_date_filter(admin_token)
    
    # 5.2.4 用户筛选考勤记录
    test_get_attendance_records_user_filter(admin_token, driver_id)
    
    # 5.2.5 司机只能查看自己的考勤记录
    test_get_attendance_records_driver_permission(driver_token, driver_id)
    
    # 5.2.6 组合筛选考勤记录（日期+用户）
    test_get_attendance_records_combined_filter(admin_token, driver_id)
    
    # 5.2.7 分页获取考勤记录
    test_get_attendance_records_pagination(admin_token)
    
    # 5.2.8 查询无结果时返回空列表
    test_get_attendance_records_empty_result(admin_token)


def main():
    """
    主测试入口
    执行所有考勤模块 API 测试
    """
    print("=" * 60)
    print("考勤模块 API 测试")
    print("=" * 60)
    
    # 获取管理员 Token
    print("\n正在获取管理员 Token...")
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ 获取管理员 Token 失败，请确保后端服务已启动")
        sys.exit(1)
    print("✅ 获取管理员 Token 成功")
    
    # 创建测试司机
    print("\n正在创建测试司机...")
    driver_info = create_test_driver(admin_token)
    if not driver_info:
        print("❌ 创建测试司机失败")
        sys.exit(1)
    print(f"✅ 创建测试司机成功: {driver_info['user']['name']} (ID: {driver_info['user']['id']})")
    
    try:
        # 运行任务 5.1 测试
        run_task_5_1_tests(admin_token, driver_info)
        
        # 运行任务 5.2 测试
        run_task_5_2_tests(admin_token, driver_info)
        
    finally:
        # 清理测试数据
        print("\n正在清理测试数据...")
        delete_test_driver(admin_token, driver_info["user"]["id"])
        print("✅ 测试数据清理完成")
    
    # 输出测试结果汇总
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    print(f"通过: {test_results['passed']}")
    print(f"失败: {test_results['failed']}")
    print(f"总计: {test_results['passed'] + test_results['failed']}")
    
    # 如果有失败的测试，返回非零退出码
    if test_results["failed"] > 0:
        print("\n❌ 存在失败的测试")
        sys.exit(1)
    else:
        print("\n✅ 所有测试通过")
        sys.exit(0)


if __name__ == "__main__":
    main()
