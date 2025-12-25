"""查询数据库中的用户账号"""
from sqlmodel import Session, select
from database import engine
from models import User

with Session(engine) as session:
    users = session.exec(select(User)).all()
    print(f"共 {len(users)} 个用户:\n")
    for u in users:
        role = u.role.value if u.role else 'N/A'
        print(f"账号: {u.username}, 角色: {role}, 姓名: {u.name}")
