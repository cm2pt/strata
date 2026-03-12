"""Platform-specific extractors — generate realistic metadata for each data platform."""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .base_extractor import BaseExtractor

_REGISTRY: dict[str, type["BaseExtractor"]] = {}


def _register_all() -> None:
    """Lazy-import extractors to populate the registry."""
    if _REGISTRY:
        return
    from .snowflake_extractor import SnowflakeExtractor  # noqa: F401
    from .databricks_extractor import DatabricksExtractor  # noqa: F401
    from .bigquery_extractor import BigQueryExtractor  # noqa: F401


def register_extractor(platform: str):
    """Decorator to register an extractor class for a platform."""
    def decorator(cls):
        _REGISTRY[platform] = cls
        return cls
    return decorator


def get_extractor(platform: str, config: dict | None = None) -> "BaseExtractor | None":
    """Get an extractor instance for the given platform, or None if unsupported."""
    _register_all()
    cls = _REGISTRY.get(platform)
    if cls is None:
        return None
    return cls(config or {})
