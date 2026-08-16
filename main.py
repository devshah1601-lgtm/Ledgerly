from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from Security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import models
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

security = HTTPBearer()



def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user_id = payload.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user

@app.get("/me")
def get_me(
    current_user: models.User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    }


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

class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    model_config = {
        "from_attributes": True
    }

class UserLogin(BaseModel):
    email: str
    password: str


@app.post("/login")
def login_user(
    user: UserLogin,
    db: Session = Depends(get_db)
):
    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing_user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    password_correct = verify_password(
        user.password,
        existing_user.password
    )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token({
        "user_id": existing_user.id,
        "email": existing_user.email
    })

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer"
    }



@app.post("/register", response_model=UserResponse)
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = hash_password(user.password)

    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    default_categories = [
        ("Sales", "income"),
        ("Services", "income"),
        ("Other Income", "income"),
        ("Inventory", "expense"),
        ("Rent", "expense"),
        ("Utilities", "expense"),
        ("Salary", "expense"),
        ("Transport", "expense"),
        ("Marketing", "expense"),
        ("Other Expense", "expense")
    ]

    for name, category_type in default_categories:
        category = models.Category(
            name=name,
            type=category_type,
            user_id=new_user.id
        )

        db.add(category)

    db.commit()

    return new_user

@app.get("/")
def home():
    return {"message": "Welcome to Ledgerly"}


@app.post("/transactions", response_model=TransactionResponse)
def add_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    category = db.query(models.Category).filter(
        models.Category.name == transaction.category,
        models.Category.type == transaction.type,
        models.Category.user_id == current_user.id
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
        date=transaction.date,
        user_id=current_user.id
    )

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    return new_transaction


@app.get("/transactions", response_model=list[TransactionResponse])
def get_transactions(
        type: Literal["income", "expense"] | None = None,
        category: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        search: str | None = None,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    )

    if type:
        query = query.filter(
            models.Transaction.type == type
        )

    if category:
        query = query.filter(
            models.Transaction.category == category
        )

    if start_date:
        query = query.filter(
            models.Transaction.date >= start_date
        )

    if end_date:
        query = query.filter(
            models.Transaction.date <= end_date
        )

    if search:
        query = query.filter(
            (models.Transaction.description.ilike(f"%{search}%"))
            |
            (models.Transaction.category.ilike(f"%{search}%"))
        )


    return query.all()


@app.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).all()

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
def get_cashbook(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).order_by(
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id
    ).first()

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    db.delete(transaction)
    db.commit()

    return {"message": "Transaction deleted successfully"}

@app.put("/transactions/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    updated_transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id
    ).first()

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    category = db.query(models.Category).filter(
        models.Category.name == updated_transaction.category,
        models.Category.type == updated_transaction.type,
        models.Category.user_id == current_user.id
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_category = models.Category(
        name=category.name,
        type=category.type,
        user_id=current_user.id
    )

    db.add(new_category)

    try:
        db.commit()
        db.refresh(new_category)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Category already exists"
        )

    return new_category

@app.get("/categories", response_model=list[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Category).filter(
        models.Category.user_id == current_user.id
    ).all()

@app.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    updated_category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    category = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.user_id == current_user.id
    ).first()

    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    old_name = category.name
    old_type = category.type

    db.query(models.Transaction).filter(
        models.Transaction.category == old_name,
        models.Transaction.type == old_type,
        models.Transaction.user_id == current_user.id
    ).update({
        "category": updated_category.name,
        "type": updated_category.type
    })

    category.name = updated_category.name
    category.type = updated_category.type

    try:
        db.commit()
        db.refresh(category)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Category already exists"
        )

    return category

@app.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    category = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.user_id == current_user.id
    ).first()

    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    transaction_using_category = db.query(models.Transaction).filter(
        models.Transaction.category == category.name,
        models.Transaction.type == category.type,
        models.Transaction.user_id == current_user.id
    ).first()

    if transaction_using_category:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category because it is being used by transactions"
        )

    db.delete(category)
    db.commit()

    return {
        "message": "Category deleted successfully"
    }

@app.get("/reports/monthly")
def monthly_report(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).all()

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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).all()

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