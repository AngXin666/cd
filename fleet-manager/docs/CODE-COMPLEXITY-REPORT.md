# 代码复杂度报告

**更新日期**: 2026-01-05

---

## 总体统计

| 指标 | 数值 |
|------|------|
| 总函数数 | 415 |
| 平均圈复杂度 | A (2.38) |
| C 级函数 | 0 |

## 复杂度等级说明

- **A (1-5)**: 低复杂度 ✅
- **B (6-10)**: 中等复杂度 ⚠️
- **C (11+)**: 高复杂度 ❌

## 当前分布

| 等级 | 数量 | 占比 | 状态 |
|------|------|------|------|
| A 级 | ~355 | 85%+ | ✅ |
| B 级 | ~60 | 15%- | ✅ |
| C 级 | 0 | 0% | ✅ |

## 各模块复杂度

| 模块 | 平均复杂度 | 最高复杂度 |
|------|------------|------------|
| routers/auth.py | A (2.5) | B (6) |
| routers/users.py | A (3.0) | B (10) |
| routers/vehicles.py | A (3.0) | B (8) |
| routers/warehouses.py | A (2.8) | B (7) |
| routers/attendance.py | A (2.2) | A (5) |
| routers/piece_work.py | A (3.2) | B (8) |
| routers/leave.py | A (2.8) | B (7) |
| routers/notifications.py | A (3.0) | B (8) |
| routers/scheduled.py | A (3.5) | B (10) |
| crud.py | A (2.82) | B (10) |
| helpers.py | A (3.0) | B (8) |

## 分析工具

```bash
# 运行复杂度分析
python3 -m radon cc . -a -s --exclude "venv/*,__pycache__/*"

# 只显示 B 级及以上
python3 -m radon cc . -a -s -nb
```

---

*分析工具: radon*
