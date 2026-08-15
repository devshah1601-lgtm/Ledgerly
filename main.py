from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from datetime import date
from sqlalchemy.orm import Session

import models
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

app = FastAPI()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    amount: float = Field(gt=0)
    category: str
    description: str
    date: date


class TransactionResponse(TransactionCreate):
    id: int

    model_config = {
        "from_attributes": True
    }
class CategoryCreate(BaseModel):
    name: str
    type: Literal["income", "expense"]


class CategoryResponse(CategoryCreate):
    id: int

    model_config = {
        "from_attributes": True
    }

@app.get("/")
def home():
    return {"message": "Welcome to Ledgerly"}


@app.post("/transactions", response_model=TransactionResponse)
def add_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db)
):
    category = db.query(models.Category).filter(
        models.Category.name == transaction.category,
        models.Category.type == transaction.type
    ).first()

    if category is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid category for this transaction type"
        )

    new_transaction = models.Transaction(
        type=transaction.type,
        amount=transaction.amount,
        category=transaction.category,
        description=transaction.description,
        date=transaction.date
    )

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    return new_transaction


@app.get("/transactions", response_model=list[TransactionResponse])
def get_transactions(
    db: Session = Depends(get_db)
):
    return db.query(models.Transaction).all()


@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):

    transactions = db.query(models.Transaction).all()

    total_income = 0
    total_expenses = 0

    for transaction in transactions:

        if transaction.type == "income":
            total_income += transaction.amount

        elif transaction.type == "expense":
            total_expenses += transaction.amount

    balance = total_income - total_expenses

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "balance": balance
    }

@app.get("/cashbook")
def get_cashbook(db: Session = Depends(get_db)):

    transactions = db.query(models.Transaction).order_by(
        models.Transaction.date,
        models.Transaction.id
    ).all()

    opening_balance = 0
    balance = opening_balance

    total_income = 0
    total_expenses = 0

    cashbook_entries = []

    for transaction in transactions:

        if transaction.type == "income":
            total_income += transaction.amount
            balance += transaction.amount

        elif transaction.type == "expense":
            total_expenses += transaction.amount
            balance -= transaction.amount

        cashbook_entries.append({
            "id": transaction.id,
            "date": transaction.date,
            "type": transaction.type,
            "category": transaction.category,
            "description": transaction.description,
            "amount": transaction.amount,
            "balance": balance
        })

    return {
        "opening_balance": opening_balance,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "closing_balance": balance,
        "entries": cashbook_entries
    }

@app.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db)
):
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id
    ).first()

    if transaction is None:
        return {"message": "Transaction not found"}

    db.delete(transaction)
    db.commit()

    return {"message": "Transaction deleted successfully"}

@app.put("/transactions/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    updated_transaction: TransactionCreate,
    db: Session = Depends(get_db)
):
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id
    ).first()

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    category = db.query(models.Category).filter(
        models.Category.name == updated_transaction.category,
        models.Category.type == updated_transaction.type
    ).first()

    if category is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid category for this transaction type"
        )

    transaction.type = updated_transaction.type
    transaction.amount = updated_transaction.amount
    transaction.category = updated_transaction.category
    transaction.description = updated_transaction.description
    transaction.date = updated_transaction.date

    db.commit()
    db.refresh(transaction)

    return transaction

@app.post("/categories", response_model=CategoryResponse)
def add_category(
    category: CategoryCreate,
    db: Session = Depends(get_db)
):
    new_category = models.Category(
        name=category.name,
        type=category.type
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category

@app.get("/categories", response_model=list[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db)
):
    return db.query(models.Category).all()

@app.get("/reports/monthly")
def monthly_report(
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    transactions = db.query(models.Transaction).all()

    total_income = 0
    total_expenses = 0
    transaction_count = 0

    for transaction in transactions:
        if transaction.date.year == year and transaction.date.month == month:

            transaction_count += 1

            if transaction.type == "income":
                total_income += transaction.amount

            elif transaction.type == "expense":
                total_expenses += transaction.amount

    net_cash_flow = total_income - total_expenses

    return {
        "year": year,
        "month": month,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_cash_flow": net_cash_flow,
        "transaction_count": transaction_count
    }

@app.get("/reports/expenses-by-category")
def expenses_by_category(
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    transactions = db.query(models.Transaction).all()

    category_totals = {}

    for transaction in transactions:

        if (
            transaction.type == "expense"
            and transaction.date.year == year
            and transaction.date.month == month
        ):
            category = transaction.category
            amount = transaction.amount

            if category in category_totals:
                category_totals[category] += amount
            else:
                category_totals[category] = amount

    return {
        "year": year,
        "month": month,
        "expenses": category_totals
    }