# -*- coding: utf-8 -*-
"""
Property 6 Test Runner - Direct Execution
Validates: Requirements 4.1, 4.2
"""
import sys
import os

# Change to backend directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 70)
print("Property 6: Piece Work Event Trigger Tests")
print("=" * 70)

# Step 1: Syntax check
print("\nStep 1: Syntax check...")
import py_compile
try:
    py_compile.compile('test_events_pbt.py', doraise=True)
    print("  [OK] Syntax check passed!")
except py_compile.PyCompileError as e:
    print(f"  [FAIL] Syntax error: {e}")
    sys.exit(1)

# Step 2: Import and run tests
print("\nStep 2: Running Property 6 tests...")
try:
    from test_events_pbt import (
        test_property_piece_work_event_trigger,
        test_property_piece_work_event_to_driver_and_manager,
        test_property_piece_work_action_correctness,
        test_property_multiple_piece_work_records,
        test_property_piece_work_event_serializable,
        test_property_piece_work_quantity_and_amount,
    )
    print("  [OK] Import successful!")
except ImportError as e:
    print(f"  [FAIL] Import error: {e}")
    sys.exit(1)

tests = [
    ("Piece work event trigger (Req 4.1, 4.2)", test_property_piece_work_event_trigger),
    ("Event push to driver and manager (Req 4.1, 4.2)", test_property_piece_work_event_to_driver_and_manager),
    ("Action type correctness (Req 4.1, 4.2)", test_property_piece_work_action_correctness),
    ("Multiple piece work records (Req 4.1, 4.2)", test_property_multiple_piece_work_records),
    ("Event serializable (Req 4.1, 4.2)", test_property_piece_work_event_serializable),
    ("Quantity and amount validation (Req 4.1, 4.2)", test_property_piece_work_quantity_and_amount),
]

passed = 0
failed = 0

for name, test_func in tests:
    print(f"\n--- {name} ---")
    try:
        test_func()
        print(f"  [PASS] {name}")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] {name}")
        print(f"         Error: {str(e)[:200]}")
        failed += 1

print("\n" + "=" * 70)
print("Property 6 Test Results Summary")
print("=" * 70)
print(f"Total tests: {passed + failed}")
print(f"Passed: {passed}")
print(f"Failed: {failed}")

if failed == 0:
    print("\n[SUCCESS] All Property 6 tests passed!")
    print("Requirements 4.1, 4.2 validated!")
else:
    print(f"\n[WARNING] {failed} test(s) failed")

sys.exit(0 if failed == 0 else 1)
