#!/usr/bin/env python3
"""
数据导入脚本
将从 Supabase 导出的数据导入到新的 FastAPI + SQLite 系统

数据转换规则：
- users 表：角色映射（BOSS->boss, MANAGER->manager, DRIVER->driver）
- 日期时间：统一转换为 Python datetime 对象
- ID：UUID 转换为自增整数 ID（建立映射关系）
- 外键：根据 ID 映射关系更新
- 密码：使用 bcrypt 哈希，默认密码为 123456

使用方法：
    python import_to_new_system.py [export_file.json]

参数：
    export_file.json: 导出的 JSON 文件路径（可选，默认使用最新的导出文件）

输出：
    data/app.db: SQLite 数据库文件
    data/export/id_mapping.json: UUID 到整数 ID 的映射文件
    data/export/import_report.json: 导入报告

环境变量：
    IMPORT_DEFAULT_PASSWORD: 导入用户的默认密码（默认：123456）
    IMPORT_SKIP_ERRORS: 是否跳过错误继续导入（默认：true）
"""

import os
import sys
import json
import logging
from datetime import datetime, date
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 添加父目录到路径（用于导入后端模块）
backend_path = str(Path(__file__).parent.parent / "backend")
sys.path.insert(0, backend_path)

try:
    from sqlmodel import Session, select
    from passlib.context import CryptContext
    
    # 导入模型和数据库
    from models import (
        User, UserRole,
        Warehouse, WarehouseAssignment,
        Attendance,
        PieceWorkCategory, PieceWorkRecord,
        LeaveApplication, LeaveType, LeaveStatus,
        Vehicle, VehicleDocument, VehicleStatus, DocumentType,
        Notification
    )
    from database import engine, create_db_and_tables
except ImportError as e:
    logger.error(f"导入模块失败: {e}")
    logger.error("请确保已安装所有依赖: pip install -r requirements.txt")
    sys.exit(1)


# ==================== 配置 ====================

# 导出数据目录
EXPORT_DIR = Path(__file__).parent.parent / "data" / "export"

# 数据目录
DATA_DIR = Path(__file__).parent.parent / "data"

# 密码哈希工具
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 默认密码（用于没有密码的用户，可通过环境变量覆盖）
DEFAULT_PASSWORD = os.getenv("IMPORT_DEFAULT_PASSWORD", "123456")

# 是否跳过错误继续导入
SKIP_ERRORS = os.getenv("IMPORT_SKIP_ERRORS", "true").lower() == "true"


# ==================== ID 映射 ====================

# UUID -> 整数 ID 映射
id_mapping: Dict[str, Dict[str, int]] = {
    "users": {},
    "warehouses": {},
    "piece_work_categories": {},
    "vehicles": {},
    "leave_applications": {},
    "notifications": {},
}

# 导入统计
import_stats: Dict[str, Dict[str, int]] = {
    "users": {"success": 0, "failed": 0, "skipped": 0},
    "warehouses": {"success": 0, "failed": 0, "skipped": 0},
    "warehouse_assignments": {"success": 0, "failed": 0, "skipped": 0},
    "attendance": {"success": 0, "failed": 0, "skipped": 0},
    "piece_work_categories": {"success": 0, "failed": 0, "skipped": 0},
    "piece_work_records": {"success": 0, "failed": 0, "skipped": 0},
    "leave_applications": {"success": 0, "failed": 0, "skipped": 0},
    "vehicles": {"success": 0, "failed": 0, "skipped": 0},
    "vehicle_documents": {"success": 0, "failed": 0, "skipped": 0},
    "notifications": {"success": 0, "failed": 0, "skipped": 0},
}

# 错误记录
import_errors: List[Dict[str, Any]] = []


# ==================== 数据转换函数 ====================

def log_error(table: str, item_id: str, error: str, item_data: Dict = None):
    """
    记录导入错误
    
    Args:
        table: 表名
        item_id: 记录 ID
        error: 错误信息
        item_data: 原始数据（可选）
    """
    error_record = {
        "table": table,
        "item_id": item_id,
        "error": str(error),
        "timestamp": datetime.now().isoformat(),
    }
    if item_data:
        # 只保留关键字段，避免日志过大
        error_record["item_preview"] = {
            k: v for k, v in item_data.items() 
            if k in ["id", "name", "username", "phone", "email", "license_plate"]
        }
    import_errors.append(error_record)
    logger.warning(f"导入失败 [{table}] ID={item_id}: {error}")


def parse_datetime(value: Any) -> Optional[datetime]:
    """
    解析日期时间字符串
    支持多种常见的日期时间格式
    
    Args:
        value: 日期时间值（字符串或 None）
    
    Returns:
        datetime: 解析后的 datetime 对象，或 None
    """
    if not value:
        return None
    
    if isinstance(value, datetime):
        return value
    
    # 尝试多种格式
    formats = [
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]
    
    for fmt in formats:
        try:
            # 处理时区信息
            value_str = str(value).replace("+00:00", "").replace("Z", "")
            # 截取到微秒精度
            return datetime.strptime(value_str[:26], fmt.replace("%z", ""))
        except ValueError:
            continue
    
    logger.debug(f"无法解析日期时间 '{value}'")
    return None


def parse_date(value: Any) -> Optional[date]:
    """
    解析日期字符串
    
    Args:
        value: 日期值（字符串或 None）
    
    Returns:
        date: 解析后的 date 对象，或 None
    """
    if not value:
        return None
    
    if isinstance(value, date):
        return value
    
    try:
        # 只取日期部分
        date_str = str(value)[:10]
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        logger.debug(f"无法解析日期 '{value}'")
        return None


def sanitize_string(value: Any, max_length: int = 255, default: str = "") -> str:
    """
    清理字符串值
    
    Args:
        value: 原始值
        max_length: 最大长度
        default: 默认值
    
    Returns:
        str: 清理后的字符串
    """
    if value is None:
        return default
    
    # 转换为字符串并去除首尾空白
    result = str(value).strip()
    
    # 截断到最大长度
    if len(result) > max_length:
        result = result[:max_length]
    
    return result or default


def map_role(role: str) -> UserRole:
    """
    映射用户角色
    
    Args:
        role: 原始角色字符串
    
    Returns:
        UserRole: 映射后的角色枚举
    """
    role_map = {
        "BOSS": UserRole.BOSS,
        "PEER_ADMIN": UserRole.BOSS,  # 调度映射为老板
        "MANAGER": UserRole.MANAGER,
        "DRIVER": UserRole.DRIVER,
        "boss": UserRole.BOSS,
        "manager": UserRole.MANAGER,
        "driver": UserRole.DRIVER,
    }
    return role_map.get(role, UserRole.DRIVER)


def map_leave_type(leave_type: str) -> LeaveType:
    """
    映射请假类型
    
    Args:
        leave_type: 原始请假类型
    
    Returns:
        LeaveType: 映射后的请假类型枚举
    """
    type_map = {
        "sick": LeaveType.LEAVE,
        "personal": LeaveType.LEAVE,
        "annual": LeaveType.LEAVE,
        "other": LeaveType.LEAVE,
        "leave": LeaveType.LEAVE,
        "resign": LeaveType.RESIGN,
    }
    return type_map.get(leave_type, LeaveType.LEAVE)


def map_leave_status(status: str) -> LeaveStatus:
    """
    映射请假状态
    
    Args:
        status: 原始状态
    
    Returns:
        LeaveStatus: 映射后的状态枚举
    """
    status_map = {
        "pending": LeaveStatus.PENDING,
        "approved": LeaveStatus.APPROVED,
        "rejected": LeaveStatus.REJECTED,
    }
    return status_map.get(status, LeaveStatus.PENDING)


def map_vehicle_status(status: str) -> VehicleStatus:
    """
    映射车辆状态
    
    Args:
        status: 原始状态
    
    Returns:
        VehicleStatus: 映射后的状态枚举
    """
    status_map = {
        "active": VehicleStatus.ACTIVE,
        "returned": VehicleStatus.RETURNED,
        "reviewing": VehicleStatus.REVIEWING,
        "pending": VehicleStatus.REVIEWING,
    }
    return status_map.get(status, VehicleStatus.REVIEWING)


# ==================== 数据导入函数 ====================

def import_users(session: Session, data: List[Dict]) -> int:
    """
    导入用户数据
    
    数据转换规则：
    - username: 优先使用 login_account，其次 phone，再次 email，最后生成默认值
    - password: 使用 bcrypt 哈希，默认密码为 DEFAULT_PASSWORD
    - role: 映射 Supabase 角色到新系统角色
    - is_active: 默认为 True
    
    Args:
        session: 数据库会话
        data: 用户数据列表
    
    Returns:
        int: 成功导入的记录数
    """
    count = 0
    seen_usernames = set()  # 用于检测重复用户名
    
    for item in data:
        item_id = item.get("id", "unknown")
        try:
            # 生成唯一用户名
            username = (
                item.get("login_account") or 
                item.get("phone") or 
                item.get("email") or 
                f"user_{item_id[:8] if len(str(item_id)) >= 8 else item_id}"
            )
            
            # 确保用户名唯一
            original_username = username
            suffix = 1
            while username in seen_usernames:
                username = f"{original_username}_{suffix}"
                suffix += 1
            seen_usernames.add(username)
            
            # 创建用户
            user = User(
                username=sanitize_string(username, 50),
                password_hash=pwd_context.hash(DEFAULT_PASSWORD),
                name=sanitize_string(item.get("name"), 50, "未知"),
                phone=sanitize_string(item.get("phone"), 20) or None,
                role=map_role(item.get("role", "DRIVER")),
                is_active=item.get("is_active", True),
                created_at=parse_datetime(item.get("created_at")) or datetime.now(),
                updated_at=parse_datetime(item.get("updated_at")) or datetime.now(),
            )
            session.add(user)
            session.flush()  # 获取自增 ID
            
            # 记录 ID 映射
            id_mapping["users"][item_id] = user.id
            count += 1
            import_stats["users"]["success"] += 1
            
        except Exception as e:
            import_stats["users"]["failed"] += 1
            log_error("users", item_id, e, item)
            if not SKIP_ERRORS:
                raise
            continue
    
    session.commit()
    return count


def import_warehouses(session: Session, data: List[Dict]) -> int:
    """
    导入仓库数据
    
    Args:
        session: 数据库会话
        data: 仓库数据列表
    
    Returns:
        int: 成功导入的记录数
    """
    count = 0
    for item in data:
        item_id = item.get("id", "unknown")
        try:
            warehouse = Warehouse(
                name=sanitize_string(item.get("name"), 100, "未知仓库"),
                address=sanitize_string(item.get("address"), 255) or None,
                is_active=item.get("is_active", True),
                created_at=parse_datetime(item.get("created_at")) or datetime.now(),
            )
            session.add(warehouse)
            session.flush()
            
            id_mapping["warehouses"][item_id] = warehouse.id
            count += 1
            import_stats["warehouses"]["success"] += 1
            
        except Exception as e:
            import_stats["warehouses"]["failed"] += 1
            log_error("warehouses", item_id, e, item)
            if not SKIP_ERRORS:
                raise
            continue
    
    session.commit()
    return count


def import_warehouse_assignments(session: Session, data: List[Dict]) -> int:
    """
    导入用户-仓库关联数据
    
    Args:
        session: 数据库会话
        data: 关联数据列表
    
    Returns:
        int: 成功导入的记录数
    """
    count = 0
    seen_assignments = set()  # 用于检测重复分配
    
    for item in data:
        item_id = item.get("id", "unknown")
        try:
            user_id = id_mapping["users"].get(item.get("user_id"))
            warehouse_id = id_mapping["warehouses"].get(item.get("warehouse_id"))
            
            if not user_id or not warehouse_id:
                import_stats["warehouse_assignments"]["skipped"] += 1
                continue
            
            # 检查是否已存在相同的分配
            assignment_key = (user_id, warehouse_id)
            if assignment_key in seen_assignments:
                import_stats["warehouse_assignments"]["skipped"] += 1
                continue
            seen_assignments.add(assignment_key)
            
            assignment = WarehouseAssignment(
                user_id=user_id,
                warehouse_id=warehouse_id,
                created_at=parse_datetime(item.get("created_at")) or datetime.now(),
            )
            session.add(assignment)
            count += 1
            import_stats["warehouse_assignments"]["success"] += 1
            
        except Exception as e:
            import_stats["warehouse_assignments"]["failed"] += 1
            log_error("warehouse_assignments", item_id, e, item)
            if not SKIP_ERRORS:
                raise
            continue
    
    session.commit()
    return count


def import_attendance(session: Session, data: List[Dict]) -> int:
    """
    导入考勤记录
    
    Args:
        session: 数据库会话
        data: 考勤数据列表
    
    Returns:
        int: 成功导入的记录数
    """
    count = 0
    for item in data:
        item_id = item.get("id", "unknown")
        try:
            user_id = id_mapping["users"].get(item.get("user_id"))
            if not user_id:
                import_stats["attendance"]["skipped"] += 1
                continue
            
            attendance = Attendance(
                user_id=user_id,
                work_date=parse_date(item.get("work_date") or item.get("date")) or date.today(),
                clock_in=parse_datetime(item.get("clock_in_time") or item.get("clock_in")),
                clock_out=parse_datetime(item.get("clock_out_time") or item.get("clock_out")),
                work_hours=item.get("work_hours"),
                created_at=parse_datetime(item.get("created_at")) or datetime.now(),
            )
            session.add(attendance)
            count += 1
            import_stats["attendance"]["success"] += 1
            
        except Exception as e:
            import_stats["attendance"]["failed"] += 1
            log_error("attendance", item_id, e, item)
            if not SKIP_ERRORS:
                raise
            continue
    
    session.commit()
    return count


def import_piece_work_categories(session: Session, data: List[Dict]) -> int:
    """
    导入计件分类
    
    Args:
        session: 数据库会话
        data: 分类数据列表
    
    Returns:
        int: 成功导入的记录数
    """
    count = 0
    seen_names = set()  # 用于检测重复分类名
    
    for item in data:
        item_id = item.get("id", "unknown")
        try:
            name = sanitize_string(
                item.get("name") or item.get("category_name"), 
                50, 
                "未知分类"
            )
            
            # 确保分类名唯一
            original_name = name
            suffix = 1
            while name in seen_names:
                name = f"{original_name}_{suffix}"
                suffix += 1
            seen_names.add(name)
            
            category = PieceWorkCategory(
                name=name,
                unit_price=float(item.get("unit_price") or item.get("price") or 0),
                unit=sanitize_string(item.get("unit"), 20, "件"),
                is_active=item.get("is_active", True),
                created_at=parse_datetime(item.get("created_at")) or datetime.now(),
            )
            session.add(category)
            session.flush()
            
            id_mapping["piece_work_categories"][item_id] = category.id
            count += 1
            import_stats["piece_work_categories"]["success"] += 1
            
        except Exception as e:
            import_stats["piece_work_categories"]["failed"] += 1
            log_error("piece_work_categories", item_id, e, item)
            if not SKIP_ERRORS:
                raise
            continue
    
    session.commit()
    return count


def import_piece_work_records(session: Session, data: List[Dict]) -> int:
    """
    导入计件记录
    
    Args:
        session: 数据库会话
        data: 计件数据列表
    
    Returns:
        int: 成功导入的记录数
    """
    count = 0
    for item in data:
        item_id = item.get("id", "unknown")
        try:
            user_id = id_mapping["users"].get(item.get("user_id"))
            category_id = id_mapping["piece_work_categories"].get(item.get("category_id"))
            warehouse_id = id_mapping["warehouses"].get(item.get("warehouse_id"))
            
            if not user_id:
                import_stats["piece_work_records"]["skipped"] += 1
                continue
            
            # 如果没有分类，使用默认分类（ID=1）
            if not category_id:
                category_id = 1
            
            record = PieceWorkRecord(
                user_id=user_id,
                category_id=category_id,
                warehouse_id=warehouse_id,
                work_date=parse_date(item.get("work_date") or item.get("date")) or date.today(),
                quantity=int(item.get("quantity", 0)),
                amount=float(item.get("total_amount") or item.get("amount") or 0),
                remark=sanitize_string(item.get("notes") or item.get("remark"), 255) or None,
                created_at=parse_datetime(item.get("created_at")) or datetime.now(),
            )
            session.add(record)
            count += 1
            import_stats["piece_work_records"]["success"] += 1
            
        except Exception as e:
            import_stats["piece_work_records"]["failed"] += 1
            log_error("piece_work_records", item_id, e, item)
            if not SKIP_ERRORS:
                raise
            continue
    
    session.commit()
    return count


def import_leave_applications(session: Session, data: List[Dict]) -> int:
    """
    导入请假申请
    
    Args:
        session: 数据库会话
        data: 请假数据列表
    
    Returns:
        int: 成功导入的记录数
    """
    count = 0
    for item in data:
        item_id = item.get("id", "unknown")
        try:
            user_id = id_mapping["users"].get(item.get("user_id"))
            approver_id = id_mapping["users"].get(item.get("approver_id") or item.get("reviewed_by"))
            
            if not user_id:
                import_stats["leave_applications"]["skipped"] += 1
                continue
            
            application = LeaveApplication(
                user_id=user_id,
                leave_type=map_leave_type(item.get("leave_type", "leave")),
                start_date=parse_date(item.get("start_date")) or date.today(),
                end_date=parse_date(item.get("end_date")) or date.today(),
                reason=sanitize_string(item.get("reason"), 500) or None,
                status=map_leave_status(item.get("status", "pending")),
                approver_id=approver_id,
                approve_remark=sanitize_string(item.get("review_notes") or item.get("approve_remark"), 255) or None,
                created_at=parse_datetime(item.get("created_at")) or datetime.now(),
                updated_at=parse_datetime(item.get("updated_at")) or datetime.now(),
            )
            session.add(application)
            session.flush()
            
            id_mapping["leave_applications"][item_id] = application.id
            count += 1
            import_stats["leave_applications"]["success"] += 1
            
        except Exception as e:
            import_stats["leave_applications"]["failed"] += 1
            log_error("leave_applications", item_id, e, item)
            if not SKIP_ERRORS:
                raise
            continue
    
    session.commit()
    return count


def import_vehicles(session: Session, data: List[Dict]) -> int:
    """
    导入车辆信息
    
    Args:
        session: 数据库会话
        data: 车辆数据列表
    
    Returns:
        int: 成功导入的记录数
    """
    count = 0
    seen_plates = set()  # 用于检测重复车牌
    
    for item in data:
        item_id = item.get("id", "unknown")
        try:
            user_id = id_mapping["users"].get(item.get("user_id") or item.get("driver_id"))
            
            # 生成唯一车牌号
            license_plate = sanitize_string(item.get("plate_number") or item.get("license_plate"), 20)
            if not license_plate:
                license_plate = f"未知_{count}"
            
            # 确保车牌号唯一
            original_plate = license_plate
            suffix = 1
            while license_plate in seen_plates:
                license_plate = f"{original_plate}_{suffix}"
                suffix += 1
            seen_plates.add(license_plate)
            
            vehicle = Vehicle(
                user_id=user_id or 1,  # 默认分配给第一个用户
                license_plate=license_plate,
                brand=sanitize_string(item.get("brand"), 50) or None,
                model=sanitize_string(item.get("model"), 50) or None,
                color=sanitize_string(item.get("color"), 20) or None,
                status=map_vehicle_status(item.get("status") or item.get("review_status", "reviewing")),
                created_at=parse_datetime(item.get("created_at")) or datetime.now(),
                updated_at=parse_datetime(item.get("updated_at")) or datetime.now(),
            )
            session.add(vehicle)
            session.flush()
            
            id_mapping["vehicles"][item_id] = vehicle.id
            count += 1
            import_stats["vehicles"]["success"] += 1
            
        except Exception as e:
            import_stats["vehicles"]["failed"] += 1
            log_error("vehicles", item_id, e, item)
            if not SKIP_ERRORS:
                raise
            continue
    
    session.commit()
    return count


def import_vehicle_documents(session: Session, data: List[Dict]) -> int:
    """
    导入车辆证件
    
    Args:
        session: 数据库会话
        data: 证件数据列表
    
    Returns:
        int: 成功导入的记录数
    """
    count = 0
    for item in data:
        item_id = item.get("id", "unknown")
        try:
            vehicle_id = id_mapping["vehicles"].get(item.get("vehicle_id"))
            if not vehicle_id:
                import_stats["vehicle_documents"]["skipped"] += 1
                continue
            
            # 导入驾驶证照片
            if item.get("driving_license_main_photo"):
                doc = VehicleDocument(
                    vehicle_id=vehicle_id,
                    doc_type=DocumentType.LICENSE,
                    file_url=sanitize_string(item.get("driving_license_main_photo"), 500) or None,
                    expiry_date=parse_date(item.get("inspection_valid_until")),
                    created_at=parse_datetime(item.get("created_at")) or datetime.now(),
                )
                session.add(doc)
                count += 1
                import_stats["vehicle_documents"]["success"] += 1
            
            # 导入行驶证照片
            if item.get("registration_photos"):
                photos = item.get("registration_photos", [])
                if photos:
                    photo_url = photos[0] if isinstance(photos, list) else photos
                    doc = VehicleDocument(
                        vehicle_id=vehicle_id,
                        doc_type=DocumentType.REGISTRATION,
                        file_url=sanitize_string(photo_url, 500) or None,
                        created_at=parse_datetime(item.get("created_at")) or datetime.now(),
                    )
                    session.add(doc)
                    count += 1
                    import_stats["vehicle_documents"]["success"] += 1
            
        except Exception as e:
            import_stats["vehicle_documents"]["failed"] += 1
            log_error("vehicle_documents", item_id, e, item)
            if not SKIP_ERRORS:
                raise
            continue
    
    session.commit()
    return count


def import_notifications(session: Session, data: List[Dict]) -> int:
    """
    导入通知消息
    
    Args:
        session: 数据库会话
        data: 通知数据列表
    
    Returns:
        int: 成功导入的记录数
    """
    count = 0
    for item in data:
        item_id = item.get("id", "unknown")
        try:
            user_id = id_mapping["users"].get(item.get("recipient_id") or item.get("user_id"))
            sender_id = id_mapping["users"].get(item.get("sender_id"))
            
            if not user_id:
                import_stats["notifications"]["skipped"] += 1
                continue
            
            notification = Notification(
                user_id=user_id,
                title=sanitize_string(item.get("title"), 100, "通知"),
                content=sanitize_string(item.get("content"), 1000) or None,
                is_read=item.get("is_read", False),
                sender_id=sender_id,
                created_at=parse_datetime(item.get("created_at")) or datetime.now(),
            )
            session.add(notification)
            session.flush()
            
            id_mapping["notifications"][item_id] = notification.id
            count += 1
            import_stats["notifications"]["success"] += 1
            
        except Exception as e:
            import_stats["notifications"]["failed"] += 1
            log_error("notifications", item_id, e, item)
            if not SKIP_ERRORS:
                raise
            continue
    
    session.commit()
    return count


# ==================== 主函数 ====================

def find_latest_export() -> Optional[Path]:
    """
    查找最新的导出文件
    
    Returns:
        Path: 最新导出文件的路径，或 None
    """
    if not EXPORT_DIR.exists():
        return None
    
    # 查找 full_export_*.json 文件
    export_files = list(EXPORT_DIR.glob("full_export_*.json"))
    if not export_files:
        return None
    
    # 按修改时间排序，返回最新的
    return max(export_files, key=lambda p: p.stat().st_mtime)


def load_export_data(filepath: Path) -> Dict[str, List[Dict]]:
    """
    加载导出数据
    
    Args:
        filepath: 导出文件路径
    
    Returns:
        Dict: 导出数据字典
    """
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def save_import_report(export_file: Path):
    """
    保存导入报告
    
    Args:
        export_file: 导出文件路径
    """
    report = {
        "import_time": datetime.now().isoformat(),
        "export_file": str(export_file),
        "statistics": import_stats,
        "errors": import_errors,
        "id_mapping_summary": {
            table: len(mapping) for table, mapping in id_mapping.items()
        }
    }
    
    report_file = EXPORT_DIR / "import_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    logger.info(f"导入报告已保存到: {report_file}")


def create_default_category(session: Session):
    """
    创建默认计件分类（用于没有分类的计件记录）
    
    Args:
        session: 数据库会话
    """
    # 检查是否已存在默认分类
    existing = session.exec(
        select(PieceWorkCategory).where(PieceWorkCategory.id == 1)
    ).first()
    
    if not existing:
        default_category = PieceWorkCategory(
            name="默认分类",
            unit_price=0.0,
            unit="件",
            is_active=True,
            created_at=datetime.now(),
        )
        session.add(default_category)
        session.commit()
        logger.info("已创建默认计件分类")


def main():
    """
    主函数：执行数据导入
    
    流程：
    1. 查找或指定导出文件
    2. 加载导出数据
    3. 创建数据库表
    4. 按顺序导入各表数据（注意外键依赖）
    5. 保存 ID 映射和导入报告
    6. 输出导入统计
    """
    print("=" * 60)
    print("数据导入工具 - 导入到新系统")
    print("=" * 60)
    
    # 确定导出文件
    if len(sys.argv) > 1:
        export_file = Path(sys.argv[1])
    else:
        export_file = find_latest_export()
    
    if not export_file or not export_file.exists():
        logger.error("未找到导出文件")
        print("✗ 错误：未找到导出文件")
        print("  请先运行 export_supabase_data.py 导出数据")
        print("  或指定导出文件路径：python import_to_new_system.py <export_file.json>")
        sys.exit(1)
    
    print(f"\n导出文件: {export_file}")
    
    # 加载导出数据
    print("\n加载导出数据...")
    try:
        data = load_export_data(export_file)
        logger.info(f"成功加载导出数据，包含 {len(data)} 个表")
    except Exception as e:
        logger.error(f"加载导出数据失败: {e}")
        print(f"✗ 错误：加载导出数据失败 - {e}")
        sys.exit(1)
    
    # 确保数据目录存在
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 创建数据库表
    print("\n创建数据库表...")
    try:
        create_db_and_tables()
        print("✓ 数据库表创建成功")
    except Exception as e:
        logger.error(f"创建数据库表失败: {e}")
        print(f"✗ 错误：创建数据库表失败 - {e}")
        sys.exit(1)
    
    # 开始导入
    print("\n开始导入数据...")
    start_time = datetime.now()
    
    with Session(engine) as session:
        # 创建默认分类
        create_default_category(session)
        
        # 按顺序导入（注意外键依赖）
        stats = {}
        
        # 1. 导入用户
        print("\n[1/10] 导入用户...")
        stats["users"] = import_users(session, data.get("users", []))
        print(f"  ✓ 导入 {stats['users']} 条用户记录")
        
        # 2. 导入仓库
        print("\n[2/10] 导入仓库...")
        stats["warehouses"] = import_warehouses(session, data.get("warehouses", []))
        print(f"  ✓ 导入 {stats['warehouses']} 条仓库记录")
        
        # 3. 导入用户-仓库关联
        print("\n[3/10] 导入用户-仓库关联...")
        stats["warehouse_assignments"] = import_warehouse_assignments(
            session, data.get("warehouse_assignments", [])
        )
        print(f"  ✓ 导入 {stats['warehouse_assignments']} 条关联记录")
        
        # 4. 导入计件分类
        print("\n[4/10] 导入计件分类...")
        # 合并 piece_work_categories 和 category_prices
        categories = data.get("piece_work_categories", []) + data.get("category_prices", [])
        stats["piece_work_categories"] = import_piece_work_categories(session, categories)
        print(f"  ✓ 导入 {stats['piece_work_categories']} 条分类记录")
        
        # 5. 导入考勤记录
        print("\n[5/10] 导入考勤记录...")
        stats["attendance"] = import_attendance(session, data.get("attendance", []))
        print(f"  ✓ 导入 {stats['attendance']} 条考勤记录")
        
        # 6. 导入计件记录
        print("\n[6/10] 导入计件记录...")
        stats["piece_work_records"] = import_piece_work_records(
            session, data.get("piece_work_records", [])
        )
        print(f"  ✓ 导入 {stats['piece_work_records']} 条计件记录")
        
        # 7. 导入请假申请
        print("\n[7/10] 导入请假申请...")
        # 合并 leave_applications 和 resignation_applications
        leaves = data.get("leave_applications", []) + data.get("resignation_applications", [])
        stats["leave_applications"] = import_leave_applications(session, leaves)
        print(f"  ✓ 导入 {stats['leave_applications']} 条请假记录")
        
        # 8. 导入车辆
        print("\n[8/10] 导入车辆...")
        stats["vehicles"] = import_vehicles(session, data.get("vehicles", []))
        print(f"  ✓ 导入 {stats['vehicles']} 条车辆记录")
        
        # 9. 导入车辆证件
        print("\n[9/10] 导入车辆证件...")
        stats["vehicle_documents"] = import_vehicle_documents(
            session, data.get("vehicle_documents", [])
        )
        print(f"  ✓ 导入 {stats['vehicle_documents']} 条证件记录")
        
        # 10. 导入通知（可选）
        print("\n[10/10] 导入通知...")
        if data.get("notifications"):
            stats["notifications"] = import_notifications(session, data.get("notifications", []))
            print(f"  ✓ 导入 {stats['notifications']} 条通知记录")
        else:
            stats["notifications"] = 0
            print("  - 无通知数据")
    
    # 计算耗时
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    # 保存 ID 映射
    mapping_file = EXPORT_DIR / "id_mapping.json"
    with open(mapping_file, "w", encoding="utf-8") as f:
        json.dump(id_mapping, f, ensure_ascii=False, indent=2)
    print(f"\nID 映射已保存到: {mapping_file}")
    
    # 保存导入报告
    save_import_report(export_file)
    
    # 导入统计
    print("\n" + "=" * 60)
    print("导入完成！")
    print("-" * 60)
    total_success = sum(stats.values())
    total_failed = sum(s["failed"] for s in import_stats.values())
    total_skipped = sum(s["skipped"] for s in import_stats.values())
    
    print("\n表级统计：")
    for table, count in stats.items():
        failed = import_stats.get(table, {}).get("failed", 0)
        skipped = import_stats.get(table, {}).get("skipped", 0)
        status = "✓" if failed == 0 else "⚠"
        print(f"  {status} {table}: {count} 条成功", end="")
        if failed > 0:
            print(f", {failed} 条失败", end="")
        if skipped > 0:
            print(f", {skipped} 条跳过", end="")
        print()
    
    print("-" * 60)
    print(f"  总计成功: {total_success} 条")
    if total_failed > 0:
        print(f"  总计失败: {total_failed} 条")
    if total_skipped > 0:
        print(f"  总计跳过: {total_skipped} 条")
    print(f"  耗时: {duration:.2f} 秒")
    print("=" * 60)
    
    # 如果有错误，提示查看报告
    if import_errors:
        print(f"\n⚠ 有 {len(import_errors)} 条记录导入失败，详情请查看:")
        print(f"  {EXPORT_DIR / 'import_report.json'}")
    
    # 提示下一步
    print("\n下一步：")
    print("  1. 运行验证脚本检查数据完整性：")
    print("     python verify_migration.py")
    print("  2. 启动后端服务测试：")
    print("     cd ../backend && python main.py")
    
    return total_failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
