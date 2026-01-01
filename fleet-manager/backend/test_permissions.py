#!/usr/bin/env python3
"""
权限测试脚本
全面测试车队长和司机的权限控制
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
    check_empty: bool = False,
    should_have_data: bool = None
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
            return
        
        # 检查状态码
        if resp.status_code == expected_status:
            # 额外检查：是否应该有数据
            if should_have_data is not None:
                try:
                    data = resp.json()
                    has_data = len(data) > 0 if isinstance(data, list) else bool(data)
                    if has_data == should_have_data:
                        print(f"  ✅ {name}: {resp.status_code} (数据: {len(data) if isinstance(data, list) else '有'})")
                        results["passed"] += 1
                    else:
                        print(f"  ❌ {name}: 数据检查失败 (期望有数据={should_have_data}, 实际={has_data})")
                        results["failed"] += 1
                        results["errors"].append(f"{name}: 数据检查失败")
                except:
                    print(f"  ❌ {name}: 无法解析响应")
                    results["failed"] += 1
            else:
                print(f"  ✅ {name}: {resp.status_code}")
                results["passed"] += 1
        else:
            print(f"  ❌ {name}: 期望 {expected_status}, 实际 {resp.status_code}")
            results["failed"] += 1
            results["errors"].append(f"{name}: 期望 {expected_status}, 实际 {resp.status_code}")
            if resp.status_code >= 400:
                try:
                    print(f"      响应: {resp.json()}")
                except:
                    pass
    except Exception as e:
        print(f"  ❌ {name}: 请求异常 {e}")
        results["failed"] += 1
        results["errors"].append(f"{name}: {e}")


def main():
    print("=" * 60)
    print("权限测试开始")
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
    
    # ==================== 1. 用户管理权限测试 ====================
    print("\n" + "=" * 60)
    print("1. 用户管理权限测试")
    print("=" * 60)
    
    # 老板可以查看所有用户
    test_api("老板-查看用户列表", "GET", "/users", boss_token, 200, should_have_data=True)
    # 车队长可以查看用户列表（应该只能看到自己管辖的）
    test_api("车队长-查看用户列表", "GET", "/users", manager_token, 200)
    # 司机不能查看用户列表
    test_api("司机-查看用户列表", "GET", "/users", driver_token, 403)
    
    # 老板可以创建用户
    test_api("老板-创建用户", "POST", "/users", boss_token, 200, 
             data={"username": "test_perm_user", "password": "test123", "name": "权限测试用户", "role": "driver"})
    # 车队长不能创建用户
    test_api("车队长-创建用户", "POST", "/users", manager_token, 403,
             data={"username": "test_perm_user2", "password": "test123", "name": "权限测试用户2", "role": "driver"})
    # 司机不能创建用户
    test_api("司机-创建用户", "POST", "/users", driver_token, 403,
             data={"username": "test_perm_user3", "password": "test123", "name": "权限测试用户3", "role": "driver"})
    
    # ==================== 2. 仓库管理权限测试 ====================
    print("\n" + "=" * 60)
    print("2. 仓库管理权限测试")
    print("=" * 60)
    
    # 老板可以查看所有仓库
    test_api("老板-查看仓库列表", "GET", "/warehouses", boss_token, 200, should_have_data=True)
    # 车队长只能看到分配的仓库
    test_api("车队长-查看仓库列表", "GET", "/warehouses", manager_token, 200)
    # 司机只能看到分配的仓库
    test_api("司机-查看仓库列表", "GET", "/warehouses", driver_token, 200)
    
    # 老板可以创建仓库
    test_api("老板-创建仓库", "POST", "/warehouses", boss_token, 200,
             data={"name": "权限测试仓库", "address": "测试地址"})
    # 车队长不能创建仓库
    test_api("车队长-创建仓库", "POST", "/warehouses", manager_token, 403,
             data={"name": "权限测试仓库2", "address": "测试地址2"})
    # 司机不能创建仓库
    test_api("司机-创建仓库", "POST", "/warehouses", driver_token, 403,
             data={"name": "权限测试仓库3", "address": "测试地址3"})
    
    # ==================== 3. 请假管理权限测试 ====================
    print("\n" + "=" * 60)
    print("3. 请假管理权限测试")
    print("=" * 60)
    
    # 老板可以查看所有请假申请
    test_api("老板-查看请假列表", "GET", "/leave", boss_token, 200, should_have_data=True)
    # 车队长可以查看管辖范围内的请假申请
    test_api("车队长-查看请假列表", "GET", "/leave", manager_token, 200)
    # 司机只能查看自己的请假申请
    test_api("司机-查看请假列表", "GET", "/leave", driver_token, 200)
    
    # 司机可以创建请假申请
    test_api("司机-创建请假申请", "POST", "/leave", driver_token, 200,
             data={"leave_type": "leave", "start_date": "2026-01-10", "end_date": "2026-01-11", "reason": "权限测试"})
    
    # 老板可以审批请假
    # 先获取一个待审批的申请
    resp = requests.get(f"{BASE_URL}/leave?status=pending", headers={"Authorization": f"Bearer {boss_token}"})
    pending_leaves = resp.json() if resp.status_code == 200 else []
    if pending_leaves:
        leave_id = pending_leaves[0]["id"]
        test_api("老板-审批请假", "PUT", f"/leave/{leave_id}/approve", boss_token, 200,
                 data={"status": "approved"})
    
    # 司机不能审批请假
    if len(pending_leaves) > 1:
        leave_id = pending_leaves[1]["id"]
        test_api("司机-审批请假(应拒绝)", "PUT", f"/leave/{leave_id}/approve", driver_token, 403,
                 data={"status": "approved"})
    
    # ==================== 4. 考勤管理权限测试 ====================
    print("\n" + "=" * 60)
    print("4. 考勤管理权限测试")
    print("=" * 60)
    
    # 老板可以查看所有考勤记录
    test_api("老板-查看考勤列表", "GET", "/attendance", boss_token, 200)
    # 车队长可以查看考勤记录
    test_api("车队长-查看考勤列表", "GET", "/attendance", manager_token, 200)
    # 司机可以查看考勤记录（应该只能看自己的）
    test_api("司机-查看考勤列表", "GET", "/attendance", driver_token, 200)
    
    # 司机可以打卡
    test_api("司机-获取今日打卡状态", "GET", "/attendance/today", driver_token, 200)
    
    # ==================== 5. 计件管理权限测试 ====================
    print("\n" + "=" * 60)
    print("5. 计件管理权限测试")
    print("=" * 60)
    
    # 老板可以查看所有计件记录
    test_api("老板-查看计件记录", "GET", "/piece-work/records", boss_token, 200)
    # 车队长可以查看计件记录
    test_api("车队长-查看计件记录", "GET", "/piece-work/records", manager_token, 200)
    # 司机可以查看计件记录
    test_api("司机-查看计件记录", "GET", "/piece-work/records", driver_token, 200)
    
    # 老板可以管理计件分类
    test_api("老板-查看计件分类", "GET", "/piece-work/categories", boss_token, 200)
    # 车队长可以查看计件分类
    test_api("车队长-查看计件分类", "GET", "/piece-work/categories", manager_token, 200)
    # 司机可以查看计件分类
    test_api("司机-查看计件分类", "GET", "/piece-work/categories", driver_token, 200)
    
    # 老板可以创建计件分类
    test_api("老板-创建计件分类", "POST", "/piece-work/categories", boss_token, 200,
             data={"name": "权限测试分类", "unit": "件", "unit_price": 1.0})
    # 车队长不能创建计件分类
    test_api("车队长-创建计件分类(应拒绝)", "POST", "/piece-work/categories", manager_token, 403,
             data={"name": "权限测试分类2", "unit": "件", "unit_price": 1.0})
    # 司机不能创建计件分类
    test_api("司机-创建计件分类(应拒绝)", "POST", "/piece-work/categories", driver_token, 403,
             data={"name": "权限测试分类3", "unit": "件", "unit_price": 1.0})
    
    # ==================== 6. 车辆管理权限测试 ====================
    print("\n" + "=" * 60)
    print("6. 车辆管理权限测试")
    print("=" * 60)
    
    # 老板可以查看所有车辆
    test_api("老板-查看车辆列表", "GET", "/vehicles", boss_token, 200)
    # 车队长可以查看车辆
    test_api("车队长-查看车辆列表", "GET", "/vehicles", manager_token, 200)
    # 司机可以查看车辆（自己的）
    test_api("司机-查看车辆列表", "GET", "/vehicles", driver_token, 200)
    
    # ==================== 7. 通知管理权限测试 ====================
    print("\n" + "=" * 60)
    print("7. 通知管理权限测试")
    print("=" * 60)
    
    # 所有角色都可以查看自己的通知
    test_api("老板-查看通知列表", "GET", "/notifications", boss_token, 200)
    test_api("车队长-查看通知列表", "GET", "/notifications", manager_token, 200)
    test_api("司机-查看通知列表", "GET", "/notifications", driver_token, 200)
    
    # 老板可以发送通知
    test_api("老板-发送通知", "POST", "/notifications", boss_token, 200,
             data={"title": "权限测试通知", "content": "测试内容", "user_ids": [5]})
    # 车队长可以发送通知
    test_api("车队长-发送通知", "POST", "/notifications", manager_token, 200,
             data={"title": "权限测试通知2", "content": "测试内容2", "user_ids": [5]})
    # 司机不能发送通知
    test_api("司机-发送通知(应拒绝)", "POST", "/notifications", driver_token, 403,
             data={"title": "权限测试通知3", "content": "测试内容3", "user_ids": [2]})
    
    # ==================== 8. 跨资源访问测试 ====================
    print("\n" + "=" * 60)
    print("8. 跨资源访问测试（越权检测）")
    print("=" * 60)
    
    # 司机尝试查看其他用户的详情
    test_api("司机-查看其他用户详情(应拒绝)", "GET", "/users/2", driver_token, 403)
    
    # 司机尝试修改其他用户
    test_api("司机-修改其他用户(应拒绝)", "PUT", "/users/2", driver_token, 403,
             data={"name": "被篡改的名字"})
    
    # 司机尝试删除用户
    test_api("司机-删除用户(应拒绝)", "DELETE", "/users/2", driver_token, 403)
    
    # 车队长尝试删除用户
    test_api("车队长-删除用户(应拒绝)", "DELETE", "/users/2", manager_token, 403)
    
    # 司机尝试查看其他司机的请假详情
    resp = requests.get(f"{BASE_URL}/leave", headers={"Authorization": f"Bearer {boss_token}"})
    all_leaves = resp.json() if resp.status_code == 200 else []
    other_user_leave = next((l for l in all_leaves if l["user_id"] != 5), None)
    if other_user_leave:
        test_api("司机-查看其他人请假详情(应拒绝)", "GET", f"/leave/{other_user_leave['id']}", driver_token, 403)
    
    # ==================== 9. 权限配置测试 ====================
    print("\n" + "=" * 60)
    print("9. 权限配置管理测试")
    print("=" * 60)
    
    # 老板可以查看权限配置
    test_api("老板-查看权限配置", "GET", "/permissions", boss_token, 200)
    # 车队长不能查看权限配置
    test_api("车队长-查看权限配置(应拒绝)", "GET", "/permissions", manager_token, 403)
    # 司机不能查看权限配置
    test_api("司机-查看权限配置(应拒绝)", "GET", "/permissions", driver_token, 403)
    
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
    
    # 清理测试数据
    print("\n清理测试数据...")
    # 删除测试创建的用户
    resp = requests.get(f"{BASE_URL}/users", headers={"Authorization": f"Bearer {boss_token}"})
    if resp.status_code == 200:
        for user in resp.json():
            if user["username"].startswith("test_perm_"):
                requests.delete(f"{BASE_URL}/users/{user['id']}", headers={"Authorization": f"Bearer {boss_token}"})
                print(f"  删除测试用户: {user['username']}")
    
    # 删除测试创建的仓库
    resp = requests.get(f"{BASE_URL}/warehouses", headers={"Authorization": f"Bearer {boss_token}"})
    if resp.status_code == 200:
        for wh in resp.json():
            if wh["name"].startswith("权限测试"):
                requests.delete(f"{BASE_URL}/warehouses/{wh['id']}", headers={"Authorization": f"Bearer {boss_token}"})
                print(f"  删除测试仓库: {wh['name']}")
    
    # 删除测试创建的计件分类
    resp = requests.get(f"{BASE_URL}/piece-work/categories", headers={"Authorization": f"Bearer {boss_token}"})
    if resp.status_code == 200:
        for cat in resp.json():
            if cat["name"].startswith("权限测试"):
                requests.delete(f"{BASE_URL}/piece-work/categories/{cat['id']}", headers={"Authorization": f"Bearer {boss_token}"})
                print(f"  删除测试分类: {cat['name']}")
    
    print("\n测试完成!")


if __name__ == "__main__":
    main()
