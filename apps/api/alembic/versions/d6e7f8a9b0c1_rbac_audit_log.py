"""rbac_audit_log

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-02-23 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON


# revision identifiers, used by Alembic.
revision: str = 'd6e7f8a9b0c1'
down_revision: Union[str, None] = 'c5d6e7f8a9b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# New enum values to add to user_role
NEW_ROLE_VALUES = [
    "executive_sponsor",
    "fpa_analyst",
    "governance_steward",
    "platform_admin",
    "data_engineer",
    "dataops_sre",
    "head_of_ai",
    "data_scientist",
    "external_auditor",
    "integration_service",
]


def upgrade() -> None:
    # 1. Expand user_role enum with 10 new values
    for val in NEW_ROLE_VALUES:
        op.execute(f"ALTER TYPE user_role ADD VALUE IF NOT EXISTS '{val}'")

    # 2. Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('org_id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('entity_id', sa.String(255), nullable=True),
        sa.Column('metadata_json', JSON, server_default='{}', nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_logs_org_id', 'audit_logs', ['org_id'])
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'])


def downgrade() -> None:
    op.drop_table('audit_logs')
    # Note: PostgreSQL does not support removing values from enums.
    # The extra enum values are harmless and remain in place.
