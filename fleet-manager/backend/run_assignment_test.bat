@echo off
python -m pytest test_events_pbt.py -k "assignment" -v --tb=short --max-examples=10 2>&1
