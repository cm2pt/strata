"""Capital Governance Mode — add impact verification fields to decisions.

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-02-23 10:00:00.000000

"""
from typing import Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f8a9b0c1d2e3'
down_revision: Union[str, None] = 'e7f8a9b0c1d2'
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    # Add impact verification columns to decisions table
    op.add_column('decisions', sa.Column('impact_validation_status', sa.String(50), server_default='pending'))
    op.add_column('decisions', sa.Column('validation_start_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('decisions', sa.Column('validation_window_days', sa.Integer(), server_default='60'))
    op.add_column('decisions', sa.Column('actual_savings_measured', sa.Numeric(12, 2), nullable=True))
    op.add_column('decisions', sa.Column('variance_from_projection', sa.Numeric(8, 4), nullable=True))
    op.add_column('decisions', sa.Column('impact_confidence_score', sa.Numeric(5, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('decisions', 'impact_confidence_score')
    op.drop_column('decisions', 'variance_from_projection')
    op.drop_column('decisions', 'actual_savings_measured')
    op.drop_column('decisions', 'validation_window_days')
    op.drop_column('decisions', 'validation_start_date')
    op.drop_column('decisions', 'impact_validation_status')
