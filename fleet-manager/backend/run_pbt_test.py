"""
运行 Property 4 属性测试的脚本
"""
import subprocess
import sys

def run_tests():
    """运行 Property 4 的属性测试"""
    output_file = "pbt_test_output.txt"
    
    # 运行 pytest
    result = subprocess.run(
        [
            sys.executable, "-m", "pytest",
            "test_events_pbt.py",
            "-v",
            "-k", "vehicle_approval or vehicle_event_only or vehicle_approval_status or multiple_vehicle or vehicle_event_serializable",
            "--tb=short"
        ],
        capture_output=True,
        text=True
    )
    
    # 写入输出文件
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("=" * 70 + "\n")
        f.write("Running Property 4: Vehicle Approval Event Trigger Tests\n")
        f.write("**Feature: unified-realtime-system**\n")
        f.write("**Validates: Requirements 2.1, 2.4**\n")
        f.write("=" * 70 + "\n\n")
        f.write("STDOUT:\n")
        f.write(result.stdout)
        if result.stderr:
            f.write("\nSTDERR:\n")
            f.write(result.stderr)
        f.write("\n" + "=" * 70 + "\n")
        f.write(f"Exit code: {result.returncode}\n")
    
    print(f"Test output written to {output_file}")
    return result.returncode

if __name__ == "__main__":
    sys.exit(run_tests())
