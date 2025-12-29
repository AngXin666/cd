"""
Property 6: 计件记录事件触发 属性测试运行脚本
**Feature: unified-realtime-system**
**Validates: Requirements 4.1, 4.2**

运行计件记录事件触发相关的所有属性测试
"""
import sys
import py_compile

def check_syntax():
    """检查语法"""
    print("检查语法...")
    try:
        py_compile.compile('test_events_pbt.py', doraise=True)
        print("✅ 语法检查通过!")
        return True
    except py_compile.PyCompileError as e:
        print(f"❌ 语法错误: {e}")
        return False

def run_property6_tests():
    """运行 Property 6 计件记录事件触发的所有属性测试"""
    print("=" * 70)
    print("Property 6: 计件记录事件触发 属性测试")
    print("**Feature: unified-realtime-system**")
    print("**Validates: Requirements 4.1, 4.2**")
    print("=" * 70)
    
    # 先检查语法
    if not check_syntax():
        return False
    
    # 导入测试函数
    from test_events_pbt import (
        test_property_piece_work_event_trigger,
        test_property_piece_work_event_to_driver_and_manager,
        test_property_piece_work_action_correctness,
        test_property_multiple_piece_work_records,
        test_property_piece_work_event_serializable,
        test_property_piece_work_quantity_and_amount,
    )
    
    tests = [
        ("计件记录事件触发 (Req 4.1, 4.2)", test_property_piece_work_event_trigger),
        ("计件事件推送给司机和车队长 (Req 4.1, 4.2)", test_property_piece_work_event_to_driver_and_manager),
        ("计件操作类型正确性 (Req 4.1, 4.2)", test_property_piece_work_action_correctness),
        ("多次计件记录提交 (Req 4.1, 4.2)", test_property_multiple_piece_work_records),
        ("计件事件可序列化 (Req 4.1, 4.2)", test_property_piece_work_event_serializable),
        ("计件数量和金额 (Req 4.1, 4.2)", test_property_piece_work_quantity_and_amount),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        print(f"\n--- {name} ---")
        try:
            test_func()
            print(f"  ✅ {name}: PASSED")
            passed += 1
        except Exception as e:
            print(f"  ❌ {name}: FAILED")
            print(f"     错误: {str(e)[:200]}")
            failed += 1
    
    print("\n" + "=" * 70)
    print("Property 6 测试结果汇总")
    print("=" * 70)
    print(f"总测试数: {passed + failed}")
    print(f"通过: {passed}")
    print(f"失败: {failed}")
    
    if failed == 0:
        print("\n🎉 Property 6 所有属性测试通过！")
        print("Requirements 4.1, 4.2 验证完成")
    else:
        print(f"\n⚠️ 有 {failed} 个测试失败")
    
    return failed == 0


if __name__ == "__main__":
    success = run_property6_tests()
    sys.exit(0 if success else 1)
