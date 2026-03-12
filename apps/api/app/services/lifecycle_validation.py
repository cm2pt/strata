"""Lifecycle stage transition validation.

Defines which lifecycle stage transitions are valid and provides a
validation helper that can be used by any endpoint or service that
updates a data product's lifecycle stage.
"""

from fastapi import HTTPException

# Maps each lifecycle stage to the set of stages it may transition to.
VALID_TRANSITIONS: dict[str, list[str]] = {
    "draft": ["active"],
    "active": ["growth", "mature", "decline", "retired"],
    "growth": ["mature", "decline", "retired"],
    "mature": ["decline", "retired"],
    "decline": ["retired", "active"],
    "retired": [],
}


def validate_lifecycle_transition(current_stage: str, new_stage: str) -> None:
    """Raise HTTPException(400) if the transition is not allowed."""
    allowed = VALID_TRANSITIONS.get(current_stage, [])
    if new_stage not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid lifecycle transition from '{current_stage}' to '{new_stage}'"
        )
