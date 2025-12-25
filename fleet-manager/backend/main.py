"""
车队管家后端 - FastAPI 应用入口
提供 RESTful API 服务，包含认证、用户、仓库、考勤、计件、请假、车辆、通知等模块
支持 SSE 实时通知推送
"""

from datetime import date, datetime
from typing import Optional, List
from contextlib import asynccontextmanager
import asyncio
import json

from fastapi import FastAPI, Depends, HTTPException, status, Query, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import Session, text

from config import get_settings
from database import create_db_and_tables, get_session
from models import User, UserRole, LeaveStatus, VehicleStatus
from auth import (
    authenticate_user, create_access_token, get_current_user,
    verify_password,
    require_boss, require_manager_or_boss, require_admin, require_management,
    decode_token
)
import crud

# 获取配置
settings = get_settings()

from schemas import (
    LoginRequest, TokenResponse, PasswordChangeRequest, MessageResponse,
    UserCreate, UserUpdate, UserResponse,
    WarehouseCreate, WarehouseUpdate, WarehouseResponse, WarehouseAssignRequest,
    AttendanceResponse, TodayAttendanceResponse,
    PieceWorkCategoryCreate, PieceWorkCategoryUpdate, PieceWorkCategoryResponse,
    PieceWorkRecordCreate, PieceWorkRecordUpdate, PieceWorkRecordResponse, PieceWorkStatsResponse,
    LeaveApplicationCreate, LeaveApproveRequest, LeaveApplicationResponse,
    VehicleCreate, VehicleUpdate, VehicleResponse, VehicleReviewRequest,
    VehicleDocumentCreate, VehicleDocumentResponse,
    VehicleLeaseUpdate, VehicleLeaseResponse, VehicleLeaseReminderResponse,
    VehicleReturnRequest, VehicleAssignRequest,
    SupplementPhotoRequest, SupplementedPhotosResponse,
    NotificationCreate, NotificationResponse, UnreadCountResponse,
    NotificationFromTemplateCreate,
    NotificationTemplateCreate, NotificationTemplateUpdate, NotificationTemplateResponse,
    NotificationTemplatePreviewRequest,
    ScheduledNotificationCreate, ScheduledNotificationUpdate, ScheduledNotificationResponse,
    SchedulerStatusResponse, ScheduledNotificationStatus as SchemaScheduledNotificationStatus,
    OCRDrivingLicenseRequest, OCRDrivingLicenseResponse, OCRDrivingLicenseData, OCRStatusResponse,
    ImageUploadResponse,
    VehicleHistoryResponse, VehicleHistoryListResponse, VehicleHistoryPhotos,
    VehicleHistoryActionType as SchemaVehicleHistoryActionType
)

# 导入定时通知相关模型
from models import ScheduledNotificationStatus

# 导入调度器模块
from scheduler import start_scheduler, stop_scheduler, is_scheduler_running, get_scheduler_status as get_scheduler_info


# ==================== 应用生命周期 ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    启动时创建数据库表和初始化数据，启动定时任务调度器
    """
    # 启动时执行
    print("🚀 正在启动车队管家后端服务...")
    create_db_and_tables()
    
    # 初始化默认数据
    with Session(crud.engine) as session:
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
# 导入静态文件服务所需模块
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

# 创建上传目录（如果不存在）
UPLOAD_BASE_DIR = Path("uploads")
UPLOAD_BASE_DIR.mkdir(parents=True, exist_ok=True)

# 挂载静态文件服务，用于访问上传的图片
# URL 路径 /uploads 映射到本地 uploads 目录
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_BASE_DIR)), name="uploads")


# ==================== 认证 API ====================

@app.post("/api/auth/login", response_model=TokenResponse, tags=["认证"])
async def login(
    request: LoginRequest,
    session: Session = Depends(get_session)
):
    """
    用户登录
    验证用户名密码，返回 JWT Token
    """
    user = authenticate_user(session, request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    
    # 创建访问令牌（sub 必须是字符串）
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(access_token=access_token)


@app.get("/api/auth/me", response_model=UserResponse, tags=["认证"])
async def get_me(current_user: User = Depends(get_current_user)):
    """
    获取当前登录用户信息
    """
    return current_user


@app.put("/api/auth/password", response_model=MessageResponse, tags=["认证"])
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    修改当前用户密码
    """
    # 验证旧密码
    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="旧密码错误"
        )
    
    # 更新密码
    crud.change_user_password(session, current_user, request.new_password)
    
    return MessageResponse(message="密码修改成功")


# ==================== 用户 API ====================

@app.get("/api/users", response_model=List[UserResponse], tags=["用户管理"])
async def get_users(
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取用户列表（管理员级别可访问：调度、老板、超级管理员）
    """
    users = crud.get_users(session, role=role, is_active=is_active, skip=skip, limit=limit)
    return users


@app.post("/api/users", response_model=UserResponse, tags=["用户管理"])
async def create_user(
    request: UserCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    创建新用户（管理员级别可访问：调度、老板、超级管理员）
    """
    # 检查用户名是否已存在
    existing = crud.get_user_by_username(session, request.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 权限控制：只有超级管理员可以创建老板和超级管理员角色
    if request.role in [UserRole.BOSS, UserRole.SUPER_ADMIN]:
        if current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有超级管理员可以创建老板或超级管理员角色"
            )
    
    user = crud.create_user(
        session,
        username=request.username,
        password=request.password,
        name=request.name,
        phone=request.phone,
        role=request.role
    )
    return user


@app.get("/api/users/{user_id}", response_model=UserResponse, tags=["用户管理"])
async def get_user(
    user_id: int,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取用户详情（管理权限可访问：车队长、调度、老板、超级管理员）
    """
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    return user


@app.put("/api/users/{user_id}", response_model=UserResponse, tags=["用户管理"])
async def update_user(
    user_id: int,
    request: UserUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    更新用户信息（管理员级别可访问：调度、老板、超级管理员）
    """
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 权限控制：只有超级管理员可以修改老板和超级管理员角色
    if user.role in [UserRole.BOSS, UserRole.SUPER_ADMIN]:
        if current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有超级管理员可以修改老板或超级管理员"
            )
    
    # 权限控制：只有超级管理员可以将用户角色改为老板或超级管理员
    if request.role in [UserRole.BOSS, UserRole.SUPER_ADMIN]:
        if current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有超级管理员可以设置老板或超级管理员角色"
            )
    
    updated_user = crud.update_user(
        session, user,
        name=request.name,
        phone=request.phone,
        role=request.role,
        is_active=request.is_active
    )
    return updated_user


@app.delete("/api/users/{user_id}", response_model=MessageResponse, tags=["用户管理"])
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    删除用户（管理员级别可访问：调度、老板、超级管理员）
    """
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 不能删除自己
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己的账号"
        )
    
    # 权限控制：只有超级管理员可以删除老板和超级管理员
    if user.role in [UserRole.BOSS, UserRole.SUPER_ADMIN]:
        if current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有超级管理员可以删除老板或超级管理员"
            )
    
    crud.delete_user(session, user)
    return MessageResponse(message="用户已删除")


# ==================== 仓库 API ====================

@app.get("/api/warehouses", response_model=List[WarehouseResponse], tags=["仓库管理"])
async def get_warehouses(
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取仓库列表（所有登录用户可访问）
    """
    warehouses = crud.get_warehouses(session, is_active=is_active, skip=skip, limit=limit)
    return warehouses


@app.post("/api/warehouses", response_model=WarehouseResponse, tags=["仓库管理"])
async def create_warehouse(
    request: WarehouseCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    创建仓库（管理员级别可访问：调度、老板、超级管理员）
    """
    warehouse = crud.create_warehouse(session, name=request.name, address=request.address)
    return warehouse


@app.get("/api/warehouses/{warehouse_id}", response_model=WarehouseResponse, tags=["仓库管理"])
async def get_warehouse(
    warehouse_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取仓库详情
    """
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )
    return warehouse


@app.put("/api/warehouses/{warehouse_id}", response_model=WarehouseResponse, tags=["仓库管理"])
async def update_warehouse(
    warehouse_id: int,
    request: WarehouseUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    更新仓库信息（管理员级别可访问：调度、老板、超级管理员）
    """
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )
    
    updated = crud.update_warehouse(
        session, warehouse,
        name=request.name,
        address=request.address,
        is_active=request.is_active
    )
    return updated


@app.delete("/api/warehouses/{warehouse_id}", response_model=MessageResponse, tags=["仓库管理"])
async def delete_warehouse(
    warehouse_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    删除仓库（管理员级别可访问：调度、老板、超级管理员）
    """
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )
    
    crud.delete_warehouse(session, warehouse)
    return MessageResponse(message="仓库已删除")


@app.post("/api/warehouses/{warehouse_id}/assign", response_model=MessageResponse, tags=["仓库管理"])
async def assign_users_to_warehouse(
    warehouse_id: int,
    request: WarehouseAssignRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    分配用户到仓库（管理员级别可访问：调度、老板、超级管理员）
    """
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )
    
    crud.assign_users_to_warehouse(session, warehouse_id, request.user_ids)
    return MessageResponse(message="用户分配成功")


@app.get("/api/warehouses/{warehouse_id}/users", response_model=List[UserResponse], tags=["仓库管理"])
async def get_warehouse_users(
    warehouse_id: int,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取仓库下的用户列表（管理权限可访问：车队长、调度、老板、超级管理员）
    """
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )
    
    users = crud.get_warehouse_users(session, warehouse_id)
    return users


@app.get("/api/warehouses/{warehouse_id}/vehicles", response_model=List[VehicleResponse], tags=["仓库管理"])
async def get_warehouse_vehicles(
    warehouse_id: int,
    vehicle_status: Optional[VehicleStatus] = Query(None, alias="status", description="按车辆状态过滤"),
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数上限"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取仓库下的车辆列表
    所有登录用户可访问，但需要验证仓库存在
    支持按状态过滤和分页
    
    Args:
        warehouse_id: 仓库ID
        vehicle_status: 按车辆状态过滤（可选）
        skip: 跳过记录数，默认0
        limit: 返回记录数上限，默认100，最大1000
        
    Returns:
        List[VehicleResponse]: 该仓库的车辆列表
        
    Raises:
        HTTPException 404: 仓库不存在
        HTTPException 403: 当前用户无权访问该仓库
    """
    # 验证仓库是否存在 (Requirement 4.4)
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )
    
    # 权限检查：司机只能访问自己分配的仓库 (Requirement 4.5)
    if current_user.role == UserRole.DRIVER:
        # 获取用户分配的仓库列表
        user_warehouses = crud.get_user_warehouses(session, current_user.id)
        user_warehouse_ids = [w.id for w in user_warehouses]
        
        # 检查用户是否有权访问该仓库
        if warehouse_id not in user_warehouse_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问该仓库"
            )
    
    # 获取仓库车辆列表 (Requirement 4.1, 4.2, 4.3)
    vehicles = crud.get_warehouse_vehicles(
        session,
        warehouse_id=warehouse_id,
        status=vehicle_status,
        skip=skip,
        limit=limit
    )
    
    # 构建响应（添加车主姓名）
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


# ==================== 考勤 API ====================

@app.post("/api/attendance/clock-in", response_model=AttendanceResponse, tags=["考勤管理"])
async def clock_in(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    上班打卡（司机操作）
    """
    attendance = crud.clock_in(session, current_user.id)
    
    # 构建响应
    return AttendanceResponse(
        id=attendance.id,
        user_id=attendance.user_id,
        work_date=attendance.work_date,
        clock_in=attendance.clock_in,
        clock_out=attendance.clock_out,
        work_hours=attendance.work_hours,
        created_at=attendance.created_at,
        user_name=current_user.name
    )


@app.post("/api/attendance/clock-out", response_model=AttendanceResponse, tags=["考勤管理"])
async def clock_out(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    下班打卡（司机操作）
    """
    attendance = crud.clock_out(session, current_user.id)
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="今天还没有上班打卡，请先上班打卡"
        )
    
    return AttendanceResponse(
        id=attendance.id,
        user_id=attendance.user_id,
        work_date=attendance.work_date,
        clock_in=attendance.clock_in,
        clock_out=attendance.clock_out,
        work_hours=attendance.work_hours,
        created_at=attendance.created_at,
        user_name=current_user.name
    )


@app.get("/api/attendance/today", response_model=TodayAttendanceResponse, tags=["考勤管理"])
async def get_today_attendance(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取今日打卡状态
    """
    attendance = crud.get_today_attendance(session, current_user.id)
    
    if not attendance:
        return TodayAttendanceResponse(
            has_clocked_in=False,
            has_clocked_out=False,
            clock_in_time=None,
            clock_out_time=None,
            work_hours=None
        )
    
    return TodayAttendanceResponse(
        has_clocked_in=attendance.clock_in is not None,
        has_clocked_out=attendance.clock_out is not None,
        clock_in_time=attendance.clock_in,
        clock_out_time=attendance.clock_out,
        work_hours=attendance.work_hours
    )


@app.get("/api/attendance", response_model=List[AttendanceResponse], tags=["考勤管理"])
async def get_attendance_records(
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取考勤记录列表
    司机只能查看自己的记录，车队长和老板可以查看所有
    """
    # 权限控制：司机只能查看自己的记录
    if current_user.role == UserRole.DRIVER:
        user_id = current_user.id
    
    records = crud.get_attendance_records(
        session,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )
    
    # 构建响应（添加用户姓名）
    result = []
    for record in records:
        user = crud.get_user_by_id(session, record.user_id)
        result.append(AttendanceResponse(
            id=record.id,
            user_id=record.user_id,
            work_date=record.work_date,
            clock_in=record.clock_in,
            clock_out=record.clock_out,
            work_hours=record.work_hours,
            created_at=record.created_at,
            user_name=user.name if user else None
        ))
    
    return result


# ==================== 计件分类 API ====================

@app.get("/api/piece-work/categories", response_model=List[PieceWorkCategoryResponse], tags=["计件管理"])
async def get_piece_work_categories(
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取计件分类列表
    """
    categories = crud.get_piece_work_categories(session, is_active=is_active)
    return categories


@app.post("/api/piece-work/categories", response_model=PieceWorkCategoryResponse, tags=["计件管理"])
async def create_piece_work_category(
    request: PieceWorkCategoryCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    创建计件分类（管理员级别可访问：调度、老板、超级管理员）
    """
    category = crud.create_piece_work_category(
        session,
        name=request.name,
        unit_price=request.unit_price,
        unit=request.unit
    )
    return category


@app.put("/api/piece-work/categories/{category_id}", response_model=PieceWorkCategoryResponse, tags=["计件管理"])
async def update_piece_work_category(
    category_id: int,
    request: PieceWorkCategoryUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    更新计件分类（管理员级别可访问：调度、老板、超级管理员）
    """
    category = session.get(crud.PieceWorkCategory, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在"
        )
    
    updated = crud.update_piece_work_category(
        session, category,
        name=request.name,
        unit_price=request.unit_price,
        unit=request.unit,
        is_active=request.is_active
    )
    return updated


# ==================== 计件记录 API ====================

@app.get("/api/piece-work/records", response_model=List[PieceWorkRecordResponse], tags=["计件管理"])
async def get_piece_work_records(
    user_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取计件记录列表
    司机只能查看自己的记录，车队长和老板可以查看所有
    """
    # 权限控制：司机只能查看自己的记录
    if current_user.role == UserRole.DRIVER:
        user_id = current_user.id
    
    records = crud.get_piece_work_records(
        session,
        user_id=user_id,
        warehouse_id=warehouse_id,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )
    
    # 构建响应（添加关联信息）
    result = []
    for record in records:
        user = crud.get_user_by_id(session, record.user_id)
        category = session.get(crud.PieceWorkCategory, record.category_id)
        warehouse = crud.get_warehouse_by_id(session, record.warehouse_id) if record.warehouse_id else None
        
        result.append(PieceWorkRecordResponse(
            id=record.id,
            user_id=record.user_id,
            category_id=record.category_id,
            warehouse_id=record.warehouse_id,
            work_date=record.work_date,
            quantity=record.quantity,
            amount=record.amount,
            remark=record.remark,
            created_at=record.created_at,
            user_name=user.name if user else None,
            category_name=category.name if category else None,
            warehouse_name=warehouse.name if warehouse else None
        ))
    
    return result


@app.post("/api/piece-work/records", response_model=PieceWorkRecordResponse, tags=["计件管理"])
async def create_piece_work_record(
    request: PieceWorkRecordCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    录入计件记录（司机操作）
    """
    # 验证分类是否存在
    category = session.get(crud.PieceWorkCategory, request.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="计件分类不存在"
        )
    
    record = crud.create_piece_work_record(
        session,
        user_id=current_user.id,
        category_id=request.category_id,
        work_date=request.work_date,
        quantity=request.quantity,
        warehouse_id=request.warehouse_id,
        remark=request.remark
    )
    
    return PieceWorkRecordResponse(
        id=record.id,
        user_id=record.user_id,
        category_id=record.category_id,
        warehouse_id=record.warehouse_id,
        work_date=record.work_date,
        quantity=record.quantity,
        amount=record.amount,
        remark=record.remark,
        created_at=record.created_at,
        user_name=current_user.name,
        category_name=category.name,
        warehouse_name=None
    )


@app.get("/api/piece-work/stats", response_model=PieceWorkStatsResponse, tags=["计件管理"])
async def get_piece_work_stats(
    user_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取计件统计
    司机只能查看自己的统计，车队长和老板可以查看所有
    """
    # 权限控制：司机只能查看自己的统计
    if current_user.role == UserRole.DRIVER:
        user_id = current_user.id
    
    stats = crud.get_piece_work_stats(
        session,
        user_id=user_id,
        warehouse_id=warehouse_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return PieceWorkStatsResponse(**stats)


@app.put("/api/piece-work/records/{record_id}", response_model=PieceWorkRecordResponse, tags=["计件管理"])
async def update_piece_work_record(
    record_id: int,
    request: PieceWorkRecordUpdate,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    更新计件记录（管理权限可操作：车队长、调度、老板、超级管理员）
    用于修正司机录入的计件数据
    """
    # 获取记录
    record = session.get(crud.PieceWorkRecord, record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="计件记录不存在"
        )
    
    # 更新记录
    updated = crud.update_piece_work_record(
        session, record,
        quantity=request.quantity,
        remark=request.remark
    )
    
    # 获取关联信息
    user = crud.get_user_by_id(session, updated.user_id)
    category = session.get(crud.PieceWorkCategory, updated.category_id)
    warehouse = crud.get_warehouse_by_id(session, updated.warehouse_id) if updated.warehouse_id else None
    
    return PieceWorkRecordResponse(
        id=updated.id,
        user_id=updated.user_id,
        category_id=updated.category_id,
        warehouse_id=updated.warehouse_id,
        work_date=updated.work_date,
        quantity=updated.quantity,
        amount=updated.amount,
        remark=updated.remark,
        created_at=updated.created_at,
        user_name=user.name if user else None,
        category_name=category.name if category else None,
        warehouse_name=warehouse.name if warehouse else None
    )


@app.delete("/api/piece-work/records/{record_id}", response_model=MessageResponse, tags=["计件管理"])
async def delete_piece_work_record(
    record_id: int,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    删除计件记录（管理权限可操作：车队长、调度、老板、超级管理员）
    """
    # 获取记录
    record = session.get(crud.PieceWorkRecord, record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="计件记录不存在"
        )
    
    crud.delete_piece_work_record(session, record)
    return MessageResponse(message="计件记录已删除")


# ==================== 请假 API ====================

@app.get("/api/leave", response_model=List[LeaveApplicationResponse], tags=["请假管理"])
async def get_leave_applications(
    user_id: Optional[int] = None,
    status: Optional[LeaveStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取请假申请列表
    司机只能查看自己的申请，车队长和老板可以查看所有
    """
    # 权限控制：司机只能查看自己的申请
    if current_user.role == UserRole.DRIVER:
        user_id = current_user.id
    
    applications = crud.get_leave_applications(
        session,
        user_id=user_id,
        status=status,
        skip=skip,
        limit=limit
    )
    
    # 构建响应（添加关联信息）
    result = []
    for app in applications:
        user = crud.get_user_by_id(session, app.user_id)
        approver = crud.get_user_by_id(session, app.approver_id) if app.approver_id else None
        
        result.append(LeaveApplicationResponse(
            id=app.id,
            user_id=app.user_id,
            leave_type=app.leave_type,
            start_date=app.start_date,
            end_date=app.end_date,
            reason=app.reason,
            status=app.status,
            approver_id=app.approver_id,
            approve_remark=app.approve_remark,
            created_at=app.created_at,
            updated_at=app.updated_at,
            user_name=user.name if user else None,
            approver_name=approver.name if approver else None
        ))
    
    return result


@app.post("/api/leave", response_model=LeaveApplicationResponse, tags=["请假管理"])
async def create_leave_application(
    request: LeaveApplicationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    提交请假申请（司机操作）
    创建申请后自动发送通知给管理员
    """
    application = crud.create_leave_application(
        session,
        user_id=current_user.id,
        leave_type=request.leave_type,
        start_date=request.start_date,
        end_date=request.end_date,
        reason=request.reason
    )
    
    # 发送通知给管理员（车队长、调度、老板、超级管理员）
    try:
        # 获取所有管理员用户
        admin_users = crud.get_users(
            session, 
            is_active=True,
            skip=0,
            limit=1000
        )
        # 筛选管理角色
        admin_ids = [
            u.id for u in admin_users 
            if u.role in [UserRole.MANAGER, UserRole.DISPATCHER, UserRole.BOSS, UserRole.SUPER_ADMIN]
        ]
        
        if admin_ids:
            # 构建通知内容
            leave_type_text = "请假" if request.leave_type == "leave" else "离职"
            title = f"新的{leave_type_text}申请"
            content = f"{current_user.name} 提交了{leave_type_text}申请，日期：{request.start_date} 至 {request.end_date}"
            if request.reason:
                content += f"，原因：{request.reason}"
            
            # 发送通知
            crud.create_notifications_batch(
                session,
                user_ids=admin_ids,
                title=title,
                content=content,
                sender_id=current_user.id
            )
    except Exception as e:
        # 通知发送失败不影响申请创建
        print(f"发送请假申请通知失败: {e}")
    
    return LeaveApplicationResponse(
        id=application.id,
        user_id=application.user_id,
        leave_type=application.leave_type,
        start_date=application.start_date,
        end_date=application.end_date,
        reason=application.reason,
        status=application.status,
        approver_id=application.approver_id,
        approve_remark=application.approve_remark,
        created_at=application.created_at,
        updated_at=application.updated_at,
        user_name=current_user.name,
        approver_name=None
    )


@app.get("/api/leave/{application_id}", response_model=LeaveApplicationResponse, tags=["请假管理"])
async def get_leave_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取请假申请详情
    """
    application = session.get(crud.LeaveApplication, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="申请不存在"
        )
    
    # 权限控制：司机只能查看自己的申请
    if current_user.role == UserRole.DRIVER and application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此申请"
        )
    
    user = crud.get_user_by_id(session, application.user_id)
    approver = crud.get_user_by_id(session, application.approver_id) if application.approver_id else None
    
    return LeaveApplicationResponse(
        id=application.id,
        user_id=application.user_id,
        leave_type=application.leave_type,
        start_date=application.start_date,
        end_date=application.end_date,
        reason=application.reason,
        status=application.status,
        approver_id=application.approver_id,
        approve_remark=application.approve_remark,
        created_at=application.created_at,
        updated_at=application.updated_at,
        user_name=user.name if user else None,
        approver_name=approver.name if approver else None
    )


@app.put("/api/leave/{application_id}/approve", response_model=LeaveApplicationResponse, tags=["请假管理"])
async def approve_leave_application(
    application_id: int,
    request: LeaveApproveRequest,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    审批请假申请（管理权限可操作：车队长、调度、老板、超级管理员）
    """
    application = session.get(crud.LeaveApplication, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="申请不存在"
        )
    
    # 检查是否已审批
    if application.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该申请已审批"
        )
    
    # 执行审批
    updated = crud.approve_leave_application(
        session,
        application,
        approver_id=current_user.id,
        status=request.status,
        approve_remark=request.approve_remark
    )
    
    user = crud.get_user_by_id(session, updated.user_id)
    
    return LeaveApplicationResponse(
        id=updated.id,
        user_id=updated.user_id,
        leave_type=updated.leave_type,
        start_date=updated.start_date,
        end_date=updated.end_date,
        reason=updated.reason,
        status=updated.status,
        approver_id=updated.approver_id,
        approve_remark=updated.approve_remark,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        user_name=user.name if user else None,
        approver_name=current_user.name
    )


# ==================== 车辆 API ====================

@app.get("/api/vehicles", response_model=List[VehicleResponse], tags=["车辆管理"])
async def get_vehicles(
    user_id: Optional[int] = None,
    status: Optional[VehicleStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取车辆列表
    司机只能查看自己的车辆，车队长和老板可以查看所有
    """
    # 权限控制：司机只能查看自己的车辆
    if current_user.role == UserRole.DRIVER:
        user_id = current_user.id
    
    vehicles = crud.get_vehicles(
        session,
        user_id=user_id,
        status=status,
        skip=skip,
        limit=limit
    )
    
    # 构建响应（添加车主姓名）
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


@app.get("/api/vehicles/all", response_model=List[VehicleResponse], tags=["车辆管理"])
async def get_all_vehicles(
    warehouse_id: Optional[int] = Query(None, description="按仓库ID过滤"),
    status: Optional[VehicleStatus] = Query(None, description="按车辆状态过滤"),
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
        status: 按车辆状态过滤（可选）
        skip: 跳过记录数，默认0
        limit: 返回记录数上限，默认100，最大1000
        
    Returns:
        List[VehicleResponse]: 车辆列表
        
    Raises:
        HTTPException 403: 当前用户无管理权限
    """
    # 获取车辆列表（已通过 require_management 验证权限）
    vehicles = crud.get_all_vehicles(
        session,
        warehouse_id=warehouse_id,
        status=status,
        skip=skip,
        limit=limit
    )
    
    # 构建响应（添加车主姓名）
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


@app.post("/api/vehicles", response_model=VehicleResponse, tags=["车辆管理"])
async def create_vehicle(
    request: VehicleCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    添加车辆（司机操作）
    支持同时设置租赁信息
    创建车辆后自动发送通知给管理员进行审核
    """
    # 检查车牌号是否已存在
    from sqlmodel import select as sql_select
    from models import Vehicle as VehicleModel
    existing = session.exec(
        sql_select(VehicleModel).where(VehicleModel.license_plate == request.license_plate)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="车牌号已存在"
        )
    
    vehicle = crud.create_vehicle(
        session,
        user_id=current_user.id,
        license_plate=request.license_plate,
        brand=request.brand,
        model=request.model,
        color=request.color,
        ownership_type=request.ownership_type,
        lessor_name=request.lessor_name,
        lessor_contact=request.lessor_contact,
        lessee_name=request.lessee_name,
        lessee_contact=request.lessee_contact,
        monthly_rent=request.monthly_rent,
        lease_start_date=request.lease_start_date,
        lease_end_date=request.lease_end_date,
        rent_payment_day=request.rent_payment_day
    )
    
    # 发送通知给管理员（调度、老板、超级管理员）进行车辆审核
    try:
        # 获取所有管理员用户
        admin_users = crud.get_users(
            session, 
            is_active=True,
            skip=0,
            limit=1000
        )
        # 筛选有车辆审核权限的角色
        admin_ids = [
            u.id for u in admin_users 
            if u.role in [UserRole.DISPATCHER, UserRole.BOSS, UserRole.SUPER_ADMIN]
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


@app.get("/api/vehicles/{vehicle_id}", response_model=VehicleResponse, tags=["车辆管理"])
async def get_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取车辆详情
    """
    vehicle = session.get(crud.Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )
    
    # 权限控制：司机只能查看自己的车辆
    if current_user.role == UserRole.DRIVER and vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此车辆"
        )
    
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


@app.put("/api/vehicles/{vehicle_id}", response_model=VehicleResponse, tags=["车辆管理"])
async def update_vehicle(
    vehicle_id: int,
    request: VehicleUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    更新车辆信息
    司机只能更新自己的车辆，老板可以更新所有
    """
    vehicle = session.get(crud.Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )
    
    # 权限控制
    if current_user.role == UserRole.DRIVER and vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权更新此车辆"
        )
    
    # 更新车辆信息
    updated = crud.update_vehicle(
        session, vehicle,
        brand=request.brand,
        model=request.model,
        color=request.color,
        ownership_type=request.ownership_type
    )
    
    # 获取车主信息用于响应
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


@app.put("/api/vehicles/{vehicle_id}/review", response_model=VehicleResponse, tags=["车辆管理"])
async def review_vehicle(
    vehicle_id: int,
    request: VehicleReviewRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    审核车辆（管理员级别可操作：调度、老板、超级管理员）
    """
    vehicle = session.get(crud.Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )
    
    updated = crud.review_vehicle(session, vehicle, request.status)
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


@app.post("/api/vehicles/{vehicle_id}/documents", response_model=VehicleDocumentResponse, tags=["车辆管理"])
async def create_vehicle_document(
    vehicle_id: int,
    request: VehicleDocumentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    上传车辆证件
    """
    vehicle = session.get(crud.Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )
    
    # 权限控制：司机只能上传自己车辆的证件
    if current_user.role == UserRole.DRIVER and vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权操作此车辆"
        )
    
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

@app.put("/api/vehicles/{vehicle_id}/return", response_model=VehicleResponse, tags=["车辆管理"])
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
    
    Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 15.2
    
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
    import json
    from models import VehicleHistoryActionType
    
    # 1. 验证车辆存在
    vehicle = session.get(crud.Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )
    
    # 2. 验证车辆归属（司机只能还自己的车，管理员可以操作所有车辆）
    if current_user.role == UserRole.DRIVER and vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权操作该车辆"
        )
    
    # 3. 验证还车照片数量（必须为7张）
    # 注意：Pydantic 已经在 schema 层面验证了 min_length=7, max_length=7
    # 这里再次验证以确保安全
    if len(request.return_photos) != 7:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="还车照片必须为7张"
        )
    
    # 4. 存储还车照片（JSON 格式）
    return_photos_json = json.dumps(request.return_photos)
    vehicle.return_photos = return_photos_json
    
    # 5. 存储车损照片（如果有）
    damage_photos_json = None
    if request.damage_photos:
        damage_photos_json = json.dumps(request.damage_photos)
        vehicle.damage_photos = damage_photos_json
    
    # 6. 记录还车时间
    return_time = request.return_time if request.return_time else datetime.now()
    vehicle.return_time = return_time
    
    # 7. 更新车辆状态为 returned
    vehicle.status = VehicleStatus.RETURNED
    
    # 8. 更新时间戳
    vehicle.updated_at = datetime.now()
    
    # 9. 保存到数据库
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    
    # 10. 创建还车历史记录 (Requirement 15.2)
    try:
        crud.create_vehicle_history(
            session,
            vehicle_id=vehicle.id,
            user_id=current_user.id,
            action_type=VehicleHistoryActionType.RETURN,
            action_time=return_time,
            photos=return_photos_json,
            damage_photos=damage_photos_json,
            remark=request.remark
        )
    except Exception as e:
        # 历史记录创建失败不影响还车操作
        print(f"创建还车历史记录失败: {e}")
    
    # 11. 获取车主信息用于响应
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


# ==================== 车辆分配 API ====================

@app.put("/api/vehicles/{vehicle_id}/assign", response_model=VehicleResponse, tags=["车辆管理"])
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
    
    Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 15.2
    
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
    from models import VehicleHistoryActionType
    
    # 1. 验证车辆存在
    vehicle = session.get(crud.Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )
    
    # 2. 验证目标用户存在
    target_user = crud.get_user_by_id(session, request.user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="目标用户不存在"
        )
    
    # 3. 验证仓库存在（如果提供了 warehouse_id）
    if request.warehouse_id is not None:
        warehouse = crud.get_warehouse_by_id(session, request.warehouse_id)
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="仓库不存在"
            )
        # 更新车辆的仓库ID
        vehicle.warehouse_id = request.warehouse_id
    
    # 4. 更新车辆的 user_id 为指定用户
    vehicle.user_id = request.user_id
    
    # 5. 更新车辆状态为 active
    vehicle.status = VehicleStatus.ACTIVE
    
    # 6. 记录提车时间
    pickup_time = datetime.now()
    vehicle.pickup_time = pickup_time
    
    # 7. 更新时间戳
    vehicle.updated_at = datetime.now()
    
    # 8. 保存到数据库
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    
    # 9. 创建提车历史记录 (Requirement 15.2)
    try:
        # 获取提车照片（如果有）
        pickup_photos_json = vehicle.pickup_photos
        
        crud.create_vehicle_history(
            session,
            vehicle_id=vehicle.id,
            user_id=request.user_id,
            action_type=VehicleHistoryActionType.PICKUP,
            action_time=pickup_time,
            photos=pickup_photos_json,
            damage_photos=None,
            remark=f"由 {current_user.name} 分配"
        )
    except Exception as e:
        # 历史记录创建失败不影响分配操作
        print(f"创建提车历史记录失败: {e}")
    
    # 10. 发送通知给目标司机
    try:
        title = "车辆分配通知"
        content = f"管理员 {current_user.name} 已将车辆 {vehicle.license_plate} 分配给您"
        if vehicle.brand:
            content += f"，品牌：{vehicle.brand}"
        if vehicle.model:
            content += f"，型号：{vehicle.model}"
        content += "。"
        
        crud.create_notifications_batch(
            session,
            user_ids=[request.user_id],
            title=title,
            content=content,
            sender_id=current_user.id
        )
    except Exception as e:
        # 通知发送失败不影响分配操作
        print(f"发送车辆分配通知失败: {e}")
    
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
        user_name=target_user.name
    )


# ==================== 车辆历史 API ====================

@app.get("/api/vehicles/{vehicle_id}/history", response_model=VehicleHistoryListResponse, tags=["车辆历史"])
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
    
    Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
    
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
    import json
    
    # 1. 验证车辆存在
    vehicle = session.get(crud.Vehicle, vehicle_id)
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
    
    # 4. 构建响应
    items = []
    for record in history_records:
        # 获取司机信息
        user = crud.get_user_by_id(session, record.user_id)
        
        # 解析照片 JSON
        photos = None
        if record.photos:
            try:
                photos_list = json.loads(record.photos)
                # 将照片数组转换为按角度组织的对象
                if isinstance(photos_list, list) and len(photos_list) >= 7:
                    photos = VehicleHistoryPhotos(
                        left_front=photos_list[0] if len(photos_list) > 0 else None,
                        right_front=photos_list[1] if len(photos_list) > 1 else None,
                        left_rear=photos_list[2] if len(photos_list) > 2 else None,
                        right_rear=photos_list[3] if len(photos_list) > 3 else None,
                        dashboard=photos_list[4] if len(photos_list) > 4 else None,
                        rear_door=photos_list[5] if len(photos_list) > 5 else None,
                        cargo_box=photos_list[6] if len(photos_list) > 6 else None
                    )
            except json.JSONDecodeError:
                photos = None
        
        # 解析车损照片 JSON
        damage_photos = None
        if record.damage_photos:
            try:
                damage_photos = json.loads(record.damage_photos)
            except json.JSONDecodeError:
                damage_photos = None
        
        # 转换操作类型
        action_type = SchemaVehicleHistoryActionType(record.action_type.value)
        
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
    
    return VehicleHistoryListResponse(
        total=total,
        items=items
    )


# ==================== 车辆租赁 API ====================

@app.get("/api/vehicles/{vehicle_id}/lease", response_model=VehicleLeaseResponse, tags=["车辆租赁"])
async def get_vehicle_lease(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取车辆租赁信息
    司机只能查看自己车辆的租赁信息，管理员可以查看所有
    """
    vehicle = session.get(crud.Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )
    
    # 权限控制：司机只能查看自己的车辆
    if current_user.role == UserRole.DRIVER and vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此车辆的租赁信息"
        )
    
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


@app.put("/api/vehicles/{vehicle_id}/lease", response_model=VehicleLeaseResponse, tags=["车辆租赁"])
async def update_vehicle_lease(
    vehicle_id: int,
    request: VehicleLeaseUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    更新车辆租赁信息
    司机只能更新自己车辆的租赁信息，管理员可以更新所有
    """
    vehicle = session.get(crud.Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )
    
    # 权限控制：司机只能更新自己的车辆
    if current_user.role == UserRole.DRIVER and vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权更新此车辆的租赁信息"
        )
    
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
    
    # 计算下一个缴纳日期和距离天数
    next_payment = crud.calculate_next_payment_date(
        updated.lease_start_date,
        updated.rent_payment_day
    )
    
    days_until = None
    if next_payment:
        days_until = (next_payment - date.today()).days
    
    # 计算租赁状态
    lease_status = None
    if updated.lease_start_date and updated.lease_end_date:
        today = date.today()
        if today < updated.lease_start_date:
            lease_status = "not_started"
        elif today > updated.lease_end_date:
            lease_status = "expired"
        else:
            lease_status = "active"
    
    return VehicleLeaseResponse(
        id=updated.id,
        license_plate=updated.license_plate,
        ownership_type=updated.ownership_type,
        lessor_name=updated.lessor_name,
        lessor_contact=updated.lessor_contact,
        lessee_name=updated.lessee_name,
        lessee_contact=updated.lessee_contact,
        monthly_rent=updated.monthly_rent,
        lease_start_date=updated.lease_start_date,
        lease_end_date=updated.lease_end_date,
        rent_payment_day=updated.rent_payment_day,
        next_payment_date=next_payment,
        days_until_payment=days_until,
        lease_status=lease_status
    )


@app.get("/api/vehicles/lease-reminders", response_model=List[VehicleLeaseReminderResponse], tags=["车辆租赁"])
async def get_lease_reminders(
    days_ahead: int = Query(7, ge=1, le=30, description="提前多少天提醒"),
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取租金提醒列表
    返回在指定天数内需要缴纳租金的车辆列表
    管理权限可访问：车队长、调度、老板、超级管理员
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

@app.put("/api/vehicles/{vehicle_id}/supplement-photo", response_model=SupplementedPhotosResponse, tags=["补录照片"])
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
    
    Returns:
        更新后的补录照片元数据
    """
    # 获取车辆
    vehicle = session.get(crud.Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )
    
    # 权限控制：司机只能补录自己车辆的照片，管理员可以补录所有
    if current_user.role == UserRole.DRIVER and vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权补录此车辆的照片"
        )
    
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


@app.get("/api/vehicles/{vehicle_id}/supplement-photos", response_model=SupplementedPhotosResponse, tags=["补录照片"])
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
    
    Returns:
        补录照片元数据字典
    """
    # 获取车辆
    vehicle = session.get(crud.Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="车辆不存在"
        )
    
    # 权限控制：司机只能查看自己车辆的补录信息，管理员可以查看所有
    if current_user.role == UserRole.DRIVER and vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此车辆的补录照片信息"
        )
    
    # 获取补录照片元数据
    supplemented_photos = crud.get_supplemented_photos(session, vehicle_id)
    
    return SupplementedPhotosResponse(
        vehicle_id=vehicle_id,
        supplemented_photos=supplemented_photos
    )


# ==================== 通知 API ====================

@app.get("/api/notifications", response_model=List[NotificationResponse], tags=["通知管理"])
async def get_notifications(
    is_read: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取当前用户的通知列表
    """
    notifications = crud.get_notifications(
        session,
        user_id=current_user.id,
        is_read=is_read,
        skip=skip,
        limit=limit
    )
    return notifications


@app.post("/api/notifications", response_model=MessageResponse, tags=["通知管理"])
async def create_notification(
    request: NotificationCreate,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    发送通知（管理权限可操作：车队长、调度、老板、超级管理员）
    """
    crud.create_notifications_batch(
        session,
        user_ids=request.user_ids,
        title=request.title,
        content=request.content,
        sender_id=current_user.id
    )
    
    return MessageResponse(message=f"通知已发送给 {len(request.user_ids)} 位用户")


@app.put("/api/notifications/{notification_id}/read", response_model=NotificationResponse, tags=["通知管理"])
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    标记通知为已读
    """
    notification = session.get(crud.Notification, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在"
        )
    
    # 权限控制：只能标记自己的通知
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权操作此通知"
        )
    
    updated = crud.mark_notification_as_read(session, notification)
    return updated


@app.get("/api/notifications/unread-count", response_model=UnreadCountResponse, tags=["通知管理"])
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取当前用户未读通知数量
    """
    count = crud.get_unread_count(session, current_user.id)
    return UnreadCountResponse(count=count)


# ==================== SSE 实时通知 ====================

# 存储活跃的 SSE 连接（用户ID -> 最后检查时间戳）
# 注意：生产环境应使用 Redis 等分布式存储
_active_connections: dict[int, float] = {}


async def notification_event_generator(user_id: int, last_id: int = 0):
    """
    SSE 事件生成器
    定期检查新通知并推送给客户端
    
    Args:
        user_id: 用户ID
        last_id: 上次接收的最后一条通知ID
        
    Yields:
        SSE 格式的事件数据
    """
    import time
    from database import engine
    
    # 记录连接
    _active_connections[user_id] = time.time()
    
    # 心跳间隔（秒）
    heartbeat_interval = 30
    # 检查新通知间隔（秒）
    check_interval = 5
    
    last_heartbeat = time.time()
    current_last_id = last_id
    
    try:
        while True:
            current_time = time.time()
            
            # 检查新通知
            with Session(engine) as session:
                # 获取新通知（ID 大于 last_id）
                new_notifications = crud.get_new_notifications(
                    session, 
                    user_id=user_id, 
                    after_id=current_last_id
                )
                
                if new_notifications:
                    # 更新最后ID
                    current_last_id = max(n.id for n in new_notifications)
                    
                    # 构建通知数据
                    notifications_data = [
                        {
                            "id": n.id,
                            "title": n.title,
                            "content": n.content,
                            "is_read": n.is_read,
                            "created_at": n.created_at.isoformat() if n.created_at else None
                        }
                        for n in new_notifications
                    ]
                    
                    # 发送新通知事件
                    yield f"event: notification\ndata: {json.dumps(notifications_data, ensure_ascii=False)}\n\n"
                
                # 获取未读数量
                unread_count = crud.get_unread_count(session, user_id)
            
            # 发送心跳（包含未读数量）
            if current_time - last_heartbeat >= heartbeat_interval:
                heartbeat_data = {
                    "type": "heartbeat",
                    "unread_count": unread_count,
                    "timestamp": current_time
                }
                yield f"event: heartbeat\ndata: {json.dumps(heartbeat_data)}\n\n"
                last_heartbeat = current_time
            
            # 更新活跃时间
            _active_connections[user_id] = current_time
            
            # 等待下次检查
            await asyncio.sleep(check_interval)
            
    except asyncio.CancelledError:
        # 连接被取消（客户端断开）
        pass
    finally:
        # 清理连接记录
        if user_id in _active_connections:
            del _active_connections[user_id]


@app.get("/api/notifications/stream", tags=["通知管理"])
async def notification_stream(
    request: Request,
    last_id: int = Query(0, ge=0, description="上次接收的最后一条通知ID"),
    token: Optional[str] = Query(None, description="JWT Token（用于 SSE 认证）")
):
    """
    SSE 实时通知推送接口
    
    客户端通过 EventSource 连接此接口，实时接收新通知
    
    事件类型：
    - notification: 新通知到达
    - heartbeat: 心跳包（包含未读数量）
    
    使用示例（前端）：
    ```javascript
    const eventSource = new EventSource('/api/notifications/stream?token=xxx&last_id=0');
    eventSource.addEventListener('notification', (e) => {
        const notifications = JSON.parse(e.data);
        console.log('新通知:', notifications);
    });
    eventSource.addEventListener('heartbeat', (e) => {
        const data = JSON.parse(e.data);
        console.log('未读数量:', data.unread_count);
    });
    ```
    """
    from auth import decode_token
    from database import engine
    
    # SSE 不支持 Authorization header，需要通过 query 参数传递 token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少认证 Token"
        )
    
    # 验证 Token
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的 Token"
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 验证失败"
        )
    
    # 验证用户存在
    with Session(engine) as session:
        user = crud.get_user_by_id(session, int(user_id))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在或已禁用"
            )
    
    # 返回 SSE 响应
    return StreamingResponse(
        notification_event_generator(int(user_id), last_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
        }
    )


@app.get("/api/notifications/sse-status", tags=["通知管理"])
async def get_sse_status(
    current_user: User = Depends(get_current_user)
):
    """
    获取 SSE 连接状态
    用于前端判断是否需要降级到轮询
    """
    import time
    
    is_connected = current_user.id in _active_connections
    last_active = _active_connections.get(current_user.id)
    
    return {
        "sse_supported": True,
        "is_connected": is_connected,
        "last_active": last_active,
        "connection_count": len(_active_connections)
    }


# ==================== 通知模板 API ====================

@app.get("/api/notification-templates", response_model=List[NotificationTemplateResponse], tags=["通知模板"])
async def get_notification_templates(
    category: Optional[str] = Query(None, description="按分类筛选"),
    is_active: Optional[bool] = Query(None, description="按启用状态筛选"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取通知模板列表
    所有登录用户可访问，用于选择模板发送通知
    """
    templates = crud.get_notification_templates(
        session,
        category=category,
        is_active=is_active,
        skip=skip,
        limit=limit
    )
    
    # 转换响应格式（解析 variables JSON）
    result = []
    for template in templates:
        variables = None
        if template.variables:
            try:
                variables = json.loads(template.variables)
            except json.JSONDecodeError:
                variables = None
        
        result.append(NotificationTemplateResponse(
            id=template.id,
            name=template.name,
            title=template.title,
            content=template.content,
            variables=variables,
            category=template.category,
            is_active=template.is_active,
            created_at=template.created_at,
            updated_at=template.updated_at
        ))
    
    return result


@app.post("/api/notification-templates", response_model=NotificationTemplateResponse, tags=["通知模板"])
async def create_notification_template(
    request: NotificationTemplateCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    创建通知模板（管理员级别可访问：调度、老板、超级管理员）
    
    模板支持变量占位符，格式为 {variable_name}
    例如：标题 "请假申请已{status}"，内容 "{user_name}的请假申请已{status}"
    """
    # 检查模板名称是否已存在
    existing = crud.get_notification_template_by_name(session, request.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="模板名称已存在"
        )
    
    template = crud.create_notification_template(
        session,
        name=request.name,
        title=request.title,
        content=request.content,
        variables=request.variables,
        category=request.category,
        is_active=request.is_active
    )
    
    # 解析 variables JSON
    variables = None
    if template.variables:
        try:
            variables = json.loads(template.variables)
        except json.JSONDecodeError:
            variables = None
    
    return NotificationTemplateResponse(
        id=template.id,
        name=template.name,
        title=template.title,
        content=template.content,
        variables=variables,
        category=template.category,
        is_active=template.is_active,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@app.get("/api/notification-templates/{template_id}", response_model=NotificationTemplateResponse, tags=["通知模板"])
async def get_notification_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取通知模板详情
    """
    template = crud.get_notification_template_by_id(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )
    
    # 解析 variables JSON
    variables = None
    if template.variables:
        try:
            variables = json.loads(template.variables)
        except json.JSONDecodeError:
            variables = None
    
    return NotificationTemplateResponse(
        id=template.id,
        name=template.name,
        title=template.title,
        content=template.content,
        variables=variables,
        category=template.category,
        is_active=template.is_active,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@app.put("/api/notification-templates/{template_id}", response_model=NotificationTemplateResponse, tags=["通知模板"])
async def update_notification_template(
    template_id: int,
    request: NotificationTemplateUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    更新通知模板（管理员级别可访问：调度、老板、超级管理员）
    """
    template = crud.get_notification_template_by_id(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )
    
    # 如果要更新名称，检查新名称是否已存在
    if request.name and request.name != template.name:
        existing = crud.get_notification_template_by_name(session, request.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="模板名称已存在"
            )
    
    updated = crud.update_notification_template(
        session, template,
        name=request.name,
        title=request.title,
        content=request.content,
        variables=request.variables,
        category=request.category,
        is_active=request.is_active
    )
    
    # 解析 variables JSON
    variables = None
    if updated.variables:
        try:
            variables = json.loads(updated.variables)
        except json.JSONDecodeError:
            variables = None
    
    return NotificationTemplateResponse(
        id=updated.id,
        name=updated.name,
        title=updated.title,
        content=updated.content,
        variables=variables,
        category=updated.category,
        is_active=updated.is_active,
        created_at=updated.created_at,
        updated_at=updated.updated_at
    )


@app.delete("/api/notification-templates/{template_id}", response_model=MessageResponse, tags=["通知模板"])
async def delete_notification_template(
    template_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    删除通知模板（管理员级别可访问：调度、老板、超级管理员）
    """
    template = crud.get_notification_template_by_id(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )
    
    crud.delete_notification_template(session, template)
    return MessageResponse(message="模板已删除")


@app.post("/api/notification-templates/{template_id}/preview", tags=["通知模板"])
async def preview_notification_template(
    template_id: int,
    variables: Optional[dict] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    预览通知模板渲染效果
    
    传入变量值，返回渲染后的标题和内容
    用于发送通知前预览效果
    """
    template = crud.get_notification_template_by_id(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )
    
    # 渲染模板
    title, content = crud.render_notification_template(template, variables)
    
    return {
        "template_id": template_id,
        "template_name": template.name,
        "rendered_title": title,
        "rendered_content": content,
        "variables_used": variables or {}
    }


@app.post("/api/notifications/from-template", response_model=MessageResponse, tags=["通知管理"])
async def create_notification_from_template(
    request: NotificationFromTemplateCreate,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    使用模板发送通知（管理权限可操作：车队长、调度、老板、超级管理员）
    
    通过模板ID和变量值创建通知，自动渲染模板内容
    """
    try:
        notifications = crud.create_notification_from_template(
            session,
            user_ids=request.user_ids,
            template_id=request.template_id,
            variables=request.variables,
            sender_id=current_user.id
        )
        
        return MessageResponse(message=f"通知已发送给 {len(notifications)} 位用户")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@app.get("/api/notification-templates/categories", tags=["通知模板"])
async def get_template_categories(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取所有模板分类
    
    返回系统中已有的模板分类列表，用于前端筛选
    """
    templates = crud.get_notification_templates(session)
    
    # 提取所有不重复的分类
    categories = set()
    for template in templates:
        if template.category:
            categories.add(template.category)
    
    # 分类显示名称映射
    category_names = {
        "attendance": "考勤",
        "leave": "请假",
        "vehicle": "车辆",
        "piece_work": "计件",
        "system": "系统"
    }
    
    return {
        "categories": [
            {
                "value": cat,
                "label": category_names.get(cat, cat)
            }
            for cat in sorted(categories)
        ]
    }


# ==================== OCR 识别 API ====================

@app.post("/api/ocr/driving-license", response_model=OCRDrivingLicenseResponse, tags=["OCR识别"])
async def recognize_driving_license(
    request: OCRDrivingLicenseRequest,
    current_user: User = Depends(get_current_user)
):
    """
    识别驾驶证
    
    上传驾驶证图片，返回识别结果
    支持 Base64 编码的图片数据或图片 URL
    
    识别字段包括：
    - 姓名、性别、国籍、住址
    - 出生日期、初次领证日期
    - 准驾车型、证号
    - 有效期限
    """
    from ocr import recognize_driving_license as ocr_recognize
    
    # 调用 OCR 识别
    result = await ocr_recognize(request.image)
    
    # 构建响应
    if result["success"]:
        return OCRDrivingLicenseResponse(
            success=True,
            data=OCRDrivingLicenseData(**result["data"]),
            error=None
        )
    else:
        return OCRDrivingLicenseResponse(
            success=False,
            data=None,
            error=result["error"]
        )


@app.get("/api/ocr/status", response_model=OCRStatusResponse, tags=["OCR识别"])
async def get_ocr_status(
    current_user: User = Depends(get_current_user)
):
    """
    获取 OCR 服务状态
    
    检查 OCR 服务是否已配置
    """
    from ocr import is_ocr_configured
    
    return OCRStatusResponse(
        configured=is_ocr_configured(),
        provider="baidu"
    )


# ==================== 超级管理员 API ====================

from auth import require_super_admin, require_boss_or_super, get_role_display_name, get_creatable_roles

@app.get("/api/admin/system-info", tags=["系统管理"])
async def get_system_info(
    current_user: User = Depends(require_super_admin),
    session: Session = Depends(get_session)
):
    """
    获取系统信息（仅超级管理员可访问）
    
    返回系统统计信息，包括用户数量、各角色数量等
    """
    # 统计各角色用户数量
    role_counts = {}
    for role in UserRole:
        count = len(crud.get_users(session, role=role))
        role_counts[role.value] = {
            "count": count,
            "display_name": get_role_display_name(role)
        }
    
    # 统计总用户数
    total_users = len(crud.get_users(session))
    active_users = len(crud.get_users(session, is_active=True))
    
    # 统计仓库数量
    total_warehouses = len(crud.get_warehouses(session))
    active_warehouses = len(crud.get_warehouses(session, is_active=True))
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "by_role": role_counts
        },
        "warehouses": {
            "total": total_warehouses,
            "active": active_warehouses
        },
        "version": "1.0.0"
    }


@app.get("/api/admin/roles", tags=["系统管理"])
async def get_available_roles(
    current_user: User = Depends(require_admin)
):
    """
    获取当前用户可创建的角色列表（管理员级别可访问）
    
    根据当前用户的角色返回可以创建的角色列表
    """
    creatable_roles = get_creatable_roles(current_user.role)
    
    return {
        "current_role": {
            "value": current_user.role.value,
            "display_name": get_role_display_name(current_user.role)
        },
        "creatable_roles": [
            {
                "value": role.value,
                "display_name": get_role_display_name(role)
            }
            for role in creatable_roles
        ]
    }


@app.post("/api/admin/reset-password/{user_id}", response_model=MessageResponse, tags=["系统管理"])
async def admin_reset_password(
    user_id: int,
    current_user: User = Depends(require_super_admin),
    session: Session = Depends(get_session)
):
    """
    重置用户密码（仅超级管理员可操作）
    
    将用户密码重置为默认密码 "123456"
    """
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 重置密码为默认密码
    crud.change_user_password(session, user, "123456")
    
    return MessageResponse(message=f"用户 {user.name} 的密码已重置为 123456")


@app.get("/api/admin/all-users", response_model=List[UserResponse], tags=["系统管理"])
async def get_all_users_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    current_user: User = Depends(require_super_admin),
    session: Session = Depends(get_session)
):
    """
    获取所有用户列表（仅超级管理员可访问）
    
    不受角色限制，可以查看所有用户包括其他超级管理员
    """
    users = crud.get_users(session, skip=skip, limit=limit)
    return users


# ==================== 定时通知 API ====================

@app.get("/api/scheduled-notifications", response_model=List[ScheduledNotificationResponse], tags=["定时通知"])
async def get_scheduled_notifications(
    status: Optional[ScheduledNotificationStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取定时通知列表（管理员级别可访问：调度、老板、超级管理员）
    
    Args:
        status: 按状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数
        
    Returns:
        List[ScheduledNotificationResponse]: 定时通知列表
    """
    scheduled_list = crud.get_scheduled_notifications(
        session,
        status=status,
        skip=skip,
        limit=limit
    )
    
    # 构建响应
    result = []
    for scheduled in scheduled_list:
        # 解析 JSON 字段
        import json
        target_user_ids = json.loads(scheduled.target_user_ids) if scheduled.target_user_ids else None
        target_roles = json.loads(scheduled.target_roles) if scheduled.target_roles else None
        variables = json.loads(scheduled.variables) if scheduled.variables else None
        weekdays = json.loads(scheduled.weekdays) if scheduled.weekdays else None
        
        # 获取模板名称
        template_name = None
        if scheduled.template_id:
            template = crud.get_notification_template_by_id(session, scheduled.template_id)
            if template:
                template_name = template.name
        
        # 获取创建者姓名
        creator_name = None
        if scheduled.creator_id:
            creator = crud.get_user_by_id(session, scheduled.creator_id)
            if creator:
                creator_name = creator.name
        
        # 计算目标用户数量
        target_user_count = crud.get_target_user_count(session, target_user_ids, target_roles)
        
        result.append(ScheduledNotificationResponse(
            id=scheduled.id,
            name=scheduled.name,
            template_id=scheduled.template_id,
            template_name=template_name,
            title=scheduled.title,
            content=scheduled.content,
            variables=variables,
            target_user_ids=target_user_ids,
            target_roles=target_roles,
            target_user_count=target_user_count,
            scheduled_time=scheduled.scheduled_time,
            repeat_type=scheduled.repeat_type.value,
            repeat_interval=scheduled.repeat_interval,
            repeat_end_date=scheduled.repeat_end_date,
            weekdays=weekdays,
            monthly_day=scheduled.monthly_day,
            status=scheduled.status.value,
            last_executed_at=scheduled.last_executed_at,
            next_execute_at=scheduled.next_execute_at,
            execution_count=scheduled.execution_count,
            creator_id=scheduled.creator_id,
            creator_name=creator_name,
            created_at=scheduled.created_at,
            updated_at=scheduled.updated_at
        ))
    
    return result


@app.post("/api/scheduled-notifications", response_model=ScheduledNotificationResponse, tags=["定时通知"])
async def create_scheduled_notification(
    request: ScheduledNotificationCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    创建定时通知（管理员级别可访问：调度、老板、超级管理员）
    
    Args:
        request: 创建定时通知请求
        
    Returns:
        ScheduledNotificationResponse: 创建的定时通知
    """
    import json
    from models import RepeatType
    
    # 验证：必须指定模板或标题
    if not request.template_id and not request.title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="必须指定模板ID或通知标题"
        )
    
    # 验证：必须指定目标用户
    if not request.target_user_ids and not request.target_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="必须指定目标用户ID或目标角色"
        )
    
    # 验证模板是否存在
    if request.template_id:
        template = crud.get_notification_template_by_id(session, request.template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="模板不存在"
            )
        if not template.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="模板已禁用"
            )
    
    # 创建定时通知
    scheduled = crud.create_scheduled_notification(
        session,
        name=request.name,
        scheduled_time=request.scheduled_time,
        template_id=request.template_id,
        title=request.title,
        content=request.content,
        variables=request.variables,
        target_user_ids=request.target_user_ids,
        target_roles=request.target_roles,
        repeat_type=RepeatType(request.repeat_type.value),
        repeat_interval=request.repeat_interval,
        repeat_end_date=request.repeat_end_date,
        weekdays=request.weekdays,
        monthly_day=request.monthly_day,
        creator_id=current_user.id
    )
    
    # 解析 JSON 字段用于响应
    target_user_ids = json.loads(scheduled.target_user_ids) if scheduled.target_user_ids else None
    target_roles = json.loads(scheduled.target_roles) if scheduled.target_roles else None
    variables = json.loads(scheduled.variables) if scheduled.variables else None
    weekdays = json.loads(scheduled.weekdays) if scheduled.weekdays else None
    
    # 获取模板名称
    template_name = None
    if scheduled.template_id:
        template = crud.get_notification_template_by_id(session, scheduled.template_id)
        if template:
            template_name = template.name
    
    # 计算目标用户数量
    target_user_count = crud.get_target_user_count(session, target_user_ids, target_roles)
    
    return ScheduledNotificationResponse(
        id=scheduled.id,
        name=scheduled.name,
        template_id=scheduled.template_id,
        template_name=template_name,
        title=scheduled.title,
        content=scheduled.content,
        variables=variables,
        target_user_ids=target_user_ids,
        target_roles=target_roles,
        target_user_count=target_user_count,
        scheduled_time=scheduled.scheduled_time,
        repeat_type=scheduled.repeat_type.value,
        repeat_interval=scheduled.repeat_interval,
        repeat_end_date=scheduled.repeat_end_date,
        weekdays=weekdays,
        monthly_day=scheduled.monthly_day,
        status=scheduled.status.value,
        last_executed_at=scheduled.last_executed_at,
        next_execute_at=scheduled.next_execute_at,
        execution_count=scheduled.execution_count,
        creator_id=scheduled.creator_id,
        creator_name=current_user.name,
        created_at=scheduled.created_at,
        updated_at=scheduled.updated_at
    )


@app.get("/api/scheduled-notifications/{scheduled_id}", response_model=ScheduledNotificationResponse, tags=["定时通知"])
async def get_scheduled_notification(
    scheduled_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取定时通知详情（管理员级别可访问：调度、老板、超级管理员）
    
    Args:
        scheduled_id: 定时通知ID
        
    Returns:
        ScheduledNotificationResponse: 定时通知详情
    """
    import json
    
    scheduled = crud.get_scheduled_notification_by_id(session, scheduled_id)
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="定时通知不存在"
        )
    
    # 解析 JSON 字段
    target_user_ids = json.loads(scheduled.target_user_ids) if scheduled.target_user_ids else None
    target_roles = json.loads(scheduled.target_roles) if scheduled.target_roles else None
    variables = json.loads(scheduled.variables) if scheduled.variables else None
    weekdays = json.loads(scheduled.weekdays) if scheduled.weekdays else None
    
    # 获取模板名称
    template_name = None
    if scheduled.template_id:
        template = crud.get_notification_template_by_id(session, scheduled.template_id)
        if template:
            template_name = template.name
    
    # 获取创建者姓名
    creator_name = None
    if scheduled.creator_id:
        creator = crud.get_user_by_id(session, scheduled.creator_id)
        if creator:
            creator_name = creator.name
    
    # 计算目标用户数量
    target_user_count = crud.get_target_user_count(session, target_user_ids, target_roles)
    
    return ScheduledNotificationResponse(
        id=scheduled.id,
        name=scheduled.name,
        template_id=scheduled.template_id,
        template_name=template_name,
        title=scheduled.title,
        content=scheduled.content,
        variables=variables,
        target_user_ids=target_user_ids,
        target_roles=target_roles,
        target_user_count=target_user_count,
        scheduled_time=scheduled.scheduled_time,
        repeat_type=scheduled.repeat_type.value,
        repeat_interval=scheduled.repeat_interval,
        repeat_end_date=scheduled.repeat_end_date,
        weekdays=weekdays,
        monthly_day=scheduled.monthly_day,
        status=scheduled.status.value,
        last_executed_at=scheduled.last_executed_at,
        next_execute_at=scheduled.next_execute_at,
        execution_count=scheduled.execution_count,
        creator_id=scheduled.creator_id,
        creator_name=creator_name,
        created_at=scheduled.created_at,
        updated_at=scheduled.updated_at
    )


@app.put("/api/scheduled-notifications/{scheduled_id}", response_model=ScheduledNotificationResponse, tags=["定时通知"])
async def update_scheduled_notification(
    scheduled_id: int,
    request: ScheduledNotificationUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    更新定时通知（管理员级别可访问：调度、老板、超级管理员）
    
    Args:
        scheduled_id: 定时通知ID
        request: 更新定时通知请求
        
    Returns:
        ScheduledNotificationResponse: 更新后的定时通知
    """
    import json
    from models import RepeatType
    
    scheduled = crud.get_scheduled_notification_by_id(session, scheduled_id)
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="定时通知不存在"
        )
    
    # 验证模板是否存在
    if request.template_id:
        template = crud.get_notification_template_by_id(session, request.template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="模板不存在"
            )
        if not template.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="模板已禁用"
            )
    
    # 转换重复类型
    repeat_type = None
    if request.repeat_type:
        repeat_type = RepeatType(request.repeat_type.value)
    
    # 转换状态
    update_status = None
    if request.status:
        update_status = ScheduledNotificationStatus(request.status.value)
    
    # 更新定时通知
    updated = crud.update_scheduled_notification(
        session, scheduled,
        name=request.name,
        template_id=request.template_id,
        title=request.title,
        content=request.content,
        variables=request.variables,
        target_user_ids=request.target_user_ids,
        target_roles=request.target_roles,
        scheduled_time=request.scheduled_time,
        repeat_type=repeat_type,
        repeat_interval=request.repeat_interval,
        repeat_end_date=request.repeat_end_date,
        weekdays=request.weekdays,
        monthly_day=request.monthly_day,
        status=update_status
    )
    
    # 解析 JSON 字段用于响应
    target_user_ids = json.loads(updated.target_user_ids) if updated.target_user_ids else None
    target_roles = json.loads(updated.target_roles) if updated.target_roles else None
    variables = json.loads(updated.variables) if updated.variables else None
    weekdays = json.loads(updated.weekdays) if updated.weekdays else None
    
    # 获取模板名称
    template_name = None
    if updated.template_id:
        template = crud.get_notification_template_by_id(session, updated.template_id)
        if template:
            template_name = template.name
    
    # 获取创建者姓名
    creator_name = None
    if updated.creator_id:
        creator = crud.get_user_by_id(session, updated.creator_id)
        if creator:
            creator_name = creator.name
    
    # 计算目标用户数量
    target_user_count = crud.get_target_user_count(session, target_user_ids, target_roles)
    
    return ScheduledNotificationResponse(
        id=updated.id,
        name=updated.name,
        template_id=updated.template_id,
        template_name=template_name,
        title=updated.title,
        content=updated.content,
        variables=variables,
        target_user_ids=target_user_ids,
        target_roles=target_roles,
        target_user_count=target_user_count,
        scheduled_time=updated.scheduled_time,
        repeat_type=updated.repeat_type.value,
        repeat_interval=updated.repeat_interval,
        repeat_end_date=updated.repeat_end_date,
        weekdays=weekdays,
        monthly_day=updated.monthly_day,
        status=updated.status.value,
        last_executed_at=updated.last_executed_at,
        next_execute_at=updated.next_execute_at,
        execution_count=updated.execution_count,
        creator_id=updated.creator_id,
        creator_name=creator_name,
        created_at=updated.created_at,
        updated_at=updated.updated_at
    )


@app.delete("/api/scheduled-notifications/{scheduled_id}", response_model=MessageResponse, tags=["定时通知"])
async def delete_scheduled_notification(
    scheduled_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    删除定时通知（管理员级别可访问：调度、老板、超级管理员）
    
    Args:
        scheduled_id: 定时通知ID
        
    Returns:
        MessageResponse: 删除成功消息
    """
    scheduled = crud.get_scheduled_notification_by_id(session, scheduled_id)
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="定时通知不存在"
        )
    
    crud.delete_scheduled_notification(session, scheduled)
    return MessageResponse(message="定时通知已删除")


@app.post("/api/scheduled-notifications/{scheduled_id}/cancel", response_model=ScheduledNotificationResponse, tags=["定时通知"])
async def cancel_scheduled_notification(
    scheduled_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    取消定时通知（管理员级别可访问：调度、老板、超级管理员）
    
    Args:
        scheduled_id: 定时通知ID
        
    Returns:
        ScheduledNotificationResponse: 取消后的定时通知
    """
    import json
    
    scheduled = crud.get_scheduled_notification_by_id(session, scheduled_id)
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="定时通知不存在"
        )
    
    # 检查状态
    if scheduled.status in [ScheduledNotificationStatus.COMPLETED, ScheduledNotificationStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该定时通知已完成或已取消"
        )
    
    # 取消定时通知
    cancelled = crud.cancel_scheduled_notification(session, scheduled)
    
    # 解析 JSON 字段用于响应
    target_user_ids = json.loads(cancelled.target_user_ids) if cancelled.target_user_ids else None
    target_roles = json.loads(cancelled.target_roles) if cancelled.target_roles else None
    variables = json.loads(cancelled.variables) if cancelled.variables else None
    weekdays = json.loads(cancelled.weekdays) if cancelled.weekdays else None
    
    # 获取模板名称
    template_name = None
    if cancelled.template_id:
        template = crud.get_notification_template_by_id(session, cancelled.template_id)
        if template:
            template_name = template.name
    
    # 获取创建者姓名
    creator_name = None
    if cancelled.creator_id:
        creator = crud.get_user_by_id(session, cancelled.creator_id)
        if creator:
            creator_name = creator.name
    
    # 计算目标用户数量
    target_user_count = crud.get_target_user_count(session, target_user_ids, target_roles)
    
    return ScheduledNotificationResponse(
        id=cancelled.id,
        name=cancelled.name,
        template_id=cancelled.template_id,
        template_name=template_name,
        title=cancelled.title,
        content=cancelled.content,
        variables=variables,
        target_user_ids=target_user_ids,
        target_roles=target_roles,
        target_user_count=target_user_count,
        scheduled_time=cancelled.scheduled_time,
        repeat_type=cancelled.repeat_type.value,
        repeat_interval=cancelled.repeat_interval,
        repeat_end_date=cancelled.repeat_end_date,
        weekdays=weekdays,
        monthly_day=cancelled.monthly_day,
        status=cancelled.status.value,
        last_executed_at=cancelled.last_executed_at,
        next_execute_at=cancelled.next_execute_at,
        execution_count=cancelled.execution_count,
        creator_id=cancelled.creator_id,
        creator_name=creator_name,
        created_at=cancelled.created_at,
        updated_at=cancelled.updated_at
    )


@app.post("/api/scheduled-notifications/{scheduled_id}/execute", response_model=MessageResponse, tags=["定时通知"])
async def execute_scheduled_notification(
    scheduled_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    手动执行定时通知（管理员级别可访问：调度、老板、超级管理员）
    立即执行一个定时通知任务，不影响其定时计划
    
    Args:
        scheduled_id: 定时通知ID
        
    Returns:
        MessageResponse: 执行结果消息
    """
    scheduled = crud.get_scheduled_notification_by_id(session, scheduled_id)
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="定时通知不存在"
        )
    
    # 检查状态
    if scheduled.status == ScheduledNotificationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该定时通知已取消"
        )
    
    # 执行定时通知
    notifications = crud.execute_scheduled_notification(session, scheduled)
    
    return MessageResponse(message=f"已发送 {len(notifications)} 条通知")


@app.get("/api/scheduled-notifications/scheduler/status", response_model=SchedulerStatusResponse, tags=["定时通知"])
async def get_scheduler_status(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取调度器状态（管理员级别可访问：调度、老板、超级管理员）
    
    Returns:
        SchedulerStatusResponse: 调度器状态信息
    """
    status_info = crud.get_scheduler_status(session)
    
    # 使用实际的调度器状态
    return SchedulerStatusResponse(
        is_running=is_scheduler_running(),
        pending_tasks=status_info["pending_tasks"],
        active_tasks=status_info["active_tasks"],
        next_execution=status_info["next_execution"]
    )


@app.post("/api/scheduled-notifications/scheduler/trigger", response_model=MessageResponse, tags=["定时通知"])
async def trigger_scheduler_check(
    current_user: User = Depends(require_admin)
):
    """
    手动触发调度器检查（管理员级别可访问：调度、老板、超级管理员）
    立即检查并执行所有到期的定时通知
    
    Returns:
        MessageResponse: 触发结果消息
    """
    from scheduler import trigger_immediate_check
    
    await trigger_immediate_check()
    return MessageResponse(message="已触发调度器检查")


@app.post("/api/scheduled-notifications/scheduler/start", response_model=MessageResponse, tags=["定时通知"])
async def start_scheduler_endpoint(
    current_user: User = Depends(require_admin)
):
    """
    启动调度器（管理员级别可访问：调度、老板、超级管理员）
    
    Returns:
        MessageResponse: 启动结果消息
    """
    if is_scheduler_running():
        return MessageResponse(message="调度器已在运行中")
    
    start_scheduler()
    return MessageResponse(message="调度器已启动")


@app.post("/api/scheduled-notifications/scheduler/stop", response_model=MessageResponse, tags=["定时通知"])
async def stop_scheduler_endpoint(
    current_user: User = Depends(require_admin)
):
    """
    停止调度器（管理员级别可访问：调度、老板、超级管理员）
    
    Returns:
        MessageResponse: 停止结果消息
    """
    if not is_scheduler_running():
        return MessageResponse(message="调度器未运行")
    
    stop_scheduler()
    return MessageResponse(message="调度器已停止")


# ==================== 应用版本（热更新）API ====================

from schemas import (
    AppVersionCreate, AppVersionUpdate, AppVersionResponse,
    AppVersionCheckRequest, AppVersionCheckResponse,
    UpdateType as SchemaUpdateType
)
from models import AppVersion, UpdateType


@app.get("/api/app-versions", response_model=List[AppVersionResponse], tags=["应用版本"])
async def get_app_versions(
    platform: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取应用版本列表（管理员级别可访问：调度、老板、超级管理员）
    """
    versions = crud.get_app_versions(
        session,
        platform=platform,
        is_active=is_active,
        skip=skip,
        limit=limit
    )
    
    # 构建响应
    result = []
    for v in versions:
        creator = crud.get_user_by_id(session, v.creator_id) if v.creator_id else None
        result.append(AppVersionResponse(
            id=v.id,
            version=v.version,
            version_code=v.version_code,
            update_type=v.update_type.value,
            title=v.title,
            description=v.description,
            download_url=v.download_url,
            file_size=v.file_size,
            file_hash=v.file_hash,
            min_version=v.min_version,
            platform=v.platform,
            is_active=v.is_active,
            publish_time=v.publish_time,
            created_at=v.created_at,
            updated_at=v.updated_at,
            creator_id=v.creator_id,
            creator_name=creator.name if creator else None
        ))
    
    return result


@app.post("/api/app-versions", response_model=AppVersionResponse, tags=["应用版本"])
async def create_app_version(
    request: AppVersionCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    发布新版本（管理员级别可访问：调度、老板、超级管理员）
    """
    # 检查版本号是否已存在
    existing = crud.get_app_version_by_version(session, request.version)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"版本号 {request.version} 已存在"
        )
    
    # 转换更新类型
    update_type = UpdateType(request.update_type.value)
    
    version = crud.create_app_version(
        session,
        version=request.version,
        version_code=request.version_code,
        title=request.title,
        update_type=update_type,
        description=request.description,
        download_url=request.download_url,
        file_size=request.file_size,
        file_hash=request.file_hash,
        min_version=request.min_version,
        platform=request.platform,
        is_active=request.is_active,
        publish_time=request.publish_time,
        creator_id=current_user.id
    )
    
    return AppVersionResponse(
        id=version.id,
        version=version.version,
        version_code=version.version_code,
        update_type=version.update_type.value,
        title=version.title,
        description=version.description,
        download_url=version.download_url,
        file_size=version.file_size,
        file_hash=version.file_hash,
        min_version=version.min_version,
        platform=version.platform,
        is_active=version.is_active,
        publish_time=version.publish_time,
        created_at=version.created_at,
        updated_at=version.updated_at,
        creator_id=version.creator_id,
        creator_name=current_user.name
    )


@app.get("/api/app-versions/latest", response_model=AppVersionResponse, tags=["应用版本"])
async def get_latest_app_version(
    platform: str = Query("all", description="平台类型"),
    session: Session = Depends(get_session)
):
    """
    获取最新版本（公开接口，无需认证）
    """
    version = crud.get_latest_app_version(session, platform)
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="暂无可用版本"
        )
    
    creator = crud.get_user_by_id(session, version.creator_id) if version.creator_id else None
    
    return AppVersionResponse(
        id=version.id,
        version=version.version,
        version_code=version.version_code,
        update_type=version.update_type.value,
        title=version.title,
        description=version.description,
        download_url=version.download_url,
        file_size=version.file_size,
        file_hash=version.file_hash,
        min_version=version.min_version,
        platform=version.platform,
        is_active=version.is_active,
        publish_time=version.publish_time,
        created_at=version.created_at,
        updated_at=version.updated_at,
        creator_id=version.creator_id,
        creator_name=creator.name if creator else None
    )


@app.post("/api/app-versions/check", response_model=AppVersionCheckResponse, tags=["应用版本"])
async def check_app_update(
    request: AppVersionCheckRequest,
    session: Session = Depends(get_session)
):
    """
    检查更新（公开接口，无需认证）
    客户端调用此接口检查是否有新版本
    """
    result = crud.check_app_update(
        session,
        current_version=request.current_version,
        current_version_code=request.current_version_code,
        platform=request.platform
    )
    
    return AppVersionCheckResponse(**result)


@app.get("/api/app-versions/{version_id}", response_model=AppVersionResponse, tags=["应用版本"])
async def get_app_version(
    version_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取版本详情（管理员级别可访问：调度、老板、超级管理员）
    """
    version = crud.get_app_version_by_id(session, version_id)
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    
    creator = crud.get_user_by_id(session, version.creator_id) if version.creator_id else None
    
    return AppVersionResponse(
        id=version.id,
        version=version.version,
        version_code=version.version_code,
        update_type=version.update_type.value,
        title=version.title,
        description=version.description,
        download_url=version.download_url,
        file_size=version.file_size,
        file_hash=version.file_hash,
        min_version=version.min_version,
        platform=version.platform,
        is_active=version.is_active,
        publish_time=version.publish_time,
        created_at=version.created_at,
        updated_at=version.updated_at,
        creator_id=version.creator_id,
        creator_name=creator.name if creator else None
    )


@app.put("/api/app-versions/{version_id}", response_model=AppVersionResponse, tags=["应用版本"])
async def update_app_version(
    version_id: int,
    request: AppVersionUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    更新版本信息（管理员级别可访问：调度、老板、超级管理员）
    """
    version = crud.get_app_version_by_id(session, version_id)
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    
    # 检查版本号是否重复
    if request.version and request.version != version.version:
        existing = crud.get_app_version_by_version(session, request.version)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"版本号 {request.version} 已存在"
            )
    
    # 转换更新类型
    update_type = None
    if request.update_type:
        update_type = UpdateType(request.update_type.value)
    
    updated = crud.update_app_version(
        session,
        version,
        version=request.version,
        version_code=request.version_code,
        update_type=update_type,
        title=request.title,
        description=request.description,
        download_url=request.download_url,
        file_size=request.file_size,
        file_hash=request.file_hash,
        min_version=request.min_version,
        platform=request.platform,
        is_active=request.is_active,
        publish_time=request.publish_time
    )
    
    creator = crud.get_user_by_id(session, updated.creator_id) if updated.creator_id else None
    
    return AppVersionResponse(
        id=updated.id,
        version=updated.version,
        version_code=updated.version_code,
        update_type=updated.update_type.value,
        title=updated.title,
        description=updated.description,
        download_url=updated.download_url,
        file_size=updated.file_size,
        file_hash=updated.file_hash,
        min_version=updated.min_version,
        platform=updated.platform,
        is_active=updated.is_active,
        publish_time=updated.publish_time,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        creator_id=updated.creator_id,
        creator_name=creator.name if creator else None
    )


@app.delete("/api/app-versions/{version_id}", response_model=MessageResponse, tags=["应用版本"])
async def delete_app_version(
    version_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    删除版本（管理员级别可访问：调度、老板、超级管理员）
    """
    version = crud.get_app_version_by_id(session, version_id)
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    
    crud.delete_app_version(session, version)
    return MessageResponse(message="版本已删除")


# ==================== 图片上传 API ====================

import uuid

# 图片存储配置
UPLOAD_DIR = Path("uploads/images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 支持的图片格式
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
# 最大文件大小（10MB）
MAX_FILE_SIZE = 10 * 1024 * 1024


def get_file_extension(filename: str) -> str:
    """
    获取文件扩展名（小写）
    
    Args:
        filename: 文件名
        
    Returns:
        str: 小写的文件扩展名，如 ".jpg"
    """
    return Path(filename).suffix.lower()


def generate_unique_filename(original_filename: str) -> str:
    """
    生成唯一的文件名
    使用 UUID 和原始扩展名组合
    
    Args:
        original_filename: 原始文件名
        
    Returns:
        str: 唯一的文件名
    """
    ext = get_file_extension(original_filename)
    unique_id = uuid.uuid4().hex[:16]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"{timestamp}_{unique_id}{ext}"


@app.post("/api/upload/image", response_model=ImageUploadResponse, tags=["图片上传"])
async def upload_image(
    file: UploadFile = File(..., description="图片文件"),
    category: str = Query("vehicle", description="图片分类（vehicle/document/other）"),
    current_user: User = Depends(get_current_user)
):
    """
    上传图片文件
    
    接收图片文件，验证格式和大小，保存到本地文件系统，返回访问 URL
    
    支持的图片格式：jpg, jpeg, png, webp
    最大文件大小：10MB
    
    Args:
        file: 上传的图片文件
        category: 图片分类，用于组织存储目录
        current_user: 当前登录用户
        
    Returns:
        ImageUploadResponse: 包含图片访问 URL、文件名、大小等信息
        
    Raises:
        HTTPException 400: 图片格式不支持或文件大小超过限制
        HTTPException 401: 用户未登录
    """
    # 验证文件扩展名 (Requirement 6.3)
    ext = get_file_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的图片格式。支持的格式：{', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 读取文件内容
    content = await file.read()
    file_size = len(content)
    
    # 验证文件大小 (Requirement 6.4)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"图片大小超过限制（最大 {MAX_FILE_SIZE // (1024 * 1024)}MB）"
        )
    
    # 验证文件内容是否为有效图片（通过检查文件头）
    if not is_valid_image_content(content, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件内容不是有效的图片"
        )
    
    # 生成唯一文件名
    unique_filename = generate_unique_filename(file.filename or "image.jpg")
    
    # 创建分类目录
    category_dir = UPLOAD_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)
    
    # 保存文件
    file_path = category_dir / unique_filename
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 构建访问 URL (Requirement 6.2)
    # URL 格式：/uploads/images/{category}/{filename}
    url = f"/uploads/images/{category}/{unique_filename}"
    
    return ImageUploadResponse(
        success=True,
        url=url,
        filename=unique_filename,
        size=file_size
    )


def is_valid_image_content(content: bytes, ext: str) -> bool:
    """
    验证文件内容是否为有效的图片
    通过检查文件头（magic bytes）来验证
    
    Args:
        content: 文件内容
        ext: 文件扩展名
        
    Returns:
        bool: 是否为有效图片
    """
    if len(content) < 8:
        return False
    
    # JPEG: FF D8 FF
    if ext in [".jpg", ".jpeg"]:
        return content[:3] == b'\xff\xd8\xff'
    
    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if ext == ".png":
        return content[:8] == b'\x89PNG\r\n\x1a\n'
    
    # WebP: RIFF....WEBP
    if ext == ".webp":
        return content[:4] == b'RIFF' and content[8:12] == b'WEBP'
    
    return False


# 挂载静态文件服务（用于访问上传的图片）
# 注意：这行代码需要在所有路由定义之后执行
# 在应用启动时会自动挂载


# ==================== 健康检查 ====================

@app.get("/api/health", tags=["系统"])
async def health_check(session: Session = Depends(get_session)):
    """
    健康检查接口
    用于监控服务是否正常运行
    检查数据库连接状态
    
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
