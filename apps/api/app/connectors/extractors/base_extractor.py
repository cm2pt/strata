"""Base extractor interface — all platform extractors implement this."""

import hashlib
import random
from abc import ABC, abstractmethod
from typing import Any


class BaseExtractor(ABC):
    """Abstract base for platform-specific metadata extractors."""

    def __init__(self, config: dict[str, Any]):
        self.config = config

    def _get_rng(self, salt: str = "") -> random.Random:
        """Deterministic RNG seeded from config + salt (matches mock_connector pattern)."""
        seed_str = str(self.config.get("seed", "demo-seed")) + salt
        seed_int = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32)
        return random.Random(seed_int)

    @property
    @abstractmethod
    def platform(self) -> str:
        """Return the platform identifier (snowflake, databricks, bigquery)."""
        ...

    @abstractmethod
    def generate_capabilities(self) -> list[dict[str, Any]]:
        """Return extraction capability matrix for this platform.

        Each item is a dict with keys:
          - capability_category: str (e.g. 'schema_metadata')
          - capability_name: str (e.g. 'Column-level types and constraints')
          - is_available: bool
          - requires_elevated_access: bool
          - extraction_method: str (e.g. 'INFORMATION_SCHEMA.COLUMNS')
          - refresh_frequency: str (e.g. 'per-sync', 'daily')
        """
        ...

    @abstractmethod
    def generate_schema_metadata(self, asset_count: int = 10) -> list[dict[str, Any]]:
        """Generate platform-realistic schema metadata."""
        ...

    def field_provenance_mapping(self) -> dict[str, dict[str, Any]]:
        """Return default field→provenance mapping for this platform.

        Keys are field names (monthly_cost, monthly_consumers, etc.).
        Values are dicts with extraction_method, automation_level, confidence.
        """
        return {
            "monthly_cost": {
                "extraction_method": self._cost_method(),
                "automation_level": "fully_automated",
                "confidence": 0.95,
            },
            "monthly_consumers": {
                "extraction_method": self._usage_method(),
                "automation_level": "fully_automated",
                "confidence": 0.92,
            },
            "composite_value": {
                "extraction_method": "Computed from cost + usage + trust metrics",
                "automation_level": "fully_automated",
                "confidence": 0.90,
            },
            "trust_score": {
                "extraction_method": self._quality_method(),
                "automation_level": "semi_automated",
                "confidence": 0.80,
            },
            "usage_trend": {
                "extraction_method": self._usage_method(),
                "automation_level": "fully_automated",
                "confidence": 0.88,
            },
            "cost_trend": {
                "extraction_method": self._cost_method(),
                "automation_level": "fully_automated",
                "confidence": 0.93,
            },
        }

    @abstractmethod
    def _cost_method(self) -> str:
        """Return the platform-specific cost extraction method name."""
        ...

    @abstractmethod
    def _usage_method(self) -> str:
        """Return the platform-specific usage extraction method name."""
        ...

    @abstractmethod
    def _quality_method(self) -> str:
        """Return the platform-specific quality/trust extraction method name."""
        ...
