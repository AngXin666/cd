#!/usr/bin/env python
"""
数据库迁移脚本
创建 vehicle_history 表用于记录车辆使用历史

Requirements: 15.2, 15.3
"""
import sqlite3
import os

# 数据库路径
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "app.db")

print(f"Database path: {db_path}")

# 连接数据库
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 检查 vehicle_history 表是否存在
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='vehicle_history'")
table_exists = cursor.fetchone() is not None

if table_exists:
    print("Table 'vehicle_history' already exists")
else:
    print("Creating table 'vehicle_history'...")
    
    # 创建 vehicle_history 表
    create_table_sql = """
    CREATE TABLE vehicle_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        action_type VARCHAR(10) NOT NULL,
        action_time DATETIME NOT NULL,
        photos TEXT,
        damage_photos TEXT,
        remark VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """
    
    try:
        cursor.execute(create_table_sql)
        print("  [OK] Table 'vehicle_history' created successfully")
        
        # 创建索引以提高查询性能
        cursor.execute("CREATE INDEX idx_vehicle_history_vehicle_id ON vehicle_history(vehicle_id)")
        print("  [OK] Index on vehicle_id created")
        
        cursor.execute("CREATE INDEX idx_vehicle_history_user_id ON vehicle_history(user_id)")
        print("  [OK] Index on user_id created")
        
        cursor.execute("CREATE INDEX idx_vehicle_history_action_time ON vehicle_history(action_time)")
        print("  [OK] Index on action_time created")
        
    except sqlite3.OperationalError as e:
        print(f"  [ERROR] Failed to create table: {e}")

# 提交更改
conn.commit()
conn.close()

print("\nMigration completed!")
