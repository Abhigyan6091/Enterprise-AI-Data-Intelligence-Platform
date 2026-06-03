import sys
from loguru import logger

def setup_logging():
    """Configure structured logging for observability integrations."""
    logger.remove()
    
    # Console logging for local observation
    logger.add(
        sys.stdout,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO"
    )
    
    # File logging for metric scraping / troubleshooting
    logger.add(
        "logs/platform_{time:YYYY-MM-DD}.log",
        rotation="100 MB",
        retention="14 days",
        level="DEBUG",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} | {message}"
    )

setup_logging()
