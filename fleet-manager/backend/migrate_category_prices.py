"""
数据库迁移脚本 - 添加品类多种单价字段
为 piece_work_categories 表添加 upstairs_price 和 sorting_price 列
Requirements: 3.1 - 支持多种单价配置
"""

import sqlite3
import os

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "app.db")


def migrate():
    """
    执行数据库迁移
    添加 upstairs_price 和 sorting_price 列到 piece_work_categories 表
    """
    print(f"连接数据库: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 检查列是否已存在
        cursor.execute("PRAGMA table_info(piece_work_categories)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # 添加 upstairs_price 列
        if "upstairs_price" not in columns:
            print("添加 upstairs_price 列...")
            cursor.execute("""
                ALTER TABLE piece_work_categories 
                ADD COLUMN upstairs_price REAL DEFAULT NULL
            """)
            print("✅ upstairs_price 列添加成功")
        else:
            print("⚠️ upstairs_price 列已存在")
        
        # 添加 sorting_price 列
        if "sorting_price" not in columns:
            print("添加 sorting_price 列...")
            cursor.execute("""
                ALTER TABLE piece_work_categories 
                ADD COLUMN sorting_price REAL DEFAULT NULL
            """)
            print("✅ sorting_price 列添加成功")
        else:
            print("⚠️ sorting_price 列已存在")
        
        conn.commit()
        print("\n✅ 数据库迁移完成")
        return True
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
