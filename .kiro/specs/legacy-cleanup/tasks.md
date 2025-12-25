# Implementation Plan

## 主项目清理任务

- [x] 1. 创建备份




  - [x] 1.1 创建 Git 标签备份


    - 执行 `git tag -a v1.0-legacy -m "Legacy Taro+Supabase version before cleanup"`
    - 验证标签创建成功
    - _Requirements: 1.1_
  - [x] 1.2 推送标签到远程仓库


    - 执行 `git push origin v1.0-legacy`
    - 验证远程标签存在
    - _Requirements: 1.2, 1.3_

- [x] 2. 清理前端代码







  - [x] 2.1 删除 src/ 目录




    - 删除主项目前端源代码目录
    - _Requirements: 2.1_
  - [x] 2.2 删除 config/ 目录


    - 删除主项目配置文件目录
    - _Requirements: 2.2_

  - [x] 2.3 删除 dist/ 目录

    - 删除构建输出目录
    - _Requirements: 2.3_
  - [x] 2.4 删除 h5-bundles/ 目录


    - 删除 H5 热更新包目录
    - _Requirements: 2.4_

- [x] 3. 清理 Supabase 配置





  - [x] 3.1 删除 supabase/ 目录


    - 删除 Supabase 配置和迁移文件
    - _Requirements: 3.1_

- [x] 4. 清理 Android 代码





  - [x] 4.1 删除 android/ 目录


    - 删除 Capacitor Android 原生代码
    - _Requirements: 4.1_
  - [x] 4.2 删除 APK 文件


    - 删除根目录下的所有 .apk 文件
    - _Requirements: 4.2_


- [x] 5. 清理测试代码




  - [x] 5.1 删除 e2e/ 目录


    - 删除 Playwright E2E 测试代码
    - _Requirements: 5.1_
  - [x] 5.2 删除 playwright-report/ 目录


    - 删除 Playwright 测试报告
    - _Requirements: 5.1_
  - [x] 5.3 删除 test-results/ 目录


    - 删除测试结果目录
    - _Requirements: 5.1_


- [x] 6. 清理根目录配置文件




  - [x] 6.1 删除包管理配置


    - 删除 package.json, pnpm-lock.yaml, pnpm-workspace.yaml
    - _Requirements: 6.1_
  - [x] 6.2 删除 TypeScript 和样式配置


    - 删除 tsconfig.json, tailwind.config.js, postcss.config.js
    - _Requirements: 6.2_
  - [x] 6.3 删除项目配置


    - 删除 project.config.json, project.private.config.json
    - _Requirements: 6.3_
  - [x] 6.4 删除 node_modules/ 目录


    - 删除主项目依赖目录
    - _Requirements: 6.4_


- [x] 7. 清理归档和杂项




  - [x] 7.1 删除 archive/ 目录


    - 删除归档文件目录
    - _Requirements: 7.1_

  - [x] 7.2 评估 rules/ 目录

    - 检查 rules/ 目录内容，决定是否保留
    - _Requirements: 7.2_

- [x] 8. Checkpoint - 清理完成验证





  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. 验证清理结果





  - [x] 9.1 验证保留目录完整性


    - 确认 fleet-manager/ 目录完整
    - 确认 .git/, .kiro/, .vscode/ 目录存在
    - _Requirements: 8.1, 8.2_
  - [x] 9.2 验证新框架可用性


    - 验证后端代码语法正确
    - 验证前端 TypeScript 编译通过
    - _Requirements: 8.3_
  - [x] 9.3 提交清理变更


    - 执行 `git add -A`
    - 执行 `git commit -m "chore: cleanup legacy Taro+Supabase code after migration to fleet-manager"`
    - _Requirements: 8.4_

- [x] 10. Final Checkpoint - 确保清理成功





  - Ensure all tests pass, ask the user if questions arise.
