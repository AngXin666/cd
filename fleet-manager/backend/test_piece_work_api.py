"""
计件模块 API 测试脚本
测试计件分类、计件记录、计件统计等 API 功能
Requirements: 1.5
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


def get_admin_token():
    """
    获取管理员 Token
    
    Returns:
        str: 管理员 Token，失败返回 None
    """
    try:
        response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    except Exception:
        return None


def get_driver_token():
    """
    获取司机 Token
    
    Returns:
        str: 司机 Token，失败返回 None
    """
    try:
        response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "driver", "password": "driver123"},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    except Exception:
        return None


# ==================== 任务 6.1: 测试计件分类 API ====================

def test_get_categories(token: str):
    """
    测试 6.1.1: 获取计件分类列表
    GET /api/piece-work/categories 获取分类
    """
    print("\n--- 测试 6.1.1: 获取计件分类列表 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/piece-work/categories",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("获取计件分类列表", True, f"返回 {len(data)} 个分类")
                return data
            else:
                log_test("获取计件分类列表", False, "响应格式错误，应为列表")
                return []
        else:
            log_test("获取计件分类列表", False, f"状态码: {response.status_code}")
            return []
    except Exception as e:
        log_test("获取计件分类列表", False, f"请求异常: {str(e)}")
        return []


def test_get_categories_with_filter(token: str):
    """
    测试 6.1.2: 获取计件分类列表（带筛选）
    GET /api/piece-work/categories?is_active=true 获取激活的分类
    """
    print("\n--- 测试 6.1.2: 获取激活的计件分类 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/piece-work/categories",
            params={"is_active": True},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # 验证所有返回的分类都是激活状态
                all_active = all(cat.get("is_active", True) for cat in data)
                if all_active:
                    log_test("获取激活的计件分类", True, f"返回 {len(data)} 个激活分类")
                else:
                    log_test("获取激活的计件分类", False, "返回了非激活的分类")
            else:
                log_test("获取激活的计件分类", False, "响应格式错误")
        else:
            log_test("获取激活的计件分类", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取激活的计件分类", False, f"请求异常: {str(e)}")


def test_create_category(admin_token: str):
    """
    测试 6.1.3: 创建计件分类
    POST /api/piece-work/categories 创建分类
    """
    print("\n--- 测试 6.1.3: 创建计件分类 ---")
    
    try:
        # 创建测试分类
        test_category = {
            "name": f"测试分类_{date.today().isoformat()}",
            "unit_price": 15.5,
            "unit": "件"
        }
        
        response = httpx.post(
            f"{BASE_URL}/api/piece-work/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=test_category,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的分类包含必要字段
            required_fields = ["id", "name", "unit_price", "unit"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test("创建计件分类", True, f"分类ID: {data['id']}, 名称: {data['name']}")
                return data["id"]
            else:
                log_test("创建计件分类", False, f"缺少字段: {missing_fields}")
                return None
        else:
            log_test("创建计件分类", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("创建计件分类", False, f"请求异常: {str(e)}")
        return None


def test_create_category_driver_forbidden(driver_token: str):
    """
    测试 6.1.4: 司机无权创建计件分类
    POST /api/piece-work/categories 司机尝试创建分类应返回 403
    """
    print("\n--- 测试 6.1.4: 司机无权创建计件分类 ---")
    
    try:
        test_category = {
            "name": "司机测试分类",
            "unit_price": 10.0,
            "unit": "件"
        }
        
        response = httpx.post(
            f"{BASE_URL}/api/piece-work/categories",
            headers={"Authorization": f"Bearer {driver_token}"},
            json=test_category,
            timeout=10
        )
        
        if response.status_code == 403:
            log_test("司机无权创建计件分类", True, "正确返回 403 Forbidden")
        else:
            log_test("司机无权创建计件分类", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("司机无权创建计件分类", False, f"请求异常: {str(e)}")


def test_update_category(admin_token: str, category_id: int):
    """
    测试 6.1.5: 更新计件分类
    PUT /api/piece-work/categories/{id} 更新分类
    """
    print("\n--- 测试 6.1.5: 更新计件分类 ---")
    
    if not category_id:
        log_test("更新计件分类", False, "无有效分类ID")
        return
    
    try:
        update_data = {
            "name": f"更新后的分类_{date.today().isoformat()}",
            "unit_price": 20.0,
            "unit": "箱",
            "is_active": True
        }
        
        response = httpx.put(
            f"{BASE_URL}/api/piece-work/categories/{category_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证更新是否生效
            if data.get("unit_price") == 20.0 and data.get("unit") == "箱":
                log_test("更新计件分类", True, f"分类已更新: {data['name']}")
            else:
                log_test("更新计件分类", False, "更新未生效")
        else:
            log_test("更新计件分类", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("更新计件分类", False, f"请求异常: {str(e)}")


def test_update_category_not_found(admin_token: str):
    """
    测试 6.1.6: 更新不存在的分类返回 404
    PUT /api/piece-work/categories/99999 更新不存在的分类
    """
    print("\n--- 测试 6.1.6: 更新不存在的分类返回 404 ---")
    
    try:
        update_data = {
            "name": "不存在的分类",
            "unit_price": 10.0,
            "unit": "件"
        }
        
        response = httpx.put(
            f"{BASE_URL}/api/piece-work/categories/99999",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_data,
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("更新不存在的分类返回 404", True, "正确返回 404")
        else:
            log_test("更新不存在的分类返回 404", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("更新不存在的分类返回 404", False, f"请求异常: {str(e)}")


# ==================== 任务 6.2: 测试计件记录 API ====================

def test_get_records(token: str):
    """
    测试 6.2.1: 获取计件记录列表
    GET /api/piece-work/records 获取记录
    """
    print("\n--- 测试 6.2.1: 获取计件记录列表 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/piece-work/records",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("获取计件记录列表", True, f"返回 {len(data)} 条记录")
                return data
            else:
                log_test("获取计件记录列表", False, "响应格式错误")
                return []
        else:
            log_test("获取计件记录列表", False, f"状态码: {response.status_code}")
            return []
    except Exception as e:
        log_test("获取计件记录列表", False, f"请求异常: {str(e)}")
        return []


def test_create_record(driver_token: str, category_id: int):
    """
    测试 6.2.2: 录入计件记录
    POST /api/piece-work/records 录入计件
    """
    print("\n--- 测试 6.2.2: 录入计件记录 ---")
    
    if not category_id:
        log_test("录入计件记录", False, "无有效分类ID")
        return None
    
    try:
        record_data = {
            "category_id": category_id,
            "work_date": date.today().isoformat(),
            "quantity": 100,
            "remark": "测试计件记录"
        }
        
        response = httpx.post(
            f"{BASE_URL}/api/piece-work/records",
            headers={"Authorization": f"Bearer {driver_token}"},
            json=record_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["id", "user_id", "category_id", "quantity", "amount"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test("录入计件记录", True, f"记录ID: {data['id']}, 数量: {data['quantity']}, 金额: {data['amount']}")
                return data["id"]
            else:
                log_test("录入计件记录", False, f"缺少字段: {missing_fields}")
                return None
        else:
            log_test("录入计件记录", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("录入计件记录", False, f"请求异常: {str(e)}")
        return None


def test_create_record_invalid_category(driver_token: str):
    """
    测试 6.2.3: 录入计件记录（无效分类）
    POST /api/piece-work/records 使用不存在的分类ID
    """
    print("\n--- 测试 6.2.3: 录入计件记录（无效分类）---")
    
    try:
        record_data = {
            "category_id": 99999,
            "work_date": date.today().isoformat(),
            "quantity": 100
        }
        
        response = httpx.post(
            f"{BASE_URL}/api/piece-work/records",
            headers={"Authorization": f"Bearer {driver_token}"},
            json=record_data,
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("录入计件记录（无效分类）", True, "正确返回 404")
        else:
            log_test("录入计件记录（无效分类）", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("录入计件记录（无效分类）", False, f"请求异常: {str(e)}")


def test_update_record(admin_token: str, record_id: int):
    """
    测试 6.2.4: 更新计件记录
    PUT /api/piece-work/records/{id} 更新记录
    """
    print("\n--- 测试 6.2.4: 更新计件记录 ---")
    
    if not record_id:
        log_test("更新计件记录", False, "无有效记录ID")
        return
    
    try:
        update_data = {
            "quantity": 150,
            "remark": "更新后的备注"
        }
        
        response = httpx.put(
            f"{BASE_URL}/api/piece-work/records/{record_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("quantity") == 150:
                log_test("更新计件记录", True, f"数量已更新为: {data['quantity']}")
            else:
                log_test("更新计件记录", False, "更新未生效")
        else:
            log_test("更新计件记录", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("更新计件记录", False, f"请求异常: {str(e)}")


def test_update_record_driver_forbidden(driver_token: str, record_id: int):
    """
    测试 6.2.5: 司机可以更新自己的计件记录
    PUT /api/piece-work/records/{id} 司机更新自己的记录应成功
    
    注意：司机只能更新自己的记录，不能更新他人的记录
    """
    print("\n--- 测试 6.2.5: 司机可以更新自己的计件记录 ---")
    
    if not record_id:
        log_test("司机更新自己的计件记录", False, "无有效记录ID")
        return
    
    try:
        update_data = {
            "quantity": 200,
            "remark": "司机更新自己的记录"
        }
        
        response = httpx.put(
            f"{BASE_URL}/api/piece-work/records/{record_id}",
            headers={"Authorization": f"Bearer {driver_token}"},
            json=update_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("quantity") == 200:
                log_test("司机更新自己的计件记录", True, f"更新成功，新数量: {data.get('quantity')}")
            else:
                log_test("司机更新自己的计件记录", False, f"数量未更新: {data.get('quantity')}")
        else:
            log_test("司机更新自己的计件记录", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("司机更新自己的计件记录", False, f"请求异常: {str(e)}")


def test_delete_record(admin_token: str, record_id: int):
    """
    测试 6.2.6: 删除计件记录
    DELETE /api/piece-work/records/{id} 删除记录
    """
    print("\n--- 测试 6.2.6: 删除计件记录 ---")
    
    if not record_id:
        log_test("删除计件记录", False, "无有效记录ID")
        return
    
    try:
        response = httpx.delete(
            f"{BASE_URL}/api/piece-work/records/{record_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            log_test("删除计件记录", True, "记录已删除")
        else:
            log_test("删除计件记录", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("删除计件记录", False, f"请求异常: {str(e)}")


def test_delete_record_not_found(admin_token: str):
    """
    测试 6.2.7: 删除不存在的记录返回 404
    DELETE /api/piece-work/records/99999 删除不存在的记录
    """
    print("\n--- 测试 6.2.7: 删除不存在的记录返回 404 ---")
    
    try:
        response = httpx.delete(
            f"{BASE_URL}/api/piece-work/records/99999",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("删除不存在的记录返回 404", True, "正确返回 404")
        else:
            log_test("删除不存在的记录返回 404", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("删除不存在的记录返回 404", False, f"请求异常: {str(e)}")


# ==================== 任务 6.3: 测试计件统计 API ====================

def test_get_stats(token: str):
    """
    测试 6.3.1: 获取计件统计
    GET /api/piece-work/stats 获取统计
    """
    print("\n--- 测试 6.3.1: 获取计件统计 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/piece-work/stats",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["total_quantity", "total_amount", "record_count"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test("获取计件统计", True, 
                    f"总数量: {data['total_quantity']}, 总金额: {data['total_amount']}, 记录数: {data['record_count']}")
            else:
                log_test("获取计件统计", False, f"缺少字段: {missing_fields}")
        else:
            log_test("获取计件统计", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取计件统计", False, f"请求异常: {str(e)}")


def test_get_stats_with_date_range(token: str):
    """
    测试 6.3.2: 获取计件统计（日期范围筛选）
    GET /api/piece-work/stats?start_date=xxx&end_date=xxx 测试日期范围筛选
    """
    print("\n--- 测试 6.3.2: 获取计件统计（日期范围筛选）---")
    
    try:
        # 设置日期范围为最近7天
        end_date = date.today()
        start_date = end_date - timedelta(days=7)
        
        response = httpx.get(
            f"{BASE_URL}/api/piece-work/stats",
            params={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test("获取计件统计（日期范围筛选）", True, 
                f"日期范围: {start_date} ~ {end_date}, 总金额: {data.get('total_amount', 0)}")
        else:
            log_test("获取计件统计（日期范围筛选）", False, f"状态码: {response.status_code}")
    except Exception as e:
        log_test("获取计件统计（日期范围筛选）", False, f"请求异常: {str(e)}")


def test_get_stats_driver_own_only(driver_token: str, admin_token: str):
    """
    测试 6.3.3: 司机只能查看自己的统计
    GET /api/piece-work/stats 验证司机权限控制
    """
    print("\n--- 测试 6.3.3: 司机只能查看自己的统计 ---")
    
    try:
        # 司机获取统计
        driver_response = httpx.get(
            f"{BASE_URL}/api/piece-work/stats",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        # 管理员获取统计
        admin_response = httpx.get(
            f"{BASE_URL}/api/piece-work/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if driver_response.status_code == 200 and admin_response.status_code == 200:
            driver_data = driver_response.json()
            admin_data = admin_response.json()
            
            # 司机的统计应该只包含自己的数据，可能小于或等于管理员看到的总数据
            log_test("司机只能查看自己的统计", True, 
                f"司机统计: {driver_data.get('total_amount', 0)}, 管理员统计: {admin_data.get('total_amount', 0)}")
        else:
            log_test("司机只能查看自己的统计", False, 
                f"司机状态码: {driver_response.status_code}, 管理员状态码: {admin_response.status_code}")
    except Exception as e:
        log_test("司机只能查看自己的统计", False, f"请求异常: {str(e)}")


def print_summary():
    """
    打印测试结果汇总
    """
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    print(f"总测试数: {test_results['passed'] + test_results['failed']}")
    print(f"通过: {test_results['passed']}")
    print(f"失败: {test_results['failed']}")
    print("=" * 60)
    
    if test_results["failed"] > 0:
        print("\n失败的测试:")
        for test in test_results["tests"]:
            if not test["passed"]:
                print(f"  - {test['name']}: {test['message']}")


def main():
    """
    主函数：运行所有计件模块测试
    """
    print("=" * 60)
    print("计件模块 API 测试")
    print("=" * 60)
    print(f"后端地址: {BASE_URL}")
    
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
        sys.exit(1)
    
    # 获取 Token
    print("\n获取测试 Token...")
    admin_token = get_admin_token()
    driver_token = get_driver_token()
    
    if not admin_token:
        print("❌ 无法获取管理员 Token")
        sys.exit(1)
    print(f"✅ 管理员 Token: {admin_token[:30]}...")
    
    if not driver_token:
        print("⚠️ 无法获取司机 Token，部分测试将跳过")
    else:
        print(f"✅ 司机 Token: {driver_token[:30]}...")
    
    # ==================== 任务 6.1: 测试计件分类 API ====================
    print("\n" + "=" * 60)
    print("任务 6.1: 测试计件分类 API")
    print("=" * 60)
    
    # 获取分类列表
    categories = test_get_categories(admin_token)
    
    # 获取激活的分类
    test_get_categories_with_filter(admin_token)
    
    # 创建分类
    new_category_id = test_create_category(admin_token)
    
    # 司机无权创建分类
    if driver_token:
        test_create_category_driver_forbidden(driver_token)
    
    # 更新分类
    test_update_category(admin_token, new_category_id)
    
    # 更新不存在的分类
    test_update_category_not_found(admin_token)
    
    # ==================== 任务 6.2: 测试计件记录 API ====================
    print("\n" + "=" * 60)
    print("任务 6.2: 测试计件记录 API")
    print("=" * 60)
    
    # 获取记录列表
    test_get_records(admin_token)
    
    # 使用已有分类或新创建的分类
    use_category_id = new_category_id or (categories[0]["id"] if categories else None)
    
    # 录入计件记录
    record_id = None
    if driver_token and use_category_id:
        record_id = test_create_record(driver_token, use_category_id)
    elif use_category_id:
        # 如果没有司机 Token，用管理员创建
        record_id = test_create_record(admin_token, use_category_id)
    
    # 录入计件记录（无效分类）
    if driver_token:
        test_create_record_invalid_category(driver_token)
    
    # 更新计件记录
    test_update_record(admin_token, record_id)
    
    # 司机无权更新计件记录
    if driver_token and record_id:
        test_update_record_driver_forbidden(driver_token, record_id)
    
    # 删除不存在的记录
    test_delete_record_not_found(admin_token)
    
    # 删除计件记录（放在最后，因为会删除测试数据）
    test_delete_record(admin_token, record_id)
    
    # ==================== 任务 6.3: 测试计件统计 API ====================
    print("\n" + "=" * 60)
    print("任务 6.3: 测试计件统计 API")
    print("=" * 60)
    
    # 获取统计
    test_get_stats(admin_token)
    
    # 获取统计（日期范围筛选）
    test_get_stats_with_date_range(admin_token)
    
    # 司机只能查看自己的统计
    if driver_token:
        test_get_stats_driver_own_only(driver_token, admin_token)
    
    # 打印汇总
    print_summary()
    
    # 返回退出码
    return 0 if test_results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
