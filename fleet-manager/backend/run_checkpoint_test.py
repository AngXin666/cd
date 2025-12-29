"""
运行后端 Checkpoint 测试脚本
用于验证所有后端测试是否通过
"""
import subprocess
import sys

def run_tests():
    """运行后端测试"""
    print("=" * 60)
    print("运行后端 Checkpoint 测试")
    print("=" * 60)
    
    # 首先检查语法
    print("\n1. 检查 events.py 语法...")
    result = subprocess.run(
        [sys.executable, "-m", "py_compile", "events.py"],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"❌ events.py 语法错误: {result.stderr}")
        return False
    print("✅ events.py 语法正确")
    
    # 检查测试文件语法
    print("\n2. 检查 test_events_pbt.py 语法...")
    result = subprocess.run(
        [sys.executable, "-m", "py_compile", "test_events_pbt.py"],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"❌ test_events_pbt.py 语法错误: {result.stderr}")
        return False
    print("✅ test_events_pbt.py 语法正确")
    
    # 运行属性测试（使用较少的示例数以加快速度）
    print("\n3. 运行属性测试 (max_examples=10)...")
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "test_events_pbt.py", 
         "-v", "--tb=short", "-x", 
         "--hypothesis-seed=0"],
        capture_output=True,
        text=True,
        timeout=300  # 5分钟超时
    )
    
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    if result.returncode == 0:
        print("\n" + "=" * 60)
        print("✅ 所有测试通过!")
        print("=" * 60)
        return True
    else:
        print("\n" + "=" * 60)
        print("❌ 测试失败!")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
