"""Connector registry — register and instantiate connectors by type."""
import logging
from typing import Any, Type

from .base import BaseConnector

logger = logging.getLogger(__name__)

_REGISTRY: dict[str, Type[BaseConnector]] = {}


def register(connector_type: str):
    """Class decorator to register a connector implementation."""
    def wrapper(cls: Type[BaseConnector]) -> Type[BaseConnector]:
        _REGISTRY[connector_type] = cls
        logger.debug(f"Registered connector: {connector_type} -> {cls.__name__}")
        return cls
    return wrapper


def get_connector(connector_type: str, config: dict[str, Any]) -> BaseConnector:
    """Instantiate a connector by type string."""
    cls = _REGISTRY.get(connector_type)
    if cls is None:
        available = ", ".join(sorted(_REGISTRY.keys()))
        raise ValueError(f"Unknown connector type '{connector_type}'. Available: {available}")
    return cls(config)


def list_registered() -> list[str]:
    """Return all registered connector type names."""
    return sorted(_REGISTRY.keys())
