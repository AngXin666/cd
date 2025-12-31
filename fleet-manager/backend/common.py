"""
公共函数模块
提取 auth.py 和 crud.py 共用的函数，解决循环导入问题

主要功能：
- 密码哈希和验证
- 其他公共工具函数
"""

from passlib.context import CryptContext

# 密码哈希上下文
# 使用 bcrypt 算法进行密码哈希
# 注意：bcrypt_sha256 方案可以处理超过 72 字节的密码，避免兼容性问题
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__ident="2b")


def hash_password(password: str) -> str:
    """
    对密码进行哈希处理

    Args:
        password: 明文密码

    Returns:
        str: 哈希后的密码
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码是否正确

    Args:
        plain_password: 明文密码
        hashed_password: 哈希后的密码

    Returns:
        bool: 密码是否匹配
    """
    return pwd_context.verify(plain_password, hashed_password)
