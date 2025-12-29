@echo off
echo Running category delete validation PBT test...
npx vitest run src/utils/__tests__/categoryDeleteValidation.pbt.test.ts --reporter=verbose --no-watch
echo Test completed.
