"""add_decision_audit_tables

Revision ID: b4e2f3a7c8d9
Revises: a3f1b2c4d5e6
Create Date: 2026-02-23 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'b4e2f3a7c8d9'
down_revision: Union[str, None] = 'a3f1b2c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # decision_comments
    op.create_table(
        'decision_comments',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('decision_id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_name', sa.String(255), nullable=False),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['decision_id'], ['decisions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_decision_comments_decision_id', 'decision_comments', ['decision_id'])

    # decision_actions
    op.create_table(
        'decision_actions',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('decision_id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('action_type', sa.String(50), nullable=False),
        sa.Column('payload', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['decision_id'], ['decisions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_decision_actions_decision_id', 'decision_actions', ['decision_id'])

    # decision_economic_effects
    op.create_table(
        'decision_economic_effects',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('decision_id', UUID(as_uuid=True), nullable=False),
        sa.Column('effect_type', sa.String(50), nullable=False),
        sa.Column('amount_usd_monthly', sa.Numeric(12, 2), nullable=False),
        sa.Column('amount_usd_annual', sa.Numeric(12, 2), nullable=False),
        sa.Column('confidence', sa.Numeric(4, 3), server_default='0.8', nullable=False),
        sa.Column('calc_explainer', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['decision_id'], ['decisions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_decision_economic_effects_decision_id', 'decision_economic_effects', ['decision_id'])


def downgrade() -> None:
    op.drop_table('decision_economic_effects')
    op.drop_table('decision_actions')
    op.drop_table('decision_comments')
