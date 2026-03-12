"""capital_impact_mode

Revision ID: a3f1b2c4d5e6
Revises: 9db6c6af1729
Create Date: 2026-02-23 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'a3f1b2c4d5e6'
down_revision: Union[str, None] = '9db6c6af1729'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ===== 1. Add new enum values (must run outside transaction) =====
    # PostgreSQL requires ALTER TYPE ... ADD VALUE to be run outside of a transaction block.
    # We commit the current transaction, add enum values, then start a new one.
    op.execute("COMMIT")

    # DecisionType: add 3 new values
    op.execute("ALTER TYPE decision_type ADD VALUE IF NOT EXISTS 'capital_reallocation'")
    op.execute("ALTER TYPE decision_type ADD VALUE IF NOT EXISTS 'pricing_activation'")
    op.execute("ALTER TYPE decision_type ADD VALUE IF NOT EXISTS 'ai_project_review'")

    # DecisionStatus: add 1 new value
    op.execute("ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'delayed'")

    # NotificationType: add 3 new values
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'capital_freed'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pricing_activated'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ai_project_flagged'")

    # PolicyCategory: add 1 new value
    op.execute("ALTER TYPE policy_category ADD VALUE IF NOT EXISTS 'pricing'")

    # Re-enter transaction for the rest
    op.execute("BEGIN")

    # ===== 2. Add columns to existing tables =====

    # DataProduct: retired_at, capital_freed_monthly
    op.add_column('data_products', sa.Column('retired_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('data_products', sa.Column('capital_freed_monthly', sa.Numeric(12, 2), server_default='0', nullable=False))

    # Decision: capital_freed, projected_savings_monthly/annual, delay_reason, delayed_until
    op.add_column('decisions', sa.Column('capital_freed', sa.Numeric(12, 2), server_default='0', nullable=False))
    op.add_column('decisions', sa.Column('projected_savings_monthly', sa.Numeric(12, 2), server_default='0', nullable=False))
    op.add_column('decisions', sa.Column('projected_savings_annual', sa.Numeric(12, 2), server_default='0', nullable=False))
    op.add_column('decisions', sa.Column('delay_reason', sa.Text(), nullable=True))
    op.add_column('decisions', sa.Column('delayed_until', sa.DateTime(timezone=True), nullable=True))

    # PortfolioMonthly: capital_freed_cumulative, budget_reallocated, active_pricing_policies, decisions_executed
    op.add_column('portfolio_monthly', sa.Column('capital_freed_cumulative', sa.Numeric(14, 2), server_default='0', nullable=False))
    op.add_column('portfolio_monthly', sa.Column('budget_reallocated', sa.Numeric(14, 2), server_default='0', nullable=False))
    op.add_column('portfolio_monthly', sa.Column('active_pricing_policies', sa.Integer(), server_default='0', nullable=False))
    op.add_column('portfolio_monthly', sa.Column('decisions_executed', sa.Integer(), server_default='0', nullable=False))

    # ===== 3. Create new tables =====

    # capital_events
    op.create_table(
        'capital_events',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('org_id', UUID(as_uuid=True), nullable=False),
        sa.Column('decision_id', UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', UUID(as_uuid=True), nullable=True),
        sa.Column('event_type', sa.Enum('retirement_freed', 'cost_optimization', 'reallocation', 'pricing_revenue', 'ai_spend_reduced', name='capital_event_type', create_constraint=True), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('effective_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['decision_id'], ['decisions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['data_products.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_capital_events_org_id', 'capital_events', ['org_id'])
    op.create_index('ix_capital_events_decision_id', 'capital_events', ['decision_id'])

    # pricing_policies
    op.create_table(
        'pricing_policies',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('org_id', UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', UUID(as_uuid=True), nullable=False),
        sa.Column('product_name', sa.String(255), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('model', sa.String(50), nullable=False),
        sa.Column('params', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('draft', 'active', 'retired', name='pricing_policy_status', create_constraint=True), server_default='draft'),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('activated_by', sa.String(255), nullable=True),
        sa.Column('decision_id', UUID(as_uuid=True), nullable=True),
        sa.Column('projected_revenue', sa.Numeric(12, 2), server_default='0', nullable=False),
        sa.Column('actual_revenue', sa.Numeric(12, 2), nullable=True),
        sa.Column('pre_activation_usage', sa.Integer(), server_default='0', nullable=False),
        sa.Column('post_activation_usage', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['data_products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['decision_id'], ['decisions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('product_id', 'version'),
    )
    op.create_index('ix_pricing_policies_org_id', 'pricing_policies', ['org_id'])
    op.create_index('ix_pricing_policies_product_id', 'pricing_policies', ['product_id'])

    # pricing_usage_deltas
    op.create_table(
        'pricing_usage_deltas',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('policy_id', UUID(as_uuid=True), nullable=False),
        sa.Column('month', sa.Date(), nullable=False),
        sa.Column('consumers', sa.Integer(), server_default='0', nullable=False),
        sa.Column('queries', sa.Integer(), server_default='0', nullable=False),
        sa.Column('revenue_collected', sa.Numeric(12, 2), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['policy_id'], ['pricing_policies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_pricing_usage_deltas_policy_id', 'pricing_usage_deltas', ['policy_id'])

    # ai_project_scorecards
    op.create_table(
        'ai_project_scorecards',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('org_id', UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', UUID(as_uuid=True), nullable=False),
        sa.Column('product_name', sa.String(255), nullable=False),
        sa.Column('cost_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('value_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('confidence_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('roi_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('dependency_risk_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('composite_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('risk_level', sa.Enum('low', 'medium', 'high', 'critical', name='ai_project_risk_level', create_constraint=True), nullable=False),
        sa.Column('monthly_cost', sa.Numeric(12, 2), nullable=False),
        sa.Column('monthly_value', sa.Numeric(12, 2), nullable=False),
        sa.Column('roi', sa.Numeric(8, 4), nullable=True),
        sa.Column('flagged_for_review', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('decision_id', UUID(as_uuid=True), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['data_products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['decision_id'], ['decisions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ai_project_scorecards_org_id', 'ai_project_scorecards', ['org_id'])
    op.create_index('ix_ai_project_scorecards_product_id', 'ai_project_scorecards', ['product_id'])


def downgrade() -> None:
    # Drop new tables
    op.drop_table('ai_project_scorecards')
    op.drop_table('pricing_usage_deltas')
    op.drop_table('pricing_policies')
    op.drop_table('capital_events')

    # Drop new columns from existing tables
    op.drop_column('portfolio_monthly', 'decisions_executed')
    op.drop_column('portfolio_monthly', 'active_pricing_policies')
    op.drop_column('portfolio_monthly', 'budget_reallocated')
    op.drop_column('portfolio_monthly', 'capital_freed_cumulative')
    op.drop_column('decisions', 'delayed_until')
    op.drop_column('decisions', 'delay_reason')
    op.drop_column('decisions', 'projected_savings_annual')
    op.drop_column('decisions', 'projected_savings_monthly')
    op.drop_column('decisions', 'capital_freed')
    op.drop_column('data_products', 'capital_freed_monthly')
    op.drop_column('data_products', 'retired_at')

    # Drop new enum types
    op.execute("DROP TYPE IF EXISTS capital_event_type")
    op.execute("DROP TYPE IF EXISTS pricing_policy_status")
    op.execute("DROP TYPE IF EXISTS ai_project_risk_level")

    # Note: Cannot remove individual values from PostgreSQL enums in downgrade.
    # The added enum values (capital_reallocation, pricing_activation, etc.) will remain.
