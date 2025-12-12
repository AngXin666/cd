#!/usr/bin/env python3
"""
自动迁移导入语句到模块化导入的脚本

将 `from '@/db/api'` 导入迁移到模块化导入：
- 用户管理 → '@/db/api/users'
- 车辆管理 → '@/db/api/vehicles'
- 考勤管理 → '@/db/api/attendance'
- 请假管理 → '@/db/api/leave'
- 计件管理 → '@/db/api/piecework'
- 仓库管理 → '@/db/api/warehouses'
- 通知系统 → '@/db/api/notifications'
- 仪表盘统计 → '@/db/api/dashboard'
- 平级账号管理 → '@/db/api/peer-accounts'
- 工具函数 → '@/db/api/utils'
"""

import re
import os
from pathlib import Path
from typing import Dict, List, Set

# 定义函数到模块的映射
FUNCTION_TO_MODULE = {
    # 用户管理模块
    'getCurrentUserProfile': 'users',
    'getCurrentUserWithRealName': 'users',
    'getCurrentUserRole': 'users',
    'getCurrentUserRoleAndTenant': 'users',
    'getCurrentUserPermissions': 'users',
    'getAllProfiles': 'users',
    'getAllUsers': 'users',
    'getAllDrivers': 'users',
    'getAllDriversWithRealName': 'users',
    'getAllDriverIds': 'users',
    'getAllManagers': 'users',
    'getAllSuperAdmins': 'users',
    'getProfileById': 'users',
    'getUserById': 'users',
    'getDriverProfiles': 'users',
    'getManagerProfiles': 'users',
    'updateProfile': 'users',
    'updateUserProfile': 'users',
    'updateUserInfo': 'users',
    'updateUserRole': 'users',
    'createUser': 'users',
    'createDriver': 'users',
    'resetUserPassword': 'users',
    'uploadAvatar': 'users',
    'changePassword': 'users',
    'submitFeedback': 'users',
    'getUserFeedbackList': 'users',
    'getAllFeedbackList': 'users',
    'updateFeedbackStatus': 'users',
    'getManagerPermission': 'users',
    'upsertManagerPermission': 'users',
    'updateManagerPermissionsEnabled': 'users',
    'getManagerPermissionsEnabled': 'users',
    'getManagerWarehouseIds': 'users',
    'setManagerWarehouses': 'users',
    'debugAuthStatus': 'users',
    'deleteTenantWithLog': 'users',
    'getDatabaseTables': 'users',
    'getTableColumns': 'users',
    'getTableConstraints': 'users',
    
    # 车辆管理模块
    'getAllVehiclesWithDrivers': 'vehicles',
    'getVehicleById': 'vehicles',
    'getVehicleByPlateNumber': 'vehicles',
    'getVehiclesByDriverId': 'vehicles',
    'getDriverVehicles': 'vehicles',
    'getVehicleWithDriverDetails': 'vehicles',
    'insertVehicle': 'vehicles',
    'updateVehicle': 'vehicles',
    'deleteVehicle': 'vehicles',
    'returnVehicle': 'vehicles',
    'getDriverLicense': 'vehicles',
    'upsertDriverLicense': 'vehicles',
    'updateDriverLicense': 'vehicles',
    'deleteDriverLicense': 'vehicles',
    'getPendingReviewVehicles': 'vehicles',
    'approveVehicle': 'vehicles',
    'submitVehicleForReview': 'vehicles',
    'requireSupplement': 'vehicles',
    'getRequiredPhotos': 'vehicles',
    'lockPhoto': 'vehicles',
    'unlockPhoto': 'vehicles',
    'lockVehiclePhotos': 'vehicles',
    'supplementPhoto': 'vehicles',
    'markPhotoForDeletion': 'vehicles',
    'getDriverDetailInfo': 'vehicles',
    'getDriverDisplayName': 'vehicles',
    'getDriverName': 'vehicles',
    
    # 考勤管理模块
    'createClockIn': 'attendance',
    'updateClockOut': 'attendance',
    'getTodayAttendance': 'attendance',
    'getMonthlyAttendance': 'attendance',
    'getAllAttendanceRecords': 'attendance',
    'getAttendanceRecordsByUserAndWarehouse': 'attendance',
    'getAttendanceRecordsByWarehouse': 'attendance',
    'getAllAttendanceRules': 'attendance',
    'getAttendanceRuleByWarehouseId': 'attendance',
    'createAttendanceRule': 'attendance',
    'updateAttendanceRule': 'attendance',
    'deleteAttendanceRule': 'attendance',
    
    # 请假管理模块
    'createLeaveApplication': 'leave',
    'saveDraftLeaveApplication': 'leave',
    'submitDraftLeaveApplication': 'leave',
    'updateDraftLeaveApplication': 'leave',
    'deleteDraftLeaveApplication': 'leave',
    'getDraftLeaveApplications': 'leave',
    'getLeaveApplicationsByUser': 'leave',
    'getLeaveApplicationsByWarehouse': 'leave',
    'getAllLeaveApplications': 'leave',
    'reviewLeaveApplication': 'leave',
    'validateLeaveApplication': 'leave',
    'createResignationApplication': 'leave',
    'saveDraftResignationApplication': 'leave',
    'submitDraftResignationApplication': 'leave',
    'updateDraftResignationApplication': 'leave',
    'deleteDraftResignationApplication': 'leave',
    'getDraftResignationApplications': 'leave',
    'getResignationApplicationsByUser': 'leave',
    'getResignationApplicationsByWarehouse': 'leave',
    'getAllResignationApplications': 'leave',
    'reviewResignationApplication': 'leave',
    'validateResignationDate': 'leave',
    
    # 计件管理模块
    'createPieceWorkRecord': 'piecework',
    'updatePieceWorkRecord': 'piecework',
    'deletePieceWorkRecord': 'piecework',
    'getPieceWorkRecordsByUser': 'piecework',
    'getPieceWorkRecordsByUserAndWarehouse': 'piecework',
    'getPieceWorkRecordsByWarehouse': 'piecework',
    'getAllPieceWorkRecords': 'piecework',
    'calculatePieceWorkStats': 'piecework',
    'getAllCategories': 'piecework',
    'getActiveCategories': 'piecework',
    'createCategory': 'piecework',
    'updateCategory': 'piecework',
    'deleteCategory': 'piecework',
    'deleteUnusedCategories': 'piecework',
    'upsertCategoryPrice': 'piecework',
    'batchUpsertCategoryPrices': 'piecework',
    'getCategoryPrice': 'piecework',
    'getCategoryPriceForDriver': 'piecework',
    'getCategoryPricesByWarehouse': 'piecework',
    'deleteCategoryPrice': 'piecework',
    
    # 仓库管理模块
    'getAllWarehouses': 'warehouses',
    'getActiveWarehouses': 'warehouses',
    'getWarehouseById': 'warehouses',
    'createWarehouse': 'warehouses',
    'updateWarehouse': 'warehouses',
    'deleteWarehouse': 'warehouses',
    'getWarehouseWithRule': 'warehouses',
    'getWarehousesWithRules': 'warehouses',
    'getAllWarehousesWithRules': 'warehouses',
    'getWarehouseSettings': 'warehouses',
    'updateWarehouseSettings': 'warehouses',
    'getWarehouseCategories': 'warehouses',
    'getWarehouseCategoriesWithDetails': 'warehouses',
    'setWarehouseCategories': 'warehouses',
    'getDriverWarehouses': 'warehouses',
    'getAllDriverWarehouses': 'warehouses',
    'getDriverWarehouseIds': 'warehouses',
    'setDriverWarehouses': 'warehouses',
    'assignWarehouseToDriver': 'warehouses',
    'removeWarehouseFromDriver': 'warehouses',
    'getWarehouseAssignmentsByDriver': 'warehouses',
    'insertWarehouseAssignment': 'warehouses',
    'deleteWarehouseAssignmentsByDriver': 'warehouses',
    'getDriversByWarehouse': 'warehouses',
    'getDriverIdsByWarehouse': 'warehouses',
    'getManagerWarehouses': 'warehouses',
    'getWarehouseAssignmentsByManager': 'warehouses',
    'addManagerWarehouse': 'warehouses',
    'removeManagerWarehouse': 'warehouses',
    'insertManagerWarehouseAssignment': 'warehouses',
    'getWarehouseManager': 'warehouses',
    'getWarehouseManagers': 'warehouses',
    
    # 通知系统模块
    'getNotificationTemplates': 'notifications',
    'createNotificationTemplate': 'notifications',
    'updateNotificationTemplate': 'notifications',
    'deleteNotificationTemplate': 'notifications',
    'createNotification': 'notifications',
    'createNotificationForAllManagers': 'notifications',
    'createNotificationForAllSuperAdmins': 'notifications',
    'createNotificationRecord': 'notifications',
    'createNotificationSendRecord': 'notifications',
    'sendNotificationToDrivers': 'notifications',
    'getNotifications': 'notifications',
    'markNotificationAsRead': 'notifications',
    'markAllNotificationsAsRead': 'notifications',
    'deleteNotification': 'notifications',
    'getUnreadNotificationCount': 'notifications',
    'getNotificationSendRecords': 'notifications',
    'getScheduledNotifications': 'notifications',
    'createScheduledNotification': 'notifications',
    'updateScheduledNotificationStatus': 'notifications',
    'getAutoReminderRules': 'notifications',
    'createAutoReminderRule': 'notifications',
    'updateAutoReminderRule': 'notifications',
    'deleteAutoReminderRule': 'notifications',
    'sendVerificationReminder': 'notifications',
    
    # 仪表盘统计模块
    'getWarehouseDashboardStats': 'dashboard',
    'getAllWarehousesDashboardStats': 'dashboard',
    'getDriverStats': 'dashboard',
    'getManagerStats': 'dashboard',
    'getSuperAdminStats': 'dashboard',
    'getDriverAttendanceStats': 'dashboard',
    'getBatchDriverAttendanceStats': 'dashboard',
    'getMonthlyLeaveCount': 'dashboard',
    'getMonthlyPendingLeaveCount': 'dashboard',
    'getApprovedLeaveForToday': 'dashboard',
    'getWarehouseDriverCount': 'dashboard',
    'getWarehouseDataVolume': 'dashboard',
    'getWarehousesDataVolume': 'dashboard',
    
    # 平级账号管理模块
    'createPeerAccount': 'peer-accounts',
    'getPeerAccounts': 'peer-accounts',
    'isPrimaryAccount': 'peer-accounts',
    
    # 工具函数模块
    'getLocalDateString': 'utils',
    'convertTenantProfileToProfile': 'utils',
}


def extract_imports_from_file(file_path: str) -> List[str]:
    """从文件中提取所有从 @/db/api 导入的函数"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 匹配所有从 @/db/api 导入的语句
    pattern = r"import\s+\{([^}]+)\}\s+from\s+['\"]@/db/api['\"]"
    matches = re.findall(pattern, content)
    
    functions = []
    for match in matches:
        # 分割函数名，处理多行导入
        funcs = [f.strip() for f in match.split(',')]
        functions.extend(funcs)
    
    return functions


def group_functions_by_module(functions: List[str]) -> Dict[str, List[str]]:
    """将函数按模块分组"""
    modules = {}
    unknown_functions = []
    
    for func in functions:
        if func in FUNCTION_TO_MODULE:
            module = FUNCTION_TO_MODULE[func]
            if module not in modules:
                modules[module] = []
            modules[module].append(func)
        else:
            unknown_functions.append(func)
    
    if unknown_functions:
        print(f"  ⚠️  未知函数: {', '.join(unknown_functions)}")
    
    return modules


def generate_new_imports(modules: Dict[str, List[str]]) -> str:
    """生成新的导入语句"""
    import_lines = []
    
    for module, functions in sorted(modules.items()):
        # 使用 import * as 的方式
        module_name = module.replace('-', '_').title().replace('_', '')
        if module == 'peer-accounts':
            module_name = 'PeerAccountsAPI'
        elif module == 'piecework':
            module_name = 'PieceworkAPI'
        else:
            module_name = f"{module.title()}API"
        
        import_lines.append(f"import * as {module_name} from '@/db/api/{module}'")
    
    return '\n'.join(import_lines)


def replace_function_calls(content: str, modules: Dict[str, List[str]]) -> str:
    """替换函数调用为模块化调用"""
    for module, functions in modules.items():
        module_name = module.replace('-', '_').title().replace('_', '')
        if module == 'peer-accounts':
            module_name = 'PeerAccountsAPI'
        elif module == 'piecework':
            module_name = 'PieceworkAPI'
        else:
            module_name = f"{module.title()}API"
        
        for func in functions:
            # 替换函数调用（确保不是在导入语句中）
            # 匹配 funcName( 但不匹配 import { funcName }
            pattern = r'\b' + func + r'\s*\('
            replacement = f'{module_name}.{func}('
            content = re.sub(pattern, replacement, content)
    
    return content


def migrate_file(file_path: str, dry_run: bool = False) -> bool:
    """迁移单个文件的导入语句"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否有需要迁移的导入
        if "from '@/db/api'" not in content:
            return False
        
        print(f"\n📄 处理文件: {file_path}")
        
        # 提取导入的函数
        functions = extract_imports_from_file(file_path)
        if not functions:
            print("  ℹ️  没有找到需要迁移的函数")
            return False
        
        print(f"  📦 找到 {len(functions)} 个函数")
        
        # 按模块分组
        modules = group_functions_by_module(functions)
        print(f"  🗂️  分组到 {len(modules)} 个模块")
        
        # 生成新的导入语句
        new_imports = generate_new_imports(modules)
        
        # 删除旧的导入语句
        old_import_pattern = r"import\s+\{[^}]+\}\s+from\s+['\"]@/db/api['\"]"
        content = re.sub(old_import_pattern, '', content)
        
        # 在第一个 import 语句之后插入新的导入
        # 找到第一个 import 语句的位置
        first_import_match = re.search(r'^import\s+', content, re.MULTILINE)
        if first_import_match:
            # 找到这一行的结束位置
            line_end = content.find('\n', first_import_match.start())
            if line_end != -1:
                # 在这一行之后插入新的导入
                content = content[:line_end+1] + new_imports + '\n' + content[line_end+1:]
        else:
            # 如果没有找到 import 语句，在文件开头插入
            content = new_imports + '\n\n' + content
        
        # 替换函数调用
        content = replace_function_calls(content, modules)
        
        # 清理多余的空行
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        if not dry_run:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("  ✅ 迁移完成")
        else:
            print("  🔍 预览模式（未写入文件）")
            print("\n新的导入语句:")
            print(new_imports)
        
        return True
        
    except Exception as e:
        print(f"  ❌ 错误: {str(e)}")
        return False


def main():
    """主函数"""
    import sys
    
    dry_run = '--dry-run' in sys.argv
    
    # 获取所有需要迁移的文件
    src_dir = Path('src/pages')
    files = list(src_dir.rglob('*.tsx')) + list(src_dir.rglob('*.ts'))
    
    # 过滤出包含 @/db/api 导入的文件
    files_to_migrate = []
    for file in files:
        with open(file, 'r', encoding='utf-8') as f:
            if "from '@/db/api'" in f.read():
                files_to_migrate.append(str(file))
    
    print(f"🚀 开始迁移导入语句")
    print(f"📊 找到 {len(files_to_migrate)} 个需要迁移的文件")
    
    if dry_run:
        print("🔍 预览模式（不会修改文件）")
    
    success_count = 0
    for file_path in files_to_migrate:
        if migrate_file(file_path, dry_run):
            success_count += 1
    
    print(f"\n✅ 迁移完成！")
    print(f"📊 成功迁移 {success_count}/{len(files_to_migrate)} 个文件")


if __name__ == '__main__':
    main()
