"""
仓库类型功能单元测试
测试仓库类型枚举、类型到单位映射、单位验证逻辑和 API 端点

测试覆盖：
1. WarehouseType 枚举值测试
2. 类型到单位映射测试
3. 类型到显示名称映射测试
4. 品类单位验证逻辑测试
5. 仓库 API 端点测试（创建、更新、查询）

Requirements: 1.1-1.6, 3.1, 7.1-7.3
"""

import pytest
from sqlmodel import Session
from fastapi.testclient import TestClient
from fastapi import HTTPException

# 导入被测试的模块
from models import WarehouseType, Warehouse, PieceWorkCategory
from helpers import (
    get_warehouse_preset_unit,
    get_warehouse_type_display_name,
    validate_category_unit_for_warehouse,
    WAREHOUSE_TYPE_UNIT_MAP,
    WAREHOUSE_TYPE_DISPLAY_MAP
)


# ==================== 枚举值测试 ====================

class TestWarehouseTypeEnum:
    """
    测试 WarehouseType 枚举
    验证枚举包含正确的四个值
    
    Requirements: 1.1
    """
    
    def test_enum_has_four_values(self):
        """测试枚举包含四个值"""
        # 获取所有枚举成员
        members = list(WarehouseType)
        
        # 验证数量
        assert len(members) == 4, "WarehouseType 应该包含 4 个值"
    
    def test_enum_piece_value(self):
        """测试 PIECE 枚举值"""
        assert WarehouseType.PIECE.value == "piece"
    
    def test_enum_point_value(self):
        """测试 POINT 枚举值"""
        assert WarehouseType.POINT.value == "point"
    
    def test_enum_whole_value(self):
        """测试 WHOLE 枚举值"""
        assert WarehouseType.WHOLE.value == "whole"
    
    def test_enum_distance_value(self):
        """测试 DISTANCE 枚举值"""
        assert WarehouseType.DISTANCE.value == "distance"
    
    def test_enum_values_are_strings(self):
        """测试所有枚举值都是字符串类型"""
        for member in WarehouseType:
            assert isinstance(member.value, str), f"{member.name} 的值应该是字符串"


# ==================== 类型到单位映射测试 ====================

class TestWarehouseTypeUnitMapping:
    """
    测试仓库类型到预设单位的映射
    
    Requirements: 1.2, 1.3, 1.4, 1.5
    """
    
    def test_piece_maps_to_jian(self):
        """测试 piece 类型映射到 '件'"""
        assert WAREHOUSE_TYPE_UNIT_MAP["piece"] == "件"
    
    def test_point_maps_to_dian(self):
        """测试 point 类型映射到 '点'"""
        assert WAREHOUSE_TYPE_UNIT_MAP["point"] == "点"
    
    def test_whole_maps_to_che(self):
        """测试 whole 类型映射到 '车'"""
        assert WAREHOUSE_TYPE_UNIT_MAP["whole"] == "车"
    
    def test_distance_maps_to_gongli(self):
        """测试 distance 类型映射到 '公里'"""
        assert WAREHOUSE_TYPE_UNIT_MAP["distance"] == "公里"
    
    def test_mapping_has_four_entries(self):
        """测试映射包含四个条目"""
        assert len(WAREHOUSE_TYPE_UNIT_MAP) == 4


class TestGetWarehousePresetUnit:
    """
    测试 get_warehouse_preset_unit 函数
    
    Requirements: 1.2, 1.3, 1.4, 1.5
    """
    
    def test_with_enum_piece(self):
        """测试传入 WarehouseType.PIECE 枚举"""
        result = get_warehouse_preset_unit(WarehouseType.PIECE)
        assert result == "件"
    
    def test_with_enum_point(self):
        """测试传入 WarehouseType.POINT 枚举"""
        result = get_warehouse_preset_unit(WarehouseType.POINT)
        assert result == "点"
    
    def test_with_enum_whole(self):
        """测试传入 WarehouseType.WHOLE 枚举"""
        result = get_warehouse_preset_unit(WarehouseType.WHOLE)
        assert result == "车"
    
    def test_with_enum_distance(self):
        """测试传入 WarehouseType.DISTANCE 枚举"""
        result = get_warehouse_preset_unit(WarehouseType.DISTANCE)
        assert result == "公里"
    
    def test_with_string_piece(self):
        """测试传入字符串 'piece'"""
        result = get_warehouse_preset_unit("piece")
        assert result == "件"
    
    def test_with_string_point(self):
        """测试传入字符串 'point'"""
        result = get_warehouse_preset_unit("point")
        assert result == "点"
    
    def test_with_string_whole(self):
        """测试传入字符串 'whole'"""
        result = get_warehouse_preset_unit("whole")
        assert result == "车"
    
    def test_with_string_distance(self):
        """测试传入字符串 'distance'"""
        result = get_warehouse_preset_unit("distance")
        assert result == "公里"
    
    def test_with_invalid_type_returns_default(self):
        """测试传入无效类型返回默认值 '件'"""
        result = get_warehouse_preset_unit("invalid")
        assert result == "件"
    
    def test_with_none_returns_default(self):
        """测试传入 None 返回默认值 '件'"""
        result = get_warehouse_preset_unit(None)
        assert result == "件"


# ==================== 类型到显示名称映射测试 ====================

class TestWarehouseTypeDisplayMapping:
    """
    测试仓库类型到显示名称的映射
    
    Requirements: 1.1
    """
    
    def test_piece_display_name(self):
        """测试 piece 类型显示名称为 '计件'"""
        assert WAREHOUSE_TYPE_DISPLAY_MAP["piece"] == "计件"
    
    def test_point_display_name(self):
        """测试 point 类型显示名称为 '点位'"""
        assert WAREHOUSE_TYPE_DISPLAY_MAP["point"] == "点位"
    
    def test_whole_display_name(self):
        """测试 whole 类型显示名称为 '整车'"""
        assert WAREHOUSE_TYPE_DISPLAY_MAP["whole"] == "整车"
    
    def test_distance_display_name(self):
        """测试 distance 类型显示名称为 '距离'"""
        assert WAREHOUSE_TYPE_DISPLAY_MAP["distance"] == "距离"


class TestGetWarehouseTypeDisplayName:
    """
    测试 get_warehouse_type_display_name 函数
    
    Requirements: 1.1
    """
    
    def test_with_enum_piece(self):
        """测试传入 WarehouseType.PIECE 枚举"""
        result = get_warehouse_type_display_name(WarehouseType.PIECE)
        assert result == "计件"
    
    def test_with_enum_point(self):
        """测试传入 WarehouseType.POINT 枚举"""
        result = get_warehouse_type_display_name(WarehouseType.POINT)
        assert result == "点位"
    
    def test_with_enum_whole(self):
        """测试传入 WarehouseType.WHOLE 枚举"""
        result = get_warehouse_type_display_name(WarehouseType.WHOLE)
        assert result == "整车"
    
    def test_with_enum_distance(self):
        """测试传入 WarehouseType.DISTANCE 枚举"""
        result = get_warehouse_type_display_name(WarehouseType.DISTANCE)
        assert result == "距离"
    
    def test_with_string_values(self):
        """测试传入字符串值"""
        assert get_warehouse_type_display_name("piece") == "计件"
        assert get_warehouse_type_display_name("point") == "点位"
        assert get_warehouse_type_display_name("whole") == "整车"
        assert get_warehouse_type_display_name("distance") == "距离"
    
    def test_with_invalid_type_returns_unknown(self):
        """测试传入无效类型返回 '未知'"""
        result = get_warehouse_type_display_name("invalid")
        assert result == "未知"


# ==================== 品类单位验证测试 ====================

class TestValidateCategoryUnitForWarehouse:
    """
    测试品类单位与仓库类型匹配验证
    
    Requirements: 3.1
    """
    
    def test_matching_unit_passes(self, session: Session):
        """测试单位匹配时验证通过"""
        # 创建计件类型仓库
        warehouse = Warehouse(
            name="计件仓库",
            address="测试地址",
            warehouse_type=WarehouseType.PIECE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        # 创建单位为 "件" 的品类
        category = PieceWorkCategory(
            name="测试品类",
            unit_price=10.0,
            unit="件",
            is_active=True
        )
        session.add(category)
        session.commit()
        session.refresh(category)
        
        # 验证应该通过，不抛出异常
        validate_category_unit_for_warehouse(
            session,
            category_id=category.id,
            warehouse_id=warehouse.id
        )
    
    def test_mismatched_unit_raises_400(self, session: Session):
        """测试单位不匹配时抛出 400 错误"""
        # 创建计件类型仓库（预设单位为 "件"）
        warehouse = Warehouse(
            name="计件仓库",
            address="测试地址",
            warehouse_type=WarehouseType.PIECE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        # 创建单位为 "点" 的品类（与仓库不匹配）
        category = PieceWorkCategory(
            name="点位品类",
            unit_price=10.0,
            unit="点",
            is_active=True
        )
        session.add(category)
        session.commit()
        session.refresh(category)
        
        # 验证应该抛出 400 错误
        with pytest.raises(HTTPException) as exc_info:
            validate_category_unit_for_warehouse(
                session,
                category_id=category.id,
                warehouse_id=warehouse.id
            )
        
        assert exc_info.value.status_code == 400
        assert "不匹配" in exc_info.value.detail
    
    def test_nonexistent_category_raises_404(self, session: Session):
        """测试品类不存在时抛出 404 错误"""
        # 创建仓库
        warehouse = Warehouse(
            name="测试仓库",
            address="测试地址",
            warehouse_type=WarehouseType.PIECE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        # 使用不存在的品类 ID
        with pytest.raises(HTTPException) as exc_info:
            validate_category_unit_for_warehouse(
                session,
                category_id=99999,
                warehouse_id=warehouse.id
            )
        
        assert exc_info.value.status_code == 404
        assert "分类不存在" in exc_info.value.detail
    
    def test_nonexistent_warehouse_raises_404(self, session: Session):
        """测试仓库不存在时抛出 404 错误"""
        # 创建品类
        category = PieceWorkCategory(
            name="测试品类",
            unit_price=10.0,
            unit="件",
            is_active=True
        )
        session.add(category)
        session.commit()
        session.refresh(category)
        
        # 使用不存在的仓库 ID
        with pytest.raises(HTTPException) as exc_info:
            validate_category_unit_for_warehouse(
                session,
                category_id=category.id,
                warehouse_id=99999
            )
        
        assert exc_info.value.status_code == 404
        assert "仓库不存在" in exc_info.value.detail
    
    def test_point_warehouse_with_point_category(self, session: Session):
        """测试点位仓库与点位品类匹配"""
        # 创建点位类型仓库
        warehouse = Warehouse(
            name="点位仓库",
            address="测试地址",
            warehouse_type=WarehouseType.POINT,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        # 创建单位为 "点" 的品类
        category = PieceWorkCategory(
            name="点位品类",
            unit_price=10.0,
            unit="点",
            is_active=True
        )
        session.add(category)
        session.commit()
        session.refresh(category)
        
        # 验证应该通过
        validate_category_unit_for_warehouse(
            session,
            category_id=category.id,
            warehouse_id=warehouse.id
        )
    
    def test_whole_warehouse_with_che_category(self, session: Session):
        """测试整车仓库与车品类匹配"""
        # 创建整车类型仓库
        warehouse = Warehouse(
            name="整车仓库",
            address="测试地址",
            warehouse_type=WarehouseType.WHOLE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        # 创建单位为 "车" 的品类
        category = PieceWorkCategory(
            name="整车品类",
            unit_price=100.0,
            unit="车",
            is_active=True
        )
        session.add(category)
        session.commit()
        session.refresh(category)
        
        # 验证应该通过
        validate_category_unit_for_warehouse(
            session,
            category_id=category.id,
            warehouse_id=warehouse.id
        )
    
    def test_distance_warehouse_with_gongli_category(self, session: Session):
        """测试距离仓库与公里品类匹配"""
        # 创建距离类型仓库
        warehouse = Warehouse(
            name="距离仓库",
            address="测试地址",
            warehouse_type=WarehouseType.DISTANCE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        # 创建单位为 "公里" 的品类
        category = PieceWorkCategory(
            name="距离品类",
            unit_price=5.0,
            unit="公里",
            is_active=True
        )
        session.add(category)
        session.commit()
        session.refresh(category)
        
        # 验证应该通过
        validate_category_unit_for_warehouse(
            session,
            category_id=category.id,
            warehouse_id=warehouse.id
        )


# ==================== 仓库模型测试 ====================

class TestWarehouseModel:
    """
    测试 Warehouse 模型的 warehouse_type 字段
    
    Requirements: 1.6
    """
    
    def test_default_warehouse_type_is_piece(self, session: Session):
        """测试仓库默认类型为 PIECE"""
        warehouse = Warehouse(
            name="默认类型仓库",
            address="测试地址",
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        assert warehouse.warehouse_type == WarehouseType.PIECE
    
    def test_can_set_warehouse_type_to_point(self, session: Session):
        """测试可以设置仓库类型为 POINT"""
        warehouse = Warehouse(
            name="点位仓库",
            address="测试地址",
            warehouse_type=WarehouseType.POINT,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        assert warehouse.warehouse_type == WarehouseType.POINT
    
    def test_can_set_warehouse_type_to_whole(self, session: Session):
        """测试可以设置仓库类型为 WHOLE"""
        warehouse = Warehouse(
            name="整车仓库",
            address="测试地址",
            warehouse_type=WarehouseType.WHOLE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        assert warehouse.warehouse_type == WarehouseType.WHOLE
    
    def test_can_set_warehouse_type_to_distance(self, session: Session):
        """测试可以设置仓库类型为 DISTANCE"""
        warehouse = Warehouse(
            name="距离仓库",
            address="测试地址",
            warehouse_type=WarehouseType.DISTANCE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        assert warehouse.warehouse_type == WarehouseType.DISTANCE


# ==================== 仓库 API 端点测试 ====================

class TestWarehouseAPIEndpoints:
    """
    测试仓库相关 API 端点
    
    Requirements: 7.1, 7.2, 7.3
    """
    
    def test_create_warehouse_with_type(
        self,
        client: TestClient,
        boss_token: str
    ):
        """测试创建带类型的仓库"""
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        response = client.post(
            "/api/warehouses",
            json={
                "name": "点位仓库",
                "address": "测试地址",
                "warehouse_type": "point"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["warehouse_type"] == "point"
        assert data["preset_unit"] == "点"
    
    def test_create_warehouse_default_type(
        self,
        client: TestClient,
        boss_token: str
    ):
        """测试创建仓库默认类型为 piece"""
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        response = client.post(
            "/api/warehouses",
            json={
                "name": "默认类型仓库",
                "address": "测试地址"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["warehouse_type"] == "piece"
        assert data["preset_unit"] == "件"
    
    def test_get_warehouse_includes_type_and_unit(
        self,
        client: TestClient,
        boss_token: str,
        session: Session
    ):
        """测试获取仓库返回类型和预设单位"""
        # 创建仓库
        warehouse = Warehouse(
            name="整车仓库",
            address="测试地址",
            warehouse_type=WarehouseType.WHOLE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        response = client.get(
            f"/api/warehouses/{warehouse.id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["warehouse_type"] == "whole"
        assert data["preset_unit"] == "车"
    
    def test_update_warehouse_type(
        self,
        client: TestClient,
        boss_token: str,
        session: Session
    ):
        """测试更新仓库类型"""
        # 创建仓库
        warehouse = Warehouse(
            name="测试仓库",
            address="测试地址",
            warehouse_type=WarehouseType.PIECE,
            is_active=True
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        # 更新仓库类型
        response = client.put(
            f"/api/warehouses/{warehouse.id}",
            json={
                "warehouse_type": "distance"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["warehouse_type"] == "distance"
        assert data["preset_unit"] == "公里"
    
    def test_list_warehouses_includes_type_and_unit(
        self,
        client: TestClient,
        boss_token: str,
        session: Session
    ):
        """测试仓库列表返回类型和预设单位"""
        # 创建多个不同类型的仓库
        warehouses = [
            Warehouse(name="计件仓库", warehouse_type=WarehouseType.PIECE, is_active=True),
            Warehouse(name="点位仓库", warehouse_type=WarehouseType.POINT, is_active=True),
        ]
        for w in warehouses:
            session.add(w)
        session.commit()
        
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        response = client.get("/api/warehouses", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # 验证返回的仓库包含类型和单位信息
        for item in data:
            assert "warehouse_type" in item
            assert "preset_unit" in item
    
    def test_filter_warehouses_by_type(
        self,
        client: TestClient,
        boss_token: str,
        session: Session
    ):
        """测试按仓库类型筛选"""
        # 创建不同类型的仓库
        warehouses = [
            Warehouse(name="计件仓库1", warehouse_type=WarehouseType.PIECE, is_active=True),
            Warehouse(name="计件仓库2", warehouse_type=WarehouseType.PIECE, is_active=True),
            Warehouse(name="点位仓库", warehouse_type=WarehouseType.POINT, is_active=True),
        ]
        for w in warehouses:
            session.add(w)
        session.commit()
        
        headers = {"Authorization": f"Bearer {boss_token}"}
        
        # 筛选计件类型仓库
        response = client.get(
            "/api/warehouses?warehouse_type=piece",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 验证只返回计件类型的仓库
        for item in data:
            assert item["warehouse_type"] == "piece"

