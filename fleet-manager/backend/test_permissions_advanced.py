#!/usr/bin/env python3
"""
高级权限测试脚本
深入测试数据隔离、边界情况和更多越权场景
"""

import requests
import json
from typing import Optional

BASE_URL = "http://localhost:8000/api"

# 测试结果统计
results = {"passed": 0, "failed": 0, "errors": []}


def get_token(username: str, password: str) -> Optional[str]:
    """获取用户 token"""
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"username": username, "password": password}
        )
        if resp.status_code == 200:
            return resp.json()["access_token"]
        return None
    except Exception as e:
        print(f"获取 token 失败: {e}")
        return None


def test_api(
    name: str,
    method: str,
    url: str,
    token: str,
    expected_status: int,
    data: dict = None,
    check_func=None
):
    """测试 API 端点"""
    global results
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        if method == "GET":
            resp = requests.get(f"{BASE_URL}{url}", headers=headers)
        elif method == "POST":
            resp = requests.post(f"{BASE_URL}{url}", headers=headers, json=data)
        elif method == "PUT":
            resp = requests.put(f"{BASE_URL}{url}", headers=headers, json=data)
        elif method == "DELETE":
            resp = requests.delete(f"{BASE_URL}{url}", headers=headers)
        else:
            print(f"  ❌ {name}: 未知方法 {method}")
            results["failed"] += 1
            return None
        
        # 检查状态码
        if resp.status_code == expected_status:
            # 额外检查函数
            if check_func:
                try:
                    data = resp.json()
                    if check_func(data):
                        print(f"  ✅ {name}: {resp.status_code}")
                        results["passed"] += 1
                    else:
                        print(f"  ❌ {name}: 数据检查失败")
                        results["failed"] += 1
                        results["errors"].append(f"{name}: 数据检查失败")
                except Exception as e:
                    print(f"  ❌ {name}: 检查函数异常 {e}")
                    results["failed"] += 1
            else:
                print(f"  ✅ {name}: {resp.status_code}")
                results["passed"] += 1
            return resp.json() if resp.status_code == 200 else None
        else:
            print(f"  ❌ {name}: 期望 {expected_status}, 实际 {resp.status_code}")
            results["failed"] += 1
            results["errors"].append(f"{name}: 期望 {expected_status}, 实际 {resp.status_code}")
            return None
    except Exception as e:
        print(f"  ❌ {name}: 请求异常 {e}")
        results["failed"] += 1
        results["errors"].append(f"{name}: {e}")
        return None


def main():
    print("=" * 60)
    print("高级权限测试开始")
    print("=" * 60)
    
    # 获取各角色 token
    print("\n获取 Token...")
    boss_token = get_token("admin", "admin123")
    manager_token = get_token("manager", "manager123")
    driver_token = get_token("driver", "driver123")
    
    if not all([boss_token, manager_token, driver_token]):
        print("❌ 无法获取所有角色的 token")
        return
    
    print("✅ 所有 token 获取成功")
    
    # ==================== 1. 数据隔离测试 ====================
    print("\n" + "=" * 60)
    print("1. 数据隔离测试")
    print("=" * 60)
    
    # 获取司机自己的请假列表
    driver_leaves = test_api(
        "司机-获取自己的请假列表", "GET", "/leave", driver_token, 200,
        check_func=lambda data: isinstance(data, list)
    )
    
    # 获取老板看到的所有请假列表
    boss_leaves = test_api(
        "老板-获取所有请假列表", "GET", "/leave", boss_token, 200,
        check_func=lambda data: isinstance(data, list)
    )
    
    # 验证司机只能看到自己的请假
    if driver_leaves and boss_leaves:
        driver_user_ids = set(l["user_id"] for l in driver_leaves)
        # 司机 ID 是 5
        if driver_user_ids == {5} or len(driver_user_ids) == 0:
            print(f"  ✅ 司机数据隔离正确: 只能看到自己的 {len(driver_leaves)} 条记录")
            results["passed"] += 1
        else:
            print(f"  ❌ 司机数据隔离失败: 看到了其他用户的数据 {driver_user_ids}")
            results["failed"] += 1
            results["errors"].append("司机数据隔离失败")
    
    # ==================== 2. 车队长仓库权限测试 ====================
    print("\n" + "=" * 60)
    print("2. 车队长仓库权限测试")
    print("=" * 60)
    
    # 获取车队长能看到的仓库
    manager_warehouses = test_api(
        "车队长-获取分配的仓库", "GET", "/warehouses", manager_token, 200,
        check_func=lambda data: isinstance(data, list)
    )
    
    if manager_warehouses:
        print(f"  车队长可见仓库数: {len(manager_warehouses)}")
        for wh in manager_warehouses:
            print(f"    - {wh['name']} (ID: {wh['id']})")
    
    # 获取老板能看到的所有仓库
    boss_warehouses = test_api(
        "老板-获取所有仓库", "GET", "/warehouses", boss_token, 200,
        check_func=lambda data: isinstance(data, list)
    )
    
    if boss_warehouses:
        print(f"  老板可见仓库数: {len(boss_warehouses)}")
    
    # ==================== 3. 计件记录数据隔离测试 ====================
    print("\n" + "=" * 60)
    print("3. 计件记录数据隔离测试")
    print("=" * 60)
    
    # 司机只能看到自己的计件记录
    driver_records = test_api(
        "司机-获取自己的计件记录", "GET", "/piece-work/records", driver_token, 200,
        check_func=lambda data: isinstance(data, list)
    )
    
    if driver_records:
        driver_record_user_ids = set(r["user_id"] for r in driver_records)
        if driver_record_user_ids == {5} or len(driver_record_user_ids) == 0:
            print(f"  ✅ 司机计件记录隔离正确: 只能看到自己的 {len(driver_records)} 条记录")
            results["passed"] += 1
        else:
            print(f"  ❌ 司机计件记录隔离失败: 看到了其他用户的数据 {driver_record_user_ids}")
            results["failed"] += 1
            results["errors"].append("司机计件记录隔离失败")
    
    # ==================== 4. 考勤记录数据隔离测试 ====================
    print("\n" + "=" * 60)
    print("4. 考勤记录数据隔离测试")
    print("=" * 60)
    
    # 司机查看考勤记录
    driver_attendance = test_api(
        "司机-获取考勤记录", "GET", "/attendance", driver_token, 200,
        check_func=lambda data: isinstance(data, list)
    )
    
    # 老板查看所有考勤记录
    boss_attendance = test_api(
        "老板-获取所有考勤记录", "GET", "/attendance", boss_token, 200,
        check_func=lambda data: isinstance(data, list)
    )
    
    if driver_attendance and boss_attendance:
        print(f"  司机可见考勤记录数: {len(driver_attendance)}")
        print(f"  老板可见考勤记录数: {len(boss_attendance)}")
    
    # ==================== 5. 通知模板权限测试 ====================
    print("\n" + "=" * 60)
    print("5. 通知模板权限测试")
    print("=" * 60)
    
    # 老板可以管理通知模板
    test_api("老板-查看通知模板", "GET", "/notification-templates", boss_token, 200)
    
    # 车队长不能创建通知模板
    test_api("车队长-创建通知模板(应拒绝)", "POST", "/notification-templates", manager_token, 403,
             data={"name": "测试模板", "title": "测试", "content": "测试内容"})
    
    # 司机不能查看通知模板
    test_api("司机-查看通知模板(应拒绝)", "GET", "/notification-templates", driver_token, 403)
    
    # ==================== 6. 定时通知权限测试 ====================
    print("\n" + "=" * 60)
    print("6. 定时通知权限测试")
    print("=" * 60)
    
    # 老板可以管理定时通知
    test_api("老板-查看定时通知", "GET", "/scheduled-notifications", boss_token, 200)
    
    # 车队长不能创建定时通知
    test_api("车队长-创建定时通知(应拒绝)", "POST", "/scheduled-notifications", manager_token, 403,
             data={"name": "测试定时", "title": "测试", "content": "测试", "scheduled_time": "2026-01-10T10:00:00"})
    
    # 司机不能查看定时通知
    test_api("司机-查看定时通知(应拒绝)", "GET", "/scheduled-notifications", driver_token, 403)
    
    # ==================== 7. 车辆详情权限测试 ====================
    print("\n" + "=" * 60)
    print("7. 车辆详情权限测试")
    print("=" * 60)
    
    # 获取车辆列表
    vehicles = test_api("老板-获取车辆列表", "GET", "/vehicles", boss_token, 200)
    
    if vehicles and len(vehicles) > 0:
        vehicle_id = vehicles[0]["id"]
        vehicle_user_id = vehicles[0].get("user_id")
        
        # 老板可以查看任何车辆详情
        test_api(f"老板-查看车辆详情(ID:{vehicle_id})", "GET", f"/vehicles/{vehicle_id}", boss_token, 200)
        
        # 车队长可以查看车辆详情
        test_api(f"车队长-查看车辆详情(ID:{vehicle_id})", "GET", f"/vehicles/{vehicle_id}", manager_token, 200)
        
        # 司机查看车辆详情（如果不是自己的车辆应该被拒绝）
        if vehicle_user_id and vehicle_user_id != 5:
            test_api(f"司机-查看他人车辆详情(应拒绝)", "GET", f"/vehicles/{vehicle_id}", driver_token, 403)
    
    # ==================== 8. 司机证件权限测试 ====================
    print("\n" + "=" * 60)
    print("8. 司机证件权限测试")
    print("=" * 60)
    
    # 司机可以查看自己的证件（如果存在）
    # 注意：404 表示证件不存在，这是正常的业务情况，不是权限问题
    resp = requests.get(f"{BASE_URL}/users/5/license", headers={"Authorization": f"Bearer {driver_token}"})
    if resp.status_code == 200:
        print(f"  ✅ 司机-查看自己的证件: 200")
        results["passed"] += 1
    elif resp.status_code == 404:
        print(f"  ✅ 司机-查看自己的证件: 404 (证件不存在，权限正确)")
        results["passed"] += 1
    else:
        print(f"  ❌ 司机-查看自己的证件: 期望 200 或 404, 实际 {resp.status_code}")
        results["failed"] += 1
        results["errors"].append(f"司机-查看自己的证件: 期望 200 或 404, 实际 {resp.status_code}")
    
    # 司机不能查看其他人的证件
    test_api("司机-查看他人证件(应拒绝)", "GET", "/users/4/license", driver_token, 403)
    
    # 老板可以查看任何人的证件（如果存在）
    resp = requests.get(f"{BASE_URL}/users/5/license", headers={"Authorization": f"Bearer {boss_token}"})
    if resp.status_code == 200:
        print(f"  ✅ 老板-查看司机证件: 200")
        results["passed"] += 1
    elif resp.status_code == 404:
        print(f"  ✅ 老板-查看司机证件: 404 (证件不存在，权限正确)")
        results["passed"] += 1
    else:
        print(f"  ❌ 老板-查看司机证件: 期望 200 或 404, 实际 {resp.status_code}")
        results["failed"] += 1
        results["errors"].append(f"老板-查看司机证件: 期望 200 或 404, 实际 {resp.status_code}")
    
    # ==================== 9. 仓库用户分配权限测试 ====================
    print("\n" + "=" * 60)
    print("9. 仓库用户分配权限测试")
    print("=" * 60)
    
    # 老板可以分配用户到仓库
    if boss_warehouses and len(boss_warehouses) > 0:
        wh_id = boss_warehouses[0]["id"]
        test_api(f"老板-查看仓库用户(ID:{wh_id})", "GET", f"/warehouses/{wh_id}/users", boss_token, 200)
        
        # 车队长不能分配用户到仓库
        test_api("车队长-分配用户到仓库(应拒绝)", "POST", f"/warehouses/{wh_id}/assign", manager_token, 403,
                 data={"user_ids": [5]})
        
        # 司机不能分配用户到仓库
        test_api("司机-分配用户到仓库(应拒绝)", "POST", f"/warehouses/{wh_id}/assign", driver_token, 403,
                 data={"user_ids": [5]})
    
    # ==================== 10. 用户仓库分配权限测试 ====================
    print("\n" + "=" * 60)
    print("10. 用户仓库分配权限测试")
    print("=" * 60)
    
    # 老板可以为用户分配仓库
    test_api("老板-查看用户仓库", "GET", "/users/5/warehouses", boss_token, 200)
    
    # 车队长不能为用户分配仓库
    test_api("车队长-为用户分配仓库(应拒绝)", "POST", "/users/5/warehouses", manager_token, 403,
             data={"warehouse_ids": [1]})
    
    # 司机不能为用户分配仓库
    test_api("司机-为用户分配仓库(应拒绝)", "POST", "/users/5/warehouses", driver_token, 403,
             data={"warehouse_ids": [1]})
    
    # ==================== 测试结果汇总 ====================
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    print(f"✅ 通过: {results['passed']}")
    print(f"❌ 失败: {results['failed']}")
    
    if results["errors"]:
        print("\n失败详情:")
        for err in results["errors"]:
            print(f"  - {err}")
    
    print("\n测试完成!")


if __name__ == "__main__":
    main()
