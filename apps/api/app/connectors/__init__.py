"""Connector framework — import all implementations to trigger registration."""
from .base import BaseConnector  # noqa: F401
from .registry import get_connector, list_registered, register  # noqa: F401
from .types import (  # noqa: F401
    ConnectionTestResult,
    CostEvent,
    CoverageReport,
    EdgeRecord,
    SourceAsset,
    UsageEvent,
)

# Import connector implementations to trigger @register decorators
from . import mock_connector  # noqa: F401
from . import replay_connector  # noqa: F401
from . import postgres_connector  # noqa: F401
from . import discovery_replay_connector  # noqa: F401
