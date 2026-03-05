"""add_google_token_fields

Revision ID: 8e0258684036
Revises: 1b64e09c7b9c
Create Date: 2026-03-05 14:43:15.172059

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e0258684036'
down_revision: Union[str, Sequence[str], None] = '1b64e09c7b9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add Google OAuth token columns to users table
    op.add_column('users', sa.Column('google_access_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('google_refresh_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('google_token_expiry', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove Google OAuth token columns
    op.drop_column('users', 'google_token_expiry')
    op.drop_column('users', 'google_refresh_token')
    op.drop_column('users', 'google_access_token')
