"""
请假模块 API 测试脚本
测试请假申请和审批功能
Requirements: 1.6

运行方式：
    python test_leave_api.py

测试内容：
    1. GET /api/leave - 获取请假列表
    2. POST /api/leave - 提交请假申请
    3. GET /api/leave/{id} - 获取请假详情
    4. PUT /api/leave/{id}/approve - 审批请假（通过/拒绝）
"""

import httpx
import sys
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any

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


def test_leave_application_api(tokens: Dict[str, str]):
    """测试请假申请 API - Task 7.1"""
    print("\n" + "=" * 60)
    print("测试 7.1: 请假申请 API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin")
    
    if not driver_token:
        log_test("请假申请测试", False, "无司机 Token")
        return None
    
    leave_id = None
    
    # 测试 1: POST /api/leave - 提交请假申请
    print("\n--- 测试 POST /api/leave 提交请假申请 ---")
    try:
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=2)).isoformat()
        
        response = api_request("POST", "/api/leave", token=driver_token, json_data={
            "leave_type": "leave",
            "start_date": start_date,
            "end_date": end_date,
            "reason": "测试请假申请 - 事假"
        })
        
        if response.status_code == 200:
            data = response.json()
            leave_id = data.get("id")
            log_test("提交请假申请", True, f"申请ID: {leave_id}, 状态: {data.get('status')}")
            
            # 验证返回数据结构
            required_fields = ["id", "user_id", "leave_type", "start_date", "end_date", "reason", "status"]
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                log_test("请假申请返回数据结构", False, f"缺少字段: {missing_fields}")
            else:
                log_test("请假申请返回数据结构", True, "所有必需字段都存在")
        else:
            log_test("提交请假申请", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("提交请假申请", False, f"异常: {str(e)}")
    
    # 测试 2: POST /api/leave - 测试不同请假类型
    # 系统支持的请假类型: leave (请假), resign (离职申请)
    print("\n--- 测试不同请假类型 ---")
    leave_types = [("leave", "请假"), ("resign", "离职申请")]
    for leave_type, type_name in leave_types:
        try:
            response = api_request("POST", "/api/leave", token=driver_token, json_data={
                "leave_type": leave_type,
                "start_date": (date.today() + timedelta(days=3)).isoformat(),
                "end_date": (date.today() + timedelta(days=4)).isoformat(),
                "reason": f"测试{type_name}类型申请"
            })
            
            if response.status_code == 200:
                log_test(f"提交{type_name}类型申请", True)
            else:
                log_test(f"提交{type_name}类型申请", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test(f"提交{type_name}类型申请", False, f"异常: {str(e)}")
    
    # 测试 3: GET /api/leave - 获取请假列表
    print("\n--- 测试 GET /api/leave 获取请假列表 ---")
    try:
        response = api_request("GET", "/api/leave", token=driver_token)
        
        if response.status_code == 200:
            leaves = response.json()
            log_test("获取请假列表", True, f"申请数: {len(leaves)}")
            
            # 验证列表中的数据结构
            if leaves:
                first_leave = leaves[0]
                required_fields = ["id", "user_id", "leave_type", "start_date", "end_date", "status"]
                missing_fields = [f for f in required_fields if f not in first_leave]
                if missing_fields:
                    log_test("请假列表数据结构", False, f"缺少字段: {missing_fields}")
                else:
                    log_test("请假列表数据结构", True, "数据结构正确")
        else:
            log_test("获取请假列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取请假列表", False, f"异常: {str(e)}")
    
    # 测试 4: GET /api/leave - 按状态筛选
    print("\n--- 测试按状态筛选请假列表 ---")
    try:
        response = api_request("GET", "/api/leave", token=driver_token, params={"status": "pending"})
        
        if response.status_code == 200:
            leaves = response.json()
            # 验证所有返回的请假都是 pending 状态
            all_pending = all(l.get("status") == "pending" for l in leaves)
            if all_pending:
                log_test("按状态筛选请假列表", True, f"待审批数: {len(leaves)}")
            else:
                log_test("按状态筛选请假列表", False, "返回了非 pending 状态的请假")
        else:
            log_test("按状态筛选请假列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("按状态筛选请假列表", False, f"异常: {str(e)}")
    
    # 测试 5: GET /api/leave/{id} - 获取请假详情
    print("\n--- 测试 GET /api/leave/{id} 获取请假详情 ---")
    if leave_id:
        try:
            response = api_request("GET", f"/api/leave/{leave_id}", token=driver_token)
            
            if response.status_code == 200:
                data = response.json()
                log_test("获取请假详情", True, f"申请ID: {data.get('id')}, 类型: {data.get('leave_type')}")
                
                # 验证详情数据
                if data.get("id") == leave_id:
                    log_test("请假详情ID匹配", True)
                else:
                    log_test("请假详情ID匹配", False, f"期望: {leave_id}, 实际: {data.get('id')}")
            else:
                log_test("获取请假详情", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取请假详情", False, f"异常: {str(e)}")
    
    # 测试 6: GET /api/leave/{id} - 获取不存在的请假
    print("\n--- 测试获取不存在的请假详情 ---")
    try:
        response = api_request("GET", "/api/leave/99999", token=driver_token)
        
        if response.status_code == 404:
            log_test("获取不存在的请假返回404", True)
        else:
            log_test("获取不存在的请假返回404", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取不存在的请假返回404", False, f"异常: {str(e)}")
    
    # 测试 7: 无 Token 访问
    print("\n--- 测试无 Token 访问 ---")
    try:
        response = api_request("GET", "/api/leave")
        
        if response.status_code in [401, 403]:
            log_test("无Token访问返回401/403", True)
        else:
            log_test("无Token访问返回401/403", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("无Token访问返回401/403", False, f"异常: {str(e)}")
    
    return leave_id


def test_leave_approval_api(tokens: Dict[str, str], leave_id: Optional[int] = None):
    """测试请假审批 API - Task 7.2"""
    print("\n" + "=" * 60)
    print("测试 7.2: 请假审批 API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin")
    manager_token = tokens.get("manager")
    
    # 如果没有传入 leave_id，创建一个新的请假申请
    if not leave_id:
        print("\n--- 创建测试用请假申请 ---")
        try:
            response = api_request("POST", "/api/leave", token=driver_token, json_data={
                "leave_type": "leave",
                "start_date": (date.today() + timedelta(days=5)).isoformat(),
                "end_date": (date.today() + timedelta(days=6)).isoformat(),
                "reason": "测试审批用请假申请"
            })
            
            if response.status_code == 200:
                data = response.json()
                leave_id = data.get("id")
                print(f"✅ 创建测试请假申请成功, ID: {leave_id}")
            else:
                print(f"❌ 创建测试请假申请失败: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ 创建测试请假申请异常: {str(e)}")
            return
    
    # 测试 1: PUT /api/leave/{id}/approve - 审批通过
    print("\n--- 测试 PUT /api/leave/{id}/approve 审批通过 ---")
    if admin_token and leave_id:
        try:
            response = api_request("PUT", f"/api/leave/{leave_id}/approve", token=admin_token, json_data={
                "status": "approved",
                "approve_remark": "测试审批通过"
            })
            
            if response.status_code == 200:
                data = response.json()
                log_test("审批请假通过", True, f"状态: {data.get('status')}, 审批人: {data.get('approver_name')}")
                
                # 验证状态已更新
                if data.get("status") == "approved":
                    log_test("审批状态更新为approved", True)
                else:
                    log_test("审批状态更新为approved", False, f"实际状态: {data.get('status')}")
                
                # 验证审批备注
                if data.get("approve_remark") == "测试审批通过":
                    log_test("审批备注保存正确", True)
                else:
                    log_test("审批备注保存正确", False, f"实际备注: {data.get('approve_remark')}")
            else:
                log_test("审批请假通过", False, f"状态码: {response.status_code}, 响应: {response.text}")
        except Exception as e:
            log_test("审批请假通过", False, f"异常: {str(e)}")
    
    # 测试 2: 创建新请假并测试拒绝
    print("\n--- 测试审批拒绝 ---")
    reject_leave_id = None
    try:
        response = api_request("POST", "/api/leave", token=driver_token, json_data={
            "leave_type": "leave",
            "start_date": (date.today() + timedelta(days=7)).isoformat(),
            "end_date": (date.today() + timedelta(days=8)).isoformat(),
            "reason": "测试拒绝用请假申请"
        })
        
        if response.status_code == 200:
            data = response.json()
            reject_leave_id = data.get("id")
            print(f"✅ 创建测试请假申请成功, ID: {reject_leave_id}")
    except Exception as e:
        print(f"❌ 创建测试请假申请异常: {str(e)}")
    
    if admin_token and reject_leave_id:
        try:
            response = api_request("PUT", f"/api/leave/{reject_leave_id}/approve", token=admin_token, json_data={
                "status": "rejected",
                "approve_remark": "测试审批拒绝 - 时间冲突"
            })
            
            if response.status_code == 200:
                data = response.json()
                log_test("审批请假拒绝", True, f"状态: {data.get('status')}")
                
                # 验证状态已更新为 rejected
                if data.get("status") == "rejected":
                    log_test("审批状态更新为rejected", True)
                else:
                    log_test("审批状态更新为rejected", False, f"实际状态: {data.get('status')}")
            else:
                log_test("审批请假拒绝", False, f"状态码: {response.status_code}, 响应: {response.text}")
        except Exception as e:
            log_test("审批请假拒绝", False, f"异常: {str(e)}")
    
    # 测试 3: 重复审批已审批的请假
    print("\n--- 测试重复审批已审批的请假 ---")
    if admin_token and leave_id:
        try:
            response = api_request("PUT", f"/api/leave/{leave_id}/approve", token=admin_token, json_data={
                "status": "rejected",
                "approve_remark": "尝试重复审批"
            })
            
            if response.status_code == 400:
                log_test("重复审批返回400", True, "正确拒绝重复审批")
            else:
                log_test("重复审批返回400", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("重复审批返回400", False, f"异常: {str(e)}")
    
    # 测试 4: 车队长审批权限
    print("\n--- 测试车队长审批权限 ---")
    manager_leave_id = None
    if driver_token:
        try:
            response = api_request("POST", "/api/leave", token=driver_token, json_data={
                "leave_type": "leave",
                "start_date": (date.today() + timedelta(days=9)).isoformat(),
                "end_date": (date.today() + timedelta(days=10)).isoformat(),
                "reason": "测试车队长审批权限"
            })
            
            if response.status_code == 200:
                data = response.json()
                manager_leave_id = data.get("id")
                print(f"✅ 创建测试请假申请成功, ID: {manager_leave_id}")
        except Exception as e:
            print(f"❌ 创建测试请假申请异常: {str(e)}")
    
    if manager_token and manager_leave_id:
        try:
            response = api_request("PUT", f"/api/leave/{manager_leave_id}/approve", token=manager_token, json_data={
                "status": "approved",
                "approve_remark": "车队长审批通过"
            })
            
            if response.status_code == 200:
                log_test("车队长审批请假", True, "车队长有审批权限")
            else:
                log_test("车队长审批请假", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("车队长审批请假", False, f"异常: {str(e)}")
    else:
        if not manager_token:
            log_test("车队长审批请假", False, "无车队长 Token")
        elif not manager_leave_id:
            log_test("车队长审批请假", False, "无法创建测试请假申请")
    
    # 测试 5: 司机无审批权限
    print("\n--- 测试司机无审批权限 ---")
    driver_approve_leave_id = None
    if driver_token:
        try:
            response = api_request("POST", "/api/leave", token=driver_token, json_data={
                "leave_type": "leave",
                "start_date": (date.today() + timedelta(days=11)).isoformat(),
                "end_date": (date.today() + timedelta(days=12)).isoformat(),
                "reason": "测试司机审批权限"
            })
            
            if response.status_code == 200:
                data = response.json()
                driver_approve_leave_id = data.get("id")
                print(f"✅ 创建测试请假申请成功, ID: {driver_approve_leave_id}")
        except Exception as e:
            print(f"❌ 创建测试请假申请异常: {str(e)}")
    
    if driver_token and driver_approve_leave_id:
        try:
            response = api_request("PUT", f"/api/leave/{driver_approve_leave_id}/approve", token=driver_token, json_data={
                "status": "approved",
                "approve_remark": "司机尝试审批"
            })
            
            if response.status_code == 403:
                log_test("司机无审批权限返回403", True, "正确拒绝司机审批")
            else:
                log_test("司机无审批权限返回403", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("司机无审批权限返回403", False, f"异常: {str(e)}")
    else:
        if not driver_token:
            log_test("司机无审批权限返回403", False, "无司机 Token")
        elif not driver_approve_leave_id:
            log_test("司机无审批权限返回403", False, "无法创建测试请假申请")
    
    # 测试 6: 审批不存在的请假
    print("\n--- 测试审批不存在的请假 ---")
    if admin_token:
        try:
            response = api_request("PUT", "/api/leave/99999/approve", token=admin_token, json_data={
                "status": "approved",
                "approve_remark": "审批不存在的请假"
            })
            
            if response.status_code == 404:
                log_test("审批不存在的请假返回404", True)
            else:
                log_test("审批不存在的请假返回404", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("审批不存在的请假返回404", False, f"异常: {str(e)}")


def print_summary():
    """打印测试结果汇总"""
    print("\n" + "=" * 60)
    print("请假模块 API 测试结果汇总")
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
    print("请假模块 API 测试")
    print("Requirements: 1.6")
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
    leave_id = test_leave_application_api(tokens)
    test_leave_approval_api(tokens, leave_id)
    
    # 打印汇总
    print_summary()
    
    # 返回退出码
    return 0 if test_results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
