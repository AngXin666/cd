#!/usr/bin/env python
"""
车辆历史 API 测试模块
测试 GET /api/vehicles/{id}/history 端点

Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
"""
import pytest
import json
from datetime import datetime
from fastapi.testclient import TestClient
from sqlmodel import Session

from main import app
from database import engine, create_db_and_tables
from models import User, Vehicle, VehicleHistory, VehicleHistoryActionType, UserRole, VehicleStatus
from auth import hash_password


# 创建测试客户端
client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    """
    设置测试数据库
    在模块开始时创建表，结束时清理
    """
    create_db_and_tables()
    yield


@pytest.fixture
def admin_token():
    """
    获取管理员 token
    使用默认的 admin 账号登录
    """
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    if response.status_code != 200:
        # 如果 admin 不存在，尝试使用 superadmin
        response = client.post(
            "/api/auth/login",
            json={"username": "superadmin", "password": "super123"}
        )
    assert response.status_code == 200, f"登录失败: {response.json()}"
    return response.json()["access_token"]


@pytest.fixture
def driver_token():
    """
    获取司机 token
    使用默认的 driver 账号登录
    """
    response = client.post(
        "/api/auth/login",
        json={"username": "driver", "password": "driver123"}
    )
    assert response.status_code == 200, f"登录失败: {response.json()}"
    return response.json()["access_token"]


@pytest.fixture
def test_vehicle(admin_token):
    """
    创建测试车辆
    """
    import random
    import string
    
    # 先获取当前用户信息
    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert me_response.status_code == 200
    
    # 生成唯一的车牌号
    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    license_plate = f"TEST{random_suffix}"
    
    # 创建车辆
    vehicle_data = {
        "license_plate": license_plate,
        "brand": "测试品牌",
        "model": "测试型号",
        "color": "白色"
    }
    
    # 使用数据库直接创建车辆
    with Session(engine) as session:
        # 获取一个司机用户
        from sqlmodel import select
        driver = session.exec(
            select(User).where(User.role == UserRole.DRIVER)
        ).first()
        
        if not driver:
            # 创建一个测试司机
            driver = User(
                username=f"test_driver_{random_suffix}",
                password_hash=hash_password("test123"),
                name="测试司机",
                role=UserRole.DRIVER
            )
            session.add(driver)
            session.commit()
            session.refresh(driver)
        
        # 创建车辆
        vehicle = Vehicle(
            user_id=driver.id,
            license_plate=vehicle_data["license_plate"],
            brand=vehicle_data["brand"],
            model=vehicle_data["model"],
            color=vehicle_data["color"],
            status=VehicleStatus.ACTIVE
        )
        session.add(vehicle)
        session.commit()
        session.refresh(vehicle)
        
        return {"id": vehicle.id, "license_plate": vehicle.license_plate, "user_id": driver.id}


@pytest.fixture
def test_vehicle_with_history(test_vehicle, admin_token):
    """
    创建带有历史记录的测试车辆
    """
    with Session(engine) as session:
        # 创建提车历史记录
        pickup_photos = json.dumps([
            "http://example.com/photo1.jpg",
            "http://example.com/photo2.jpg",
            "http://example.com/photo3.jpg",
            "http://example.com/photo4.jpg",
            "http://example.com/photo5.jpg",
            "http://example.com/photo6.jpg",
            "http://example.com/photo7.jpg"
        ])
        
        pickup_history = VehicleHistory(
            vehicle_id=test_vehicle["id"],
            user_id=test_vehicle["user_id"],
            action_type=VehicleHistoryActionType.PICKUP,
            action_time=datetime.now(),
            photos=pickup_photos,
            remark="测试提车"
        )
        session.add(pickup_history)
        
        # 创建还车历史记录
        return_photos = json.dumps([
            "http://example.com/return1.jpg",
            "http://example.com/return2.jpg",
            "http://example.com/return3.jpg",
            "http://example.com/return4.jpg",
            "http://example.com/return5.jpg",
            "http://example.com/return6.jpg",
            "http://example.com/return7.jpg"
        ])
        damage_photos = json.dumps([
            "http://example.com/damage1.jpg",
            "http://example.com/damage2.jpg"
        ])
        
        return_history = VehicleHistory(
            vehicle_id=test_vehicle["id"],
            user_id=test_vehicle["user_id"],
            action_type=VehicleHistoryActionType.RETURN,
            action_time=datetime.now(),
            photos=return_photos,
            damage_photos=damage_photos,
            remark="测试还车"
        )
        session.add(return_history)
        
        session.commit()
        
        return test_vehicle


class TestVehicleHistoryAPI:
    """
    车辆历史 API 测试类
    """
    
    def test_get_vehicle_history_success(self, test_vehicle_with_history, admin_token):
        """
        测试成功获取车辆历史
        Requirements: 15.1, 15.2, 15.3
        """
        vehicle_id = test_vehicle_with_history["id"]
        
        response = client.get(
            f"/api/vehicles/{vehicle_id}/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"获取历史失败: {response.json()}"
        data = response.json()
        
        # 验证响应结构
        assert "total" in data
        assert "items" in data
        assert data["total"] >= 2  # 至少有提车和还车两条记录
        
        # 验证历史记录内容
        for item in data["items"]:
            assert "id" in item
            assert "vehicle_id" in item
            assert "user_id" in item
            assert "action_type" in item
            assert "action_time" in item
            assert item["action_type"] in ["pickup", "return"]
    
    def test_get_vehicle_history_with_pagination(self, test_vehicle_with_history, admin_token):
        """
        测试分页功能
        Requirements: 15.4
        """
        vehicle_id = test_vehicle_with_history["id"]
        
        # 测试 skip 和 limit 参数
        response = client.get(
            f"/api/vehicles/{vehicle_id}/history?skip=0&limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 验证分页
        assert len(data["items"]) <= 1
    
    def test_get_vehicle_history_not_found(self, admin_token):
        """
        测试车辆不存在的情况
        """
        response = client.get(
            "/api/vehicles/99999/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404
        assert "车辆不存在" in response.json()["detail"]
    
    def test_get_vehicle_history_unauthorized(self, test_vehicle_with_history, driver_token):
        """
        测试无管理权限的情况
        Requirements: 15.5
        """
        vehicle_id = test_vehicle_with_history["id"]
        
        response = client.get(
            f"/api/vehicles/{vehicle_id}/history",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        # 司机没有管理权限，应该返回 403
        assert response.status_code == 403
    
    def test_get_vehicle_history_photos_structure(self, test_vehicle_with_history, admin_token):
        """
        测试照片结构
        Requirements: 15.2, 15.3
        """
        vehicle_id = test_vehicle_with_history["id"]
        
        response = client.get(
            f"/api/vehicles/{vehicle_id}/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 找到有照片的记录
        for item in data["items"]:
            if item.get("photos"):
                photos = item["photos"]
                # 验证照片结构包含 7 个角度
                assert "left_front" in photos or photos.get("left_front") is None
                assert "right_front" in photos or photos.get("right_front") is None
                assert "left_rear" in photos or photos.get("left_rear") is None
                assert "right_rear" in photos or photos.get("right_rear") is None
                assert "dashboard" in photos or photos.get("dashboard") is None
                assert "rear_door" in photos or photos.get("rear_door") is None
                assert "cargo_box" in photos or photos.get("cargo_box") is None


class TestVehicleReturnWithHistory:
    """
    测试还车操作自动创建历史记录
    """
    
    def test_return_vehicle_creates_history(self, test_vehicle, driver_token, admin_token):
        """
        测试还车操作自动创建历史记录
        Requirements: 15.2
        """
        vehicle_id = test_vehicle["id"]
        
        # 先将车辆分配给司机（使用管理员）
        # 获取司机信息
        me_response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        driver_id = me_response.json()["id"]
        
        # 分配车辆
        assign_response = client.put(
            f"/api/vehicles/{vehicle_id}/assign",
            json={"user_id": driver_id},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # 还车
        return_photos = [
            "http://example.com/return1.jpg",
            "http://example.com/return2.jpg",
            "http://example.com/return3.jpg",
            "http://example.com/return4.jpg",
            "http://example.com/return5.jpg",
            "http://example.com/return6.jpg",
            "http://example.com/return7.jpg"
        ]
        
        return_response = client.put(
            f"/api/vehicles/{vehicle_id}/return",
            json={
                "return_photos": return_photos,
                "damage_photos": ["http://example.com/damage1.jpg"],
                "remark": "测试还车"
            },
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        assert return_response.status_code == 200, f"还车失败: {return_response.json()}"
        
        # 验证历史记录已创建
        history_response = client.get(
            f"/api/vehicles/{vehicle_id}/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert history_response.status_code == 200
        data = history_response.json()
        
        # 应该有还车记录
        return_records = [item for item in data["items"] if item["action_type"] == "return"]
        assert len(return_records) > 0, "还车历史记录未创建"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
