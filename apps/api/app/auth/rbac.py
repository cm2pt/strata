"""
Strata — Role-Based Access Control Registry

Central source of truth for:
  - All permission strings
  - All role definitions (persona, focus route, nav priority, permissions)

Roles are stored as a PostgreSQL enum in user_org_roles.role.
This module maps each enum value to rich metadata used by the
auth dependency layer and the frontend focus-mode system.
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ──────────────────────────────────────────────────────────────────────
# Permission strings
# ──────────────────────────────────────────────────────────────────────

ALL_PERMISSIONS: list[str] = [
    # Connectors
    "connectors:read",
    "connectors:write",
    "connectors:run",
    # Candidates (discovery inbox)
    "candidates:read",
    "candidates:promote",
    "candidates:ignore",
    # Products
    "products:read",
    "products:write",
    "products:certify",
    # Marketplace
    "marketplace:read",
    "marketplace:subscribe",
    # Decisions
    "decisions:read",
    "decisions:create",
    "decisions:approve",
    "decisions:execute",
    # Pricing
    "pricing:simulate",
    "pricing:activate",
    # AI Scorecard
    "ai:read",
    "ai:flag",
    "ai:kill_approve",
    "ai:kill_execute",
    # Capital Impact
    "capital:read",
    "capital:export",
    # Portfolio (read-only; every authenticated user has at minimum)
    "portfolio:read",
    # Lifecycle
    "lifecycle:read",
    # Allocation
    "allocation:read",
    # Notifications
    "notifications:read",
    # Users / IAM
    "users:read",
    "users:write",
    # Audit
    "audit:read",
]


# ──────────────────────────────────────────────────────────────────────
# Role definition dataclass
# ──────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class RoleDefinition:
    """Immutable metadata for a single persona/role."""

    role_id: str                        # enum value stored in DB
    display_name: str                   # human-friendly label
    description: str                    # one-liner
    default_focus_route: str            # where user lands after login
    nav_priority: list[str] = field(default_factory=list)   # emphasized nav hrefs
    permissions: frozenset[str] = field(default_factory=frozenset)
    is_ui_role: bool = True             # False for service accounts


# ──────────────────────────────────────────────────────────────────────
# Role definitions — 15 personas
# ──────────────────────────────────────────────────────────────────────

ROLE_DEFINITIONS: dict[str, RoleDefinition] = {}


def _register(role_id: str, **kwargs) -> None:  # noqa: ANN003
    perms = kwargs.pop("permissions", [])
    kwargs["permissions"] = frozenset(perms)
    ROLE_DEFINITIONS[role_id] = RoleDefinition(role_id=role_id, **kwargs)


# 1. CFO
_register(
    "cfo",
    display_name="CFO",
    description="Chief Financial Officer — financial oversight of data capital",
    default_focus_route="/capital-impact",
    nav_priority=["/capital-impact", "/portfolio", "/decisions", "/allocation"],
    permissions=[
        "portfolio:read", "products:read", "decisions:read", "decisions:approve",
        "capital:read", "capital:export", "pricing:simulate", "ai:read",
        "audit:read", "marketplace:read", "lifecycle:read", "allocation:read",
        "candidates:read", "notifications:read",
    ],
)

# 2. Executive Sponsor (CEO/COO)
_register(
    "executive_sponsor",
    display_name="Executive Sponsor",
    description="CEO/COO — strategic oversight and board reporting",
    default_focus_route="/portfolio",
    nav_priority=["/portfolio", "/capital-impact", "/decisions"],
    permissions=[
        "portfolio:read", "products:read", "decisions:read", "capital:read",
        "capital:export", "ai:read", "audit:read", "marketplace:read",
        "lifecycle:read", "notifications:read", "allocation:read",
    ],
)

# 3. FP&A Analyst
_register(
    "fpa_analyst",
    display_name="FP&A Analyst",
    description="Financial Planning & Analysis — cost modelling and allocation",
    default_focus_route="/allocation",
    nav_priority=["/allocation", "/capital-impact", "/portfolio", "/simulate"],
    permissions=[
        "portfolio:read", "products:read", "capital:read", "capital:export",
        "pricing:simulate", "allocation:read", "lifecycle:read",
        "notifications:read", "audit:read",
    ],
)

# 4. CDO / Head of Data
_register(
    "cdo",
    display_name="CDO / Head of Data",
    description="Chief Data Officer — data strategy, lifecycle, and governance authority",
    default_focus_route="/portfolio",
    nav_priority=["/portfolio", "/candidates", "/lifecycle", "/decisions", "/ai-scorecard"],
    permissions=[
        "portfolio:read", "products:read", "products:write", "products:certify",
        "decisions:read", "decisions:create", "decisions:approve",
        "capital:read", "capital:export", "ai:read", "ai:flag", "ai:kill_approve",
        "lifecycle:read", "allocation:read", "candidates:read",
        "candidates:promote", "candidates:ignore", "marketplace:read",
        "connectors:read", "pricing:simulate", "pricing:activate",
        "audit:read", "notifications:read", "users:read",
    ],
)

# 5. Data Product Owner
_register(
    "product_owner",
    display_name="Data Product Owner",
    description="Owns data products — cost, value declarations, consumer management",
    default_focus_route="/assets",
    nav_priority=["/assets", "/candidates", "/decisions", "/marketplace"],
    permissions=[
        "portfolio:read", "products:read", "products:write",
        "decisions:read", "decisions:create",
        "candidates:read", "candidates:promote", "candidates:ignore",
        "marketplace:read", "marketplace:subscribe",
        "lifecycle:read", "connectors:read", "pricing:simulate",
        "notifications:read",
    ],
)

# 6. Data Governance / Steward
_register(
    "governance_steward",
    display_name="Data Governance / Steward",
    description="Certifies products, enforces policies, reviews lifecycle compliance",
    default_focus_route="/lifecycle",
    nav_priority=["/lifecycle", "/assets", "/decisions", "/candidates"],
    permissions=[
        "portfolio:read", "products:read", "products:certify",
        "decisions:read", "decisions:create", "lifecycle:read",
        "candidates:read", "marketplace:read", "audit:read",
        "notifications:read",
    ],
)

# 7. Data Platform Admin
_register(
    "platform_admin",
    display_name="Data Platform Admin",
    description="Manages connectors, infrastructure, and platform configuration",
    default_focus_route="/setup",
    nav_priority=["/setup", "/candidates", "/assets", "/lifecycle"],
    permissions=[
        "portfolio:read", "products:read",
        "connectors:read", "connectors:write", "connectors:run",
        "candidates:read", "candidates:promote", "candidates:ignore",
        "lifecycle:read", "users:read", "users:write",
        "notifications:read", "audit:read",
    ],
)

# 8. Data Engineer
_register(
    "data_engineer",
    display_name="Data Engineer",
    description="Builds and maintains data pipelines and source asset mappings",
    default_focus_route="/candidates",
    nav_priority=["/candidates", "/assets", "/setup", "/lifecycle"],
    permissions=[
        "portfolio:read", "products:read",
        "connectors:read", "connectors:run",
        "candidates:read", "candidates:promote", "candidates:ignore",
        "lifecycle:read", "marketplace:read", "notifications:read",
    ],
)

# 9. DataOps / SRE
_register(
    "dataops_sre",
    display_name="DataOps / SRE",
    description="Monitors platform health, cost efficiency, and operational reliability",
    default_focus_route="/setup",
    nav_priority=["/setup", "/lifecycle", "/portfolio"],
    permissions=[
        "portfolio:read", "products:read",
        "connectors:read", "connectors:write", "connectors:run",
        "lifecycle:read", "notifications:read", "audit:read",
    ],
)

# 10. Head of AI
_register(
    "head_of_ai",
    display_name="Head of AI",
    description="Oversees AI/ML investments — scorecard, kill-switch authority",
    default_focus_route="/ai-scorecard",
    nav_priority=["/ai-scorecard", "/portfolio", "/decisions", "/candidates"],
    permissions=[
        "portfolio:read", "products:read",
        "ai:read", "ai:flag", "ai:kill_approve", "ai:kill_execute",
        "decisions:read", "decisions:create",
        "capital:read", "lifecycle:read",
        "candidates:read", "notifications:read",
    ],
)

# 11. Data Scientist / ML Engineer
_register(
    "data_scientist",
    display_name="Data Scientist / ML Engineer",
    description="Discovers and consumes data products for ML feature engineering",
    default_focus_route="/marketplace",
    nav_priority=["/marketplace", "/ai-scorecard", "/candidates", "/assets"],
    permissions=[
        "portfolio:read", "products:read",
        "marketplace:read", "marketplace:subscribe",
        "ai:read", "ai:flag",
        "candidates:read", "lifecycle:read", "notifications:read",
    ],
)

# 12. Business Consumer
_register(
    "consumer",
    display_name="Business Consumer",
    description="End-user who discovers and subscribes to data products",
    default_focus_route="/marketplace",
    nav_priority=["/marketplace", "/portfolio"],
    permissions=[
        "portfolio:read", "products:read",
        "marketplace:read", "marketplace:subscribe",
        "notifications:read",
    ],
)

# 13. External Auditor (read-only)
_register(
    "external_auditor",
    display_name="External Auditor",
    description="Read-only access for compliance audits and board reviews",
    default_focus_route="/portfolio",
    nav_priority=["/portfolio", "/capital-impact", "/decisions"],
    permissions=[
        "portfolio:read", "products:read", "decisions:read",
        "capital:read", "audit:read", "lifecycle:read",
    ],
)

# 14. System Admin
_register(
    "admin",
    display_name="System Admin",
    description="Full platform access — user management, configuration, all operations",
    default_focus_route="/portfolio",
    nav_priority=["/portfolio", "/setup", "/candidates", "/decisions"],
    permissions=ALL_PERMISSIONS,  # everything
)

# 15. Integration Service Account (non-UI)
_register(
    "integration_service",
    display_name="Integration Service",
    description="Machine-to-machine account for automated pipelines and CI/CD",
    default_focus_route="/setup",
    nav_priority=[],
    is_ui_role=False,
    permissions=[
        "connectors:read", "connectors:write", "connectors:run",
        "products:read", "products:write",
        "candidates:read", "candidates:promote",
    ],
)


# ──────────────────────────────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────────────────────────────

def get_role(role_id: str) -> RoleDefinition | None:
    """Return the role definition for a given role_id (enum value)."""
    return ROLE_DEFINITIONS.get(role_id)


def has_permission(role_id: str, permission: str) -> bool:
    """Check whether a role grants a specific permission."""
    role = ROLE_DEFINITIONS.get(role_id)
    if role is None:
        return False
    return permission in role.permissions


def get_permissions(role_id: str) -> frozenset[str]:
    """Return the full set of permissions for a role."""
    role = ROLE_DEFINITIONS.get(role_id)
    if role is None:
        return frozenset()
    return role.permissions


def get_ui_roles() -> list[RoleDefinition]:
    """Return only roles that have a UI login (excludes service accounts)."""
    return [r for r in ROLE_DEFINITIONS.values() if r.is_ui_role]
