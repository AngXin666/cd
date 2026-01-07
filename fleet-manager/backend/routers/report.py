"""
报表路由模块
提供数据统计报表 API，支持日报、周报、月报查看

功能：
- 仓库统计列表：按日期范围统计各仓库的计件数据
- 仓库司机统计：按日期范围统计指定仓库内各司机的计件数据
- 司机计件记录：获取指定司机在日期范围内的计件记录明细

权限控制：
- 老板：可查看所有仓库数据
- 车队长：只能查看管辖仓库数据

Requirements: 
- Requirement 1: 报表入口
- Requirement 2: 报表周期切换
- Requirement 3: 仓库卡片展示
- Requirement 4: 仓库详情（司机列表）
- Requirement 5: 司机详情（计件记录）
- Requirement 6: 权限控制
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func

from database import get_session
from models import (
    User, UserRole, Warehouse, PieceWorkRecord, 
    WarehouseAssignment, is_role
)
from auth import get_current_user, require_manager_or_boss
from helpers import get_warehouse_preset_unit
import crud


# ==================== 响应模型 ====================

class WarehouseStatItem(BaseModel):
    """
    仓库统计项
    
    Attributes:
        warehouse_id: 仓库ID
        warehouse_name: 仓库名称
        warehouse_type: 仓库类型
        total_quantity: 总数量
        driver_count: 司机人数
        unit: 计量单位
    """
    warehouse_id: int
    warehouse_name: str
    warehouse_type: str
    total_quantity: int
    driver_count: int
    unit: str


class DriverStatItem(BaseModel):
    """
    司机统计项
    
    Attributes:
        driver_id: 司机ID
        driver_name: 司机姓名
        total_quantity: 总数量
        record_count: 记录条数
    """
    driver_id: int
    driver_name: str
    total_quantity: int
    record_count: int


class PieceWorkRecordItem(BaseModel):
    """
    计件记录项
    
    Attributes:
        id: 记录ID
        work_date: 工作日期
        category_name: 品类名称
        quantity: 数量
        amount: 金额
        remark: 备注
    """
    id: int
    work_date: date
    category_name: str
    quantity: int
    amount: float
    remark: Optional[str] = None


class DriverRecordsResponse(BaseModel):
    """
    司机计件记录响应
    
    Attributes:
        records: 计件记录列表
        total_quantity: 总件数
        total_amount: 总金额
    """
    records: List[PieceWorkRecordItem]
    total_quantity: int
    total_amount: float


# ==================== 路由器 ====================

router = APIRouter(
    prefix="/api/report",
    tags=["数据报表"]
)


# ==================== 辅助函数 ====================

def get_manager_warehouse_ids(session: Session, user_id: int) -> List[int]:
    """
    获取车队长管辖的仓库ID列表
    
    Args:
        session: 数据库会话
        user_id: 车队长用户ID
        
    Returns:
        List[int]: 仓库ID列表
    """
    warehouses = crud.get_user_warehouses(session, user_id)
    return [w.id for w in warehouses]


# ==================== API 接口 ====================

@router.get("/warehouses", response_model=List[WarehouseStatItem])
async def get_warehouse_stats(
    start_date: date = Query(..., description="开始日期 (YYYY-MM-DD)"),
    end_date: date = Query(..., description="结束日期 (YYYY-MM-DD)"),
    current_user: User = Depends(require_manager_or_boss),
    session: Session = Depends(get_session)
):
    """
    获取仓库统计列表
    
    按日期范围统计各仓库的计件数据，包括总件数和司机人数。
    结果按总件数降序排列。
    
    权限控制：
    - 老板：可查看所有仓库数据
    - 车队长：只能查看管辖仓库数据
    
    Args:
        start_date: 开始日期
        end_date: 结束日期
        current_user: 当前登录用户（需要车队长或老板权限）
        session: 数据库会话
        
    Returns:
        List[WarehouseStatItem]: 仓库统计列表，按总件数降序排列
        
    Requirements:
        - Requirement 3: 仓库卡片展示
        - Requirement 6: 权限控制
    """
    # 验证日期范围
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="开始日期不能大于结束日期"
        )
    
    # 权限控制：获取可访问的仓库ID列表
    # Requirements: 6.1, 6.2, 6.3 - 老板查看所有，车队长只看管辖仓库
    accessible_warehouse_ids: Optional[List[int]] = None
    
    if is_role(current_user.role, UserRole.MANAGER):
        # 车队长只能查看管辖仓库
        accessible_warehouse_ids = get_manager_warehouse_ids(session, current_user.id)
        if not accessible_warehouse_ids:
            # 车队长没有管辖任何仓库，返回空列表
            return []
    
    # 构建统计查询
    # 按仓库分组，统计总数量和司机人数
    query = (
        select(
            PieceWorkRecord.warehouse_id,
            func.sum(PieceWorkRecord.quantity).label("total_quantity"),
            func.count(func.distinct(PieceWorkRecord.user_id)).label("driver_count")
        )
        .where(PieceWorkRecord.work_date >= start_date)
        .where(PieceWorkRecord.work_date <= end_date)
        .where(PieceWorkRecord.warehouse_id.isnot(None))
    )
    
    # 如果是车队长，只查询管辖仓库
    if accessible_warehouse_ids is not None:
        query = query.where(PieceWorkRecord.warehouse_id.in_(accessible_warehouse_ids))
    
    # 按仓库分组
    query = query.group_by(PieceWorkRecord.warehouse_id)
    
    # 执行查询
    results = session.exec(query).all()
    
    # 构建响应
    warehouse_stats: List[WarehouseStatItem] = []
    
    for row in results:
        warehouse_id = row.warehouse_id
        total_quantity = row.total_quantity or 0
        driver_count = row.driver_count or 0
        
        # 获取仓库信息
        warehouse = crud.get_warehouse_by_id(session, warehouse_id)
        if not warehouse:
            continue
        
        # 获取仓库类型和单位
        warehouse_type = (
            warehouse.warehouse_type.value 
            if hasattr(warehouse.warehouse_type, 'value') 
            else str(warehouse.warehouse_type)
        )
        unit = get_warehouse_preset_unit(warehouse.warehouse_type)
        
        warehouse_stats.append(WarehouseStatItem(
            warehouse_id=warehouse_id,
            warehouse_name=warehouse.name,
            warehouse_type=warehouse_type,
            total_quantity=total_quantity,
            driver_count=driver_count,
            unit=unit
        ))
    
    # 按总件数降序排列
    # Requirements: 3.5 - 按总件数降序排列仓库卡片
    warehouse_stats.sort(key=lambda x: x.total_quantity, reverse=True)
    
    return warehouse_stats



@router.get("/warehouse/{warehouse_id}/drivers", response_model=List[DriverStatItem])
async def get_warehouse_driver_stats(
    warehouse_id: int,
    start_date: date = Query(..., description="开始日期 (YYYY-MM-DD)"),
    end_date: date = Query(..., description="结束日期 (YYYY-MM-DD)"),
    current_user: User = Depends(require_manager_or_boss),
    session: Session = Depends(get_session)
):
    """
    获取仓库内司机统计列表
    
    按日期范围统计指定仓库内各司机的计件数据，包括总件数和记录条数。
    结果按总件数降序排列。
    
    权限控制：
    - 老板：可查看任意仓库数据
    - 车队长：只能查看管辖仓库数据
    
    Args:
        warehouse_id: 仓库ID
        start_date: 开始日期
        end_date: 结束日期
        current_user: 当前登录用户（需要车队长或老板权限）
        session: 数据库会话
        
    Returns:
        List[DriverStatItem]: 司机统计列表，按总件数降序排列
        
    Raises:
        HTTPException 404: 仓库不存在
        HTTPException 403: 无权访问该仓库
        
    Requirements:
        - Requirement 4: 仓库详情（司机列表）
        - Requirement 6: 权限控制
    """
    # 验证日期范围
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="开始日期不能大于结束日期"
        )
    
    # 验证仓库存在
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )
    
    # 权限控制：车队长只能查看管辖仓库
    # Requirements: 6.2, 6.3 - 车队长只能查看管辖仓库数据
    if is_role(current_user.role, UserRole.MANAGER):
        accessible_warehouse_ids = get_manager_warehouse_ids(session, current_user.id)
        if warehouse_id not in accessible_warehouse_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问该仓库数据"
            )
    
    # 构建统计查询
    # 按司机分组，统计总数量和记录条数
    query = (
        select(
            PieceWorkRecord.user_id,
            func.sum(PieceWorkRecord.quantity).label("total_quantity"),
            func.count(PieceWorkRecord.id).label("record_count")
        )
        .where(PieceWorkRecord.warehouse_id == warehouse_id)
        .where(PieceWorkRecord.work_date >= start_date)
        .where(PieceWorkRecord.work_date <= end_date)
        .group_by(PieceWorkRecord.user_id)
    )
    
    # 执行查询
    results = session.exec(query).all()
    
    # 构建响应
    driver_stats: List[DriverStatItem] = []
    
    for row in results:
        user_id = row.user_id
        total_quantity = row.total_quantity or 0
        record_count = row.record_count or 0
        
        # 获取司机信息
        user = crud.get_user_by_id(session, user_id)
        if not user:
            continue
        
        driver_stats.append(DriverStatItem(
            driver_id=user_id,
            driver_name=user.name,
            total_quantity=total_quantity,
            record_count=record_count
        ))
    
    # 按总件数降序排列
    # Requirements: 4.6 - 按总件数降序排列司机卡片
    driver_stats.sort(key=lambda x: x.total_quantity, reverse=True)
    
    return driver_stats


@router.get("/driver/{driver_id}/records", response_model=DriverRecordsResponse)
async def get_driver_records(
    driver_id: int,
    warehouse_id: int = Query(..., description="仓库ID"),
    start_date: date = Query(..., description="开始日期 (YYYY-MM-DD)"),
    end_date: date = Query(..., description="结束日期 (YYYY-MM-DD)"),
    current_user: User = Depends(require_manager_or_boss),
    session: Session = Depends(get_session)
):
    """
    获取司机计件记录列表
    
    获取指定司机在日期范围内的计件记录明细。
    结果按工作日期降序排列。
    
    权限控制：
    - 老板：可查看任意司机数据
    - 车队长：只能查看管辖仓库内司机的数据
    
    Args:
        driver_id: 司机ID
        warehouse_id: 仓库ID
        start_date: 开始日期
        end_date: 结束日期
        current_user: 当前登录用户（需要车队长或老板权限）
        session: 数据库会话
        
    Returns:
        DriverRecordsResponse: 司机计件记录响应，包含记录列表和统计汇总
        
    Raises:
        HTTPException 404: 司机或仓库不存在
        HTTPException 403: 无权访问该仓库数据
        
    Requirements:
        - Requirement 5: 司机详情（计件记录）
        - Requirement 6: 权限控制
    """
    # 验证日期范围
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="开始日期不能大于结束日期"
        )
    
    # 验证司机存在
    driver = crud.get_user_by_id(session, driver_id)
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="司机不存在"
        )
    
    # 验证仓库存在
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )
    
    # 权限控制：车队长只能查看管辖仓库内司机的数据
    # Requirements: 6.2, 6.3 - 车队长只能查看管辖仓库数据
    if is_role(current_user.role, UserRole.MANAGER):
        accessible_warehouse_ids = get_manager_warehouse_ids(session, current_user.id)
        if warehouse_id not in accessible_warehouse_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问该仓库数据"
            )
    
    # 查询计件记录
    records = crud.get_piece_work_records(
        session,
        user_id=driver_id,
        warehouse_id=warehouse_id,
        start_date=start_date,
        end_date=end_date,
        limit=1000  # 设置较大的限制，确保获取所有记录
    )
    
    # 构建响应
    record_items: List[PieceWorkRecordItem] = []
    total_quantity = 0
    total_amount = 0.0
    
    for record in records:
        # 获取品类名称
        category = crud.get_piece_work_category_by_id(session, record.category_id)
        category_name = category.name if category else "未知品类"
        
        record_items.append(PieceWorkRecordItem(
            id=record.id,
            work_date=record.work_date,
            category_name=category_name,
            quantity=record.quantity,
            amount=record.amount,
            remark=record.remark
        ))
        
        total_quantity += record.quantity
        total_amount += record.amount
    
    # 按工作日期降序排列（已在 crud 中排序，这里确保一致性）
    # Requirements: 5.5 - 按工作日期降序排列计件记录
    record_items.sort(key=lambda x: x.work_date, reverse=True)
    
    return DriverRecordsResponse(
        records=record_items,
        total_quantity=total_quantity,
        total_amount=total_amount
    )
