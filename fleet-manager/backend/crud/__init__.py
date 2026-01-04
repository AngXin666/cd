"""
CRUD 操作模块
实现数据库的增删改查操作
包含用户、仓库、考勤、计件、请假、车辆、通知等模块的 CRUD

重构说明：
- 原 crud.py (2554 行) 按功能拆分为多个子模块
- 所有函数通过此 __init__.py 统一导出，保持向后兼容
"""

# 用户相关 CRUD（基础模块，无依赖）
from crud.users import (
    create_user,
    get_user_by_id,
    get_user_by_username,
    get_users,
    update_user,
    delete_user,
    change_user_password,
)

# 仓库相关 CRUD（基础模块，无依赖）
from crud.warehouses import (
    create_warehouse,
    get_warehouse_by_id,
    get_warehouses,
    update_warehouse,
    delete_warehouse,
    assign_users_to_warehouse,
    get_user_warehouses,
    get_warehouse_users,
    assign_warehouses_to_user,
)

# 考勤相关 CRUD
from crud.attendance import (
    clock_in,
    clock_out,
    get_today_attendance,
    get_attendance_records,
)

# 计件相关 CRUD（依赖 warehouses）
from crud.piece_work import (
    create_piece_work_category,
    get_piece_work_categories,
    update_piece_work_category,
    delete_piece_work_category,
    get_piece_work_category_by_id,
    create_piece_work_record,
    get_piece_work_records,
    get_piece_work_stats,
    update_piece_work_record,
    delete_piece_work_record,
)

# 请假相关 CRUD
from crud.leave import (
    create_leave_application,
    get_leave_applications,
    approve_leave_application,
)

# 车辆相关 CRUD
from crud.vehicles import (
    create_vehicle,
    create_vehicle_with_params,
    get_vehicles,
    get_all_vehicles,
    get_warehouse_vehicles,
    update_vehicle,
    update_vehicle_lease,
    get_vehicle_lease_info,
    get_vehicles_with_lease_reminders,
    calculate_next_payment_date,
    review_vehicle,
    create_vehicle_document,
    get_or_create_vehicle_document,
    supplement_vehicle_photo,
    get_supplemented_photos,
    clear_supplemented_photo,
)

# 驾驶证相关 CRUD
from crud.driver_license import (
    get_driver_license_by_user_id,
    create_driver_license,
    update_driver_license,
    create_or_update_driver_license,
)

# 通知相关 CRUD（依赖 users, warehouses）
from crud.notifications import (
    create_notification,
    create_notifications_batch,
    notify_admins,
    get_managers_for_user,
    create_approval_notification,
    complete_approval,
    get_notifications,
    mark_notification_as_read,
    get_unread_count,
    get_new_notifications,
)

# 初始化数据（依赖 users, piece_work）
from crud.init_data import init_default_data

# 导出所有函数（保持向后兼容）
__all__ = [
    # 用户
    'create_user', 'get_user_by_id', 'get_user_by_username', 'get_users',
    'update_user', 'delete_user', 'change_user_password',
    # 仓库
    'create_warehouse', 'get_warehouse_by_id', 'get_warehouses',
    'update_warehouse', 'delete_warehouse', 'assign_users_to_warehouse',
    'get_user_warehouses', 'get_warehouse_users', 'assign_warehouses_to_user',
    # 考勤
    'clock_in', 'clock_out', 'get_today_attendance', 'get_attendance_records',
    # 计件
    'create_piece_work_category', 'get_piece_work_categories',
    'update_piece_work_category', 'delete_piece_work_category',
    'get_piece_work_category_by_id', 'create_piece_work_record',
    'get_piece_work_records', 'get_piece_work_stats',
    'update_piece_work_record', 'delete_piece_work_record',
    # 请假
    'create_leave_application', 'get_leave_applications', 'approve_leave_application',
    # 车辆
    'create_vehicle', 'create_vehicle_with_params', 'get_vehicles',
    'get_all_vehicles', 'get_warehouse_vehicles', 'update_vehicle',
    'update_vehicle_lease', 'get_vehicle_lease_info',
    'get_vehicles_with_lease_reminders', 'calculate_next_payment_date',
    'review_vehicle', 'create_vehicle_document', 'get_or_create_vehicle_document',
    'supplement_vehicle_photo', 'get_supplemented_photos', 'clear_supplemented_photo',
    # 通知
    'create_notification', 'create_notifications_batch', 'notify_admins',
    'get_managers_for_user', 'create_approval_notification', 'complete_approval',
    'get_notifications', 'mark_notification_as_read', 'get_unread_count',
    'get_new_notifications',
    # 驾驶证
    'get_driver_license_by_user_id', 'create_driver_license',
    'update_driver_license', 'create_or_update_driver_license',
    # 初始化
    'init_default_data',
]
