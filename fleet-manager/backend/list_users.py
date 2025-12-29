# -*- coding: utf-8 -*-
"""
列出所有用户账号
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "app.db"

conn = sqlite3.connect(str(DB_PATH))
cursor = conn.cursor()

cursor.execute("""
    SELECT id, phone, name, role, is_active 
    FROM users 
    ORDER BY role, id
""")
users = cursor.fetchall()

print("=" * 70)
print("DATABASE USERS LIST")
print("=" * 70)
print(f"Total: {len(users)} users")
print("-" * 70)
print(f"{'ID':<5} {'Phone':<15} {'Name':<15} {'Role':<12} {'Active'}")
print("-" * 70)

for u in users:
    uid, phone, name, role, active = u
    uid_str = str(uid) if uid else "?"
    phone_str = str(phone) if phone else "(no phone)"
    name_str = str(name) if name else "(no name)"
    role_str = str(role) if role else "(no role)"
    active_str = "Yes" if active else "No"
    print(f"{uid_str:<5} {phone_str:<15} {name_str:<15} {role_str:<12} {active_str}")

conn.close()
print("-" * 70)
