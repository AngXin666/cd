"""
路由模块包
将 main.py 中的路由拆分为独立模块，提升代码可维护性

模块说明：
- auth.py: 认证路由（登录、获取当前用户、修改密码）
- users.py: 用户管理路由
- warehouses.py: 仓库管理路由
- attendance.py: 考勤打卡路由
- piece_work.py: 计件功能路由
- leave.py: 请假审批路由
- vehicles.py: 车辆管理路由
- notifications.py: 通知系统路由（通知管理、SSE 推送）
- ocr.py: OCR 识别路由（驾驶证、行驶证识别）
- upload.py: 图片上传路由（车辆照片、证件照片、头像）
- admin.py: 系统管理路由（超级管理员、权限配置）
- app_version.py: 应用版本管理路由（版本检查、发布、历史）

Requirements: 9.1 - 创建 routers/ 目录包含各功能模块路由
"""

# 导入所有路由模块，便于在 main.py 中统一注册
from .auth import router as auth_router
from .users import router as users_router
from .warehouses import router as warehouses_router
from .attendance import router as attendance_router
from .piece_work import router as piece_work_router
from .leave import router as leave_router
from .vehicles import router as vehicles_router
from .notifications import router as notifications_router
from .ocr import router as ocr_router
from .upload import router as upload_router
from .admin import router as admin_router
from .app_version import router as app_version_router
from .report import router as report_router

# 导出所有路由器
__all__ = [
    "auth_router",
    "users_router",
    "warehouses_router",
    "attendance_router",
    "piece_work_router",
    "leave_router",
    "vehicles_router",
    "notifications_router",
    "ocr_router",
    "upload_router",
    "admin_router",
    "app_version_router",
    "report_router",
]
