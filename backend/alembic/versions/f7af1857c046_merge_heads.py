"""merge_heads

Revision ID: f7af1857c046
Revises: 3f92a1d8b45e, a2c1e3f4d567
Create Date: 2026-03-10 21:03:03.431510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7af1857c046'
down_revision: Union[str, Sequence[str], None] = ('3f92a1d8b45e', 'a2c1e3f4d567')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
