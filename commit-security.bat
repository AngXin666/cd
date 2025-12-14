@echo off
chcp 65001 >nul
git commit -m "security: fix 8 vulnerabilities" -m "- Upgrade vitest to 1.6.1" -m "- Add pnpm overrides for indirect dependencies" -m "- Fix git-clone, http-cache-semantics, html-minifier vulnerabilities" -m "- Fix glob, esbuild, vite-plugin-static-copy vulnerabilities" -m "- Fix got UNIX socket redirect vulnerability" -m "" -m "See SECURITY_FIXES.md for details"
