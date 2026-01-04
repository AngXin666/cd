"""
驾驶证 CRUD 操作模块
用于管理司机的身份证和驾驶证信息
Requirements: 4.5, 4.6, 4.7 - 司机个人档案页面显示身份证号、驾驶证类型、驾驶证有效期
"""

from datetime import datetime, date
from typing import Optional

from sqlmodel import Session, select

from models import DriverLicense


def get_driver_license_by_user_id(session: Session, user_id: int) -> Optional[DriverLicense]:
    """
    根据用户ID获取司机证件信息
    由于 user_id 是唯一的，每个用户最多只有一条证件记录

    Args:
        session: 数据库会话
        user_id: 用户ID

    Returns:
        DriverLicense: 司机证件对象，不存在则返回 None
    """
    statement = select(DriverLicense).where(DriverLicense.user_id == user_id)
    return session.exec(statement).first()


def create_driver_license(
    session: Session,
    user_id: int,
    id_card_number: Optional[str] = None,
    id_card_name: Optional[str] = None,
    id_card_photo_front: Optional[str] = None,
    id_card_photo_back: Optional[str] = None,
    license_number: Optional[str] = None,
    license_class: Optional[str] = None,
    valid_from: Optional[date] = None,
    valid_to: Optional[date] = None,
    driving_license_photo: Optional[str] = None
) -> DriverLicense:
    """
    创建司机证件记录

    Args:
        session: 数据库会话
        user_id: 用户ID
        id_card_number: 身份证号码（可选）
        id_card_name: 身份证姓名（可选）
        id_card_photo_front: 身份证正面照片URL（可选）
        id_card_photo_back: 身份证背面照片URL（可选）
        license_number: 驾驶证号码（可选）
        license_class: 驾驶证类型（可选）
        valid_from: 驾驶证有效期起始日期（可选）
        valid_to: 驾驶证有效期截止日期（可选）
        driving_license_photo: 驾驶证照片URL（可选）

    Returns:
        DriverLicense: 创建的司机证件对象
    """
    driver_license = DriverLicense(
        user_id=user_id,
        id_card_number=id_card_number,
        id_card_name=id_card_name,
        id_card_photo_front=id_card_photo_front,
        id_card_photo_back=id_card_photo_back,
        license_number=license_number,
        license_class=license_class,
        valid_from=valid_from,
        valid_to=valid_to,
        driving_license_photo=driving_license_photo
    )
    session.add(driver_license)
    session.commit()
    session.refresh(driver_license)
    return driver_license


def update_driver_license(
    session: Session,
    driver_license: DriverLicense,
    id_card_number: Optional[str] = None,
    id_card_name: Optional[str] = None,
    id_card_photo_front: Optional[str] = None,
    id_card_photo_back: Optional[str] = None,
    license_number: Optional[str] = None,
    license_class: Optional[str] = None,
    valid_from: Optional[date] = None,
    valid_to: Optional[date] = None,
    driving_license_photo: Optional[str] = None
) -> DriverLicense:
    """
    更新司机证件信息
    只更新提供的字段，未提供的字段保持不变

    Args:
        session: 数据库会话
        driver_license: 要更新的司机证件对象
        id_card_number: 身份证号码（可选）
        id_card_name: 身份证姓名（可选）
        id_card_photo_front: 身份证正面照片URL（可选）
        id_card_photo_back: 身份证背面照片URL（可选）
        license_number: 驾驶证号码（可选）
        license_class: 驾驶证类型（可选）
        valid_from: 驾驶证有效期起始日期（可选）
        valid_to: 驾驶证有效期截止日期（可选）
        driving_license_photo: 驾驶证照片URL（可选）

    Returns:
        DriverLicense: 更新后的司机证件对象
    """
    if id_card_number is not None:
        driver_license.id_card_number = id_card_number
    if id_card_name is not None:
        driver_license.id_card_name = id_card_name
    if id_card_photo_front is not None:
        driver_license.id_card_photo_front = id_card_photo_front
    if id_card_photo_back is not None:
        driver_license.id_card_photo_back = id_card_photo_back
    if license_number is not None:
        driver_license.license_number = license_number
    if license_class is not None:
        driver_license.license_class = license_class
    if valid_from is not None:
        driver_license.valid_from = valid_from
    if valid_to is not None:
        driver_license.valid_to = valid_to
    if driving_license_photo is not None:
        driver_license.driving_license_photo = driving_license_photo
    
    driver_license.updated_at = datetime.now()
    
    session.add(driver_license)
    session.commit()
    session.refresh(driver_license)
    return driver_license


def create_or_update_driver_license(
    session: Session,
    user_id: int,
    id_card_number: Optional[str] = None,
    id_card_name: Optional[str] = None,
    id_card_photo_front: Optional[str] = None,
    id_card_photo_back: Optional[str] = None,
    license_number: Optional[str] = None,
    license_class: Optional[str] = None,
    valid_from: Optional[date] = None,
    valid_to: Optional[date] = None,
    driving_license_photo: Optional[str] = None
) -> DriverLicense:
    """
    创建或更新司机证件信息
    如果用户已有证件记录则更新，否则创建新记录（upsert 操作）

    Args:
        session: 数据库会话
        user_id: 用户ID
        id_card_number: 身份证号码（可选）
        id_card_name: 身份证姓名（可选）
        id_card_photo_front: 身份证正面照片URL（可选）
        id_card_photo_back: 身份证背面照片URL（可选）
        license_number: 驾驶证号码（可选）
        license_class: 驾驶证类型（可选）
        valid_from: 驾驶证有效期起始日期（可选）
        valid_to: 驾驶证有效期截止日期（可选）
        driving_license_photo: 驾驶证照片URL（可选）

    Returns:
        DriverLicense: 创建或更新后的司机证件对象
    """
    existing = get_driver_license_by_user_id(session, user_id)
    
    if existing:
        return update_driver_license(
            session, existing,
            id_card_number=id_card_number,
            id_card_name=id_card_name,
            id_card_photo_front=id_card_photo_front,
            id_card_photo_back=id_card_photo_back,
            license_number=license_number,
            license_class=license_class,
            valid_from=valid_from,
            valid_to=valid_to,
            driving_license_photo=driving_license_photo
        )
    else:
        return create_driver_license(
            session, user_id,
            id_card_number=id_card_number,
            id_card_name=id_card_name,
            id_card_photo_front=id_card_photo_front,
            id_card_photo_back=id_card_photo_back,
            license_number=license_number,
            license_class=license_class,
            valid_from=valid_from,
            valid_to=valid_to,
            driving_license_photo=driving_license_photo
        )
