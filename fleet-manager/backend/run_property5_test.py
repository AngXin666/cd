"""
Property 5: 请假审批事件触发 属性测试运行脚本
**Feature: unified-realtime-system**
**Validates: Requirements 3.1, 3.4**

运行 Property 5 相关的所有属性测试
"""

import subprocess
import sys

def run_property5_tests():
    """运行 Property 5 请假审批事件触发的所有属性测试"""
    print("=" * 70)
    print("Property 5: 请假审批事件触发 属性测试")
    print("**Feature: unified-realtime-system**")
    print("**Validates: Requirements 3.1, 3.4**")
    print("=" * 70)
    print()
    
    # Property 5 相关的测试函数列表
    test_functions = [
        "test_property_leave_approval_event_trigger",
        "test_property_leave_event_to_applicant_and_manager",
        "test_property_leave_approval_status_change",
        "test_property_leave_type_correctness",
        "test_property_multiple_leave_applications",
        "test_property_leave_event_serializable",
    ]
    
    # 构建 pytest 命令
    test_specs = [f"test_events_pbt.py::{func}" for func in test_functions]
    cmd = [
        sys.executable, "-m", "pytest",
        *test_specs,
        "-v", "--tb=short"
    ]
    
    print(f"运行命令: {' '.join(cmd)}")
    print()
    
    # 运行测试
    result = subprocess.run(cmd, capture_output=False)
    
    print()
    print("=" * 70)
    if result.returncode == 0:
        print("✅ Property 5 所有测试通过！")
    else:
        print(f"❌ 测试失败，退出码: {result.returncode}")
    print("=" * 70)
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(run_property5_tests())
