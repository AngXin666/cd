"""
数据库连接模块
管理 SQLite/PostgreSQL 数据库连接和会话

支持的数据库：
- SQLite（开发环境）：sqlite:///./data/app.db
- PostgreSQL（生产环境）：postgresql://user:password@host:port/database
"""

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import QueuePool, StaticPool
from config import get_settings, get_database_url
import os
import logging

# 配置日志
logger = logging.getLogger(__name__)

# 获取配置
settings = get_settings()

# 获取数据库 URL
database_url = get_database_url()


def create_database_engine():
    """
    创建数据库引擎
    根据数据库类型（SQLite/PostgreSQL）配置不同的连接参数
    
    Returns:
        Engine: SQLAlchemy 数据库引擎
    """
    # 连接参数
    connect_args = {}
    engine_kwargs = {
        "echo": settings.debug,  # 开发模式下打印 SQL
    }
    
    if database_url.startswith("sqlite"):
        # SQLite 配置
        # check_same_thread=False 以支持多线程
        connect_args["check_same_thread"] = False
        # SQLite 使用 StaticPool（单连接）
        engine_kwargs["poolclass"] = StaticPool
        # 确保数据目录存在
        os.makedirs("data", exist_ok=True)
        logger.info(f"使用 SQLite 数据库: {database_url}")
        
    elif database_url.startswith("postgresql"):
        # PostgreSQL 配置
        # 使用连接池
        engine_kwargs["poolclass"] = QueuePool
        engine_kwargs["pool_size"] = settings.db_pool_size
        engine_kwargs["max_overflow"] = settings.db_max_overflow
        engine_kwargs["pool_timeout"] = settings.db_pool_timeout
        engine_kwargs["pool_pre_ping"] = True  # 连接前检查连接是否有效
        logger.info(f"使用 PostgreSQL 数据库，连接池大小: {settings.db_pool_size}")
    
    else:
        # 其他数据库（如 MySQL）
        logger.warning(f"未知数据库类型: {database_url}")
    
    return create_engine(
        database_url,
        connect_args=connect_args,
        **engine_kwargs
    )


# 创建数据库引擎（全局单例）
engine = create_database_engine()


def create_db_and_tables():
    """
    创建数据库和所有表
    在应用启动时调用
    
    注意：
    - SQLite：自动创建数据库文件
    - PostgreSQL：需要先创建数据库
    """
    try:
        SQLModel.metadata.create_all(engine)
        logger.info("数据库表创建成功")
    except Exception as e:
        logger.error(f"数据库表创建失败: {e}")
        raise


def get_session():
    """
    获取数据库会话
    用于 FastAPI 依赖注入
    
    Yields:
        Session: 数据库会话对象
    
    Example:
        @app.get("/users")
        def get_users(session: Session = Depends(get_session)):
            return session.exec(select(User)).all()
    """
    with Session(engine) as session:
        yield session


def check_database_connection() -> bool:
    """
    检查数据库连接是否正常
    用于健康检查
    
    Returns:
        bool: True 表示连接正常，False 表示连接失败
    """
    try:
        with Session(engine) as session:
            # 执行简单查询测试连接
            session.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"数据库连接检查失败: {e}")
        return False
