from sqlalchemy import Column, Integer, String, Float, Date, UniqueConstraint
from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    amount = Column(Float)
    category = Column(String)
    description = Column(String)
    date = Column(Date)

    user_id = Column(Integer, nullable=True)

    def __repr__(self):
        return (
            f"Transaction(id={self.id}, "
            f"type={self.type}, "
            f"amount={self.amount}, "
            f"category={self.category})"
        )

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    type = Column(String)
    user_id = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "name",
            name="uq_category_user_name"
        ),
    )

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
