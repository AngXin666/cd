"""
配置模块
管理应用程序的所有配置项，从环境变量加载
支持 SQLite（开发）和 PostgreSQL（生产）数据库
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    应用配置类
    使用 pydantic-settings 从环境变量自动加载配置

    环境变量映射：
    - DATABASE_URL: 数据库连接字符串
    - JWT_SECRET: JWT 密钥
    - JWT_EXPIRE_MINUTES: JWT 过期时间（分钟）
    - DEBUG: 调试模式
    - BAIDU_OCR_APP_ID: 百度 OCR 应用 ID
    - BAIDU_OCR_API_KEY: 百度 OCR API Key
    - BAIDU_OCR_SECRET_KEY: 百度 OCR Secret Key
    """

    # ============================================
    # 数据库配置
    # ============================================
    # 支持 SQLite 和 PostgreSQL
    # SQLite: sqlite:///./data/app.db
    # PostgreSQL: postgresql://user:password@host:port/database
    database_url: str = "sqlite:///./data/app.db"

    # PostgreSQL 连接池配置（仅 PostgreSQL 生效）
    db_pool_size: int = 5  # 连接池大小
    db_max_overflow: int = 10  # 最大溢出连接数
    db_pool_timeout: int = 30  # 连接超时（秒）

    # ============================================
    # JWT 认证配置
    # ============================================
    jwt_secret_key: str = "dev-secret-key"  # 生产环境必须更改！
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440  # 24小时

    # ============================================
    # 百度 OCR 配置（驾驶证识别）
    # ============================================
    baidu_ocr_app_id: str = ""
    baidu_ocr_api_key: str = ""
    baidu_ocr_secret_key: str = ""

    # ============================================
    # 服务器配置
    # ============================================
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # ============================================
    # CORS 配置
    # ============================================
    # 允许的源（逗号分隔）
    cors_origins: str = "*"

    class Config:
        """Pydantic 配置"""
        env_file = ".env"
        env_file_encoding = "utf-8"
        # 环境变量名称映射（支持大写环境变量）
        env_prefix = ""
        case_sensitive = False
        # 允许额外的环境变量（避免测试时因其他环境变量报错）
        extra = "ignore"

    @property
    def is_postgresql(self) -> bool:
        """
        判断是否使用 PostgreSQL 数据库

        Returns:
            bool: True 表示使用 PostgreSQL，False 表示使用 SQLite
        """
        return self.database_url.startswith("postgresql")

    @property
    def cors_origins_list(self) -> list:
        """
        获取 CORS 允许的源列表

        Returns:
            list: 允许的源列表
        """
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """
    获取配置单例
    使用 lru_cache 确保只创建一次配置实例

    Returns:
        Settings: 配置实例
    """
    return Settings()


def get_database_url() -> str:
    """
    获取数据库连接 URL
    优先使用环境变量 DATABASE_URL

    Returns:
        str: 数据库连接 URL
    """
    # 优先从环境变量获取
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url

    # 否则使用配置文件中的值
    return get_settings().database_url
