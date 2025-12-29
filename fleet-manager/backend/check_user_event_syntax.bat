@echo off
cd /d "%~dp0"
python -m py_compile events.py && echo events.py SYNTAX_OK
python -m py_compile main.py && echo main.py SYNTAX_OK
python -c "from events import emit_user_update; print('emit_user_update imported successfully')"
