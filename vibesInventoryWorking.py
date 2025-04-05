from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from collections import defaultdict
from fastapi.responses import JSONResponse
from openpyxl import load_workbook
from io import BytesIO
#from models import Expense


DATABASE_URL = "sqlite:///./inventory.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Models ---

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    quantity = Column(Float)
    unit = Column(String)
    price_per_unit = Column(Float)
    total_cost = Column(Float)
    type = Column(String)
    date_added = Column(DateTime, default=datetime.utcnow)

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String)
    quantity = Column(Float)
    total_cost = Column(Float)
    date = Column(DateTime, default=datetime.utcnow)

class DishType(Base):
    __tablename__ = "dish_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class Dish(Base):
    __tablename__ = "dishes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type_id = Column(Integer, ForeignKey("dish_types.id"))
    type = relationship("DishType")

class DishIngredient(Base):
    __tablename__ = "dish_ingredients"
    id = Column(Integer, primary_key=True, index=True)
    dish_id = Column(Integer, ForeignKey("dishes.id"))
    ingredient_id = Column(Integer, ForeignKey("inventory.id"))
    quantity_required = Column(Float)
    dish = relationship("Dish")
    ingredient = relationship("Inventory")

class InventoryLog(Base):
    __tablename__ = "inventory_log"
    id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("inventory.id"))
    quantity_left = Column(Float)
    date = Column(DateTime, default=datetime.utcnow)
    ingredient = relationship("Inventory")

Base.metadata.create_all(bind=engine)

# --- Routes ---

@app.post("/add_item")
def add_item(
    name: str,
    quantity: float,
    unit: str,
    price_per_unit: Optional[float] = None,
    total_cost: Optional[float] = None,
    type: Optional[str] = None,
    date_added: datetime = datetime.utcnow(),
    db: Session = Depends(get_db)
):

    if price_per_unit is not None:
        total_cost = quantity * price_per_unit
    elif total_cost is not None:
        total_cost = total_cost
    else:
        raise HTTPException(status_code=400, detail="Either price_per_unit or total_cost must be provided")


    item = Inventory(
        name=name,
        quantity=quantity,
        unit=unit,
        price_per_unit=price_per_unit if price_per_unit is not None else 0.0,
        total_cost=total_cost,
        type=type if type is not None else "",
        date_added=date_added
    )

    db.add(item)
    db.add(Expense(item_name=name, quantity=quantity, total_cost=total_cost, date=date_added))
    db.commit()
    db.refresh(item)

    inventory = db.query(Inventory).all()
    return {"message": "Item added successfully!", "inventory": inventory}

@app.get("/search_inventory")
def search_inventory(
    name: Optional[str] = Query(None, description="Partial or full item name"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Inventory)

        if name:
            query = query.filter(Inventory.name.ilike(f"%{name}%"))

        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(Inventory.date_added >= start)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD.")

        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d")
                query = query.filter(Inventory.date_added <= end)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD.")

        results = query.all()

        return [
            {
                "id": item.id,
                "name": item.name,
                "price_per_unit": item.price_per_unit,
                "unit": item.unit,
                "quantity": item.quantity,
                "total_cost": item.total_cost,
                "type": item.type,
                "date_added": item.date_added.strftime("%Y-%m-%d %H:%M:%S")
            }
            for item in results
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@app.delete("/delete_item/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return {
        "message": "Item deleted successfully!",
        "current_inventory": db.query(Inventory).all()
    }


@app.put("/update_item/{item_id}")
def update_item(
    item_id: int,
    name: str = Query(...),
    quantity: float = Query(...),
    unit: str = Query(...),
    price_per_unit: float = Query(None),
    total_cost: float = Query(None),
    date_added: Optional[datetime] = Query(default=datetime.utcnow()),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Recalculate total_cost
    if price_per_unit is not None:
        total_cost = quantity * price_per_unit
    elif total_cost is not None:
        total_cost = total_cost
    else:
        raise HTTPException(status_code=400, detail="Either price_per_unit or total_cost must be provided")

    # Update fields
    item.name = name
    item.quantity = quantity
    item.unit = unit
    item.price_per_unit = price_per_unit if price_per_unit is not None else 0.0
    item.total_cost = total_cost
    item.date_added = date_added
    item.type = type if type is not None else ""

    db.commit()
    db.refresh(item)

    return {
        "message": "Item updated successfully!",
        "updated_item": {
            "id": item.id,
            "name": item.name,
            "quantity": item.quantity,
            "unit": item.unit,
            "price_per_unit": item.price_per_unit,
            "total_cost": item.total_cost,
            "type": item.type,
            "date_added": item.date_added.strftime("%Y-%m-%d")
        },
        "current_inventory": [
            {
                "id": i.id,
                "name": i.name,
                "quantity": i.quantity,
                "unit": i.unit,
                "price_per_unit": i.price_per_unit,
                "total_cost": i.total_cost,
                "type": i.type,
                "date_added": i.date_added.strftime("%Y-%m-%d")
            } for i in db.query(Inventory).all()
        ]
    }

@app.get("/inventory")
def get_inventory(db: Session = Depends(get_db)):
    inventory_items = db.query(Inventory).all()
    return [
        {
            "id": item.id,
            "name": item.name,
            "price_per_unit": item.price_per_unit,
            "unit": item.unit,
            "quantity": item.quantity,
            "total_cost": item.total_cost,
            "type": item.type,
            "date_added": item.date_added.strftime("%Y-%m-%d %H:%M:%S")
        }
        for item in inventory_items
    ]

@app.get("/inventory_by_name/{item_name}")
def get_inventory_by_name(item_name: str, db: Session = Depends(get_db)):
    items = db.query(Inventory).filter(Inventory.name.ilike(f"%{item_name}%")).all()
    if not items:
        raise HTTPException(status_code=404, detail="Item not found")
    return items

@app.delete("/delete_all_inventory")
def delete_all_inventory(confirm: bool = False, db: Session = Depends(get_db)):
    if not confirm:
        raise HTTPException(status_code=400, detail="Please confirm deletion by setting confirm=true")

    deleted = db.query(Inventory).delete()
    db.commit()
    return {
        "message": f"Deleted {deleted} item(s) from inventory.",
        "current_inventory": db.query(Inventory).all()
    }


@app.get("/expense_report")
def expense_report(
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    inventory_name: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    # Determine date range if not provided
    if not start_date or not end_date:
        date_range = db.query(
            func.min(Expense.date),
            func.max(Expense.date)
        ).first()
        if not date_range or not date_range[0] or not date_range[1]:
            return {
                "message": "No expenses in the database.",
                "total_expense": 0,
                "average_expense": 0,
                "highest_expense_day": None,
                "lowest_expense_day": None,
            }
        start = date_range[0]
        end = date_range[1]
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

    # Base query with date range
    query = db.query(Expense).filter(Expense.date >= start, Expense.date <= end)

    # Optional case-insensitive filter by inventory name
    if inventory_name:
        query = query.filter(Expense.item_name.ilike(f"%{inventory_name}%"))
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        expenses = db.query(Expense).filter(Expense.date >= start, Expense.date <= end).all()
        total = sum(exp.total_cost for exp in expenses)
        avg = total / len(expenses) if expenses else 0
        highest = max(expenses, key=lambda x: x.total_cost, default=None)
        lowest = min(expenses, key=lambda x: x.total_cost, default=None)
        return {
            "total_expense": total,
            "average_expense": avg,
            "highest_expense": highest.item_name if highest else None,
            "lowest_expense": lowest.item_name if lowest else None
        }

    expenses = query.all()

    if not expenses:
        return {
            "message": "No expenses found for the given filters.",
            "total_expense": 0,
            "average_expense": 0,
            "highest_expense_day": None,
            "lowest_expense_day": None,
        }

    # Group by date
    daily_expenses = defaultdict(float)
    for exp in expenses:
        daily_expenses[exp.date.date()] += exp.total_cost

    # Aggregate stats
    total_expense = sum(exp.total_cost for exp in expenses)
    average_expense = total_expense / len(expenses)

    highest_day = max(daily_expenses.items(), key=lambda x: x[1])
    lowest_day = min(daily_expenses.items(), key=lambda x: x[1])

    return {
        "inventory_name": inventory_name,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "total_expense": total_expense,
        "average_expense": average_expense,
        "highest_expense_day": {
            "date": highest_day[0].isoformat(),
            "amount": highest_day[1]
        },
        "lowest_expense_day": {
            "date": lowest_day[0].isoformat(),
            "amount": lowest_day[1]
        }
    }


@app.post("/upload_inventory_excel")
async def upload_inventory_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Please upload a valid Excel file (.xlsx or .xls)")

    try:
        contents = await file.read()
        workbook = load_workbook(filename=BytesIO(contents))
        sheet = workbook.active

        headers = [str(cell.value).strip() if cell.value else "" for cell in sheet[1]]
        required_columns = {"name", "quantity", "unit", "date_added"}
        optional_columns = {"price_per_unit", "total_cost", "type"}

        missing_required = required_columns - set(headers)
        if missing_required:
            return JSONResponse(status_code=400, content={
                "error": f"Missing required columns: {', '.join(missing_required)}. Found: {headers}"
            })

        col_index = {key: headers.index(key) for key in required_columns.union(optional_columns) if key in headers}

        added_items = []
        skipped_rows = []

        for idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                if not row or all(cell is None for cell in row):
                    continue  # Skip empty rows

                name = row[col_index["name"]]
                quantity = float(row[col_index["quantity"]])
                unit = row[col_index["unit"]]

                price_per_unit = float(row[col_index["price_per_unit"]]) if "price_per_unit" in col_index and row[col_index["price_per_unit"]] is not None else None
                total_cost = float(row[col_index["total_cost"]]) if "total_cost" in col_index and row[col_index["total_cost"]] is not None else None
                type_ = str(row[col_index["type"]]).strip() if "type" in col_index and row[col_index["type"]] is not None else ""

                if price_per_unit is not None:
                    total_cost = quantity * price_per_unit
                elif total_cost is not None:
                    price_per_unit = total_cost / quantity
                else:
                    skipped_rows.append(f"Row {idx}: Missing price_per_unit and total_cost.")
                    continue

                date_raw = row[col_index["date_added"]]
                if isinstance(date_raw, datetime):
                    date_added = date_raw
                elif isinstance(date_raw, str):
                    date_added = datetime.strptime(date_raw.strip(), "%Y-%m-%d")
                else:
                    raise ValueError("Invalid date format in 'date_added'")

                # Check if an exact item already exists
                existing = db.query(Inventory).filter(
                    Inventory.name == name,
                    Inventory.quantity == quantity,
                    Inventory.unit == unit,
                    Inventory.price_per_unit == price_per_unit,
                    Inventory.total_cost == total_cost,
                    Inventory.type == type_,
                    Inventory.date_added == date_added
                ).first()

                if existing:
                    skipped_rows.append(f"Row {idx}: Exact item already exists. Skipped.")
                    continue

                item = Inventory(
                    name=name,
                    quantity=quantity,
                    unit=unit,
                    price_per_unit=price_per_unit,
                    total_cost=total_cost,
                    type=type_,
                    date_added=date_added
                )
                db.add(item)
                db.add(Expense(item_name=name, quantity=quantity, total_cost=total_cost, date=date_added))
                added_items.append(name)

            except Exception as row_error:
                skipped_rows.append(f"Row {idx}: {str(row_error)}")

        db.commit()

        return {
            "message": "Excel processed successfully",
            "added_items": added_items,
            "skipped_rows": skipped_rows
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/prepare_dish")
def prepare_dish(dish_id: int, quantity: float, db: Session = Depends(get_db)):
    dish_ingredients = db.query(DishIngredient).filter(DishIngredient.dish_id == dish_id).all()
    if not dish_ingredients:
        raise HTTPException(status_code=404, detail="Dish not found or has no ingredients")

    for ingredient in dish_ingredients:
        required_quantity = ingredient.quantity_required * quantity
        inventory_item = db.query(Inventory).filter(Inventory.id == ingredient.ingredient_id).first()

        if not inventory_item or inventory_item.quantity < required_quantity:
            raise HTTPException(status_code=400, detail=f"Not enough {inventory_item.name} in inventory")

        inventory_item.quantity -= required_quantity
        db.add(InventoryLog(ingredient_id=ingredient.ingredient_id, quantity_left=inventory_item.quantity,
                            date=datetime.utcnow()))

    db.commit()
    return {"message": "Dish prepared, inventory updated!"}





@app.get("/inventory_on_date")
def inventory_on_date(date: str, db: Session = Depends(get_db)):
    date_parsed = datetime.strptime(date, "%Y-%m-%d")
    items = db.query(InventoryLog).filter(InventoryLog.date == date_parsed).all()
    return [{"ingredient_id": item.ingredient_id, "quantity_left": item.quantity_left, "date": item.date} for item in items]




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
