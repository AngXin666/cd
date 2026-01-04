# 设计文档：通知系统重构

## 概述

本设计文档描述通知系统重构的技术实现方案，包括需要删除的代码、新增的模型字段和函数。

## 1. 需要删除的代码

### 1.1 模型层 (models.py)

删除以下模型：
- `NotificationTemplate` 类（约 30 行）
- `ScheduledNotification` 类（约 40 行）
- 相关枚举：`RepeatType`、`ScheduledNotificationStatus`（在 enums.py 中）

保留 `Notification` 模型并扩展。

### 1.2 CRUD 层 (crud.py)

删除以下函数（约 600 行）：

**通知模板相关：**
- `create_notification_template()`
- `get_notification_template_by_id()`
- `get_notification_template_by_name()`
- `get_notification_templates()`
- `update_notification_template()`
- `delete_notification_template()`
- `render_notification_template()`
- `create_notification_from_template()`
- `init_default_notification_templates()`

**定时通知相关：**
- `create_scheduled_notification()`
- `create_scheduled_notification_with_params()`
- `get_scheduled_notification_by_id()`
- `get_scheduled_notifications()`
- `get_pending_scheduled_notifications()`
- `update_scheduled_notification()`
- `update_scheduled_notification_with_params()`
- `delete_scheduled_notification()`
- `cancel_scheduled_notification()`
- `calculate_next_execute_time()`
- `execute_scheduled_notification()`
- `get_target_user_count()`
- `get_scheduler_status()`
- 所有 `_calculate_*_next_time()` 辅助函数

**初始化函数修改：**
- `init_default_data()` 中删除模板初始化调用

### 1.3 路由层 (routers/)

**删除整个文件：**
- `routers/scheduled.py`（约 400 行）

**修改 notifications.py，删除以下端点（约 350 行）：**
- `POST /api/notifications/from-template`
- `GET /api/notification-templates`
- `POST /api/notification-templates`
- `GET /api/notification-templates/{id}`
- `PUT /api/notification-templates/{id}`
- `DELETE /api/notification-templates/{id}`
- `POST /api/notification-templates/{id}/preview`
- `GET /api/notification-templates/categories`

### 1.4 调度器模块

**删除整个文件：**
- `scheduler.py`（约 250 行）

### 1.5 主入口 (main.py)

删除以下内容：
- `from scheduler import start_scheduler, stop_scheduler` 导入
- `from routers import scheduled` 导入
- `app.include_router(scheduled.router)` 路由注册
- `start_scheduler()` 调用
- `stop_scheduler()` 调用

### 1.6 Schema 层 (schemas.py)

删除以下类：
- `NotificationTemplateCreate`
- `NotificationTemplateUpdate`
- `NotificationTemplateResponse`
- `NotificationFromTemplateCreate`
- `ScheduledNotificationCreate`
- `ScheduledNotificationUpdate`
- `ScheduledNotificationResponse`
- `ScheduledNotificationParams`
- `SchedulerStatusResponse`

## 2. 新增/修改的模型

### 2.1 Notification 模型扩展

```python
class Notification(SQLModel, table=True):
    """通知消息表"""
    __tablename__ = "notifications"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    title: str = Field(max_length=100)
    content: Optional[str] = Field(default=None, max_length=1000)
    is_read: bool = Field(default=False, index=True)
    sender_id: Optional[int] = Field(default=None)
    
    # 新增字段
    ref_type: Optional[str] = Field(default=None, max_length=20, index=True)
    # 关联类型：leave/vehicle/resign
    
    ref_id: Optional[int] = Field(default=None, index=True)
    # 关联业务ID
    
    status: Optional[str] = Field(default=None, max_length=20)
    # 审批状态：pending/approved/rejected/completed
    
    updated_at: Optional[datetime] = Field(default=None)
    # 更新时间
    
    created_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    user: Optional[User] = Relationship(back_populates="notifications")
```

### 2.2 删除 template_id 外键

从 Notification 模型中删除：
- `template_id: Optional[int] = Field(default=None, foreign_key="notification_templates.id")`
- `template: Optional["NotificationTemplate"] = Relationship(back_populates="notifications")`

## 3. 新增 CRUD 函数

### 3.1 get_managers_for_user()

```python
def get_managers_for_user(session: Session, user_id: int) -> List[User]:
    """
    获取管辖某用户的车队长列表
    
    通过用户的仓库分配，找到同样分配到这些仓库的车队长。
    
    Args:
        session: 数据库会话
        user_id: 用户ID
        
    Returns:
        List[User]: 管辖该用户的车队长列表
    """
    # 1. 获取用户分配的仓库ID列表
    user_warehouses = get_user_warehouses(session, user_id)
    warehouse_ids = [w.id for w in user_warehouses]
    
    if not warehouse_ids:
        return []
    
    # 2. 查找分配到这些仓库的车队长
    statement = (
        select(User)
        .join(WarehouseAssignment)
        .where(
            WarehouseAssignment.warehouse_id.in_(warehouse_ids),
            User.role == UserRole.MANAGER.value,
            User.is_active == True
        )
        .distinct()
    )
    
    return list(session.exec(statement).all())
```

### 3.2 create_approval_notification()

```python
def create_approval_notification(
    session: Session,
    applicant_id: int,
    ref_type: str,
    ref_id: int,
    title: str,
    content: str
) -> List[Notification]:
    """
    创建审批通知
    
    自动发送给：
    1. 管辖申请人的车队长
    2. 所有调度（peer_admin）
    3. 所有老板（boss）
    
    Args:
        session: 数据库会话
        applicant_id: 申请人ID
        ref_type: 关联类型（leave/vehicle/resign）
        ref_id: 关联业务ID
        title: 通知标题
        content: 通知内容
        
    Returns:
        List[Notification]: 创建的通知列表
    """
    # 1. 获取管辖申请人的车队长
    managers = get_managers_for_user(session, applicant_id)
    manager_ids = [m.id for m in managers]
    
    # 2. 获取所有调度和老板
    all_users = get_users(session, is_active=True, skip=0, limit=1000)
    admin_ids = [
        u.id for u in all_users 
        if u.role in [UserRole.PEER_ADMIN.value, UserRole.BOSS.value]
    ]
    
    # 3. 合并去重
    recipient_ids = list(set(manager_ids + admin_ids))
    
    if not recipient_ids:
        return []
    
    # 4. 批量创建通知
    notifications = []
    for user_id in recipient_ids:
        notification = Notification(
            user_id=user_id,
            title=title,
            content=content,
            sender_id=applicant_id,
            ref_type=ref_type,
            ref_id=ref_id,
            status="pending"
        )
        session.add(notification)
        notifications.append(notification)
    
    session.commit()
    for n in notifications:
        session.refresh(n)
    
    return notifications
```

### 3.3 complete_approval()

```python
def complete_approval(
    session: Session,
    ref_type: str,
    ref_id: int,
    result: str,
    approver_id: int,
    applicant_id: int,
    result_title: str,
    result_content: str
) -> List[Notification]:
    """
    完成审批，更新所有相关通知并发送结果通知
    
    Args:
        session: 数据库会话
        ref_type: 关联类型（leave/vehicle/resign）
        ref_id: 关联业务ID
        result: 审批结果（approved/rejected）
        approver_id: 审批人ID
        applicant_id: 申请人ID
        result_title: 结果通知标题
        result_content: 结果通知内容
        
    Returns:
        List[Notification]: 新创建的结果通知列表
    """
    # 1. 查找所有相关的 pending 通知
    statement = select(Notification).where(
        Notification.ref_type == ref_type,
        Notification.ref_id == ref_id,
        Notification.status == "pending"
    )
    pending_notifications = list(session.exec(statement).all())
    
    # 2. 更新所有 pending 通知的状态
    notified_user_ids = set()
    for notification in pending_notifications:
        notification.status = result
        notification.updated_at = datetime.now()
        session.add(notification)
        notified_user_ids.add(notification.user_id)
    
    # 3. 添加申请人到通知列表
    notified_user_ids.add(applicant_id)
    
    # 4. 给所有相关人员发送结果通知
    result_notifications = []
    for user_id in notified_user_ids:
        notification = Notification(
            user_id=user_id,
            title=result_title,
            content=result_content,
            sender_id=approver_id,
            ref_type=ref_type,
            ref_id=ref_id,
            status=result
        )
        session.add(notification)
        result_notifications.append(notification)
    
    session.commit()
    for n in result_notifications:
        session.refresh(n)
    
    return result_notifications
```

## 4. Schema 修改

### 4.1 NotificationResponse 扩展

```python
class NotificationResponse(BaseModel):
    """通知响应模型"""
    id: int
    user_id: int
    title: str
    content: Optional[str] = None
    is_read: bool
    sender_id: Optional[int] = None
    created_at: datetime
    
    # 新增字段
    ref_type: Optional[str] = None
    ref_id: Optional[int] = None
    status: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

## 5. 业务流程修改

### 5.1 请假/离职申请流程 (routers/leave.py)

**提交申请时：**
```python
# 替换原有的 notify_admins() 调用
crud.create_approval_notification(
    session,
    applicant_id=current_user.id,
    ref_type="leave" if leave_type == "leave" else "resign",
    ref_id=application.id,
    title=f"新的{'请假' if leave_type == 'leave' else '离职'}申请",
    content=f"{current_user.name} 提交了{'请假' if leave_type == 'leave' else '离职'}申请"
)
```

**审批完成时：**
```python
# 添加审批完成通知
crud.complete_approval(
    session,
    ref_type="leave" if application.leave_type == "leave" else "resign",
    ref_id=application.id,
    result="approved" if status == LeaveStatus.APPROVED else "rejected",
    approver_id=current_user.id,
    applicant_id=application.user_id,
    result_title=f"{'请假' if application.leave_type == 'leave' else '离职'}申请已{status_text}",
    result_content=f"您的申请已被{current_user.name}{status_text}"
)
```

### 5.2 车辆审核流程 (routers/vehicles.py)

**提交车辆时：**
```python
# 替换原有的 notify_admins() 调用
crud.create_approval_notification(
    session,
    applicant_id=current_user.id,
    ref_type="vehicle",
    ref_id=vehicle.id,
    title="新的车辆审核申请",
    content=f"{current_user.name} 添加了新车辆 {vehicle.license_plate}，请审核"
)
```

**审核完成时：**
```python
# 添加审核完成通知
crud.complete_approval(
    session,
    ref_type="vehicle",
    ref_id=vehicle.id,
    result="approved" if new_status == VehicleStatus.ACTIVE else "rejected",
    approver_id=current_user.id,
    applicant_id=vehicle.user_id,
    result_title=f"车辆审核已{status_text}",
    result_content=f"您的车辆 {vehicle.license_plate} 已被{current_user.name}{status_text}"
)
```

## 6. 数据库迁移

由于使用 SQLite，需要手动处理数据库迁移：

1. 备份现有数据库
2. 删除 `notification_templates` 表
3. 删除 `scheduled_notifications` 表
4. 修改 `notifications` 表：
   - 删除 `template_id` 列
   - 添加 `ref_type` 列
   - 添加 `ref_id` 列
   - 添加 `status` 列
   - 添加 `updated_at` 列

或者直接删除数据库文件重新初始化（开发环境）。

## 7. 前端适配

前端需要修改通知列表组件，根据 `ref_type` 和 `ref_id` 实现点击跳转：

```typescript
// 通知点击处理
function handleNotificationClick(notification: Notification) {
  if (notification.ref_type && notification.ref_id) {
    switch (notification.ref_type) {
      case 'leave':
      case 'resign':
        // 跳转到请假/离职详情页
        uni.navigateTo({ url: `/pages/approval/leave-detail?id=${notification.ref_id}` })
        break
      case 'vehicle':
        // 跳转到车辆详情页
        uni.navigateTo({ url: `/pages/approval/vehicle-detail?id=${notification.ref_id}` })
        break
    }
  }
}
```
