#!/usr/bin/env python
"""
数据库迁移脚本
添加 vehicles 表缺失的列
"""
import sqlite3
import os

# 数据库路径
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "app.db")

print(f"Database path: {db_path}")

# 连接数据库
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 检查现有列
cursor.execute("PRAGMA table_info(vehicles)")
columns = {row[1] for row in cursor.fetchall()}
print(f"Existing columns: {columns}")

# 需要添加的列
new_columns = [
    ("warehouse_id", "INTEGER"),
    ("pickup_photos", "TEXT"),
    ("pickup_time", "DATETIME"),
    ("return_photos", "TEXT"),
    ("damage_photos", "TEXT"),
    ("return_time", "DATETIME"),
]

# 添加缺失的列
for col_name, col_type in new_columns:
    if col_name not in columns:
        print(f"Adding column: {col_name} ({col_type})")
        try:
            cursor.execute(f"ALTER TABLE vehicles ADD COLUMN {col_name} {col_type}")
            print(f"  [OK] Column {col_name} added successfully")
        except sqlite3.OperationalError as e:
            print(f"  [ERROR] Failed to add column {col_name}: {e}")
    else:
        print(f"Column {col_name} already exists")

# 提交更改
conn.commit()
conn.close()

print("\nMigration completed!")
