"""
Property 7: 仓库分配事件触发 属性测试运行脚本
Validates: Requirements 5.1, 5.2

运行 Property 7 相关的所有属性测试
"""

import subprocess
import sys

def run_property7_tests():
    """运行 Property 7 的属性测试"""
    print("=" * 70)
    print("Property 7: 仓库分配事件触发 属性测试")
    print("**Feature: unified-realtime-system**")
    print("**Validates: Requirements 5.1, 5.2**")
    print("=" * 70)
    
    # 运行 pytest 测试
    result = subprocess.run(
        [
            sys.executable, "-m", "pytest",
            "test_events_pbt.py",
            "-v",
            "-k", "assignment",
            "--tb=short"
        ],
        capture_output=False
    )
    
    return result.returncode == 0


if __name__ == "__main__":
    success = run_property7_tests()
    sys.exit(0 if success else 1)
