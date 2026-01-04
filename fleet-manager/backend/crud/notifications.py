"""
通知 CRUD 操作模块
"""
from datetime import datetime
from typing import Optional, List
from sqlmodel import Session, select, func
from models import User, Notification, Warehouse, WarehouseAssignment, UserRole


def create_notification(session: Session, user_id: int, title: str,
    content: Optional[str] = None, sender_id: Optional[int] = None,
    ref_type: Optional[str] = None, ref_id: Optional[int] = None,
    status: Optional[str] = None) -> Notification:
    """创建通知"""
    n = Notification(user_id=user_id, title=title, content=content,
        sender_id=sender_id, ref_type=ref_type, ref_id=ref_id, status=status)
    session.add(n)
    session.commit()
    session.refresh(n)
    return n


def create_notifications_batch(session: Session, user_ids: List[int], title: str,
    content: Optional[str] = None, sender_id: Optional[int] = None,
    ref_type: Optional[str] = None, ref_id: Optional[int] = None,
    status: Optional[str] = None) -> List[Notification]:
    """批量创建通知"""
    notifications = []
    for uid in user_ids:
        n = Notification(user_id=uid, title=title, content=content,
            sender_id=sender_id, ref_type=ref_type, ref_id=ref_id, status=status)
        session.add(n)
        notifications.append(n)
    session.commit()
    for n in notifications:
        session.refresh(n)
    return notifications


def notify_admins(session: Session, title: str, content: str,
    sender_id: Optional[int] = None, include_manager: bool = True) -> List[Notification]:
    """发送通知给所有管理员"""
    try:
        roles = [UserRole.MANAGER.value, UserRole.PEER_ADMIN.value, UserRole.BOSS.value] if include_manager else [UserRole.PEER_ADMIN.value, UserRole.BOSS.value]
        users = list(session.exec(select(User).where(User.is_active == True)).all())
        ids = [u.id for u in users if u.role in roles]
        return create_notifications_batch(session, ids, title, content, sender_id) if ids else []
    except Exception as e:
        print(f"发送管理员通知失败: {e}")
        return []


def get_managers_for_user(session: Session, user_id: int) -> List[User]:
    """获取管辖某用户的车队长列表"""
    wh_stmt = select(Warehouse).join(WarehouseAssignment).where(WarehouseAssignment.user_id == user_id)
    wh_ids = [w.id for w in session.exec(wh_stmt).all()]
    if not wh_ids:
        return []
    stmt = select(User).join(WarehouseAssignment).where(
        WarehouseAssignment.warehouse_id.in_(wh_ids),
        User.role == UserRole.MANAGER.value, User.is_active == True).distinct()
    return list(session.exec(stmt).all())


def create_approval_notification(session: Session, applicant_id: int, ref_type: str,
    ref_id: int, title: str, content: str) -> List[Notification]:
    """创建审批通知"""
    try:
        mgr_ids = [m.id for m in get_managers_for_user(session, applicant_id)]
        users = list(session.exec(select(User).where(User.is_active == True)).all())
        admin_ids = [u.id for u in users if u.role in [UserRole.PEER_ADMIN.value, UserRole.BOSS.value]]
        ids = list(set(mgr_ids + admin_ids))
        if not ids:
            return []
        notifications = []
        for uid in ids:
            n = Notification(user_id=uid, title=title, content=content,
                sender_id=applicant_id, ref_type=ref_type, ref_id=ref_id, status="pending")
            session.add(n)
            notifications.append(n)
        session.commit()
        for n in notifications:
            session.refresh(n)
        return notifications
    except Exception as e:
        print(f"创建审批通知失败: {e}")
        return []


def complete_approval(session: Session, ref_type: str, ref_id: int, result: str,
    approver_id: int, applicant_id: int, result_title: str, result_content: str) -> List[Notification]:
    """完成审批"""
    try:
        pending = list(session.exec(select(Notification).where(
            Notification.ref_type == ref_type, Notification.ref_id == ref_id,
            Notification.status == "pending")).all())
        ids = {applicant_id}
        for n in pending:
            n.status = result
            n.updated_at = datetime.now()
            session.add(n)
            ids.add(n.user_id)
        result_notifs = []
        for uid in ids:
            n = Notification(user_id=uid, title=result_title, content=result_content,
                sender_id=approver_id, ref_type=ref_type, ref_id=ref_id, status=result)
            session.add(n)
            result_notifs.append(n)
        session.commit()
        for n in result_notifs:
            session.refresh(n)
        return result_notifs
    except Exception as e:
        print(f"完成审批通知失败: {e}")
        return []


def get_notifications(session: Session, user_id: int, is_read: Optional[bool] = None,
    skip: int = 0, limit: int = 100) -> List[Notification]:
    """获取用户的通知列表"""
    stmt = select(Notification).where(Notification.user_id == user_id)
    if is_read is not None:
        stmt = stmt.where(Notification.is_read == is_read)
    stmt = stmt.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    return list(session.exec(stmt).all())


def mark_notification_as_read(session: Session, notification: Notification) -> Notification:
    """标记通知为已读"""
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


def get_unread_count(session: Session, user_id: int) -> int:
    """获取用户未读通知数量"""
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user_id, Notification.is_read.is_(False))
    return session.exec(stmt).first() or 0


def get_new_notifications(session: Session, user_id: int, after_id: int = 0) -> List[Notification]:
    """获取用户的新通知（用于 SSE）"""
    stmt = select(Notification).where(
        Notification.user_id == user_id, Notification.id > after_id).order_by(Notification.id.asc())
    return list(session.exec(stmt).all())
