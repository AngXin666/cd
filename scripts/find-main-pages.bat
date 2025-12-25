@echo off
echo === Find commits with src/pages (main project) ===
git log --oneline --all -- "src/pages/*.tsx" | head -20

echo.
echo === Check 8b6e91d0 commit ===
git ls-tree -r --name-only 8b6e91d0 | findstr "src/pages"
