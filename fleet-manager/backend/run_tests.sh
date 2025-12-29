#!/bin/bash
# ============================================
# 测试运行脚本 (macOS/Linux)
# 用于运行后端测试套件并生成报告
# ============================================

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 切换到后端目录
cd "$(dirname "$0")"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Fleet Manager 后端测试套件${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查 Python 环境
echo -e "${YELLOW}检查 Python 环境...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}错误: 未找到 python3${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "Python 版本: ${GREEN}$PYTHON_VERSION${NC}"

# 检查 pytest
echo -e "${YELLOW}检查 pytest...${NC}"
if ! python3 -c "import pytest" &> /dev/null; then
    echo -e "${RED}错误: 未安装 pytest，正在安装...${NC}"
    python3 -m pip install pytest pytest-cov pytest-html --quiet
fi

# 设置测试环境变量
export DATABASE_URL="sqlite:///:memory:"
export JWT_SECRET_KEY="test-secret-key"
export DEBUG="true"

# 解析命令行参数
COVERAGE=""
HTML_REPORT=""
VERBOSE="-v"
TEST_PATH="tests/"

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage|-c)
            COVERAGE="--cov=. --cov-report=html --cov-report=term-missing"
            shift
            ;;
        --html|-h)
            HTML_REPORT="--html=test_report.html --self-contained-html"
            shift
            ;;
        --quiet|-q)
            VERBOSE=""
            shift
            ;;
        --file|-f)
            TEST_PATH="$2"
            shift 2
            ;;
        *)
            TEST_PATH="$1"
            shift
            ;;
    esac
done

echo ""
echo -e "${YELLOW}运行测试...${NC}"
echo -e "测试路径: ${GREEN}$TEST_PATH${NC}"
echo ""

# 运行测试
python3 -m pytest $TEST_PATH $VERBOSE $COVERAGE $HTML_REPORT --tb=short

# 检查测试结果
TEST_RESULT=$?

echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✅ 所有测试通过！${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ❌ 部分测试失败${NC}"
    echo -e "${RED}========================================${NC}"
fi

# 显示报告位置
if [ -n "$COVERAGE" ]; then
    echo ""
    echo -e "${YELLOW}覆盖率报告: ${GREEN}htmlcov/index.html${NC}"
fi

if [ -n "$HTML_REPORT" ]; then
    echo -e "${YELLOW}测试报告: ${GREEN}test_report.html${NC}"
fi

exit $TEST_RESULT
