"""
车队管家后端 - FastAPI 应用入口
提供 RESTful API 服务，包含认证、用户、仓库、考勤、计件、请假、车辆、通知等模块
支持 SSE 实时通知推送

重构说明：
- 所有业务路由已拆分到 routers/ 目录下的独立模块
- main.py 仅保留应用入口、生命周期管理、静态文件服务、健康检查等核心功能
- 目标：main.py <= 500 行

路由模块：
- auth_router: 认证路由（登录、获取当前用户、修改密码）
- users_router: 用户管理路由
- warehouses_router: 仓库管理路由
- attendance_router: 考勤打卡路由
- piece_work_router: 计件功能路由
- leave_router: 请假审批路由
- vehicles_router: 车辆管理路由
- notifications_router: 通知系统路由（通知管理、模板、SSE 推送）
- scheduled_router: 定时通知路由（定时通知管理、调度器控制）
- ocr_router: OCR 识别路由（驾驶证、行驶证识别）
- upload_router: 图片上传路由（车辆照片、证件照片、头像）
- admin_router: 系统管理路由（老板管理、权限配置）

Requirements: 9.2 - main.py 作为简洁入口，使用 include_router 注册路由
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, text

from config import get_settings
from database import create_db_and_tables, get_session, engine, run_migrations
import crud

# 获取配置
settings = get_settings()

# 导入调度器模块
from scheduler import start_scheduler, stop_scheduler

# 导入路由模块
from routers import (
    auth_router, users_router, warehouses_router,
    attendance_router, piece_work_router,
    leave_router, vehicles_router,
    notifications_router, scheduled_router,
    ocr_router, upload_router, admin_router
)


# ==================== 应用生命周期 ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    启动时创建数据库表和初始化数据，启动定时任务调度器

    Yields:
        None: 应用运行中
    """
    # 启动时执行
    print("🚀 正在启动车队管家后端服务...")
    create_db_and_tables()
    
    # 执行数据库迁移（幂等操作，可安全多次执行）
    # Requirements: 5.1 - 数据迁移
    run_migrations()

    # 初始化默认数据
    with Session(engine) as session:
        crud.init_default_data(session)

    # 启动定时任务调度器
    start_scheduler()
    print("⏰ 定时任务调度器已启动")

    print("✅ 服务启动完成！")

    yield  # 应用运行中

    # 关闭时执行
    stop_scheduler()
    print("⏰ 定时任务调度器已停止")
    print("👋 服务已关闭")


# ==================== 创建 FastAPI 应用 ====================

app = FastAPI(
    title="车队管家 API",
    description="车队管理系统后端 API，提供用户、仓库、考勤、计件、请假、车辆、通知等功能",
    version="1.0.0",
    lifespan=lifespan
)

# 配置 CORS（跨域资源共享）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 静态文件服务配置 ====================
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# 创建上传目录（如果不存在）
UPLOAD_BASE_DIR = Path("uploads")
UPLOAD_BASE_DIR.mkdir(parents=True, exist_ok=True)

# 挂载静态文件服务，用于访问上传的图片
# URL 路径 /uploads 映射到本地 uploads 目录
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_BASE_DIR)), name="uploads")


# ==================== 注册路由模块 ====================

# 注册认证路由（登录、获取当前用户、修改密码）
app.include_router(auth_router)

# 注册用户管理路由
app.include_router(users_router)

# 注册仓库管理路由
app.include_router(warehouses_router)

# 注册考勤打卡路由
app.include_router(attendance_router)

# 注册计件功能路由
app.include_router(piece_work_router)

# 注册请假审批路由
app.include_router(leave_router)

# 注册车辆管理路由
app.include_router(vehicles_router)

# 注册通知系统路由（通知管理、模板、SSE 推送）
app.include_router(notifications_router)

# 注册定时通知路由（定时通知管理、调度器控制）
app.include_router(scheduled_router)

# 注册 OCR 识别路由（驾驶证、行驶证识别）
app.include_router(ocr_router)

# 注册图片上传路由（车辆照片、证件照片、头像）
app.include_router(upload_router)

# 注册系统管理路由（老板管理、权限配置）
app.include_router(admin_router)


# ==================== 健康检查 ====================

@app.get("/api/health", tags=["系统"])
async def health_check(session: Session = Depends(get_session)):
    """
    健康检查接口
    用于监控服务是否正常运行
    检查数据库连接状态

    Args:
        session: 数据库会话

    Returns:
        dict: 包含服务状态、数据库状态、版本信息
    """
    # 检查数据库连接
    db_status = "ok"
    try:
        # 执行简单查询测试数据库连接
        session.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "message": "服务运行正常" if db_status == "ok" else "服务运行中，但数据库连接异常",
        "database": db_status,
        "version": "1.0.0"
    }


@app.get("/api/health/live", tags=["系统"])
async def liveness_check():
    """
    存活检查接口（Kubernetes liveness probe）
    仅检查服务是否响应

    Returns:
        dict: 服务存活状态
    """
    return {"status": "alive"}


@app.get("/api/health/ready", tags=["系统"])
async def readiness_check(session: Session = Depends(get_session)):
    """
    就绪检查接口（Kubernetes readiness probe）
    检查服务是否准备好接收流量

    Args:
        session: 数据库会话

    Returns:
        dict: 服务就绪状态

    Raises:
        HTTPException: 如果服务未就绪
    """
    try:
        # 检查数据库连接
        session.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"服务未就绪: {str(e)}"
        )


@app.get("/", tags=["系统"])
async def root():
    """
    根路径
    返回 API 基本信息

    Returns:
        dict: API 基本信息
    """
    return {
        "name": "车队管家 API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


# ==================== 启动入口 ====================

if __name__ == "__main__":
    import uvicorn

    # 启动服务器
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug  # 开发模式下启用热重载
    )
