"""add connector depth tables

Revision ID: af1ddc754bba
Revises: f8a9b0c1d2e3
Create Date: 2026-02-26 08:01:15.958714

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'af1ddc754bba'
down_revision: Union[str, None] = 'f8a9b0c1d2e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types first (checkfirst=True prevents errors if they already exist)
    bind = op.get_bind()
    bind.execute(sa.text(
        "DO $$ BEGIN "
        "  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status') THEN "
        "    CREATE TYPE sync_status AS ENUM ('success', 'partial', 'failed'); "
        "  END IF; "
        "END $$;"
    ))
    bind.execute(sa.text(
        "DO $$ BEGIN "
        "  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_level') THEN "
        "    CREATE TYPE automation_level AS ENUM ('fully_automated', 'semi_automated', 'manual'); "
        "  END IF; "
        "END $$;"
    ))

    # connector_sync_logs
    op.create_table(
        'connector_sync_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('connector_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sync_started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('sync_ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', postgresql.ENUM('success', 'partial', 'failed', name='sync_status', create_type=False), nullable=True),
        sa.Column('objects_discovered', sa.Integer(), server_default='0', nullable=True),
        sa.Column('objects_updated', sa.Integer(), server_default='0', nullable=True),
        sa.Column('objects_deleted', sa.Integer(), server_default='0', nullable=True),
        sa.Column('usage_events_fetched', sa.Integer(), server_default='0', nullable=True),
        sa.Column('cost_events_fetched', sa.Integer(), server_default='0', nullable=True),
        sa.Column('errors', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('diff_summary', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['connector_id'], ['connector_configs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_connector_sync_logs_connector_id', 'connector_sync_logs', ['connector_id'])
    op.create_index('ix_connector_sync_logs_org_id', 'connector_sync_logs', ['org_id'])

    # field_provenances
    op.create_table(
        'field_provenances',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('data_product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('field_name', sa.String(length=100), nullable=False),
        sa.Column('source_connector_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('source_platform', sa.String(length=50), nullable=False),
        sa.Column('extraction_method', sa.String(length=255), nullable=False),
        sa.Column('automation_level', postgresql.ENUM('fully_automated', 'semi_automated', 'manual', name='automation_level', create_type=False), nullable=False),
        sa.Column('confidence', sa.Float(), server_default='1.0', nullable=True),
        sa.Column('last_observed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('observation_count', sa.Integer(), server_default='1', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['data_product_id'], ['data_products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_connector_id'], ['connector_configs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('data_product_id', 'field_name'),
    )
    op.create_index('ix_field_provenances_data_product_id', 'field_provenances', ['data_product_id'])
    op.create_index('ix_field_provenances_org_id', 'field_provenances', ['org_id'])

    # connector_extraction_meta
    op.create_table(
        'connector_extraction_meta',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('connector_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('capability_category', sa.String(length=100), nullable=False),
        sa.Column('capability_name', sa.String(length=255), nullable=False),
        sa.Column('is_available', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('requires_elevated_access', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('extraction_method', sa.String(length=255), nullable=False),
        sa.Column('refresh_frequency', sa.String(length=50), server_default="'per-sync'", nullable=True),
        sa.Column('sample_output', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['connector_id'], ['connector_configs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_connector_extraction_meta_connector_id', 'connector_extraction_meta', ['connector_id'])
    op.create_index('ix_connector_extraction_meta_org_id', 'connector_extraction_meta', ['org_id'])


def downgrade() -> None:
    op.drop_index('ix_connector_extraction_meta_org_id', table_name='connector_extraction_meta')
    op.drop_index('ix_connector_extraction_meta_connector_id', table_name='connector_extraction_meta')
    op.drop_table('connector_extraction_meta')

    op.drop_index('ix_field_provenances_org_id', table_name='field_provenances')
    op.drop_index('ix_field_provenances_data_product_id', table_name='field_provenances')
    op.drop_table('field_provenances')

    op.drop_index('ix_connector_sync_logs_org_id', table_name='connector_sync_logs')
    op.drop_index('ix_connector_sync_logs_connector_id', table_name='connector_sync_logs')
    op.drop_table('connector_sync_logs')

    bind = op.get_bind()
    bind.execute(sa.text("DROP TYPE IF EXISTS automation_level"))
    bind.execute(sa.text("DROP TYPE IF EXISTS sync_status"))
