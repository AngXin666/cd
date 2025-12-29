# -*- coding: utf-8 -*-
"""
列出所有用户账号和密码
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "app.db"

conn = sqlite3.connect(str(DB_PATH))
cursor = conn.cursor()

# 先查看 users 表结构
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
print("Users table columns:")
for col in columns:
    print(f"  {col[1]} ({col[2]})")
print()

# 查询用户数据（包含密码相关字段）
cursor.execute("""
    SELECT id, username, phone, name, role, is_active, password_hash
    FROM users 
    ORDER BY role, id
""")
users = cursor.fetchall()

print("=" * 90)
print("DATABASE USERS WITH CREDENTIALS")
print("=" * 90)
print(f"Total: {len(users)} users")
print("-" * 90)

for u in users:
    uid, username, phone, name, role, active, pwd_hash = u
    uid_str = str(uid) if uid else "?"
    username_str = str(username) if username else "(no username)"
    phone_str = str(phone) if phone else "(no phone)"
    name_str = str(name) if name else "(no name)"
    role_str = str(role) if role else "(no role)"
    active_str = "Yes" if active else "No"
    pwd_str = pwd_hash[:40] + "..." if pwd_hash and len(pwd_hash) > 40 else (pwd_hash or "(no pwd)")
    
    print(f"ID: {uid_str}")
    print(f"  Username: {username_str}")
    print(f"  Name: {name_str}")
    print(f"  Phone: {phone_str}")
    print(f"  Role: {role_str}")
    print(f"  Active: {active_str}")
    print(f"  Password Hash: {pwd_str}")
    print("-" * 90)

conn.close()
