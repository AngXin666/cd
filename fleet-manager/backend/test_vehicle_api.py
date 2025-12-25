"""
车辆模块 API 测试脚本
测试车辆 CRUD、审核和证件上传功能
Requirements: 1.7

运行方式：
    python test_vehicle_api.py

测试内容：
    Task 8.1: 车辆 CRUD API
        - GET /api/vehicles - 获取车辆列表
        - POST /api/vehicles - 添加车辆
        - GET /api/vehicles/{id} - 获取车辆详情
        - PUT /api/vehicles/{id} - 更新车辆
    
    Task 8.2: 车辆审核 API
        - PUT /api/vehicles/{id}/review - 审核车辆
        - 测试审核通过和拒绝
    
    Task 8.3: 车辆证件 API
        - POST /api/vehicles/{id}/documents - 上传证件
"""

import httpx
import sys
import random
import string
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List

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



def test_vehicle_crud_api(tokens: Dict[str, str]) -> Optional[int]:
    """测试车辆 CRUD API - Task 8.1"""
    print("\n" + "=" * 60)
    print("测试 8.1: 车辆 CRUD API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin")
    manager_token = tokens.get("manager")
    
    if not driver_token:
        log_test("车辆 CRUD 测试", False, "无司机 Token")
        return None
    
    vehicle_id = None
    test_license_plate = generate_license_plate()
    
    # 测试 1: POST /api/vehicles - 添加车辆
    print("\n--- 测试 POST /api/vehicles 添加车辆 ---")
    try:
        response = api_request("POST", "/api/vehicles", token=driver_token, json_data={
            "license_plate": test_license_plate,
            "brand": "测试品牌",
            "model": "测试型号",
            "color": "白色",
            "ownership_type": "personal"
        })
        
        if response.status_code == 200:
            data = response.json()
            vehicle_id = data.get("id")
            log_test("添加车辆", True, f"车辆ID: {vehicle_id}, 车牌: {data.get('license_plate')}")
            
            # 验证返回数据结构
            required_fields = ["id", "user_id", "license_plate", "brand", "model", "color", "status"]
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                log_test("车辆返回数据结构", False, f"缺少字段: {missing_fields}")
            else:
                log_test("车辆返回数据结构", True, "所有必需字段都存在")
            
            # 验证默认状态为 reviewing
            if data.get("status") == "reviewing":
                log_test("新车辆默认状态为reviewing", True)
            else:
                log_test("新车辆默认状态为reviewing", False, f"实际状态: {data.get('status')}")
        else:
            log_test("添加车辆", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("添加车辆", False, f"异常: {str(e)}")
    
    # 测试 2: POST /api/vehicles - 添加重复车牌
    print("\n--- 测试添加重复车牌 ---")
    try:
        response = api_request("POST", "/api/vehicles", token=driver_token, json_data={
            "license_plate": test_license_plate,
            "brand": "另一个品牌",
            "model": "另一个型号",
            "color": "黑色"
        })
        
        if response.status_code == 400:
            log_test("添加重复车牌返回400", True, "正确拒绝重复车牌")
        else:
            log_test("添加重复车牌返回400", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("添加重复车牌返回400", False, f"异常: {str(e)}")
    
    # 测试 3: GET /api/vehicles - 获取车辆列表
    print("\n--- 测试 GET /api/vehicles 获取车辆列表 ---")
    try:
        response = api_request("GET", "/api/vehicles", token=driver_token)
        
        if response.status_code == 200:
            vehicles = response.json()
            log_test("获取车辆列表", True, f"车辆数: {len(vehicles)}")
            
            # 验证列表中的数据结构
            if vehicles:
                first_vehicle = vehicles[0]
                required_fields = ["id", "user_id", "license_plate", "status"]
                missing_fields = [f for f in required_fields if f not in first_vehicle]
                if missing_fields:
                    log_test("车辆列表数据结构", False, f"缺少字段: {missing_fields}")
                else:
                    log_test("车辆列表数据结构", True, "数据结构正确")
        else:
            log_test("获取车辆列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取车辆列表", False, f"异常: {str(e)}")
    
    # 测试 4: GET /api/vehicles - 按状态筛选
    print("\n--- 测试按状态筛选车辆列表 ---")
    try:
        response = api_request("GET", "/api/vehicles", token=admin_token, params={"status": "reviewing"})
        
        if response.status_code == 200:
            vehicles = response.json()
            # 验证所有返回的车辆都是 reviewing 状态
            all_reviewing = all(v.get("status") == "reviewing" for v in vehicles)
            if all_reviewing:
                log_test("按状态筛选车辆列表", True, f"审核中车辆数: {len(vehicles)}")
            else:
                log_test("按状态筛选车辆列表", False, "返回了非 reviewing 状态的车辆")
        else:
            log_test("按状态筛选车辆列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("按状态筛选车辆列表", False, f"异常: {str(e)}")
    
    # 测试 5: GET /api/vehicles/{id} - 获取车辆详情
    print("\n--- 测试 GET /api/vehicles/{id} 获取车辆详情 ---")
    if vehicle_id:
        try:
            response = api_request("GET", f"/api/vehicles/{vehicle_id}", token=driver_token)
            
            if response.status_code == 200:
                data = response.json()
                log_test("获取车辆详情", True, f"车辆ID: {data.get('id')}, 车牌: {data.get('license_plate')}")
                
                # 验证详情数据
                if data.get("id") == vehicle_id:
                    log_test("车辆详情ID匹配", True)
                else:
                    log_test("车辆详情ID匹配", False, f"期望: {vehicle_id}, 实际: {data.get('id')}")
            else:
                log_test("获取车辆详情", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("获取车辆详情", False, f"异常: {str(e)}")
    
    # 测试 6: GET /api/vehicles/{id} - 获取不存在的车辆
    print("\n--- 测试获取不存在的车辆详情 ---")
    try:
        response = api_request("GET", "/api/vehicles/99999", token=driver_token)
        
        if response.status_code == 404:
            log_test("获取不存在的车辆返回404", True)
        else:
            log_test("获取不存在的车辆返回404", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取不存在的车辆返回404", False, f"异常: {str(e)}")
    
    # 测试 7: PUT /api/vehicles/{id} - 更新车辆信息
    print("\n--- 测试 PUT /api/vehicles/{id} 更新车辆信息 ---")
    if vehicle_id:
        try:
            response = api_request("PUT", f"/api/vehicles/{vehicle_id}", token=driver_token, json_data={
                "brand": "更新后的品牌",
                "model": "更新后的型号",
                "color": "红色"
            })
            
            if response.status_code == 200:
                data = response.json()
                log_test("更新车辆信息", True, f"品牌: {data.get('brand')}, 颜色: {data.get('color')}")
                
                # 验证更新是否生效
                if data.get("brand") == "更新后的品牌" and data.get("color") == "红色":
                    log_test("车辆信息更新生效", True)
                else:
                    log_test("车辆信息更新生效", False, f"品牌: {data.get('brand')}, 颜色: {data.get('color')}")
            else:
                log_test("更新车辆信息", False, f"状态码: {response.status_code}, 响应: {response.text}")
        except Exception as e:
            log_test("更新车辆信息", False, f"异常: {str(e)}")
    
    # 测试 8: 无 Token 访问
    print("\n--- 测试无 Token 访问 ---")
    try:
        response = api_request("GET", "/api/vehicles")
        
        if response.status_code in [401, 403]:
            log_test("无Token访问返回401/403", True)
        else:
            log_test("无Token访问返回401/403", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("无Token访问返回401/403", False, f"异常: {str(e)}")
    
    # 测试 9: 老板可以查看所有车辆
    print("\n--- 测试老板查看所有车辆 ---")
    if admin_token:
        try:
            response = api_request("GET", "/api/vehicles", token=admin_token)
            
            if response.status_code == 200:
                vehicles = response.json()
                log_test("老板查看所有车辆", True, f"车辆数: {len(vehicles)}")
            else:
                log_test("老板查看所有车辆", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("老板查看所有车辆", False, f"异常: {str(e)}")
    
    return vehicle_id



def test_vehicle_review_api(tokens: Dict[str, str], vehicle_id: Optional[int] = None):
    """测试车辆审核 API - Task 8.2"""
    print("\n" + "=" * 60)
    print("测试 8.2: 车辆审核 API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin")
    manager_token = tokens.get("manager")
    
    # 如果没有传入 vehicle_id，创建一个新的车辆
    if not vehicle_id:
        print("\n--- 创建测试用车辆 ---")
        try:
            test_plate = generate_license_plate()
            response = api_request("POST", "/api/vehicles", token=driver_token, json_data={
                "license_plate": test_plate,
                "brand": "审核测试品牌",
                "model": "审核测试型号",
                "color": "蓝色"
            })
            
            if response.status_code == 200:
                data = response.json()
                vehicle_id = data.get("id")
                print(f"✅ 创建测试车辆成功, ID: {vehicle_id}")
            else:
                print(f"❌ 创建测试车辆失败: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ 创建测试车辆异常: {str(e)}")
            return
    
    # 测试 1: PUT /api/vehicles/{id}/review - 审核通过
    print("\n--- 测试 PUT /api/vehicles/{id}/review 审核通过 ---")
    if admin_token and vehicle_id:
        try:
            response = api_request("PUT", f"/api/vehicles/{vehicle_id}/review", token=admin_token, json_data={
                "status": "active"
            })
            
            if response.status_code == 200:
                data = response.json()
                log_test("审核车辆通过", True, f"状态: {data.get('status')}")
                
                # 验证状态已更新
                if data.get("status") == "active":
                    log_test("审核状态更新为active", True)
                else:
                    log_test("审核状态更新为active", False, f"实际状态: {data.get('status')}")
            else:
                log_test("审核车辆通过", False, f"状态码: {response.status_code}, 响应: {response.text}")
        except Exception as e:
            log_test("审核车辆通过", False, f"异常: {str(e)}")
    
    # 测试 2: 创建新车辆并测试审核拒绝（设为归还状态）
    print("\n--- 测试审核拒绝（设为归还状态） ---")
    reject_vehicle_id = None
    try:
        test_plate = generate_license_plate()
        response = api_request("POST", "/api/vehicles", token=driver_token, json_data={
            "license_plate": test_plate,
            "brand": "拒绝测试品牌",
            "model": "拒绝测试型号",
            "color": "灰色"
        })
        
        if response.status_code == 200:
            data = response.json()
            reject_vehicle_id = data.get("id")
            print(f"✅ 创建测试车辆成功, ID: {reject_vehicle_id}")
    except Exception as e:
        print(f"❌ 创建测试车辆异常: {str(e)}")
    
    if admin_token and reject_vehicle_id:
        try:
            response = api_request("PUT", f"/api/vehicles/{reject_vehicle_id}/review", token=admin_token, json_data={
                "status": "returned"
            })
            
            if response.status_code == 200:
                data = response.json()
                log_test("审核车辆设为归还", True, f"状态: {data.get('status')}")
                
                # 验证状态已更新为 returned
                if data.get("status") == "returned":
                    log_test("审核状态更新为returned", True)
                else:
                    log_test("审核状态更新为returned", False, f"实际状态: {data.get('status')}")
            else:
                log_test("审核车辆设为归还", False, f"状态码: {response.status_code}, 响应: {response.text}")
        except Exception as e:
            log_test("审核车辆设为归还", False, f"异常: {str(e)}")
    
    # 测试 3: 司机无审核权限
    print("\n--- 测试司机无审核权限 ---")
    driver_review_vehicle_id = None
    if driver_token:
        try:
            test_plate = generate_license_plate()
            response = api_request("POST", "/api/vehicles", token=driver_token, json_data={
                "license_plate": test_plate,
                "brand": "权限测试品牌",
                "model": "权限测试型号",
                "color": "绿色"
            })
            
            if response.status_code == 200:
                data = response.json()
                driver_review_vehicle_id = data.get("id")
                print(f"✅ 创建测试车辆成功, ID: {driver_review_vehicle_id}")
        except Exception as e:
            print(f"❌ 创建测试车辆异常: {str(e)}")
    
    if driver_token and driver_review_vehicle_id:
        try:
            response = api_request("PUT", f"/api/vehicles/{driver_review_vehicle_id}/review", token=driver_token, json_data={
                "status": "active"
            })
            
            if response.status_code == 403:
                log_test("司机无审核权限返回403", True, "正确拒绝司机审核")
            else:
                log_test("司机无审核权限返回403", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("司机无审核权限返回403", False, f"异常: {str(e)}")
    else:
        if not driver_token:
            log_test("司机无审核权限返回403", False, "无司机 Token")
        elif not driver_review_vehicle_id:
            log_test("司机无审核权限返回403", False, "无法创建测试车辆")
    
    # 测试 4: 车队长无审核权限（只有管理员级别可以审核）
    print("\n--- 测试车队长无审核权限 ---")
    if manager_token and driver_review_vehicle_id:
        try:
            response = api_request("PUT", f"/api/vehicles/{driver_review_vehicle_id}/review", token=manager_token, json_data={
                "status": "active"
            })
            
            if response.status_code == 403:
                log_test("车队长无审核权限返回403", True, "正确拒绝车队长审核")
            else:
                log_test("车队长无审核权限返回403", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("车队长无审核权限返回403", False, f"异常: {str(e)}")
    
    # 测试 5: 审核不存在的车辆
    print("\n--- 测试审核不存在的车辆 ---")
    if admin_token:
        try:
            response = api_request("PUT", "/api/vehicles/99999/review", token=admin_token, json_data={
                "status": "active"
            })
            
            if response.status_code == 404:
                log_test("审核不存在的车辆返回404", True)
            else:
                log_test("审核不存在的车辆返回404", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("审核不存在的车辆返回404", False, f"异常: {str(e)}")



def test_vehicle_document_api(tokens: Dict[str, str], vehicle_id: Optional[int] = None):
    """测试车辆证件 API - Task 8.3"""
    print("\n" + "=" * 60)
    print("测试 8.3: 车辆证件 API")
    print("=" * 60)
    
    driver_token = tokens.get("driver")
    admin_token = tokens.get("admin")
    
    # 如果没有传入 vehicle_id，创建一个新的车辆
    if not vehicle_id:
        print("\n--- 创建测试用车辆 ---")
        try:
            test_plate = generate_license_plate()
            response = api_request("POST", "/api/vehicles", token=driver_token, json_data={
                "license_plate": test_plate,
                "brand": "证件测试品牌",
                "model": "证件测试型号",
                "color": "黄色"
            })
            
            if response.status_code == 200:
                data = response.json()
                vehicle_id = data.get("id")
                print(f"✅ 创建测试车辆成功, ID: {vehicle_id}")
            else:
                print(f"❌ 创建测试车辆失败: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ 创建测试车辆异常: {str(e)}")
            return
    
    # 测试 1: POST /api/vehicles/{id}/documents - 上传驾驶证
    print("\n--- 测试 POST /api/vehicles/{id}/documents 上传驾驶证 ---")
    if driver_token and vehicle_id:
        try:
            expiry_date = (date.today() + timedelta(days=365)).isoformat()
            response = api_request("POST", f"/api/vehicles/{vehicle_id}/documents", token=driver_token, json_data={
                "doc_type": "license",
                "file_url": "https://example.com/test-license.jpg",
                "expiry_date": expiry_date
            })
            
            if response.status_code == 200:
                data = response.json()
                log_test("上传驾驶证", True, f"证件ID: {data.get('id')}, 类型: {data.get('doc_type')}")
                
                # 验证返回数据结构
                required_fields = ["id", "vehicle_id", "doc_type", "file_url"]
                missing_fields = [f for f in required_fields if f not in data]
                if missing_fields:
                    log_test("证件返回数据结构", False, f"缺少字段: {missing_fields}")
                else:
                    log_test("证件返回数据结构", True, "所有必需字段都存在")
            else:
                log_test("上传驾驶证", False, f"状态码: {response.status_code}, 响应: {response.text}")
        except Exception as e:
            log_test("上传驾驶证", False, f"异常: {str(e)}")
    
    # 测试 2: POST /api/vehicles/{id}/documents - 上传行驶证
    print("\n--- 测试上传行驶证 ---")
    if driver_token and vehicle_id:
        try:
            expiry_date = (date.today() + timedelta(days=730)).isoformat()
            response = api_request("POST", f"/api/vehicles/{vehicle_id}/documents", token=driver_token, json_data={
                "doc_type": "registration",
                "file_url": "https://example.com/test-registration.jpg",
                "expiry_date": expiry_date
            })
            
            if response.status_code == 200:
                data = response.json()
                log_test("上传行驶证", True, f"证件ID: {data.get('id')}, 类型: {data.get('doc_type')}")
            else:
                log_test("上传行驶证", False, f"状态码: {response.status_code}, 响应: {response.text}")
        except Exception as e:
            log_test("上传行驶证", False, f"异常: {str(e)}")
    
    # 测试 3: POST /api/vehicles/{id}/documents - 上传保险单
    print("\n--- 测试上传保险单 ---")
    if driver_token and vehicle_id:
        try:
            expiry_date = (date.today() + timedelta(days=365)).isoformat()
            response = api_request("POST", f"/api/vehicles/{vehicle_id}/documents", token=driver_token, json_data={
                "doc_type": "insurance",
                "file_url": "https://example.com/test-insurance.jpg",
                "expiry_date": expiry_date
            })
            
            if response.status_code == 200:
                data = response.json()
                log_test("上传保险单", True, f"证件ID: {data.get('id')}, 类型: {data.get('doc_type')}")
            else:
                log_test("上传保险单", False, f"状态码: {response.status_code}, 响应: {response.text}")
        except Exception as e:
            log_test("上传保险单", False, f"异常: {str(e)}")
    
    # 测试 4: 上传证件到不存在的车辆
    print("\n--- 测试上传证件到不存在的车辆 ---")
    if driver_token:
        try:
            response = api_request("POST", "/api/vehicles/99999/documents", token=driver_token, json_data={
                "doc_type": "license",
                "file_url": "https://example.com/test.jpg"
            })
            
            if response.status_code == 404:
                log_test("上传证件到不存在的车辆返回404", True)
            else:
                log_test("上传证件到不存在的车辆返回404", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("上传证件到不存在的车辆返回404", False, f"异常: {str(e)}")
    
    # 测试 5: 司机不能上传其他人车辆的证件
    print("\n--- 测试司机不能上传其他人车辆的证件 ---")
    # 首先用老板创建一个车辆
    other_vehicle_id = None
    if admin_token:
        try:
            test_plate = generate_license_plate()
            response = api_request("POST", "/api/vehicles", token=admin_token, json_data={
                "license_plate": test_plate,
                "brand": "其他人的车",
                "model": "其他型号",
                "color": "黑色"
            })
            
            if response.status_code == 200:
                data = response.json()
                other_vehicle_id = data.get("id")
                print(f"✅ 创建其他人的车辆成功, ID: {other_vehicle_id}")
        except Exception as e:
            print(f"❌ 创建其他人的车辆异常: {str(e)}")
    
    if driver_token and other_vehicle_id:
        try:
            response = api_request("POST", f"/api/vehicles/{other_vehicle_id}/documents", token=driver_token, json_data={
                "doc_type": "license",
                "file_url": "https://example.com/unauthorized.jpg"
            })
            
            if response.status_code == 403:
                log_test("司机不能上传其他人车辆证件返回403", True, "正确拒绝越权操作")
            else:
                log_test("司机不能上传其他人车辆证件返回403", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("司机不能上传其他人车辆证件返回403", False, f"异常: {str(e)}")
    
    # 测试 6: 无 Token 上传证件
    print("\n--- 测试无 Token 上传证件 ---")
    if vehicle_id:
        try:
            response = api_request("POST", f"/api/vehicles/{vehicle_id}/documents", json_data={
                "doc_type": "license",
                "file_url": "https://example.com/no-token.jpg"
            })
            
            if response.status_code in [401, 403]:
                log_test("无Token上传证件返回401/403", True)
            else:
                log_test("无Token上传证件返回401/403", False, f"状态码: {response.status_code}")
        except Exception as e:
            log_test("无Token上传证件返回401/403", False, f"异常: {str(e)}")


def print_summary():
    """打印测试结果汇总"""
    print("\n" + "=" * 60)
    print("车辆模块 API 测试结果汇总")
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
    print("车辆模块 API 测试")
    print("Requirements: 1.7")
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
    # Task 8.1: 车辆 CRUD API
    vehicle_id = test_vehicle_crud_api(tokens)
    
    # Task 8.2: 车辆审核 API
    test_vehicle_review_api(tokens, vehicle_id)
    
    # Task 8.3: 车辆证件 API
    test_vehicle_document_api(tokens, vehicle_id)
    
    # 打印汇总
    print_summary()
    
    # 返回退出码
    return 0 if test_results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
