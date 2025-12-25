"""
健康检查 API 测试模块
测试 /api/health、/api/health/live、/api/health/ready 接口
"""

import httpx
import sys

# 后端服务地址
BASE_URL = "http://localhost:8000"


def test_health_check():
    """
    测试 10.2.1: 健康检查 API
    GET /api/health 返回服务状态、数据库状态、版本信息
    """
    print("\n" + "=" * 60)
    print("测试 10.2.1: 健康检查 API")
    print("=" * 60)
    
    response = httpx.get(f"{BASE_URL}/api/health", timeout=10)
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    
    assert response.status_code == 200, f"期望 200，实际 {response.status_code}"
    
    data = response.json()
    
    # 验证返回字段
    assert "status" in data, "响应缺少 status 字段"
    assert "message" in data, "响应缺少 message 字段"
    assert "database" in data, "响应缺少 database 字段"
    assert "version" in data, "响应缺少 version 字段"
    
    # 验证状态值
    assert data["status"] in ["ok", "degraded"], f"status 值异常: {data['status']}"
    assert data["database"] == "ok", f"数据库状态异常: {data['database']}"
    
    print("✅ 测试通过: 健康检查 API 正常")
    return True


def test_liveness_check():
    """
    测试 10.2.2: 存活检查 API
    GET /api/health/live 返回服务存活状态
    """
    print("\n" + "=" * 60)
    print("测试 10.2.2: 存活检查 API")
    print("=" * 60)
    
    response = httpx.get(f"{BASE_URL}/api/health/live", timeout=10)
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    
    assert response.status_code == 200, f"期望 200，实际 {response.status_code}"
    
    data = response.json()
    
    # 验证返回字段
    assert "status" in data, "响应缺少 status 字段"
    assert data["status"] == "alive", f"status 值异常: {data['status']}"
    
    print("✅ 测试通过: 存活检查 API 正常")
    return True


def test_readiness_check():
    """
    测试 10.2.3: 就绪检查 API
    GET /api/health/ready 返回服务就绪状态
    """
    print("\n" + "=" * 60)
    print("测试 10.2.3: 就绪检查 API")
    print("=" * 60)
    
    response = httpx.get(f"{BASE_URL}/api/health/ready", timeout=10)
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    
    assert response.status_code == 200, f"期望 200，实际 {response.status_code}"
    
    data = response.json()
    
    # 验证返回字段
    assert "status" in data, "响应缺少 status 字段"
    assert data["status"] == "ready", f"status 值异常: {data['status']}"
    
    print("✅ 测试通过: 就绪检查 API 正常")
    return True


def test_root_endpoint():
    """
    测试 10.2.4: 根路径 API
    GET / 返回 API 基本信息
    """
    print("\n" + "=" * 60)
    print("测试 10.2.4: 根路径 API")
    print("=" * 60)
    
    response = httpx.get(f"{BASE_URL}/", timeout=10)
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    
    assert response.status_code == 200, f"期望 200，实际 {response.status_code}"
    
    data = response.json()
    
    # 验证返回字段
    assert "name" in data, "响应缺少 name 字段"
    assert "version" in data, "响应缺少 version 字段"
    assert "docs" in data, "响应缺少 docs 字段"
    
    print("✅ 测试通过: 根路径 API 正常")
    return True


def run_all_tests():
    """
    运行所有健康检查测试
    """
    print("\n" + "=" * 60)
    print("健康检查 API 测试")
    print("=" * 60)
    
    # 检查后端服务是否运行
    print("\n检查后端服务...")
    try:
        response = httpx.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ 后端服务正常运行")
        else:
            print(f"❌ 后端服务响应异常: {response.status_code}")
            return False
    except httpx.ConnectError:
        print("❌ 无法连接到后端服务")
        print(f"请确保后端服务已启动: cd fleet-manager/backend && python main.py")
        return False
    except Exception as e:
        print(f"❌ 检查后端服务时出错: {e}")
        return False
    
    # 测试列表
    tests = [
        ("10.2.1 健康检查 API", test_health_check),
        ("10.2.2 存活检查 API", test_liveness_check),
        ("10.2.3 就绪检查 API", test_readiness_check),
        ("10.2.4 根路径 API", test_root_endpoint),
    ]
    
    # 运行测试
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                print(f"❌ 测试失败: {name}")
        except AssertionError as e:
            failed += 1
            print(f"❌ 测试失败: {name}")
            print(f"   断言错误: {e}")
        except Exception as e:
            failed += 1
            print(f"❌ 测试异常: {name}")
            print(f"   错误: {e}")
    
    # 输出测试结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    print(f"通过: {passed}")
    print(f"失败: {failed}")
    print(f"总计: {passed + failed}")
    
    if failed == 0:
        print("\n✅ 所有测试通过！")
        return True
    else:
        print(f"\n❌ {failed} 个测试失败")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
