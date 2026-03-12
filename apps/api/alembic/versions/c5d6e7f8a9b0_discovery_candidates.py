"""discovery_candidates

Revision ID: c5d6e7f8a9b0
Revises: b4e2f3a7c8d9
Create Date: 2026-02-23 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON, ENUM


# revision identifiers, used by Alembic.
revision: str = 'c5d6e7f8a9b0'
down_revision: Union[str, None] = 'b4e2f3a7c8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------- Enum additions ----------

    # Add 'portfolio_change' to decision_type enum
    op.execute("ALTER TYPE decision_type ADD VALUE IF NOT EXISTS 'portfolio_change'")

    # Add 'discovery_replay' to connector_type enum
    op.execute("ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'discovery_replay'")

    # Create enums via raw SQL (safe + idempotent)
    op.execute("DO $$ BEGIN CREATE TYPE candidate_type AS ENUM ('semantic_product', 'dbt_product', 'usage_bundle', 'certified_asset'); EXCEPTION WHEN duplicate_object THEN NULL; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE candidate_status AS ENUM ('new', 'under_review', 'promoted', 'ignored'); EXCEPTION WHEN duplicate_object THEN NULL; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE edge_type AS ENUM ('lineage', 'consumption', 'copy', 'derivation', 'exposure'); EXCEPTION WHEN duplicate_object THEN NULL; END $$")

    # ---------- source_assets: add new columns ----------

    op.add_column('source_assets', sa.Column(
        'org_id', UUID(as_uuid=True),
        sa.ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=True,
    ))
    op.create_index('ix_source_assets_org_id', 'source_assets', ['org_id'])
    op.add_column('source_assets', sa.Column('platform', sa.String(50), nullable=True))
    op.add_column('source_assets', sa.Column('qualified_name', sa.String(1024), nullable=True))
    op.add_column('source_assets', sa.Column('display_name', sa.String(512), nullable=True))
    op.add_column('source_assets', sa.Column('owner_hint', sa.String(255), nullable=True))
    op.add_column('source_assets', sa.Column('tags_json', JSON, server_default='[]', nullable=True))

    # ---------- asset_mappings: add mapping_role ----------

    op.add_column('asset_mappings', sa.Column('mapping_role', sa.String(50), nullable=True))

    # ---------- product_candidates ----------

    op.create_table(
        'product_candidates',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('org_id', UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_type', ENUM(
            'semantic_product', 'dbt_product', 'usage_bundle', 'certified_asset',
            name='candidate_type', create_type=False,
        ), nullable=False),
        sa.Column('name_suggested', sa.String(255), nullable=False),
        sa.Column('domain_suggested', sa.String(255), nullable=True),
        sa.Column('owner_suggested', sa.String(255), nullable=True),
        sa.Column('confidence_score', sa.Integer, server_default='0', nullable=False),
        sa.Column('confidence_breakdown_json', JSON, server_default='{}', nullable=True),
        sa.Column('evidence_json', JSON, server_default='{}', nullable=True),
        sa.Column('status', ENUM(
            'new', 'under_review', 'promoted', 'ignored',
            name='candidate_status', create_type=False,
        ), server_default='new', nullable=False),
        sa.Column('promoted_product_id', UUID(as_uuid=True), nullable=True),
        sa.Column('ignored_reason', sa.Text, nullable=True),
        sa.Column('ignored_by', sa.String(255), nullable=True),
        sa.Column('ignored_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('monthly_cost_estimate', sa.Numeric(12, 2), server_default='0', nullable=False),
        sa.Column('monthly_consumers', sa.Integer, server_default='0', nullable=False),
        sa.Column('consumer_teams_json', JSON, server_default='[]', nullable=True),
        sa.Column('cost_coverage_pct', sa.Numeric(5, 4), server_default='0', nullable=False),
        sa.Column('source_count', sa.Integer, server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['promoted_product_id'], ['data_products.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_product_candidates_org_id', 'product_candidates', ['org_id'])

    # ---------- candidate_members ----------

    op.create_table(
        'candidate_members',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('candidate_id', UUID(as_uuid=True), nullable=False),
        sa.Column('source_asset_id', UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(50), server_default='primary', nullable=False),
        sa.Column('inclusion_reason', sa.Text, nullable=True),
        sa.Column('weight', sa.Numeric(5, 4), server_default='1.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['candidate_id'], ['product_candidates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_asset_id'], ['source_assets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_candidate_members_candidate_id', 'candidate_members', ['candidate_id'])
    op.create_index('ix_candidate_members_source_asset_id', 'candidate_members', ['source_asset_id'])

    # ---------- edges ----------

    op.create_table(
        'edges',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('org_id', UUID(as_uuid=True), nullable=False),
        sa.Column('from_asset_id', UUID(as_uuid=True), nullable=False),
        sa.Column('to_asset_id', UUID(as_uuid=True), nullable=False),
        sa.Column('edge_type', ENUM(
            'lineage', 'consumption', 'copy', 'derivation', 'exposure',
            name='edge_type', create_type=False,
        ), nullable=False),
        sa.Column('evidence_source', sa.String(100), nullable=True),
        sa.Column('confidence', sa.Numeric(5, 4), server_default='1.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['from_asset_id'], ['source_assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_asset_id'], ['source_assets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_edges_org_id', 'edges', ['org_id'])
    op.create_index('ix_edges_from_asset_id', 'edges', ['from_asset_id'])
    op.create_index('ix_edges_to_asset_id', 'edges', ['to_asset_id'])


def downgrade() -> None:
    op.drop_table('edges')
    op.drop_table('candidate_members')
    op.drop_table('product_candidates')

    op.drop_column('asset_mappings', 'mapping_role')

    op.drop_index('ix_source_assets_org_id', table_name='source_assets')
    op.drop_column('source_assets', 'tags_json')
    op.drop_column('source_assets', 'owner_hint')
    op.drop_column('source_assets', 'display_name')
    op.drop_column('source_assets', 'qualified_name')
    op.drop_column('source_assets', 'platform')
    op.drop_column('source_assets', 'org_id')

    sa.Enum(name='edge_type').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='candidate_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='candidate_type').drop(op.get_bind(), checkfirst=True)
    # Note: cannot remove enum value from decision_type in PostgreSQL
