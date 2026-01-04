"""
车辆 CRUD 操作模块
包含车辆的增删改查、租赁管理、证件管理、补录照片等功能
"""

import json
import calendar
from datetime import datetime, date
from typing import Optional, List

from sqlmodel import Session, select

from models import (
    Vehicle, VehicleDocument, VehicleStatus, DocumentType
)
from schemas import VehicleCreateParams


def create_vehicle(
    session: Session,
    user_id: int,
    license_plate: str,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    color: Optional[str] = None,
    ownership_type: Optional[str] = "company",
    lessor_name: Optional[str] = None,
    lessor_contact: Optional[str] = None,
    lessee_name: Optional[str] = None,
    lessee_contact: Optional[str] = None,
    monthly_rent: Optional[float] = None,
    lease_start_date: Optional[date] = None,
    lease_end_date: Optional[date] = None,
    rent_payment_day: Optional[int] = None,
    # 车辆照片（7张基本照片）
    left_front_photo: Optional[str] = None,
    right_front_photo: Optional[str] = None,
    left_rear_photo: Optional[str] = None,
    right_rear_photo: Optional[str] = None,
    dashboard_photo: Optional[str] = None,
    rear_door_photo: Optional[str] = None,
    cargo_box_photo: Optional[str] = None,
    # 行驶证照片（3张）
    driving_license_main_photo: Optional[str] = None,
    driving_license_sub_photo: Optional[str] = None,
    driving_license_sub_back_photo: Optional[str] = None,
    # 照片数组
    pickup_photos: Optional[List[str]] = None,
    registration_photos: Optional[List[str]] = None,
    damage_photos: Optional[List[str]] = None,
    # 提车时间
    pickup_time: Optional[datetime] = None
) -> Vehicle:
    """
    创建车辆

    Args:
        session: 数据库会话
        user_id: 车主ID
        license_plate: 车牌号
        brand: 品牌（可选）
        model: 型号（可选）
        color: 颜色（可选）
        ownership_type: 所有权类型（可选，默认 company）
        lessor_name: 出租方名称（可选）
        lessor_contact: 出租方联系方式（可选）
        lessee_name: 承租方名称（可选）
        lessee_contact: 承租方联系方式（可选）
        monthly_rent: 月租金（可选）
        lease_start_date: 租赁开始日期（可选）
        lease_end_date: 租赁结束日期（可选）
        rent_payment_day: 每月租金缴纳日（可选）
        left_front_photo: 左前照片URL（可选）
        right_front_photo: 右前照片URL（可选）
        left_rear_photo: 左后照片URL（可选）
        right_rear_photo: 右后照片URL（可选）
        dashboard_photo: 仪表盘照片URL（可选）
        rear_door_photo: 后门照片URL（可选）
        cargo_box_photo: 货箱照片URL（可选）
        driving_license_main_photo: 行驶证主页照片URL（可选）
        driving_license_sub_photo: 行驶证副页照片URL（可选）
        driving_license_sub_back_photo: 行驶证副页背面照片URL（可选）
        pickup_photos: 提车照片数组（可选）
        registration_photos: 行驶证照片数组（可选）
        damage_photos: 车损照片数组（可选）
        pickup_time: 提车时间（可选）

    Returns:
        Vehicle: 创建的车辆对象
    """
    # 将照片数组转换为 JSON 字符串
    pickup_photos_json = json.dumps(pickup_photos) if pickup_photos else None
    registration_photos_json = json.dumps(registration_photos) if registration_photos else None
    damage_photos_json = json.dumps(damage_photos) if damage_photos else None
    
    vehicle = Vehicle(
        user_id=user_id,
        license_plate=license_plate,
        brand=brand,
        model=model,
        color=color,
        status=VehicleStatus.REVIEWING,  # 新车辆默认待审核
        ownership_type=ownership_type,
        lessor_name=lessor_name,
        lessor_contact=lessor_contact,
        lessee_name=lessee_name,
        lessee_contact=lessee_contact,
        monthly_rent=monthly_rent,
        lease_start_date=lease_start_date,
        lease_end_date=lease_end_date,
        rent_payment_day=rent_payment_day,
        # 车辆照片
        left_front_photo=left_front_photo,
        right_front_photo=right_front_photo,
        left_rear_photo=left_rear_photo,
        right_rear_photo=right_rear_photo,
        dashboard_photo=dashboard_photo,
        rear_door_photo=rear_door_photo,
        cargo_box_photo=cargo_box_photo,
        # 行驶证照片
        driving_license_main_photo=driving_license_main_photo,
        driving_license_sub_photo=driving_license_sub_photo,
        driving_license_sub_back_photo=driving_license_sub_back_photo,
        # 照片数组（JSON格式）
        pickup_photos=pickup_photos_json,
        registration_photos=registration_photos_json,
        damage_photos=damage_photos_json,
        # 提车时间
        pickup_time=pickup_time
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def create_vehicle_with_params(
    session: Session,
    params: VehicleCreateParams
) -> Vehicle:
    """
    使用参数数据类创建车辆
    封装多参数为单一参数对象，简化函数调用

    Args:
        session: 数据库会话
        params: 车辆创建参数对象，包含所有创建所需的参数

    Returns:
        Vehicle: 创建的车辆对象

    Requirements: 4.2
    """
    return create_vehicle(
        session=session,
        user_id=params.user_id,
        license_plate=params.license_plate,
        brand=params.brand,
        model=params.model,
        color=params.color,
        ownership_type=params.ownership_type,
        lessor_name=params.lessor_name,
        lessor_contact=params.lessor_contact,
        lessee_name=params.lessee_name,
        lessee_contact=params.lessee_contact,
        monthly_rent=params.monthly_rent,
        lease_start_date=params.lease_start_date,
        lease_end_date=params.lease_end_date,
        rent_payment_day=params.rent_payment_day,
        # 车辆照片
        left_front_photo=params.left_front_photo,
        right_front_photo=params.right_front_photo,
        left_rear_photo=params.left_rear_photo,
        right_rear_photo=params.right_rear_photo,
        dashboard_photo=params.dashboard_photo,
        rear_door_photo=params.rear_door_photo,
        cargo_box_photo=params.cargo_box_photo,
        # 行驶证照片
        driving_license_main_photo=params.driving_license_main_photo,
        driving_license_sub_photo=params.driving_license_sub_photo,
        driving_license_sub_back_photo=params.driving_license_sub_back_photo,
        # 照片数组
        pickup_photos=params.pickup_photos,
        registration_photos=params.registration_photos,
        damage_photos=params.damage_photos,
        # 提车时间
        pickup_time=params.pickup_time
    )


def get_vehicles(
    session: Session,
    user_id: Optional[int] = None,
    status: Optional[VehicleStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Vehicle]:
    """
    获取车辆列表

    Args:
        session: 数据库会话
        user_id: 按车主筛选（可选）
        status: 按状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限

    Returns:
        List[Vehicle]: 车辆列表
    """
    statement = select(Vehicle)

    if user_id is not None:
        statement = statement.where(Vehicle.user_id == user_id)
    if status is not None:
        statement = statement.where(Vehicle.status == status)

    statement = statement.offset(skip).limit(limit)
    return list(session.exec(statement).all())


def get_all_vehicles(
    session: Session,
    warehouse_id: Optional[int] = None,
    status: Optional[VehicleStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Vehicle]:
    """
    获取所有车辆列表（管理员用）
    支持按仓库和状态过滤

    Args:
        session: 数据库会话
        warehouse_id: 按仓库筛选（可选）
        status: 按状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限

    Returns:
        List[Vehicle]: 车辆列表
    """
    statement = select(Vehicle)

    # 按仓库过滤
    if warehouse_id is not None:
        statement = statement.where(Vehicle.warehouse_id == warehouse_id)
    # 按状态过滤
    if status is not None:
        statement = statement.where(Vehicle.status == status)

    # 按创建时间倒序排列
    statement = statement.order_by(Vehicle.created_at.desc())
    # 分页
    statement = statement.offset(skip).limit(limit)

    return list(session.exec(statement).all())


def get_warehouse_vehicles(
    session: Session,
    warehouse_id: int,
    status: Optional[VehicleStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Vehicle]:
    """
    获取指定仓库的车辆列表
    用于车队长查看本仓库的车辆

    Args:
        session: 数据库会话
        warehouse_id: 仓库ID（必需）
        status: 按状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限

    Returns:
        List[Vehicle]: 该仓库的车辆列表
    """
    statement = select(Vehicle).where(Vehicle.warehouse_id == warehouse_id)

    if status is not None:
        statement = statement.where(Vehicle.status == status)

    statement = statement.order_by(Vehicle.created_at.desc())
    statement = statement.offset(skip).limit(limit)

    return list(session.exec(statement).all())


def update_vehicle(
    session: Session,
    vehicle: Vehicle,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    color: Optional[str] = None,
    ownership_type: Optional[str] = None
) -> Vehicle:
    """
    更新车辆信息

    Args:
        session: 数据库会话
        vehicle: 要更新的车辆对象
        brand: 新品牌（可选）
        model: 新型号（可选）
        color: 新颜色（可选）
        ownership_type: 新所有权类型（可选）

    Returns:
        Vehicle: 更新后的车辆对象
    """
    if brand is not None:
        vehicle.brand = brand
    if model is not None:
        vehicle.model = model
    if color is not None:
        vehicle.color = color
    if ownership_type is not None:
        vehicle.ownership_type = ownership_type

    vehicle.updated_at = datetime.now()
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def update_vehicle_lease(
    session: Session,
    vehicle: Vehicle,
    lessor_name: Optional[str] = None,
    lessor_contact: Optional[str] = None,
    lessee_name: Optional[str] = None,
    lessee_contact: Optional[str] = None,
    monthly_rent: Optional[float] = None,
    lease_start_date: Optional[date] = None,
    lease_end_date: Optional[date] = None,
    rent_payment_day: Optional[int] = None
) -> Vehicle:
    """
    更新车辆租赁信息

    Args:
        session: 数据库会话
        vehicle: 要更新的车辆对象
        lessor_name: 出租方名称（可选）
        lessor_contact: 出租方联系方式（可选）
        lessee_name: 承租方名称（可选）
        lessee_contact: 承租方联系方式（可选）
        monthly_rent: 月租金（可选）
        lease_start_date: 租赁开始日期（可选）
        lease_end_date: 租赁结束日期（可选）
        rent_payment_day: 每月租金缴纳日（可选）

    Returns:
        Vehicle: 更新后的车辆对象
    """
    if lessor_name is not None:
        vehicle.lessor_name = lessor_name
    if lessor_contact is not None:
        vehicle.lessor_contact = lessor_contact
    if lessee_name is not None:
        vehicle.lessee_name = lessee_name
    if lessee_contact is not None:
        vehicle.lessee_contact = lessee_contact
    if monthly_rent is not None:
        vehicle.monthly_rent = monthly_rent
    if lease_start_date is not None:
        vehicle.lease_start_date = lease_start_date
    if lease_end_date is not None:
        vehicle.lease_end_date = lease_end_date
    if rent_payment_day is not None:
        vehicle.rent_payment_day = rent_payment_day

    vehicle.updated_at = datetime.now()
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def get_vehicle_lease_info(session: Session, vehicle_id: int) -> Optional[Vehicle]:
    """
    获取车辆租赁信息

    Args:
        session: 数据库会话
        vehicle_id: 车辆ID

    Returns:
        Vehicle: 车辆对象（包含租赁信息），不存在则返回 None
    """
    return session.get(Vehicle, vehicle_id)


def get_vehicles_with_lease_reminders(
    session: Session,
    days_ahead: int = 7
) -> List[Vehicle]:
    """
    获取即将到期的租金提醒列表
    返回在指定天数内需要缴纳租金的车辆

    Args:
        session: 数据库会话
        days_ahead: 提前多少天提醒，默认7天

    Returns:
        List[Vehicle]: 需要提醒的车辆列表
    """
    today = date.today()

    # 查询有租赁信息的车辆
    statement = select(Vehicle).where(
        Vehicle.monthly_rent is not None,
        Vehicle.monthly_rent > 0,
        Vehicle.rent_payment_day is not None
    )

    vehicles = list(session.exec(statement).all())

    # 过滤出即将到期的车辆
    reminders = []
    for vehicle in vehicles:
        next_payment = calculate_next_payment_date(
            vehicle.lease_start_date,
            vehicle.rent_payment_day
        )
        if next_payment:
            days_until = (next_payment - today).days
            if 0 <= days_until <= days_ahead:
                reminders.append(vehicle)

    return reminders


def calculate_next_payment_date(
    lease_start_date: Optional[date],
    rent_payment_day: Optional[int]
) -> Optional[date]:
    """
    计算下一个租金缴纳日期

    Args:
        lease_start_date: 租赁开始日期
        rent_payment_day: 每月缴纳日（1-31）

    Returns:
        date: 下一个缴纳日期，如果无法计算则返回 None
    """
    if not rent_payment_day:
        return None

    today = date.today()
    current_year = today.year
    current_month = today.month

    # 处理缴纳日超过当月天数的情况
    days_in_month = calendar.monthrange(current_year, current_month)[1]
    payment_day = min(rent_payment_day, days_in_month)

    # 计算当月的缴纳日期
    current_month_payment = date(current_year, current_month, payment_day)

    # 如果当月的缴纳日期还未到，返回当月的缴纳日期
    if current_month_payment >= today:
        return current_month_payment

    # 否则返回下个月的缴纳日期
    if current_month == 12:
        next_month = 1
        next_year = current_year + 1
    else:
        next_month = current_month + 1
        next_year = current_year

    days_in_next_month = calendar.monthrange(next_year, next_month)[1]
    payment_day = min(rent_payment_day, days_in_next_month)

    return date(next_year, next_month, payment_day)


def review_vehicle(
    session: Session,
    vehicle: Vehicle,
    status: VehicleStatus
) -> Vehicle:
    """
    审核车辆

    Args:
        session: 数据库会话
        vehicle: 车辆对象
        status: 新状态

    Returns:
        Vehicle: 更新后的车辆对象
    """
    vehicle.status = status
    vehicle.updated_at = datetime.now()
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def create_vehicle_document(
    session: Session,
    vehicle_id: int,
    doc_type: str,
    file_url: Optional[str] = None,
    expiry_date: Optional[date] = None
) -> VehicleDocument:
    """
    创建车辆证件

    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        doc_type: 证件类型
        file_url: 证件图片URL（可选）
        expiry_date: 过期日期（可选）

    Returns:
        VehicleDocument: 创建的证件对象
    """
    document = VehicleDocument(
        vehicle_id=vehicle_id,
        doc_type=doc_type,
        file_url=file_url,
        expiry_date=expiry_date
    )
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


# ==================== 补录照片 CRUD ====================

def get_or_create_vehicle_document(session: Session, vehicle_id: int) -> VehicleDocument:
    """
    获取或创建车辆证件记录
    用于存储补录照片元数据

    Args:
        session: 数据库会话
        vehicle_id: 车辆ID

    Returns:
        VehicleDocument: 车辆证件对象
    """
    # 查找现有的证件记录（使用 LICENSE 类型作为默认）
    statement = select(VehicleDocument).where(
        VehicleDocument.vehicle_id == vehicle_id,
        VehicleDocument.doc_type == DocumentType.LICENSE
    )
    document = session.exec(statement).first()

    if not document:
        # 创建新的证件记录
        document = VehicleDocument(
            vehicle_id=vehicle_id,
            doc_type=DocumentType.LICENSE,
            supplemented_photos="{}"
        )
        session.add(document)
        session.commit()
        session.refresh(document)

    return document


def supplement_vehicle_photo(
    session: Session,
    vehicle_id: int,
    field: str,
    index: int,
    new_url: str
) -> dict:
    """
    补录车辆照片
    记录补录照片的元数据，包括补录时间、原始URL、补录次数等

    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        field: 照片字段名（如 "pickup_photos"）
        index: 照片在数组中的索引
        new_url: 新照片的URL

    Returns:
        dict: 更新后的补录照片元数据字典
    """
    # 获取或创建证件记录
    document = get_or_create_vehicle_document(session, vehicle_id)

    # 解析现有的补录照片元数据
    supplemented_photos = {}
    if document.supplemented_photos:
        try:
            supplemented_photos = json.loads(document.supplemented_photos)
        except json.JSONDecodeError:
            supplemented_photos = {}

    # 生成照片键
    photo_key = f"{field}_{index}"

    # 获取现有的补录信息（如果有）
    existing_meta = supplemented_photos.get(photo_key, {})
    supplement_count = existing_meta.get("supplement_count", 0) + 1

    # 更新补录元数据
    supplemented_photos[photo_key] = {
        "field": field,
        "index": index,
        "supplemented_at": datetime.now().isoformat(),
        "original_url": existing_meta.get("original_url") or new_url,
        "supplement_count": supplement_count
    }

    # 保存更新
    document.supplemented_photos = json.dumps(supplemented_photos, ensure_ascii=False)
    document.updated_at = datetime.now()
    session.add(document)
    session.commit()
    session.refresh(document)

    return supplemented_photos


def get_supplemented_photos(session: Session, vehicle_id: int) -> dict:
    """
    获取车辆的补录照片元数据

    Args:
        session: 数据库会话
        vehicle_id: 车辆ID

    Returns:
        dict: 补录照片元数据字典，键为 "{field}_{index}"
    """
    # 查找证件记录
    statement = select(VehicleDocument).where(
        VehicleDocument.vehicle_id == vehicle_id,
        VehicleDocument.doc_type == DocumentType.LICENSE
    )
    document = session.exec(statement).first()

    if not document or not document.supplemented_photos:
        return {}

    try:
        return json.loads(document.supplemented_photos)
    except json.JSONDecodeError:
        return {}


def clear_supplemented_photo(
    session: Session,
    vehicle_id: int,
    field: str,
    index: int
) -> dict:
    """
    清除指定照片的补录标记

    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        field: 照片字段名
        index: 照片在数组中的索引

    Returns:
        dict: 更新后的补录照片元数据字典
    """
    # 查找证件记录
    statement = select(VehicleDocument).where(
        VehicleDocument.vehicle_id == vehicle_id,
        VehicleDocument.doc_type == DocumentType.LICENSE
    )
    document = session.exec(statement).first()

    if not document or not document.supplemented_photos:
        return {}

    try:
        supplemented_photos = json.loads(document.supplemented_photos)
    except json.JSONDecodeError:
        return {}

    # 删除指定的补录标记
    photo_key = f"{field}_{index}"
    if photo_key in supplemented_photos:
        del supplemented_photos[photo_key]

    # 保存更新
    document.supplemented_photos = json.dumps(supplemented_photos, ensure_ascii=False)
    document.updated_at = datetime.now()
    session.add(document)
    session.commit()
    session.refresh(document)

    return supplemented_photos
