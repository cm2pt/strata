"""Structured JSON logging configuration for the Strata API.

Provides a JSONFormatter that outputs one JSON object per log line,
suitable for ingestion by log aggregators (Datadog, ELK, CloudWatch, etc.).

Call ``setup_logging()`` once at application startup (e.g. in main.py lifespan).
"""

import logging
import json
import sys
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """Emit each log record as a single-line JSON object."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Merge any structured extras attached by callers
        # (e.g.  logger.info("msg", extra={...})  )
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id  # type: ignore[attr-defined]
        if hasattr(record, "org_id"):
            log_data["org_id"] = record.org_id  # type: ignore[attr-defined]
        if hasattr(record, "action"):
            log_data["action"] = record.action  # type: ignore[attr-defined]
        if hasattr(record, "entity_type"):
            log_data["entity_type"] = record.entity_type  # type: ignore[attr-defined]
        if hasattr(record, "entity_id"):
            log_data["entity_id"] = record.entity_id  # type: ignore[attr-defined]
        if hasattr(record, "details"):
            log_data["details"] = record.details  # type: ignore[attr-defined]
        if hasattr(record, "ip_address"):
            log_data["ip_address"] = record.ip_address  # type: ignore[attr-defined]

        # Preserve any generic 'extra' dict the caller may have supplied
        extra = getattr(record, "extra", None)
        if isinstance(extra, dict):
            log_data.update(extra)

        if record.exc_info and record.exc_info[0]:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, default=str)


def setup_logging(*, level: int = logging.INFO) -> None:
    """Configure the root logger (and key Strata loggers) with JSON output.

    Should be called once during application startup.
    """
    root = logging.getLogger()
    root.setLevel(level)

    # Remove any existing handlers to avoid duplicate output
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root.addHandler(handler)

    # Silence overly chatty third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # Ensure our audit logger is at least INFO
    logging.getLogger("strata.audit").setLevel(logging.INFO)
