"""add_google_token_columns

Revision ID: 3f92a1d8b45e
Revises: 1b64e09c7b9c
Create Date: 2026-02-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f92a1d8b45e'
down_revision: Union[str, Sequence[str], None] = '1b64e09c7b9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add google_access_token and google_refresh_token columns to users table."""
    op.add_column('users', sa.Column('google_access_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('google_refresh_token', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove google_access_token and google_refresh_token columns from users table."""
    op.drop_column('users', 'google_refresh_token')
    op.drop_column('users', 'google_access_token')
