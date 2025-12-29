#!/usr/bin/env python3
"""
直接运行测试的脚本
不依赖 pytest 命令行，直接使用 Python 导入运行

用法：
    python3 run_tests_direct.py
"""

import sys
import os

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def check_imports():
    """检查必要的导入是否可用"""
    print("=" * 60)
    print("检查项目导入...")
    print("=" * 60)
    
    errors = []
    
    # 检查核心模块
    try:
        from main import app
        print("✅ main.app 导入成功")
    except Exception as e:
        errors.append(f"❌ main.app 导入失败: {e}")
        print(errors[-1])
    
    try:
        from database import get_session
        print("✅ database.get_session 导入成功")
    except Exception as e:
        errors.append(f"❌ database.get_session 导入失败: {e}")
        print(errors[-1])
    
    try:
        from models import User, UserRole, Warehouse
        print("✅ models 导入成功")
    except Exception as e:
        errors.append(f"❌ models 导入失败: {e}")
        print(errors[-1])
    
    try:
        from auth import hash_password, verify_password, create_access_token
        print("✅ auth 导入成功")
    except Exception as e:
        errors.append(f"❌ auth 导入失败: {e}")
        print(errors[-1])
    
    try:
        from schemas import UserCreate, UserLogin
        print("✅ schemas 导入成功")
    except Exception as e:
        errors.append(f"❌ schemas 导入失败: {e}")
        print(errors[-1])
    
    # 检查测试依赖
    try:
        import pytest
        print("✅ pytest 导入成功")
    except Exception as e:
        errors.append(f"❌ pytest 导入失败: {e}")
        print(errors[-1])
    
    try:
        from fastapi.testclient import TestClient
        print("✅ TestClient 导入成功")
    except Exception as e:
        errors.append(f"❌ TestClient 导入失败: {e}")
        print(errors[-1])
    
    try:
        from sqlmodel import SQLModel, Session, create_engine
        print("✅ sqlmodel 导入成功")
    except Exception as e:
        errors.append(f"❌ sqlmodel 导入失败: {e}")
        print(errors[-1])
    
    print()
    if errors:
        print(f"发现 {len(errors)} 个导入错误")
        return False
    else:
        print("所有导入检查通过！")
        return True


def run_basic_tests():
    """运行基本测试"""
    print()
    print("=" * 60)
    print("运行基本测试...")
    print("=" * 60)
    
    try:
        from sqlmodel import SQLModel, Session, create_engine
        from sqlalchemy.pool import StaticPool
        from fastapi.testclient import TestClient
        from main import app
        from database import get_session
        from models import User, UserRole
        from auth import hash_password, create_access_token
        
        # 创建测试数据库
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(engine)
        
        # 创建会话
        with Session(engine) as session:
            # 创建测试用户
            test_password = "test123456"
            user = User(
                username="test_driver",
                password_hash=hash_password(test_password),
                name="测试司机",
                phone="13800000001",
                role=UserRole.DRIVER,
                is_active=True
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            
            print(f"✅ 创建测试用户成功: {user.username} (ID: {user.id})")
            
            # 覆盖依赖
            def get_session_override():
                return session
            
            app.dependency_overrides[get_session] = get_session_override
            
            # 创建测试客户端
            with TestClient(app) as client:
                # 测试 1: 登录成功
                print("\n测试 1: 登录成功")
                response = client.post(
                    "/api/auth/login",
                    json={
                        "username": "test_driver",
                        "password": test_password
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    if "access_token" in data:
                        print(f"  ✅ 登录成功，获取到 Token")
                        token = data["access_token"]
                    else:
                        print(f"  ❌ 登录响应缺少 access_token")
                        return False
                else:
                    print(f"  ❌ 登录失败: {response.status_code} - {response.text}")
                    return False
                
                # 测试 2: 错误密码登录失败
                print("\n测试 2: 错误密码登录失败")
                response = client.post(
                    "/api/auth/login",
                    json={
                        "username": "test_driver",
                        "password": "wrong_password"
                    }
                )
                if response.status_code == 401:
                    print(f"  ✅ 错误密码正确返回 401")
                else:
                    print(f"  ❌ 错误密码应返回 401，实际返回: {response.status_code}")
                    return False
                
                # 测试 3: 使用 Token 访问 /api/auth/me
                print("\n测试 3: 使用 Token 访问受保护端点")
                response = client.get(
                    "/api/auth/me",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("username") == "test_driver":
                        print(f"  ✅ Token 验证成功，用户: {data['username']}")
                    else:
                        print(f"  ❌ 返回的用户名不正确")
                        return False
                else:
                    print(f"  ❌ Token 验证失败: {response.status_code} - {response.text}")
                    return False
                
                # 测试 4: 无 Token 访问失败
                print("\n测试 4: 无 Token 访问失败")
                response = client.get("/api/auth/me")
                if response.status_code in [401, 403]:
                    print(f"  ✅ 无 Token 正确返回 {response.status_code}")
                else:
                    print(f"  ❌ 无 Token 应返回 401/403，实际返回: {response.status_code}")
                    return False
            
            # 清理
            app.dependency_overrides.clear()
        
        print("\n" + "=" * 60)
        print("所有基本测试通过！✅")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ 测试执行出错: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主函数"""
    print("Fleet Manager 后端测试")
    print("=" * 60)
    
    # 检查导入
    if not check_imports():
        print("\n⚠️ 导入检查失败，请先安装依赖")
        sys.exit(1)
    
    # 运行基本测试
    if run_basic_tests():
        print("\n✅ 测试完成")
        sys.exit(0)
    else:
        print("\n❌ 测试失败")
        sys.exit(1)


if __name__ == "__main__":
    main()
