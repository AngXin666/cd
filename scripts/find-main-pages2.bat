@echo off
echo === Check 8b6e91d0 commit for src/pages ===
git ls-tree -r --name-only 8b6e91d0 | findstr "src/pages"

echo.
echo === Check 025d8de2 commit for src/pages ===
git ls-tree -r --name-only 025d8de2 | findstr "src/pages"
