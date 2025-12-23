"""
定时任务调度模块
使用 APScheduler 实现定时通知的自动发送
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional
from contextlib import contextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlmodel import Session

from database import engine
import crud
from models import ScheduledNotificationStatus

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 全局调度器实例
scheduler: Optional[AsyncIOScheduler] = None


@contextmanager
def get_db_session():
    """获取数据库会话的上下文管理器"""
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()


async def check_and_execute_scheduled_notifications():
    """
    检查并执行到期的定时通知
    这个函数会被调度器定期调用
    """
    logger.info(f"[{datetime.now()}] 检查定时通知任务...")
    
    try:
        with get_db_session() as session:
            # 获取所有待执行的定时通知
            pending_notifications = crud.get_pending_scheduled_notifications(session)
            
            if not pending_notifications:
                logger.debug("没有待执行的定时通知")
                return
            
            logger.info(f"发现 {len(pending_notifications)} 个待执行的定时通知")
            
            for scheduled in pending_notifications:
                try:
                    logger.info(f"执行定时通知: {scheduled.name} (ID: {scheduled.id})")
                    
                    # 执行通知发送
                    notifications = crud.execute_scheduled_notification(session, scheduled)
                    
                    logger.info(f"定时通知 {scheduled.name} 执行完成，发送了 {len(notifications)} 条通知")
                    
                except Exception as e:
                    logger.error(f"执行定时通知 {scheduled.name} 失败: {str(e)}")
                    # 标记为失败
                    try:
                        scheduled.status = ScheduledNotificationStatus.FAILED
                        scheduled.updated_at = datetime.now()
                        session.add(scheduled)
                        session.commit()
                    except Exception as commit_error:
                        logger.error(f"更新失败状态时出错: {str(commit_error)}")
                        session.rollback()
                        
    except Exception as e:
        logger.error(f"检查定时通知时发生错误: {str(e)}")


def start_scheduler():
    """
    启动调度器
    """
    global scheduler
    
    if scheduler is not None and scheduler.running:
        logger.warning("调度器已在运行中")
        return
    
    scheduler = AsyncIOScheduler()
    
    # 添加定时任务：每分钟检查一次待执行的通知
    scheduler.add_job(
        check_and_execute_scheduled_notifications,
        trigger=IntervalTrigger(minutes=1),
        id='check_scheduled_notifications',
        name='检查定时通知',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("✅ 定时任务调度器已启动")


def stop_scheduler():
    """
    停止调度器
    """
    global scheduler
    
    if scheduler is None:
        logger.warning("调度器未运行")
        return
    
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("👋 定时任务调度器已停止")
    
    scheduler = None


def is_scheduler_running() -> bool:
    """
    检查调度器是否正在运行
    
    Returns:
        bool: 调度器是否正在运行
    """
    global scheduler
    return scheduler is not None and scheduler.running


def get_scheduler_info() -> dict:
    """
    获取调度器信息
    
    Returns:
        dict: 调度器状态信息
    """
    global scheduler
    
    if scheduler is None or not scheduler.running:
        return {
            "is_running": False,
            "jobs": []
        }
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
        })
    
    return {
        "is_running": True,
        "jobs": jobs
    }


async def trigger_immediate_check():
    """
    立即触发一次检查
    用于手动触发或测试
    """
    await check_and_execute_scheduled_notifications()
