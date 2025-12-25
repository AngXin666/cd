"""
运行车辆列表过滤属性测试并输出结果
"""
import subprocess
import sys

def main():
    """运行测试并输出结果"""
    print("=" * 60)
    print("运行车辆列表过滤属性测试")
    print("=" * 60)
    
    # 运行 pytest
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "test_vehicle_list_filter_pbt.py", "-v", "--tb=short"],
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace'
    )
    
    # 输出结果
    print("\n--- STDOUT ---")
    print(result.stdout)
    
    if result.stderr:
        print("\n--- STDERR ---")
        print(result.stderr)
    
    print(f"\n退出码: {result.returncode}")
    
    # 保存结果到文件
    with open("filter_pbt_test_output.txt", "w", encoding="utf-8") as f:
        f.write("=" * 60 + "\n")
        f.write("车辆列表过滤属性测试结果\n")
        f.write("=" * 60 + "\n\n")
        f.write("--- STDOUT ---\n")
        f.write(result.stdout)
        if result.stderr:
            f.write("\n--- STDERR ---\n")
            f.write(result.stderr)
        f.write(f"\n退出码: {result.returncode}\n")
    
    print("\n结果已保存到 filter_pbt_test_output.txt")
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
