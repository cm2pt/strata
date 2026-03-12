"""add lineage tables

Revision ID: b1c2d3e4f5a6
Revises: af1ddc754bba
Create Date: 2026-02-26 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'af1ddc754bba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # Create enum types (idempotent)
    bind.execute(sa.text(
        "DO $$ BEGIN "
        "  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lineage_node_type') THEN "
        "    CREATE TYPE lineage_node_type AS ENUM ("
        "      'source_system', 'database', 'schema', 'table', 'view', 'column', "
        "      'etl_job', 'dbt_model', 'notebook', 'dataset', 'data_product', "
        "      'dashboard', 'report', 'metric', 'ml_model', 'api_endpoint', 'application'"
        "    ); "
        "  END IF; "
        "END $$;"
    ))
    bind.execute(sa.text(
        "DO $$ BEGIN "
        "  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lineage_edge_type') THEN "
        "    CREATE TYPE lineage_edge_type AS ENUM ("
        "      'physical_lineage', 'logical_lineage', 'transformation', 'aggregation', "
        "      'derivation', 'exposure', 'consumption', 'copy', 'dependency'"
        "    ); "
        "  END IF; "
        "END $$;"
    ))
    bind.execute(sa.text(
        "DO $$ BEGIN "
        "  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lineage_provenance') THEN "
        "    CREATE TYPE lineage_provenance AS ENUM ('automated', 'inferred', 'manual'); "
        "  END IF; "
        "END $$;"
    ))

    # lineage_nodes
    op.create_table(
        'lineage_nodes',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('node_type', postgresql.ENUM(
            'source_system', 'database', 'schema', 'table', 'view', 'column',
            'etl_job', 'dbt_model', 'notebook', 'dataset', 'data_product',
            'dashboard', 'report', 'metric', 'ml_model', 'api_endpoint', 'application',
            name='lineage_node_type', create_type=False,
        ), nullable=False),
        sa.Column('name', sa.String(length=512), nullable=False),
        sa.Column('qualified_name', sa.String(length=1024), nullable=False),
        sa.Column('platform', sa.String(length=100), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tags', postgresql.JSON(astext_type=sa.Text()), server_default='[]', nullable=True),
        sa.Column('provenance', postgresql.ENUM('automated', 'inferred', 'manual', name='lineage_provenance', create_type=False), nullable=True),
        sa.Column('confidence', sa.Float(), server_default='1.0', nullable=True),
        sa.Column('data_product_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('source_asset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('metadata_json', postgresql.JSON(astext_type=sa.Text()), server_default='{}', nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['data_product_id'], ['data_products.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['source_asset_id'], ['source_assets.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('qualified_name'),
    )
    op.create_index('ix_lineage_nodes_org_id', 'lineage_nodes', ['org_id'])
    op.create_index('ix_lineage_nodes_node_type', 'lineage_nodes', ['node_type'])
    op.create_index('ix_lineage_nodes_platform', 'lineage_nodes', ['platform'])

    # lineage_edges
    op.create_table(
        'lineage_edges',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('from_node_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('to_node_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('edge_type', postgresql.ENUM(
            'physical_lineage', 'logical_lineage', 'transformation', 'aggregation',
            'derivation', 'exposure', 'consumption', 'copy', 'dependency',
            name='lineage_edge_type', create_type=False,
        ), nullable=False),
        sa.Column('platform', sa.String(length=100), nullable=True),
        sa.Column('provenance', postgresql.ENUM('automated', 'inferred', 'manual', name='lineage_provenance', create_type=False), nullable=True),
        sa.Column('confidence', sa.Float(), server_default='1.0', nullable=True),
        sa.Column('metadata_json', postgresql.JSON(astext_type=sa.Text()), server_default='{}', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['from_node_id'], ['lineage_nodes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_node_id'], ['lineage_nodes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_lineage_edges_org_id', 'lineage_edges', ['org_id'])
    op.create_index('ix_lineage_edges_from_node_id', 'lineage_edges', ['from_node_id'])
    op.create_index('ix_lineage_edges_to_node_id', 'lineage_edges', ['to_node_id'])
    op.create_index('ix_lineage_edges_edge_type', 'lineage_edges', ['edge_type'])


def downgrade() -> None:
    op.drop_index('ix_lineage_edges_edge_type', table_name='lineage_edges')
    op.drop_index('ix_lineage_edges_to_node_id', table_name='lineage_edges')
    op.drop_index('ix_lineage_edges_from_node_id', table_name='lineage_edges')
    op.drop_index('ix_lineage_edges_org_id', table_name='lineage_edges')
    op.drop_table('lineage_edges')

    op.drop_index('ix_lineage_nodes_platform', table_name='lineage_nodes')
    op.drop_index('ix_lineage_nodes_node_type', table_name='lineage_nodes')
    op.drop_index('ix_lineage_nodes_org_id', table_name='lineage_nodes')
    op.drop_table('lineage_nodes')

    bind = op.get_bind()
    bind.execute(sa.text("DROP TYPE IF EXISTS lineage_provenance"))
    bind.execute(sa.text("DROP TYPE IF EXISTS lineage_edge_type"))
    bind.execute(sa.text("DROP TYPE IF EXISTS lineage_node_type"))
