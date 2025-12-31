"""
定时任务调度器模块
使用 APScheduler 实现定时通知的后台调度
支持一次性和重复性定时任务
"""

import logging
from datetime import datetime
from typing import Optional
from contextlib import contextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from sqlmodel import Session

from database import engine
from models import ScheduledNotificationStatus
import crud

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== 调度器配置 ====================

# 作业存储配置
jobstores = {
    'default': MemoryJobStore()
}

# 执行器配置
executors = {
    'default': ThreadPoolExecutor(max_workers=5)
}

# 作业默认配置
job_defaults = {
    'coalesce': True,  # 合并错过的执行
    'max_instances': 1,  # 同一作业最大并发实例数
    'misfire_grace_time': 60 * 5  # 错过执行的宽限时间（5分钟）
}

# 全局调度器实例
_scheduler: Optional[BackgroundScheduler] = None


# ==================== 数据库会话管理 ====================

@contextmanager
def get_db_session():
    """
    获取数据库会话的上下文管理器
    用于在调度任务中安全地访问数据库
    """
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()


# ==================== 调度任务函数 ====================

def _mark_notification_as_failed(session: Session, scheduled) -> None:
    """
    将定时通知标记为失败状态

    Args:
        session: 数据库会话
        scheduled: 定时通知对象
    """
    try:
        scheduled.status = ScheduledNotificationStatus.FAILED
        scheduled.updated_at = datetime.now()
        session.add(scheduled)
        session.commit()
    except Exception as update_error:
        logger.error(f"更新定时通知状态失败: {str(update_error)}")
        session.rollback()


def _execute_single_scheduled_notification(session: Session, scheduled) -> None:
    """
    执行单个定时通知

    Args:
        session: 数据库会话
        scheduled: 定时通知对象
    """
    try:
        logger.info(f"执行定时通知: {scheduled.name} (ID: {scheduled.id})")
        notifications = crud.execute_scheduled_notification(session, scheduled)
        logger.info(f"定时通知 {scheduled.name} 执行成功，发送了 {len(notifications)} 条通知")
    except Exception as e:
        logger.error(f"执行定时通知 {scheduled.name} 失败: {str(e)}")
        _mark_notification_as_failed(session, scheduled)


def _process_pending_notifications(session: Session) -> None:
    """
    处理所有待执行的定时通知

    Args:
        session: 数据库会话
    """
    # 获取所有待执行的定时通知
    pending_notifications = crud.get_pending_scheduled_notifications(
        session,
        before_time=datetime.now()
    )

    # 早返回：没有待执行的通知
    if not pending_notifications:
        logger.debug("没有待执行的定时通知")
        return

    logger.info(f"发现 {len(pending_notifications)} 个待执行的定时通知")

    # 逐个执行
    for scheduled in pending_notifications:
        _execute_single_scheduled_notification(session, scheduled)


def check_and_execute_scheduled_notifications():
    """
    检查并执行到期的定时通知
    这是调度器的主要任务，定期检查是否有需要执行的定时通知

    重构说明：
    - 使用早返回减少嵌套
    - 提取 _process_pending_notifications 处理通知列表
    - 提取 _execute_single_scheduled_notification 执行单个通知
    - 提取 _mark_notification_as_failed 标记失败状态
    - 嵌套深度从 7 层降低到 3 层
    """
    logger.info("开始检查定时通知...")

    try:
        with get_db_session() as session:
            _process_pending_notifications(session)
    except Exception as e:
        logger.error(f"检查定时通知时发生错误: {str(e)}")


def cleanup_completed_notifications():
    """
    清理已完成的一次性定时通知
    保留最近30天的记录，删除更早的已完成任务
    """
    logger.info("开始清理已完成的定时通知...")

    try:
        with get_db_session() as session:
            from datetime import timedelta
            from sqlmodel import select
            from models import ScheduledNotification, RepeatType

            # 计算30天前的时间
            cutoff_date = datetime.now() - timedelta(days=30)

            # 查找需要清理的记录
            statement = select(ScheduledNotification).where(
                ScheduledNotification.status == ScheduledNotificationStatus.COMPLETED,
                ScheduledNotification.repeat_type == RepeatType.ONCE,
                ScheduledNotification.updated_at < cutoff_date
            )

            old_notifications = list(session.exec(statement).all())

            if old_notifications:
                for notification in old_notifications:
                    session.delete(notification)
                session.commit()
                logger.info(f"清理了 {len(old_notifications)} 个已完成的定时通知")
            else:
                logger.debug("没有需要清理的定时通知")

    except Exception as e:
        logger.error(f"清理定时通知时发生错误: {str(e)}")


# ==================== 调度器管理函数 ====================

def get_scheduler() -> Optional[BackgroundScheduler]:
    """
    获取调度器实例

    Returns:
        BackgroundScheduler: 调度器实例，如果未初始化则返回 None
    """
    return _scheduler


def init_scheduler() -> BackgroundScheduler:
    """
    初始化调度器
    创建并配置 APScheduler 实例

    Returns:
        BackgroundScheduler: 初始化后的调度器实例
    """
    global _scheduler

    if _scheduler is not None:
        logger.warning("调度器已经初始化")
        return _scheduler

    logger.info("正在初始化定时任务调度器...")

    # 创建调度器
    _scheduler = BackgroundScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone='Asia/Shanghai'
    )

    # 添加定期检查任务（每分钟检查一次）
    _scheduler.add_job(
        check_and_execute_scheduled_notifications,
        trigger=IntervalTrigger(minutes=1),
        id='check_scheduled_notifications',
        name='检查定时通知',
        replace_existing=True
    )

    # 添加清理任务（每天凌晨3点执行）
    _scheduler.add_job(
        cleanup_completed_notifications,
        trigger='cron',
        hour=3,
        minute=0,
        id='cleanup_completed_notifications',
        name='清理已完成的定时通知',
        replace_existing=True
    )

    logger.info("定时任务调度器初始化完成")
    return _scheduler


def start_scheduler():
    """
    启动调度器
    如果调度器未初始化，会先进行初始化
    """
    global _scheduler

    if _scheduler is None:
        init_scheduler()

    if not _scheduler.running:
        _scheduler.start()
        logger.info("定时任务调度器已启动")
    else:
        logger.warning("调度器已经在运行中")


def stop_scheduler():
    """
    停止调度器
    """
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=True)
        logger.info("定时任务调度器已停止")
    else:
        logger.warning("调度器未运行")


def is_scheduler_running() -> bool:
    """
    检查调度器是否正在运行

    Returns:
        bool: 调度器是否正在运行
    """
    return _scheduler is not None and _scheduler.running


def get_scheduler_jobs() -> list:
    """
    获取调度器中的所有作业

    Returns:
        list: 作业列表
    """
    if _scheduler is None:
        return []

    return _scheduler.get_jobs()


def add_immediate_job(scheduled_id: int):
    """
    添加一个立即执行的作业
    用于手动触发定时通知的执行

    Args:
        scheduled_id: 定时通知ID
    """
    if _scheduler is None:
        logger.error("调度器未初始化")
        return

    def execute_single_notification():
        """执行单个定时通知"""
        with get_db_session() as session:
            scheduled = crud.get_scheduled_notification_by_id(session, scheduled_id)
            if scheduled:
                crud.execute_scheduled_notification(session, scheduled)

    _scheduler.add_job(
        execute_single_notification,
        trigger=DateTrigger(run_date=datetime.now()),
        id=f'immediate_notification_{scheduled_id}',
        name=f'立即执行通知 {scheduled_id}',
        replace_existing=True
    )

    logger.info(f"已添加立即执行作业: 定时通知 {scheduled_id}")


# ==================== 调度器状态信息 ====================

def get_scheduler_status() -> dict:
    """
    获取调度器的详细状态信息

    Returns:
        dict: 调度器状态信息
    """
    if _scheduler is None:
        return {
            "is_running": False,
            "jobs_count": 0,
            "jobs": [],
            "next_run_time": None
        }

    jobs = _scheduler.get_jobs()
    jobs_info = []
    next_run_time = None

    for job in jobs:
        job_info = {
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        }
        jobs_info.append(job_info)

        # 找到最近的下次执行时间
        if job.next_run_time:
            if next_run_time is None or job.next_run_time < next_run_time:
                next_run_time = job.next_run_time

    return {
        "is_running": _scheduler.running,
        "jobs_count": len(jobs),
        "jobs": jobs_info,
        "next_run_time": next_run_time.isoformat() if next_run_time else None
    }


async def trigger_immediate_check():
    """
    立即触发一次定时通知检查
    用于手动触发调度器检查
    """
    logger.info("手动触发定时通知检查...")
    check_and_execute_scheduled_notifications()
    logger.info("手动触发的定时通知检查完成")
