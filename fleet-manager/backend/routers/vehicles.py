"""
车辆管理路由模块
提供车辆的创建、查询、更新、审核、分配、还车等功能
"""

from datetime import date, datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select as sql_select

from database import get_session
from models import (
    User, UserRole, Vehicle, VehicleStatus, VehicleDocument, VehicleHistory, is_role
)
from auth import (
    get_current_user, require_admin, require_management,
    check_vehicle_ownership
)
from schemas import (
    VehicleCreate, VehicleUpdate, VehicleResponse, VehicleReviewRequest,
    VehicleDocumentCreate, VehicleDocumentResponse,
    VehicleReturnRequest, VehicleAssignRequest,
    VehicleLeaseUpdate, VehicleLeaseResponse, VehicleLeaseReminderResponse,
    SupplementPhotoRequest, SupplementedPhotosResponse,
    VehicleHistoryResponse, VehicleHistoryListResponse, VehicleHistoryPhotos,
    VehicleHistoryActionType as SchemaVehicleHistoryActionType,
    MessageResponse
)
import crud
import helpers
from events import emit_vehicle_update


# ==================== 创建路由器 ====================
router = APIRouter(prefix="/api/vehicles", tags=["车辆管理"])


# ==================== 车辆列表 API ====================

@router.get("", response_model=List[VehicleResponse])
async def get_vehicles(
    user_id: Optional[int] = None,
    vehicle_status: Optional[VehicleStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取车辆列表
    司机只能查看自己的车辆，车队长和老板可以查看所有

    Args:
        user_id: 按用户ID过滤（可选）
        vehicle_status: 按车辆状态过滤（可选）
        skip: 跳过记录数，默认0
        limit: 返回记录数上限，默认100，最大1000
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[VehicleResponse]: 车辆列表
    """
    # 权限控制：司机只能查看自己的车辆
    if is_role(current_user.role, UserRole.DRIVER):
        user_id = current_user.id

    vehicles = crud.get_vehicles(
        session,
        user_id=user_id,
        status=vehicle_status,
        skip=skip,
        limit=limit
    )

    # 构建响应（添加车主姓名）
    return _build_vehicle_response_list(session, vehicles)


@router.get("/all", response_model=List[VehicleResponse])
async def get_all_vehicles(
    warehouse_id: Optional[int] = Query(None, description="按仓库ID过滤"),
    vehicle_status: Optional[VehicleStatus] = Query(None, alias="status", description="按车辆状态过滤"),
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数上限"),
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取所有车辆列表（管理员用）
    需要管理权限（车队长、调度、老板、超级管理员）
    支持按仓库和状态过滤，支持分页

    Args:
        warehouse_id: 按仓库ID过滤（可选）
        vehicle_status: 按车辆状态过滤（可选）
        skip: 跳过记录数，默认0
        limit: 返回记录数上限，默认100，最大1000
        current_user: 当前登录用户（必须具有管理权限）
        session: 数据库会话

    Returns:
        List[VehicleResponse]: 车辆列表

    Raises:
        HTTPException 403: 当前用户无管理权限
    """
    vehicles = crud.get_all_vehicles(
        session,
        warehouse_id=warehouse_id,
        status=vehicle_status,
        skip=skip,
        limit=limit
    )

    return _build_vehicle_response_list(session, vehicles)


# ==================== 车辆 CRUD API ====================

@router.post("", response_model=VehicleResponse)
async def create_vehicle(
    request: VehicleCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    添加车辆（司机操作）
    支持同时设置租赁信息和司机证件信息
    创建车辆后自动发送通知给管理员进行审核

    使用参数数据类封装多参数，简化函数调用。
    如果请求中包含司机证件信息，会同时创建或更新司机证件记录。

    Args:
        request: 车辆创建数据（包含可选的司机证件信息）
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        VehicleResponse: 创建的车辆信息

    Raises:
        HTTPException 400: 车牌号已存在

    Requirements: 4.2, 10.4 - 在创建车辆时同时保存司机证件信息
    """
    from schemas import VehicleCreateParams

    # 检查车牌号是否已存在
    existing = session.exec(
        sql_select(Vehicle).where(Vehicle.license_plate == request.license_plate)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="车牌号已存在"
        )

    # 使用参数数据类封装参数，简化函数调用
    params = VehicleCreateParams.from_create_request(request, user_id=current_user.id)

    # 创建车辆（使用参数数据类版本）
    vehicle = crud.create_vehicle_with_params(session, params)

    # 如果请求中包含司机证件信息，同时创建或更新司机证件记录
    # Requirements: 10.4 - 在创建车辆时同时保存司机证件信息
    _save_driver_license_if_provided(session, current_user.id, request)

    # 发送通知给管理员进行车辆审核
    _send_vehicle_review_notification(session, current_user, request)

    return VehicleResponse(
        id=vehicle.id,
        user_id=vehicle.user_id,
        license_plate=vehicle.license_plate,
        brand=vehicle.brand,
        model=vehicle.model,
        color=vehicle.color,
        status=vehicle.status,
        ownership_type=vehicle.ownership_type,
        created_at=vehicle.created_at,
        updated_at=vehicle.updated_at,
        user_name=current_user.name
    )


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取车辆详情

    Args:
        vehicle_id: 车辆ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        VehicleResponse: 车辆详情

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无权查看该车辆
    """
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 权限控制：使用统一的车辆所有权检查
    check_vehicle_ownership(vehicle, current_user)

    user = crud.get_user_by_id(session, vehicle.user_id)

    return VehicleResponse(
        id=vehicle.id,
        user_id=vehicle.user_id,
        license_plate=vehicle.license_plate,
        brand=vehicle.brand,
        model=vehicle.model,
        color=vehicle.color,
        status=vehicle.status,
        ownership_type=vehicle.ownership_type,
        created_at=vehicle.created_at,
        updated_at=vehicle.updated_at,
        user_name=user.name if user else None
    )


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: int,
    request: VehicleUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    更新车辆信息
    司机只能更新自己的车辆，老板可以更新所有

    Args:
        vehicle_id: 车辆ID
        request: 车辆更新数据
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        VehicleResponse: 更新后的车辆信息

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无权更新该车辆
    """
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 权限控制：使用统一的车辆所有权检查
    check_vehicle_ownership(vehicle, current_user)

    # 更新车辆信息
    updated = crud.update_vehicle(
        session, vehicle,
        brand=request.brand,
        model=request.model,
        color=request.color,
        ownership_type=request.ownership_type
    )

    user = crud.get_user_by_id(session, updated.user_id)

    return VehicleResponse(
        id=updated.id,
        user_id=updated.user_id,
        license_plate=updated.license_plate,
        brand=updated.brand,
        model=updated.model,
        color=updated.color,
        status=updated.status,
        ownership_type=updated.ownership_type,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        user_name=user.name if user else None
    )


@router.delete("/{vehicle_id}", response_model=MessageResponse)
async def delete_vehicle(
    vehicle_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    删除车辆（管理员操作）

    只有管理员级别（调度、老板、超级管理员）可以删除车辆。
    删除前会检查车辆是否存在，删除后会同时删除关联的证件记录。

    Args:
        vehicle_id: 车辆ID
        current_user: 当前登录用户（必须是管理员）
        session: 数据库会话

    Returns:
        MessageResponse: 删除成功消息

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无管理员权限
    """
    # 1. 验证车辆存在
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 2. 删除关联的证件记录
    documents = session.exec(
        sql_select(VehicleDocument).where(VehicleDocument.vehicle_id == vehicle_id)
    ).all()
    for doc in documents:
        session.delete(doc)

    # 3. 删除关联的历史记录
    histories = session.exec(
        sql_select(VehicleHistory).where(VehicleHistory.vehicle_id == vehicle_id)
    ).all()
    for history in histories:
        session.delete(history)

    # 4. 删除车辆
    license_plate = vehicle.license_plate
    session.delete(vehicle)
    session.commit()

    return MessageResponse(message=f"车辆 {license_plate} 删除成功")


# ==================== 车辆审核 API ====================

@router.put("/{vehicle_id}/review", response_model=VehicleResponse)
async def review_vehicle(
    vehicle_id: int,
    request: VehicleReviewRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    审核车辆（管理员级别可操作：调度、老板、超级管理员）

    审批完成后会向车辆所有者推送 vehicle_update 事件，
    包含完整的车辆数据，前端无需额外 API 请求即可更新 UI。

    Requirements: 2.1, 2.4 - 车辆审批实时数据同步

    Args:
        vehicle_id: 车辆ID
        request: 审核请求数据
        current_user: 当前登录用户（必须是管理员）
        session: 数据库会话

    Returns:
        VehicleResponse: 审核后的车辆信息

    Raises:
        HTTPException 404: 车辆不存在
    """
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    updated = crud.review_vehicle(session, vehicle, request.status)
    user = crud.get_user_by_id(session, updated.user_id)

    # 触发车辆更新事件，向车辆所有者推送实时更新
    emit_vehicle_update(
        vehicle_id=updated.id,
        license_plate=updated.license_plate,
        brand=updated.brand,
        model=updated.model,
        color=updated.color,
        status=updated.status.value,
        user_id=updated.user_id,
        warehouse_id=updated.warehouse_id,
        ownership_type=updated.ownership_type,
        created_at=updated.created_at.isoformat(),
        updated_at=updated.updated_at.isoformat(),
        target_user_id=updated.user_id,
        action="update"
    )

    return VehicleResponse(
        id=updated.id,
        user_id=updated.user_id,
        license_plate=updated.license_plate,
        brand=updated.brand,
        model=updated.model,
        color=updated.color,
        status=updated.status,
        ownership_type=updated.ownership_type,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        user_name=user.name if user else None
    )


# ==================== 车辆证件 API ====================

@router.post("/{vehicle_id}/documents", response_model=VehicleDocumentResponse)
async def create_vehicle_document(
    vehicle_id: int,
    request: VehicleDocumentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    上传车辆证件

    Args:
        vehicle_id: 车辆ID
        request: 证件创建数据
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        VehicleDocumentResponse: 创建的证件信息

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无权操作该车辆
    """
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 权限控制：使用统一的车辆所有权检查
    check_vehicle_ownership(vehicle, current_user)

    document = crud.create_vehicle_document(
        session,
        vehicle_id=vehicle_id,
        doc_type=request.doc_type,
        file_url=request.file_url,
        expiry_date=request.expiry_date
    )

    return VehicleDocumentResponse(
        id=document.id,
        vehicle_id=document.vehicle_id,
        doc_type=document.doc_type,
        file_url=document.file_url,
        expiry_date=document.expiry_date,
        created_at=document.created_at
    )



# ==================== 车辆还车 API ====================

@router.post("/{vehicle_id}/return", response_model=VehicleResponse)
async def return_vehicle_simple(
    vehicle_id: int,
    request: dict,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    简化版还车操作（管理员操作）

    用于管理员快速执行还车操作，只需提供还车日期和原因。
    更新车辆状态为 returned，记录还车时间。

    Args:
        vehicle_id: 车辆ID
        request: 还车请求，包含 return_date（还车日期）和 reason（原因，可选）
        current_user: 当前登录用户（必须是管理员）
        session: 数据库会话

    Returns:
        VehicleResponse: 更新后的车辆信息

    Raises:
        HTTPException 404: 车辆不存在
    """
    # 1. 验证车辆存在
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 2. 更新车辆状态为 returned
    vehicle.status = VehicleStatus.RETURNED

    # 3. 记录还车时间
    vehicle.return_time = datetime.now()

    # 4. 更新时间戳
    vehicle.updated_at = datetime.now()

    # 5. 保存到数据库
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)

    # 6. 获取车主信息用于响应
    user = crud.get_user_by_id(session, vehicle.user_id)

    return VehicleResponse(
        id=vehicle.id,
        user_id=vehicle.user_id,
        license_plate=vehicle.license_plate,
        brand=vehicle.brand,
        model=vehicle.model,
        color=vehicle.color,
        status=vehicle.status,
        ownership_type=vehicle.ownership_type,
        created_at=vehicle.created_at,
        updated_at=vehicle.updated_at,
        user_name=user.name if user else None
    )


@router.put("/{vehicle_id}/return", response_model=VehicleResponse)
async def return_vehicle(
    vehicle_id: int,
    request: VehicleReturnRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    还车操作（司机操作）

    验证车辆存在且属于当前用户，存储还车照片和车损照片，
    更新车辆状态为 returned，记录还车时间，并自动创建历史记录。

    Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 15.2, 3.3

    Args:
        vehicle_id: 车辆ID
        request: 还车请求，包含还车照片（7张）和车损照片（可选）
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        VehicleResponse: 更新后的车辆信息

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无权操作该车辆（车辆不属于当前用户）
        HTTPException 400: 还车照片数量不正确
    """
    # 1. 验证还车请求
    vehicle = helpers.validate_return_vehicle_request(
        session,
        vehicle_id,
        current_user,
        request.return_photos
    )

    # 2. 更新车辆还车信息
    return_photos_json, damage_photos_json, return_time = helpers.update_vehicle_for_return(
        vehicle,
        request.return_photos,
        request.damage_photos,
        request.return_time
    )

    # 3. 保存到数据库
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)

    # 4. 创建还车历史记录 (Requirement 15.2)
    helpers.create_vehicle_return_history(
        session,
        vehicle,
        current_user.id,
        return_time,
        return_photos_json,
        damage_photos_json,
        request.remark
    )

    # 5. 构建并返回响应
    return VehicleResponse(
        **helpers.build_vehicle_return_response(vehicle, session)
    )


# ==================== 车辆分配 API ====================

@router.put("/{vehicle_id}/assign", response_model=VehicleResponse)
async def assign_vehicle(
    vehicle_id: int,
    request: VehicleAssignRequest,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    分配车辆给司机（管理权限操作）

    验证当前用户具有管理权限，将车辆分配给指定司机，
    更新车辆的 user_id 和 warehouse_id（如果提供），
    更新车辆状态为 active，并自动创建提车历史记录。

    Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 15.2, 3.1

    Args:
        vehicle_id: 车辆ID
        request: 分配请求，包含目标司机ID和仓库ID（可选）
        current_user: 当前登录用户（必须具有管理权限）
        session: 数据库会话

    Returns:
        VehicleResponse: 更新后的车辆信息

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 404: 目标用户不存在
        HTTPException 403: 无管理权限（由 require_management 依赖处理）
    """
    # 1. 验证车辆、用户、仓库存在
    vehicle, target_user, _ = helpers.validate_vehicle_assignment(
        session,
        vehicle_id,
        request.user_id,
        request.warehouse_id
    )

    # 2. 更新车辆分配信息
    pickup_time = helpers.update_vehicle_for_assignment(
        vehicle,
        request.user_id,
        request.warehouse_id
    )

    # 3. 保存到数据库
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)

    # 4. 创建提车历史记录 (Requirement 15.2)
    helpers.create_vehicle_pickup_history(
        session,
        vehicle,
        request.user_id,
        pickup_time,
        current_user.name
    )

    # 5. 发送通知给目标司机
    helpers.send_vehicle_assignment_notification(
        session,
        vehicle,
        request.user_id,
        current_user
    )

    # 6. 构建并返回响应
    return VehicleResponse(
        **helpers.build_vehicle_assignment_response(vehicle, target_user)
    )


# ==================== 车辆历史 API ====================

@router.get("/{vehicle_id}/history", response_model=VehicleHistoryListResponse)
async def get_vehicle_history(
    vehicle_id: int,
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回记录数上限"),
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取车辆使用历史
    返回车辆的提车/还车记录列表，包含照片、时间、司机信息

    Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 2.1

    Args:
        vehicle_id: 车辆ID
        skip: 跳过记录数，默认0
        limit: 返回记录数上限，默认20，最大100
        current_user: 当前登录用户（必须具有管理权限）
        session: 数据库会话

    Returns:
        VehicleHistoryListResponse: 包含总数和历史记录列表

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无管理权限（由 require_management 依赖处理）
    """
    # 1. 验证车辆存在
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 2. 获取历史记录总数
    total = crud.get_vehicle_history_count(session, vehicle_id)

    # 3. 获取历史记录列表
    history_records = crud.get_vehicle_history(
        session,
        vehicle_id=vehicle_id,
        skip=skip,
        limit=limit
    )

    # 4. 构建响应列表
    items = _build_history_items(session, history_records)

    return VehicleHistoryListResponse(
        total=total,
        items=items
    )


# ==================== 车辆租赁 API ====================

@router.get("/{vehicle_id}/lease", response_model=VehicleLeaseResponse)
async def get_vehicle_lease(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取车辆租赁信息
    司机只能查看自己车辆的租赁信息，管理员可以查看所有

    Args:
        vehicle_id: 车辆ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        VehicleLeaseResponse: 车辆租赁信息

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无权查看该车辆
    """
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 权限控制：使用统一的车辆所有权检查
    check_vehicle_ownership(vehicle, current_user)

    return _build_lease_response(vehicle)


@router.put("/{vehicle_id}/lease", response_model=VehicleLeaseResponse)
async def update_vehicle_lease(
    vehicle_id: int,
    request: VehicleLeaseUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    更新车辆租赁信息
    司机只能更新自己车辆的租赁信息，管理员可以更新所有

    Args:
        vehicle_id: 车辆ID
        request: 租赁更新数据
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        VehicleLeaseResponse: 更新后的租赁信息

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无权更新该车辆
    """
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 权限控制：使用统一的车辆所有权检查
    check_vehicle_ownership(vehicle, current_user)

    # 更新租赁信息
    updated = crud.update_vehicle_lease(
        session, vehicle,
        lessor_name=request.lessor_name,
        lessor_contact=request.lessor_contact,
        lessee_name=request.lessee_name,
        lessee_contact=request.lessee_contact,
        monthly_rent=request.monthly_rent,
        lease_start_date=request.lease_start_date,
        lease_end_date=request.lease_end_date,
        rent_payment_day=request.rent_payment_day
    )

    return _build_lease_response(updated)


@router.get("/lease-reminders", response_model=List[VehicleLeaseReminderResponse])
async def get_lease_reminders(
    days_ahead: int = Query(7, ge=1, le=30, description="提前多少天提醒"),
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取租金提醒列表
    返回在指定天数内需要缴纳租金的车辆列表
    管理权限可访问：车队长、调度、老板、超级管理员

    Args:
        days_ahead: 提前多少天提醒，默认7天，最大30天
        current_user: 当前登录用户（必须具有管理权限）
        session: 数据库会话

    Returns:
        List[VehicleLeaseReminderResponse]: 租金提醒列表
    """
    vehicles = crud.get_vehicles_with_lease_reminders(session, days_ahead=days_ahead)

    result = []
    for vehicle in vehicles:
        # 获取车主信息
        user = crud.get_user_by_id(session, vehicle.user_id)

        # 计算下一个缴纳日期和距离天数
        next_payment = crud.calculate_next_payment_date(
            vehicle.lease_start_date,
            vehicle.rent_payment_day
        )

        days_until = 0
        if next_payment:
            days_until = (next_payment - date.today()).days

        result.append(VehicleLeaseReminderResponse(
            id=vehicle.id,
            license_plate=vehicle.license_plate,
            brand=vehicle.brand,
            model=vehicle.model,
            user_id=vehicle.user_id,
            user_name=user.name if user else None,
            lessor_name=vehicle.lessor_name,
            monthly_rent=vehicle.monthly_rent,
            next_payment_date=next_payment,
            days_until_payment=days_until
        ))

    # 按距离缴纳日期排序（最近的在前）
    result.sort(key=lambda x: x.days_until_payment)

    return result


# ==================== 补录照片 API ====================

@router.post("/{vehicle_id}/supplement-photos", response_model=SupplementedPhotosResponse)
async def supplement_photos_simple(
    vehicle_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    简化版补录照片 API

    用于快速补录车辆照片，支持简单的请求格式。

    Args:
        vehicle_id: 车辆ID
        request: 补录照片请求，包含 photo_type（照片类型）和 photo_url（照片URL）
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        SupplementedPhotosResponse: 补录照片元数据

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无权操作该车辆
    """
    # 1. 获取车辆
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 2. 权限控制：使用统一的车辆所有权检查
    check_vehicle_ownership(vehicle, current_user)

    # 3. 解析请求参数
    photo_type = request.get("photo_type", "front")
    photo_url = request.get("photo_url", "")

    # 4. 映射 photo_type 到实际字段名
    type_to_field = {
        "front": "left_front_photo",
        "rear": "right_rear_photo",
        "left": "left_front_photo",
        "right": "right_front_photo",
        "dashboard": "dashboard_photo",
        "cargo": "cargo_box_photo"
    }
    field = type_to_field.get(photo_type, "left_front_photo")

    # 5. 执行补录操作
    supplemented_photos = crud.supplement_vehicle_photo(
        session,
        vehicle_id=vehicle_id,
        field=field,
        index=0,
        new_url=photo_url
    )

    return SupplementedPhotosResponse(
        vehicle_id=vehicle_id,
        supplemented_photos=supplemented_photos
    )


@router.put("/{vehicle_id}/supplement-photo", response_model=SupplementedPhotosResponse)
async def supplement_photo(
    vehicle_id: int,
    request: SupplementPhotoRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    补录照片
    为车辆的指定照片字段补录新照片，并记录补录元数据

    Args:
        vehicle_id: 车辆ID
        request: 补录照片请求，包含字段名、索引和新照片URL
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        SupplementedPhotosResponse: 更新后的补录照片元数据

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无权操作该车辆
        HTTPException 400: 无效的照片字段名
    """
    # 获取车辆
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 权限控制：使用统一的车辆所有权检查
    check_vehicle_ownership(vehicle, current_user)

    # 验证字段名是否有效（允许的照片字段）
    valid_fields = [
        "pickup_photos", "return_photos", "registration_photos", "damage_photos",
        "left_front_photo", "right_front_photo", "left_rear_photo", "right_rear_photo",
        "dashboard_photo", "rear_door_photo", "cargo_box_photo",
        "driving_license_main_photo", "driving_license_sub_photo",
        "driving_license_back_photo", "driving_license_sub_back_photo"
    ]
    if request.field not in valid_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的照片字段名，允许的字段：{', '.join(valid_fields)}"
        )

    # 执行补录操作
    supplemented_photos = crud.supplement_vehicle_photo(
        session,
        vehicle_id=vehicle_id,
        field=request.field,
        index=request.index,
        new_url=request.new_url
    )

    return SupplementedPhotosResponse(
        vehicle_id=vehicle_id,
        supplemented_photos=supplemented_photos
    )


@router.get("/{vehicle_id}/supplement-photos", response_model=SupplementedPhotosResponse)
async def get_supplement_photos(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取车辆的补录照片元数据
    返回该车辆所有已补录照片的元数据信息

    Args:
        vehicle_id: 车辆ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        SupplementedPhotosResponse: 补录照片元数据字典

    Raises:
        HTTPException 404: 车辆不存在
        HTTPException 403: 无权查看该车辆
    """
    # 获取车辆
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )

    # 权限控制：使用统一的车辆所有权检查
    check_vehicle_ownership(vehicle, current_user)

    # 获取补录照片元数据
    supplemented_photos = crud.get_supplemented_photos(session, vehicle_id)

    return SupplementedPhotosResponse(
        vehicle_id=vehicle_id,
        supplemented_photos=supplemented_photos
    )


# ==================== 辅助函数 ====================

def _build_vehicle_response_list(
    session: Session,
    vehicles: List[Vehicle]
) -> List[VehicleResponse]:
    """
    构建车辆响应列表

    Args:
        session: 数据库会话
        vehicles: 车辆列表

    Returns:
        List[VehicleResponse]: 车辆响应列表
    """
    result = []
    for vehicle in vehicles:
        user = crud.get_user_by_id(session, vehicle.user_id)
        result.append(VehicleResponse(
            id=vehicle.id,
            user_id=vehicle.user_id,
            license_plate=vehicle.license_plate,
            brand=vehicle.brand,
            model=vehicle.model,
            color=vehicle.color,
            status=vehicle.status,
            ownership_type=vehicle.ownership_type,
            created_at=vehicle.created_at,
            updated_at=vehicle.updated_at,
            user_name=user.name if user else None
        ))
    return result


def _save_driver_license_if_provided(
    session: Session,
    user_id: int,
    request: VehicleCreate
) -> None:
    """
    如果请求中包含司机证件信息，则创建或更新司机证件记录
    
    这是一个辅助函数，用于在车辆录入时同时保存司机证件信息。
    只有当请求中包含至少一个司机证件字段时才会执行保存操作。

    Args:
        session: 数据库会话
        user_id: 用户ID（司机ID）
        request: 车辆创建请求，可能包含司机证件信息
        
    Requirements: 10.4 - 在创建车辆时同时保存司机证件信息
    """
    # 检查是否有任何司机证件信息需要保存
    has_driver_license_info = any([
        request.driver_id_card_number,
        request.driver_id_card_name,
        request.driver_id_card_photo_front,
        request.driver_id_card_photo_back,
        request.driver_license_number,
        request.driver_license_class,
        request.driver_license_valid_from,
        request.driver_license_valid_to,
        request.driver_license_photo
    ])
    
    if not has_driver_license_info:
        # 没有司机证件信息，跳过保存
        return
    
    try:
        # 创建或更新司机证件信息
        crud.create_or_update_driver_license(
            session, user_id,
            id_card_number=request.driver_id_card_number,
            id_card_name=request.driver_id_card_name,
            id_card_photo_front=request.driver_id_card_photo_front,
            id_card_photo_back=request.driver_id_card_photo_back,
            license_number=request.driver_license_number,
            license_class=request.driver_license_class,
            valid_from=request.driver_license_valid_from,
            valid_to=request.driver_license_valid_to,
            driving_license_photo=request.driver_license_photo
        )
    except Exception as e:
        # 司机证件保存失败不影响车辆创建
        # 记录错误日志，但不抛出异常
        print(f"保存司机证件信息失败: {e}")


def _send_vehicle_review_notification(
    session: Session,
    current_user: User,
    request: VehicleCreate
) -> None:
    """
    发送车辆审核通知给管理员

    Args:
        session: 数据库会话
        current_user: 当前用户（车辆创建者）
        request: 车辆创建请求
    """
    try:
        # 获取所有管理员用户
        admin_users = crud.get_users(
            session,
            is_active=True,
            skip=0,
            limit=1000
        )
        # 筛选有车辆审核权限的角色（老板是最高权限角色）
        admin_ids = [
            u.id for u in admin_users
            if u.role in [UserRole.PEER_ADMIN, UserRole.BOSS]
        ]

        if admin_ids:
            # 构建通知内容
            title = "新的车辆审核申请"
            content = f"{current_user.name} 添加了新车辆，车牌号：{request.license_plate}"
            if request.brand:
                content += f"，品牌：{request.brand}"
            if request.model:
                content += f"，型号：{request.model}"
            content += "，请及时审核。"

            # 发送通知
            crud.create_notifications_batch(
                session,
                user_ids=admin_ids,
                title=title,
                content=content,
                sender_id=current_user.id
            )
    except Exception as e:
        # 通知发送失败不影响车辆创建
        print(f"发送车辆审核通知失败: {e}")


def _build_history_items(
    session: Session,
    history_records: List
) -> List[VehicleHistoryResponse]:
    """
    构建车辆历史记录响应列表

    将数据库记录列表转换为 API 响应对象列表。

    Args:
        session: 数据库会话
        history_records: 车辆历史记录列表

    Returns:
        List[VehicleHistoryResponse]: 响应对象列表
    """
    from helpers import parse_vehicle_photos, parse_damage_photos

    items = []
    for record in history_records:
        # 获取司机信息
        user = crud.get_user_by_id(session, record.user_id)

        # 使用辅助函数解析照片
        photos_dict = parse_vehicle_photos(record.photos)
        photos = _convert_photos_dict_to_schema(photos_dict)

        # 使用辅助函数解析车损照片
        damage_photos = parse_damage_photos(record.damage_photos)

        # 转换操作类型
        action_type = SchemaVehicleHistoryActionType(record.action_type.value)

        # 构建响应对象
        items.append(VehicleHistoryResponse(
            id=record.id,
            vehicle_id=record.vehicle_id,
            user_id=record.user_id,
            user_name=user.name if user else None,
            action_type=action_type,
            action_time=record.action_time,
            photos=photos,
            damage_photos=damage_photos,
            remark=record.remark,
            created_at=record.created_at
        ))

    return items


def _convert_photos_dict_to_schema(
    photos_dict: Optional[dict]
) -> Optional[VehicleHistoryPhotos]:
    """
    将照片字典转换为 VehicleHistoryPhotos schema 对象

    Args:
        photos_dict: 解析后的照片字典

    Returns:
        Optional[VehicleHistoryPhotos]: schema 对象，如果输入为 None 则返回 None
    """
    if photos_dict is None:
        return None

    return VehicleHistoryPhotos(
        left_front=photos_dict.get("left_front"),
        right_front=photos_dict.get("right_front"),
        left_rear=photos_dict.get("left_rear"),
        right_rear=photos_dict.get("right_rear"),
        dashboard=photos_dict.get("dashboard"),
        rear_door=photos_dict.get("rear_door"),
        cargo_box=photos_dict.get("cargo_box")
    )


def _build_lease_response(vehicle: Vehicle) -> VehicleLeaseResponse:
    """
    构建车辆租赁响应

    Args:
        vehicle: 车辆对象

    Returns:
        VehicleLeaseResponse: 租赁响应对象
    """
    # 计算下一个缴纳日期和距离天数
    next_payment = crud.calculate_next_payment_date(
        vehicle.lease_start_date,
        vehicle.rent_payment_day
    )

    days_until = None
    if next_payment:
        days_until = (next_payment - date.today()).days

    # 计算租赁状态
    lease_status = None
    if vehicle.lease_start_date and vehicle.lease_end_date:
        today = date.today()
        if today < vehicle.lease_start_date:
            lease_status = "not_started"
        elif today > vehicle.lease_end_date:
            lease_status = "expired"
        else:
            lease_status = "active"

    return VehicleLeaseResponse(
        id=vehicle.id,
        license_plate=vehicle.license_plate,
        ownership_type=vehicle.ownership_type,
        lessor_name=vehicle.lessor_name,
        lessor_contact=vehicle.lessor_contact,
        lessee_name=vehicle.lessee_name,
        lessee_contact=vehicle.lessee_contact,
        monthly_rent=vehicle.monthly_rent,
        lease_start_date=vehicle.lease_start_date,
        lease_end_date=vehicle.lease_end_date,
        rent_payment_day=vehicle.rent_payment_day,
        next_payment_date=next_payment,
        days_until_payment=days_until,
        lease_status=lease_status
    )
