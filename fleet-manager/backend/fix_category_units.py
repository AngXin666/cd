#!/usr/bin/env python3
"""
修复品类单位脚本
将品类的 unit 字段更新为其关联仓库的预设单位

运行方式：
    cd fleet-manager/backend
    python fix_category_units.py
"""

from sqlmodel import Session, select
from database import engine
from models import PieceWorkCategory, Warehouse, WarehouseType
from helpers import get_warehouse_preset_unit


def fix_category_units():
    """
    修复所有品类的单位，使其与关联仓库的预设单位一致
    """
    with Session(engine) as session:
        # 获取所有品类
        categories = session.exec(select(PieceWorkCategory)).all()
        
        fixed_count = 0
        for category in categories:
            if category.warehouse_id is None:
                print(f"跳过品类 [{category.id}] {category.name}: 未关联仓库")
                continue
            
            # 获取关联的仓库
            warehouse = session.get(Warehouse, category.warehouse_id)
            if warehouse is None:
                print(f"跳过品类 [{category.id}] {category.name}: 关联仓库不存在")
                continue
            
            # 获取仓库的预设单位
            preset_unit = get_warehouse_preset_unit(warehouse.warehouse_type)
            
            # 检查是否需要更新
            if category.unit != preset_unit:
                old_unit = category.unit
                category.unit = preset_unit
                session.add(category)
                fixed_count += 1
                print(f"修复品类 [{category.id}] {category.name}: {old_unit} -> {preset_unit} (仓库: {warehouse.name}, 类型: {warehouse.warehouse_type})")
            else:
                print(f"品类 [{category.id}] {category.name}: 单位已正确 ({category.unit})")
        
        # 提交更改
        session.commit()
        print(f"\n修复完成，共更新 {fixed_count} 个品类")


if __name__ == "__main__":
    fix_category_units()
