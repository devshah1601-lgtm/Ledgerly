from sqlalchemy import Column, Integer, String, Float, Date
from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    amount = Column(Float)
    category = Column(String)
    description = Column(String)
    date = Column(Date)

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
    name = Column(String, unique=True)
    type = Column(String)