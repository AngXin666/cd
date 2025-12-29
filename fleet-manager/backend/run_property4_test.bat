@echo off
echo Running Property 4: Vehicle Approval Event Trigger Tests
echo ========================================================
python -m pytest test_events_pbt.py -v -k "vehicle_approval or vehicle_event_only or vehicle_approval_status or multiple_vehicle or vehicle_event_serializable" --tb=short
echo ========================================================
echo Test completed
