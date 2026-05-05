"""add_notification_devices_table

Revision ID: ab12cd34ef56
Revises: 82b245f5c4e6
Create Date: 2026-03-19 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ab12cd34ef56"
down_revision: Union[str, Sequence[str], None] = "82b245f5c4e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notification_devices",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("expo_push_token", sa.String(length=255), nullable=False),
        sa.Column("platform", sa.String(length=20), nullable=True),
        sa.Column("device_name", sa.String(length=200), nullable=True),
        sa.Column("app_version", sa.String(length=50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_seen_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("expo_push_token", name="uq_notification_devices_expo_push_token"),
    )
    op.create_index("ix_notification_devices_user_id", "notification_devices", ["user_id"], unique=False)
    op.create_index("ix_notification_devices_is_active", "notification_devices", ["is_active"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_notification_devices_is_active", table_name="notification_devices")
    op.drop_index("ix_notification_devices_user_id", table_name="notification_devices")
    op.drop_table("notification_devices")
