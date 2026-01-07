"""
应用版本 CRUD 属性测试模块

使用 Hypothesis 进行属性测试，验证版本管理的核心正确性属性。

Properties:
    - Property 1: 版本比较正确性 (Requirements 2.1, 8.2, 8.3)
    - Property 5: 最低兼容版本逻辑 (Requirements 2.6)
    - Property 8: 平台筛选正确性 (Requirements 7.3)
    - Property 9: 下载统计累加正确性 (Requirements 7.4)
"""

import pytest
from hypothesis import given, settings, strategies as st
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool
from contextlib import contextmanager

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crud.app_version import (
    create_version,
    get_latest_version,
    get_version_history,
    increment_download_count,
    check_update
)
from schemas import VersionCreate


# ==================== 数据库会话管理 ====================

@contextmanager
def get_test_session():
    """
    创建测试数据库会话的上下文管理器
    每次调用都会创建一个全新的内存数据库
    
    Yields:
        Session: 数据库会话对象
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        yield session
    
    SQLModel.metadata.drop_all(engine)


# ==================== 测试策略 ====================

# 版本号策略：生成 1-9999 范围内的整数
version_code_strategy = st.integers(min_value=1, max_value=9999)

# 版本名称策略：生成类似 "1.2.3" 格式的版本名
version_name_strategy = st.builds(
    lambda major, minor, patch: f"{major}.{minor}.{patch}",
    major=st.integers(min_value=0, max_value=99),
    minor=st.integers(min_value=0, max_value=99),
    patch=st.integers(min_value=0, max_value=99)
)

# 平台策略
platform_strategy = st.sampled_from(["android", "ios"])

# 更新类型策略
update_type_strategy = st.sampled_from(["wgt", "apk"])

# MD5 策略：生成 32 位十六进制字符串
md5_strategy = st.text(
    alphabet="0123456789abcdef",
    min_size=32,
    max_size=32
)

# 文件大小策略
file_size_strategy = st.integers(min_value=1000, max_value=100000000)

# 下载 URL 策略
download_url_strategy = st.builds(
    lambda name: f"https://example.com/updates/{name}",
    name=st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789", min_size=5, max_size=20)
)


def version_create_strategy():
    """
    生成 VersionCreate 数据策略
    
    Returns:
        st.SearchStrategy: VersionCreate 数据策略
    """
    return st.builds(
        VersionCreate,
        version_name=version_name_strategy,
        version_code=version_code_strategy,
        platform=platform_strategy,
        update_type=update_type_strategy,
        download_url=download_url_strategy,
        file_size=file_size_strategy,
        md5=md5_strategy,
        description=st.one_of(st.none(), st.text(min_size=1, max_size=100)),
        is_force_update=st.booleans(),
        min_compatible_version=st.integers(min_value=0, max_value=9999)
    )


# ==================== Property 1: 版本比较正确性 ====================

@settings(max_examples=20, deadline=None)
@given(
    current_code=version_code_strategy,
    latest_code=version_code_strategy,
    platform=platform_strategy
)
def test_property_1_version_comparison_correctness(
    current_code: int,
    latest_code: int,
    platform: str
):
    """
    Property 1: 版本比较正确性
    
    *For any* 两个版本号 A 和 B，当 A.version_code < B.version_code 时，
    版本检查应返回 has_update: true；当 A.version_code >= B.version_code 时，
    应返回 has_update: false。
    
    **Validates: Requirements 2.1, 8.2, 8.3**
    
    Feature: hot-update, Property 1: 版本比较正确性
    """
    with get_test_session() as session:
        # 创建一个版本记录
        version_data = VersionCreate(
            version_name=f"{latest_code // 100}.{(latest_code % 100) // 10}.{latest_code % 10}",
            version_code=latest_code,
            platform=platform,
            update_type="wgt",
            download_url=f"https://example.com/update_{latest_code}.wgt",
            file_size=1024000,
            md5="a" * 32,
            description="测试版本",
            is_force_update=False,
            min_compatible_version=0
        )
        create_version(session, version_data)
        
        # 检查更新
        response = check_update(session, current_code, platform)
        
        # 验证属性：版本比较正确性
        if current_code < latest_code:
            # 当前版本低于最新版本，应该有更新
            assert response.has_update is True, \
                f"当前版本 {current_code} < 最新版本 {latest_code}，应返回 has_update=True"
        else:
            # 当前版本等于或高于最新版本，不应该有更新
            assert response.has_update is False, \
                f"当前版本 {current_code} >= 最新版本 {latest_code}，应返回 has_update=False"


# ==================== Property 5: 最低兼容版本逻辑 ====================

@settings(max_examples=20, deadline=None)
@given(
    current_code=version_code_strategy,
    latest_code=version_code_strategy,
    min_compatible=version_code_strategy,
    original_update_type=update_type_strategy,
    platform=platform_strategy
)
def test_property_5_min_compatible_version_logic(
    current_code: int,
    latest_code: int,
    min_compatible: int,
    original_update_type: str,
    platform: str
):
    """
    Property 5: 最低兼容版本逻辑
    
    *For any* 客户端版本低于服务器配置的 min_compatible_version 时，
    update_type 必须为 "apk"（整包更新）。
    
    **Validates: Requirements 2.6**
    
    Feature: hot-update, Property 5: 最低兼容版本逻辑
    """
    with get_test_session() as session:
        # 确保 latest_code > current_code 以触发更新
        if latest_code <= current_code:
            latest_code = current_code + 1
        
        # 创建版本记录
        version_data = VersionCreate(
            version_name=f"{latest_code // 100}.{(latest_code % 100) // 10}.{latest_code % 10}",
            version_code=latest_code,
            platform=platform,
            update_type=original_update_type,
            download_url=f"https://example.com/update_{latest_code}.wgt",
            file_size=1024000,
            md5="b" * 32,
            description="测试版本",
            is_force_update=False,
            min_compatible_version=min_compatible
        )
        create_version(session, version_data)
        
        # 检查更新
        response = check_update(session, current_code, platform)
        
        # 验证属性：最低兼容版本逻辑
        if response.has_update:
            if min_compatible > 0 and current_code < min_compatible:
                # 当前版本低于最低兼容版本，必须整包更新
                assert response.update_type == "apk", \
                    f"当前版本 {current_code} < 最低兼容版本 {min_compatible}，" \
                    f"update_type 应为 'apk'，实际为 '{response.update_type}'"
            else:
                # 当前版本满足最低兼容要求，使用原始更新类型
                assert response.update_type == original_update_type, \
                    f"当前版本 {current_code} >= 最低兼容版本 {min_compatible}，" \
                    f"update_type 应为 '{original_update_type}'，实际为 '{response.update_type}'"


# ==================== Property 8: 平台筛选正确性 ====================

@settings(max_examples=20, deadline=None)
@given(
    versions_data=st.lists(
        st.tuples(version_code_strategy, platform_strategy),
        min_size=1,
        max_size=10
    ),
    query_platform=platform_strategy
)
def test_property_8_platform_filter_correctness(
    versions_data: list,
    query_platform: str
):
    """
    Property 8: 平台筛选正确性
    
    *For any* 按平台筛选的版本查询，返回结果中所有版本的 platform 字段
    必须与查询参数一致。
    
    **Validates: Requirements 7.3**
    
    Feature: hot-update, Property 8: 平台筛选正确性
    """
    with get_test_session() as session:
        # 创建多个版本记录
        for i, (code, platform) in enumerate(versions_data):
            version_data = VersionCreate(
                version_name=f"{code // 100}.{(code % 100) // 10}.{code % 10}",
                version_code=code + i * 10000,  # 确保版本号唯一
                platform=platform,
                update_type="wgt",
                download_url=f"https://example.com/update_{code}_{i}.wgt",
                file_size=1024000,
                md5="c" * 32,
                description=f"测试版本 {i}",
                is_force_update=False,
                min_compatible_version=0
            )
            create_version(session, version_data)
        
        # 按平台查询版本历史
        history = get_version_history(session, platform=query_platform)
        
        # 验证属性：所有返回结果的平台必须与查询参数一致
        for version in history:
            assert version.platform == query_platform, \
                f"查询平台 '{query_platform}'，但返回版本的平台为 '{version.platform}'"


# ==================== Property 9: 下载统计累加正确性 ====================

@settings(max_examples=20, deadline=None)
@given(
    increment_count=st.integers(min_value=1, max_value=10),
    platform=platform_strategy
)
def test_property_9_download_count_increment_correctness(
    increment_count: int,
    platform: str
):
    """
    Property 9: 下载统计累加正确性
    
    *For any* 版本下载操作，该版本的 download_count 应增加 1。
    
    **Validates: Requirements 7.4**
    
    Feature: hot-update, Property 9: 下载统计累加正确性
    """
    with get_test_session() as session:
        # 创建版本记录
        version_data = VersionCreate(
            version_name="1.0.0",
            version_code=100,
            platform=platform,
            update_type="wgt",
            download_url="https://example.com/update.wgt",
            file_size=1024000,
            md5="d" * 32,
            description="测试版本",
            is_force_update=False,
            min_compatible_version=0
        )
        version = create_version(session, version_data)
        initial_count = version.download_count
        
        # 多次增加下载次数
        for i in range(increment_count):
            expected_count = initial_count + i + 1
            updated_version = increment_download_count(session, version.id)
            
            # 验证属性：每次调用后 download_count 应增加 1
            assert updated_version is not None, "版本不应为 None"
            assert updated_version.download_count == expected_count, \
                f"第 {i + 1} 次增加后，download_count 应为 {expected_count}，" \
                f"实际为 {updated_version.download_count}"
