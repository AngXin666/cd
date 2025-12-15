# 事件驱动数据刷新 - 备份文件

## 备份时间
2025-12-15

## 备份文件列表

| 备份文件 | 原文件位置 |
|----------|------------|
| `eventBus.ts.backup` | `src/utils/eventBus.ts` |
| `useEventSubscription.ts.backup` | `src/hooks/useEventSubscription.ts` |
| `usePollingNotifications.ts.backup` | `src/hooks/usePollingNotifications.ts` |
| `useDataCache.ts.backup` | `src/hooks/useDataCache.ts` |
| `realtimeListener.ts.backup` | `src/utils/realtimeListener.ts` |

## 恢复方法

### 方法 1：手动恢复
将备份文件内容复制到对应的原文件位置。

### 方法 2：使用命令恢复（PowerShell）
```powershell
# 恢复所有文件
Copy-Item ".kiro/specs/event-driven-data-refresh/backup/eventBus.ts.backup" "src/utils/eventBus.ts" -Force
Copy-Item ".kiro/specs/event-driven-data-refresh/backup/useEventSubscription.ts.backup" "src/hooks/useEventSubscription.ts" -Force
Copy-Item ".kiro/specs/event-driven-data-refresh/backup/usePollingNotifications.ts.backup" "src/hooks/usePollingNotifications.ts" -Force
Copy-Item ".kiro/specs/event-driven-data-refresh/backup/useDataCache.ts.backup" "src/hooks/useDataCache.ts" -Force
Copy-Item ".kiro/specs/event-driven-data-refresh/backup/realtimeListener.ts.backup" "src/utils/realtimeListener.ts" -Force
```

### 方法 3：使用 Git 恢复
如果已经提交了代码，可以使用 Git 恢复：
```bash
# 恢复单个文件
git checkout HEAD~1 -- src/utils/eventBus.ts

# 恢复所有相关文件
git checkout HEAD~1 -- src/utils/eventBus.ts src/hooks/useEventSubscription.ts src/hooks/usePollingNotifications.ts src/hooks/useDataCache.ts src/utils/realtimeListener.ts
```

## 注意事项

1. 恢复前请确保当前代码已保存或提交
2. 恢复后需要重新编译项目
3. 如果有新增的文件（如 `useRealtimeSubscription.ts`），需要手动删除
