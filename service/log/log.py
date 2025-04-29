import logging
import os

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG if os.getenv("DEBUG", False) == "True" else logging.INFO)
