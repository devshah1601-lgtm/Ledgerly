"""fix category uniqueness

Revision ID: 4086326764cb
Revises: 6333c5bf012e
Create Date: 2026-08-16 19:05:29.487093

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4086326764cb'
down_revision: Union[str, Sequence[str], None] = '6333c5bf012e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    naming_convention = {
        "uq": "uq_%(table_name)s_%(column_0_name)s"
    }

    with op.batch_alter_table(
        "categories",
        naming_convention=naming_convention
    ) as batch_op:

        batch_op.drop_constraint(
            "uq_categories_name",
            type_="unique"
        )

        batch_op.create_unique_constraint(
            "uq_category_user_name",
            ["user_id", "name"]
        )


def downgrade() -> None:
    """Downgrade schema."""

    naming_convention = {
        "uq": "uq_%(table_name)s_%(column_0_name)s"
    }

    with op.batch_alter_table(
        "categories",
        naming_convention=naming_convention
    ) as batch_op:

        batch_op.drop_constraint(
            "uq_category_user_name",
            type_="unique"
        )

        batch_op.create_unique_constraint(
            "uq_categories_name",
            ["name"]
        )
