"""
仓库类型功能集成测试
端到端测试完整的仓库类型功能流程

测试覆盖：
1. 创建带类型的仓库
2. 更新仓库类型
3. 品类筛选
4. 计件记录单位验证
5. 统计单位显示

Requirements: 1.1-1.6, 3.1, 4.1, 6.1, 7.1-7.3
"""

import pytest
from datetime import date
from sqlmodel import Session
from fastapi.testclient import TestClient

from models import (
    WarehouseType,
    Warehouse,
    PieceWorkCategory,
    PieceWorkRecord,
    User,
    UserRole
)
from auth import hash_password, create_access_token


# ==================== 集成测试：创建带类型的仓库 ====================

class TestCreateWarehouseWithType:
    """
    测试创建带类型的仓库的完整流程
    
    Requirements: 1.1-1.6, 7.1
    """
    
    def test_create_piece_warehouse_full_flow(
        self,
        client: TestClient,
        boss_token: str
    ):
        """测试创建计件类型仓库的完整流程"""
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        # 1. 创建计件类型仓库
        create_response = client.post(
            "/api/warehouses",
            json={
                "name": "计件仓库A",
                "address": "北京市朝阳区",
                "warehouse_type": "piece"
            },
            headers=headers
        )
        
        assert create_response.status_code == 200
        warehouse_data = create_response.json()
        warehouse_id = warehouse_data["id"]
        
        # 验证创建结果
        assert warehouse_data["name"] == "计件仓库A"
        assert warehouse_data["warehouse_type"] == "piece"
        assert warehouse_data["preset_unit"] == "件"
        
        # 2. 获取仓库详情验证
        get_response = client.get(
            f"/api/warehouses/{warehouse_id}",
            headers=headers
        )
        
        assert get_response.status_code == 200
        detail_data = get_response.json()
        assert detail_data["warehouse_type"] == "piece"
        assert detail_data["preset_unit"] == "件"
    
    def test_create_all_warehouse_types(
        self,
        client: TestClient,
        boss_token: str
    ):
        """测试创建所有四种类型的仓库"""
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        # 定义四种类型及其预期单位
        warehouse_types = [
            ("piece", "件", "计件仓库"),
            ("point", "点", "点位仓库"),
            ("whole", "车", "整车仓库"),
            ("distance", "公里", "距离仓库"),
        ]
        
        for wtype, expected_unit, name in warehouse_types:
            response = client.post(
                "/api/warehouses",
                json={
                    "name": name,
                    "address": "测试地址",
                    "warehouse_type": wtype
                },
                headers=headers
            )
            
            assert response.status_code == 200, f"创建 {wtype} 类型仓库失败"
            data = response.json()
            assert data["warehouse_type"] == wtype
            assert data["preset_unit"] == expected_unit


# ==================== 集成测试：更新仓库类型 ====================

class TestUpdateWarehouseType:
    """
    测试更新仓库类型的完整流程
    
    Requirements: 1.1-1.6, 7.2
    """
    
    def test_update_warehouse_type_full_flow(
        self,
        client: TestClient,
        boss_token: str
    ):
        """测试更新仓库类型的完整流程"""
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        # 1. 创建计件类型仓库
        create_response = client.post(
            "/api/warehouses",
            json={
                "name": "待更新仓库",
                "address": "测试地址",
                "warehouse_type": "piece"
            },
            headers=headers
        )
        
        assert create_response.status_code == 200
        warehouse_id = create_response.json()["id"]
        
        # 2. 更新为点位类型
        update_response = client.put(
            f"/api/warehouses/{warehouse_id}",
            json={"warehouse_type": "point"},
            headers=headers
        )
        
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["warehouse_type"] == "point"
        assert updated_data["preset_unit"] == "点"
        
        # 3. 再次更新为整车类型
        update_response2 = client.put(
            f"/api/warehouses/{warehouse_id}",
            json={"warehouse_type": "whole"},
            headers=headers
        )
        
        assert update_response2.status_code == 200
        updated_data2 = update_response2.json()
        assert updated_data2["warehouse_type"] == "whole"
        assert updated_data2["preset_unit"] == "车"
        
        # 4. 验证最终状态
        get_response = client.get(
            f"/api/warehouses/{warehouse_id}",
            headers=headers
        )
        
        assert get_response.status_code == 200
        final_data = get_response.json()
        assert final_data["warehouse_type"] == "whole"
        assert final_data["preset_unit"] == "车"


# ==================== 集成测试：品类筛选 ====================

class TestCategoryFiltering:
    """
    测试根据仓库类型筛选品类的完整流程
    
    Requirements: 4.1, 7.3
    """
    
    def test_get_warehouse_categories_filters_by_unit(
        self,
        client: TestClient,
        boss_token: str,
        session: Session
    ):
        """测试获取仓库可用品类时按单位筛选"""
        # 1. 创建计件类型仓库
        warehouse = Warehouse(
            name="品类筛选测试仓库",
            address="测试地址",
            warehouse_type=WarehouseType.PIECE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        # 2. 创建不同单位的品类
        categories = [
            PieceWorkCategory(name="计件品类1", unit_price=10.0, unit="件", is_active=True),
            PieceWorkCategory(name="计件品类2", unit_price=15.0, unit="件", is_active=True),
            PieceWorkCategory(name="点位品类", unit_price=20.0, unit="点", is_active=True),
            PieceWorkCategory(name="整车品类", unit_price=100.0, unit="车", is_active=True),
        ]
        for cat in categories:
            session.add(cat)
        session.commit()
        
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        # 3. 获取仓库可用品类
        response = client.get(
            f"/api/warehouses/{warehouse.id}/categories",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 4. 验证只返回单位为 "件" 的品类
        assert len(data) == 2
        for cat in data:
            assert cat["unit"] == "件"
    
    def test_point_warehouse_gets_point_categories(
        self,
        client: TestClient,
        boss_token: str,
        session: Session
    ):
        """测试点位仓库只获取点位品类"""
        # 1. 创建点位类型仓库
        warehouse = Warehouse(
            name="点位仓库",
            address="测试地址",
            warehouse_type=WarehouseType.POINT,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        # 2. 创建不同单位的品类
        categories = [
            PieceWorkCategory(name="计件品类", unit_price=10.0, unit="件", is_active=True),
            PieceWorkCategory(name="点位品类1", unit_price=20.0, unit="点", is_active=True),
            PieceWorkCategory(name="点位品类2", unit_price=25.0, unit="点", is_active=True),
        ]
        for cat in categories:
            session.add(cat)
        session.commit()
        
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        # 3. 获取仓库可用品类
        response = client.get(
            f"/api/warehouses/{warehouse.id}/categories",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 4. 验证只返回单位为 "点" 的品类
        assert len(data) == 2
        for cat in data:
            assert cat["unit"] == "点"


# ==================== 集成测试：计件记录单位验证 ====================

class TestPieceWorkUnitValidation:
    """
    测试计件记录创建时的单位验证
    
    Requirements: 3.1
    """
    
    def test_create_piece_work_with_matching_unit(
        self,
        client: TestClient,
        session: Session
    ):
        """测试创建计件记录时单位匹配的情况"""
        # 1. 创建司机用户
        driver = User(
            username="test_driver_unit",
            password_hash=hash_password("test123"),
            name="测试司机",
            phone="13800000099",
            role=UserRole.DRIVER,
            is_active=True
        )
        session.add(driver)
        session.commit()
        session.refresh(driver)
        
        driver_token = create_access_token(data={"sub": str(driver.id)})
        
        # 2. 创建计件类型仓库
        warehouse = Warehouse(
            name="计件仓库",
            address="测试地址",
            warehouse_type=WarehouseType.PIECE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        # 3. 创建单位为 "件" 的品类
        category = PieceWorkCategory(
            name="匹配品类",
            unit_price=10.0,
            unit="件",
            is_active=True
        )
        session.add(category)
        session.commit()
        session.refresh(category)
        
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        # 4. 创建计件记录（单位匹配，应该成功）
        response = client.post(
            "/api/piece-work/records",
            json={
                "category_id": category.id,
                "warehouse_id": warehouse.id,
                "work_date": str(date.today()),
                "quantity": 100
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 100
    
    def test_create_piece_work_with_mismatched_unit_fails(
        self,
        client: TestClient,
        session: Session
    ):
        """测试创建计件记录时单位不匹配的情况"""
        # 1. 创建司机用户
        driver = User(
            username="test_driver_mismatch",
            password_hash=hash_password("test123"),
            name="测试司机2",
            phone="13800000098",
            role=UserRole.DRIVER,
            is_active=True
        )
        session.add(driver)
        session.commit()
        session.refresh(driver)
        
        driver_token = create_access_token(data={"sub": str(driver.id)})
        
        # 2. 创建计件类型仓库（预设单位为 "件"）
        warehouse = Warehouse(
            name="计件仓库2",
            address="测试地址",
            warehouse_type=WarehouseType.PIECE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        # 3. 创建单位为 "点" 的品类（与仓库不匹配）
        category = PieceWorkCategory(
            name="不匹配品类",
            unit_price=20.0,
            unit="点",
            is_active=True
        )
        session.add(category)
        session.commit()
        session.refresh(category)
        
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        # 4. 创建计件记录（单位不匹配，应该失败）
        response = client.post(
            "/api/piece-work/records",
            json={
                "category_id": category.id,
                "warehouse_id": warehouse.id,
                "work_date": str(date.today()),
                "quantity": 50
            },
            headers=headers
        )
        
        assert response.status_code == 400
        assert "不匹配" in response.json()["detail"]


# ==================== 集成测试：统计单位显示 ====================

class TestStatisticsUnitDisplay:
    """
    测试统计数据中的单位显示
    
    Requirements: 6.1
    """
    
    def test_warehouse_list_shows_correct_units(
        self,
        client: TestClient,
        boss_token: str,
        session: Session
    ):
        """测试仓库列表显示正确的单位"""
        # 1. 创建不同类型的仓库
        warehouses = [
            Warehouse(name="统计测试-计件", warehouse_type=WarehouseType.PIECE, is_active=True),
            Warehouse(name="统计测试-点位", warehouse_type=WarehouseType.POINT, is_active=True),
            Warehouse(name="统计测试-整车", warehouse_type=WarehouseType.WHOLE, is_active=True),
            Warehouse(name="统计测试-距离", warehouse_type=WarehouseType.DISTANCE, is_active=True),
        ]
        for w in warehouses:
            session.add(w)
        session.commit()
        
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        # 2. 获取仓库列表
        response = client.get("/api/warehouses", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # 3. 验证每个仓库都有正确的单位
        expected_units = {
            "piece": "件",
            "point": "点",
            "whole": "车",
            "distance": "公里"
        }
        
        for warehouse in data:
            if warehouse["name"].startswith("统计测试"):
                wtype = warehouse["warehouse_type"]
                assert warehouse["preset_unit"] == expected_units[wtype]


# ==================== 集成测试：完整业务流程 ====================

class TestFullBusinessFlow:
    """
    测试完整的业务流程
    从创建仓库到录入计件记录
    
    Requirements: 1.1-1.6, 3.1, 4.1, 6.1, 7.1-7.3
    """
    
    def test_complete_piece_work_flow(
        self,
        client: TestClient,
        session: Session
    ):
        """测试完整的计件工作流程"""
        # 1. 创建老板用户
        boss = User(
            username="flow_boss",
            password_hash=hash_password("test123"),
            name="流程测试老板",
            phone="13800000001",
            role=UserRole.BOSS,
            is_active=True
        )
        session.add(boss)
        session.commit()
        session.refresh(boss)
        boss_token = create_access_token(data={"sub": str(boss.id)})
        
        # 2. 创建司机用户
        driver = User(
            username="flow_driver",
            password_hash=hash_password("test123"),
            name="流程测试司机",
            phone="13800000002",
            role=UserRole.DRIVER,
            is_active=True
        )
        session.add(driver)
        session.commit()
        session.refresh(driver)
        driver_token = create_access_token(data={"sub": str(driver.id)})
        
        boss_headers = {"Authorization": f"Bearer {boss_token}"}
        driver_headers = {"Authorization": f"Bearer {driver_token}"}
        
        # 3. 老板创建点位类型仓库
        warehouse_response = client.post(
            "/api/warehouses",
            json={
                "name": "流程测试仓库",
                "address": "测试地址",
                "warehouse_type": "point"
            },
            headers=boss_headers
        )
        
        assert warehouse_response.status_code == 200
        warehouse_data = warehouse_response.json()
        warehouse_id = warehouse_data["id"]
        assert warehouse_data["preset_unit"] == "点"
        
        # 4. 创建点位品类
        category = PieceWorkCategory(
            name="流程测试品类",
            unit_price=15.0,
            unit="点",
            is_active=True
        )
        session.add(category)
        session.commit()
        session.refresh(category)
        
        # 5. 司机录入计件记录
        record_response = client.post(
            "/api/piece-work/records",
            json={
                "category_id": category.id,
                "warehouse_id": warehouse_id,
                "work_date": str(date.today()),
                "quantity": 50
            },
            headers=driver_headers
        )
        
        assert record_response.status_code == 200
        record_data = record_response.json()
        assert record_data["quantity"] == 50
        assert record_data["amount"] == 50 * 15.0  # 数量 × 单价
        
        # 6. 验证仓库信息
        warehouse_detail = client.get(
            f"/api/warehouses/{warehouse_id}",
            headers=boss_headers
        )
        
        assert warehouse_detail.status_code == 200
        assert warehouse_detail.json()["warehouse_type"] == "point"
        assert warehouse_detail.json()["preset_unit"] == "点"

