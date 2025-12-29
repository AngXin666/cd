"""
数据库清理脚本
清空车辆测试数据并列出所有账号

用法：python db_cleanup.py
"""

import sqlite3
import os
from pathlib import Path

# 数据库路径
DB_PATH = Path(__file__).parent / "data" / "app.db"


def get_connection():
    """获取数据库连接"""
    if not DB_PATH.exists():
        print(f"❌ 数据库文件不存在: {DB_PATH}")
        return None
    return sqlite3.connect(str(DB_PATH))


def list_all_users():
    """列出所有用户账号"""
    conn = get_connection()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    print("\n" + "=" * 80)
    print("📋 数据库中所有账号")
    print("=" * 80)
    
    try:
        cursor.execute("""
            SELECT id, phone, name, role, is_active, created_at
            FROM users
            ORDER BY role, id
        """)
        users = cursor.fetchall()
        
        if not users:
            print("暂无用户数据")
        else:
            print(f"\n共 {len(users)} 个账号:\n")
            print(f"{'ID':<6} {'手机号':<15} {'姓名':<12} {'角色':<12} {'状态':<8} {'创建时间'}")
            print("-" * 80)
            
            role_map = {
                'boss': '老板',
                'manager': '车队长',
                'driver': '司机',
                'admin': '管理员'
            }
            
            for user in users:
                user_id, phone, name, role, is_active, created_at = user
                role_cn = role_map.get(role, role) if role else "未知"
                status = "启用" if is_active else "禁用"
                created = str(created_at)[:19] if created_at else "未知"
                name_str = name if name else "未设置"
                phone_str = phone if phone else "未设置"
                print(f"{user_id}  |  {phone_str}  |  {name_str}  |  {role_cn}  |  {status}  |  {created}")
        
    except Exception as e:
        print(f"❌ 查询用户失败: {e}")
    finally:
        conn.close()


def count_vehicles():
    """统计车辆数量"""
    conn = get_connection()
    if not conn:
        return 0
    
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM vehicles")
        count = cursor.fetchone()[0]
        return count
    except Exception as e:
        print(f"❌ 统计车辆失败: {e}")
        return 0
    finally:
        conn.close()


def clear_vehicles():
    """清空所有车辆数据"""
    conn = get_connection()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    print("\n" + "=" * 80)
    print("🚗 清空车辆数据")
    print("=" * 80)
    
    try:
        # 先统计当前车辆数量
        cursor.execute("SELECT COUNT(*) FROM vehicles")
        before_count = cursor.fetchone()[0]
        print(f"\n清空前车辆数量: {before_count}")
        
        if before_count == 0:
            print("✅ 车辆表已经是空的，无需清理")
            return
        
        # 先清空车辆相关的关联数据（如果有）
        # 清空车辆证件表
        try:
            cursor.execute("DELETE FROM vehicle_documents")
            print(f"  - 已清空 vehicle_documents 表")
        except Exception as e:
            print(f"  - vehicle_documents 表不存在或清空失败: {e}")
        
        # 清空车辆表
        cursor.execute("DELETE FROM vehicles")
        deleted_count = cursor.rowcount
        
        # 提交事务
        conn.commit()
        
        # 验证清空结果
        cursor.execute("SELECT COUNT(*) FROM vehicles")
        after_count = cursor.fetchone()[0]
        
        print(f"\n✅ 清空完成!")
        print(f"  - 删除车辆数: {deleted_count}")
        print(f"  - 清空后车辆数量: {after_count}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ 清空车辆失败: {e}")
    finally:
        conn.close()


def main():
    """主函数"""
    print("\n" + "=" * 80)
    print("🔧 数据库清理工具")
    print("=" * 80)
    print(f"数据库路径: {DB_PATH}")
    
    # 1. 列出所有账号
    list_all_users()
    
    # 2. 清空车辆数据
    clear_vehicles()
    
    print("\n" + "=" * 80)
    print("✅ 操作完成")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
