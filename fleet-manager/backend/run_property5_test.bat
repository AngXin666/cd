@echo off
echo ======================================================================
echo Property 5: 请假审批事件触发 属性测试
echo **Feature: unified-realtime-system**
echo **Validates: Requirements 3.1, 3.4**
echo ======================================================================
echo.

python -m pytest test_events_pbt.py::test_property_leave_approval_event_trigger test_events_pbt.py::test_property_leave_event_to_applicant_and_manager test_events_pbt.py::test_property_leave_approval_status_change test_events_pbt.py::test_property_leave_type_correctness test_events_pbt.py::test_property_multiple_leave_applications test_events_pbt.py::test_property_leave_event_serializable -v --tb=short

echo.
echo ======================================================================
echo 测试完成
echo ======================================================================
