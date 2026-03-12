"""Tests for the RBAC registry — roles, permissions, helper functions."""

from app.auth.rbac import (
    ALL_PERMISSIONS,
    ROLE_DEFINITIONS,
    RoleDefinition,
    get_permissions,
    get_role,
    get_ui_roles,
    has_permission,
)


class TestRoleDefinitions:
    def test_all_15_roles_registered(self):
        assert len(ROLE_DEFINITIONS) == 15

    def test_role_ids_match_keys(self):
        for key, role in ROLE_DEFINITIONS.items():
            assert key == role.role_id

    def test_every_role_has_display_name(self):
        for role in ROLE_DEFINITIONS.values():
            assert role.display_name, f"{role.role_id} missing display_name"

    def test_every_role_has_description(self):
        for role in ROLE_DEFINITIONS.values():
            assert role.description, f"{role.role_id} missing description"

    def test_every_role_has_focus_route(self):
        for role in ROLE_DEFINITIONS.values():
            assert role.default_focus_route.startswith("/"), (
                f"{role.role_id} focus route must start with /"
            )

    def test_every_ui_role_has_nav_priority(self):
        for role in ROLE_DEFINITIONS.values():
            if role.is_ui_role:
                assert len(role.nav_priority) > 0, f"{role.role_id} missing nav_priority"

    def test_admin_has_all_permissions(self):
        admin = ROLE_DEFINITIONS["admin"]
        for perm in ALL_PERMISSIONS:
            assert perm in admin.permissions, f"admin missing {perm}"

    def test_consumer_limited_permissions(self):
        consumer = ROLE_DEFINITIONS["consumer"]
        assert "portfolio:read" in consumer.permissions
        assert "marketplace:read" in consumer.permissions
        assert "decisions:approve" not in consumer.permissions
        assert "connectors:write" not in consumer.permissions

    def test_cfo_has_capital_read(self):
        cfo = ROLE_DEFINITIONS["cfo"]
        assert "capital:read" in cfo.permissions
        assert "capital:export" in cfo.permissions
        assert "connectors:write" not in cfo.permissions

    def test_data_engineer_has_candidates_promote(self):
        role = ROLE_DEFINITIONS["data_engineer"]
        assert "candidates:promote" in role.permissions
        assert "candidates:ignore" in role.permissions

    def test_external_auditor_read_only(self):
        auditor = ROLE_DEFINITIONS["external_auditor"]
        write_perms = [p for p in auditor.permissions if ":write" in p or ":create" in p or ":promote" in p]
        assert len(write_perms) == 0, f"auditor has write perms: {write_perms}"

    def test_integration_service_is_non_ui(self):
        svc = ROLE_DEFINITIONS["integration_service"]
        assert svc.is_ui_role is False

    def test_permissions_are_frozen(self):
        for role in ROLE_DEFINITIONS.values():
            assert isinstance(role.permissions, frozenset)


class TestHelperFunctions:
    def test_get_role_valid(self):
        role = get_role("cfo")
        assert role is not None
        assert role.display_name == "CFO"

    def test_get_role_invalid(self):
        assert get_role("nonexistent") is None

    def test_has_permission_true(self):
        assert has_permission("cfo", "capital:read") is True

    def test_has_permission_false(self):
        assert has_permission("consumer", "connectors:write") is False

    def test_has_permission_unknown_role(self):
        assert has_permission("bogus_role", "capital:read") is False

    def test_get_permissions_returns_frozenset(self):
        perms = get_permissions("cdo")
        assert isinstance(perms, frozenset)
        assert "products:write" in perms

    def test_get_permissions_unknown_role(self):
        perms = get_permissions("nonexistent")
        assert len(perms) == 0

    def test_get_ui_roles_excludes_service(self):
        ui_roles = get_ui_roles()
        role_ids = {r.role_id for r in ui_roles}
        assert "integration_service" not in role_ids
        assert len(ui_roles) == 14

    def test_get_ui_roles_includes_all_human_personas(self):
        ui_roles = get_ui_roles()
        role_ids = {r.role_id for r in ui_roles}
        for expected in ["cfo", "cdo", "consumer", "admin", "data_engineer", "external_auditor"]:
            assert expected in role_ids


class TestAllPermissions:
    def test_all_permissions_format(self):
        """Every permission should be namespace:action format."""
        for perm in ALL_PERMISSIONS:
            parts = perm.split(":")
            assert len(parts) == 2, f"Bad format: {perm}"
            assert len(parts[0]) > 0
            assert len(parts[1]) > 0

    def test_no_duplicate_permissions(self):
        assert len(ALL_PERMISSIONS) == len(set(ALL_PERMISSIONS))

    def test_every_permission_is_assigned_to_at_least_one_role(self):
        all_assigned = set()
        for role in ROLE_DEFINITIONS.values():
            all_assigned.update(role.permissions)
        for perm in ALL_PERMISSIONS:
            assert perm in all_assigned, f"Permission '{perm}' not assigned to any role"
