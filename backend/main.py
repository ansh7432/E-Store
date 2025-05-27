from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os
from enum import Enum
import asyncpg
from dotenv import load_dotenv

load_dotenv()  

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL")

async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL)

async def sql(query: str, params: list = None):
    conn = await get_db_connection()
    try:
        if params:
            result = await conn.fetch(query, *params)
        else:
            result = await conn.fetch(query)
        return [dict(record) for record in result]
    finally:
        await conn.close()

# Security
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="E-commerce API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://v0-fastapi-e-commerce-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums
class UserRole(str, Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: Optional[UserRole] = UserRole.CUSTOMER

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    stock: int
    category: str
    image_url: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    image_url: Optional[str] = None

class CartItemCreate(BaseModel):
    product_id: int
    quantity: int

class CheckoutRequest(BaseModel):
    payment_method: str = "card"

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

# Auth utilities
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await sql("SELECT * FROM users WHERE email = $1 AND id = $2", [email, user_id])
    if not user:
        raise credentials_exception
    return user[0]

# Auth endpoints
@app.post("/auth/signup", response_model=dict)
async def signup(user: UserCreate):
    # Check if user exists
    existing_user = await sql("SELECT id FROM users WHERE email = $1", [user.email])
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    existing_username = await sql("SELECT id FROM users WHERE username = $1", [user.username])
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    result = await sql(
        "INSERT INTO users (email, username, hashed_password, role) VALUES ($1, $2, $3, $4) RETURNING id",
        [user.email, user.username, hashed_password, user.role]
    )
    
    return {"message": "User created successfully", "user_id": result[0]["id"]}

@app.post("/auth/token", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await sql("SELECT * FROM users WHERE email = $1", [user_credentials.email])
    if not user or not verify_password(user_credentials.password, user[0]["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user[0]["email"], "user_id": user[0]["id"]}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user[0]["email"], "user_id": user[0]["id"]})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post("/auth/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user = await sql("SELECT * FROM users WHERE email = $1 AND id = $2", [email, user_id])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user[0]["email"], "user_id": user[0]["id"]}, expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(data={"sub": user[0]["email"], "user_id": user[0]["id"]})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@app.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "username": current_user["username"],
        "role": current_user["role"]
    }

@app.put("/auth/profile")
async def update_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    update_fields = []
    params = []
    param_count = 1
    
    for field, value in user_update.dict(exclude_unset=True).items():
        if field == "email":
            # Check if email already exists
            existing_email = await sql("SELECT id FROM users WHERE email = $1 AND id != $2", [value, current_user["id"]])
            if existing_email:
                raise HTTPException(status_code=400, detail="Email already registered")
        elif field == "username":
            # Check if username already exists
            existing_username = await sql("SELECT id FROM users WHERE username = $1 AND id != $2", [value, current_user["id"]])
            if existing_username:
                raise HTTPException(status_code=400, detail="Username already taken")
        
        update_fields.append(f"{field} = ${param_count}")
        params.append(value)
        param_count += 1
    
    if not update_fields:
        return {
            "id": current_user["id"],
            "email": current_user["email"],
            "username": current_user["username"],
            "role": current_user["role"]
        }
    
    query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ${param_count} RETURNING *"
    params.append(current_user["id"])
    
    result = await sql(query, params)
    return {
        "id": result[0]["id"],
        "email": result[0]["email"],
        "username": result[0]["username"],
        "role": result[0]["role"]
    }

@app.put("/auth/password")
async def update_password(
    password_update: PasswordUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Verify current password
    if not verify_password(password_update.current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    # Hash new password
    new_hashed_password = get_password_hash(password_update.new_password)
    
    await sql("UPDATE users SET hashed_password = $1 WHERE id = $2", [new_hashed_password, current_user["id"]])
    
    return {"message": "Password updated successfully"}

# Product endpoints
@app.get("/products")
async def get_products(
    skip: int = 0,
    limit: int = 20,
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    query = "SELECT * FROM products WHERE is_active = true"
    params = []
    
    if category and category != "all":
        query += " AND category = $" + str(len(params) + 1)
        params.append(category)
    
    if search:
        query += " AND name ILIKE $" + str(len(params) + 1)
        params.append(f"%{search}%")
    
    query += " ORDER BY created_at DESC LIMIT $" + str(len(params) + 1) + " OFFSET $" + str(len(params) + 2)
    params.extend([limit, skip])
    
    products = await sql(query, params)
    
    # Get total count
    count_query = "SELECT COUNT(*) as total FROM products WHERE is_active = true"
    count_params = []
    
    if category and category != "all":
        count_query += " AND category = $1"
        count_params.append(category)
    
    if search:
        if count_params:
            count_query += " AND name ILIKE $2"
        else:
            count_query += " AND name ILIKE $1"
        count_params.append(f"%{search}%")
    
    total_result = await sql(count_query, count_params)
    total = total_result[0]["total"] if total_result else 0
    
    return {
        "products": products,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@app.get("/products/{product_id}")
async def get_product(product_id: int):
    product = await sql("SELECT * FROM products WHERE id = $1 AND is_active = true", [product_id])
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product[0]

@app.post("/vendor/products")
async def create_product(
    product: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in [UserRole.VENDOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to create products")
    
    result = await sql(
        """INSERT INTO products (name, description, price, stock, category, image_url, vendor_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *""",
        [product.name, product.description, product.price, product.stock, 
         product.category, product.image_url, current_user["id"]]
    )
    return result[0]

@app.put("/vendor/products/{product_id}")
async def update_product(
    product_id: int,
    product_update: ProductUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Check if product exists and belongs to user
    product = await sql("SELECT * FROM products WHERE id = $1", [product_id])
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product[0]["vendor_id"] != current_user["id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update this product")
    
    # Build update query dynamically
    update_fields = []
    params = []
    param_count = 1
    
    for field, value in product_update.dict(exclude_unset=True).items():
        update_fields.append(f"{field} = ${param_count}")
        params.append(value)
        param_count += 1
    
    if not update_fields:
        return product[0]
    
    query = f"UPDATE products SET {', '.join(update_fields)} WHERE id = ${param_count} RETURNING *"
    params.append(product_id)
    
    result = await sql(query, params)
    return result[0]

@app.delete("/vendor/products/{product_id}")
async def delete_product(
    product_id: int,
    current_user: dict = Depends(get_current_user)
):
    product = await sql("SELECT * FROM products WHERE id = $1", [product_id])
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product[0]["vendor_id"] != current_user["id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this product")
    
    await sql("UPDATE products SET is_active = false WHERE id = $1", [product_id])
    return {"message": "Product deleted successfully"}

# Cart endpoints
@app.get("/cart")
async def get_cart(current_user: dict = Depends(get_current_user)):
    cart_items = await sql("""
        SELECT ci.*, p.name, p.price, p.image_url 
        FROM cart_items ci 
        JOIN products p ON ci.product_id = p.id 
        WHERE ci.user_id = $1
    """, [current_user["id"]])
    
    total = sum(item["price"] * item["quantity"] for item in cart_items)
    
    return {
        "items": [
            {
                "id": item["id"],
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "product": {
                    "id": item["product_id"],
                    "name": item["name"],
                    "price": item["price"],
                    "image_url": item["image_url"]
                }
            }
            for item in cart_items
        ],
        "total": total,
        "item_count": len(cart_items)
    }

@app.post("/cart/items")
async def add_to_cart(
    cart_item: CartItemCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if product exists
    product = await sql("SELECT * FROM products WHERE id = $1", [cart_item.product_id])
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if item already in cart
    existing_item = await sql(
        "SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2",
        [current_user["id"], cart_item.product_id]
    )
    
    if existing_item:
        # Update quantity
        result = await sql(
            "UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2 RETURNING *",
            [cart_item.quantity, existing_item[0]["id"]]
        )
        return result[0]
    else:
        # Create new cart item
        result = await sql(
            "INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *",
            [current_user["id"], cart_item.product_id, cart_item.quantity]
        )
        return result[0]

class CartItemUpdate(BaseModel):
    quantity: int

@app.put("/cart/items/{item_id}")
async def update_cart_item(
    item_id: int,
    cart_update: CartItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    cart_item = await sql(
        "SELECT * FROM cart_items WHERE id = $1 AND user_id = $2",
        [item_id, current_user["id"]]
    )
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    if cart_update.quantity <= 0:
        # Remove item if quantity is 0 or less
        await sql("DELETE FROM cart_items WHERE id = $1", [item_id])
        return {"message": "Item removed from cart"}
    else:
        # Update quantity
        result = await sql(
            "UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *",
            [cart_update.quantity, item_id]
        )
        return result[0]

@app.delete("/cart/items/{item_id}")
async def remove_from_cart(
    item_id: int,
    current_user: dict = Depends(get_current_user)
):
    cart_item = await sql(
        "SELECT * FROM cart_items WHERE id = $1 AND user_id = $2",
        [item_id, current_user["id"]]
    )
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    await sql("DELETE FROM cart_items WHERE id = $1", [item_id])
    return {"message": "Item removed from cart"}

@app.post("/checkout")
async def checkout(
    checkout_data: CheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    # Get cart items
    cart_items = await sql("""
        SELECT ci.*, p.price 
        FROM cart_items ci 
        JOIN products p ON ci.product_id = p.id 
        WHERE ci.user_id = $1
    """, [current_user["id"]])
    
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate total
    total_amount = sum(item["price"] * item["quantity"] for item in cart_items)
    
    # Create order
    order_result = await sql(
        "INSERT INTO orders (user_id, total_amount, payment_intent_id) VALUES ($1, $2, $3) RETURNING *",
        [current_user["id"], total_amount, f"pi_mock_{int(datetime.utcnow().timestamp())}"]
    )
    order = order_result[0]
    
    # Create order items
    for cart_item in cart_items:
        await sql(
            "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
            [order["id"], cart_item["product_id"], cart_item["quantity"], cart_item["price"]]
        )
    
    # Clear cart
    await sql("DELETE FROM cart_items WHERE user_id = $1", [current_user["id"]])
    
    return {
        "order_id": order["id"],
        "total_amount": total_amount,
        "payment_intent_id": order["payment_intent_id"],
        "status": "created"
    }

# Order management endpoints
@app.get("/orders")
async def get_user_orders(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20
):
    # Get orders with items separately to avoid array aggregation issues
    orders = await sql("""
        SELECT o.id, o.total_amount, o.status, o.created_at, o.payment_intent_id,
               COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = $1
        GROUP BY o.id, o.total_amount, o.status, o.created_at, o.payment_intent_id
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3
    """, [current_user["id"], limit, skip])
    
    # Get items for each order
    for order in orders:
        items = await sql("""
            SELECT oi.id, oi.product_id, oi.quantity, oi.price,
                   p.name as product_name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
        """, [order["id"]])
        order["items"] = items
    
    return orders

@app.get("/orders/{order_id}")
async def get_order_details(
    order_id: int,
    current_user: dict = Depends(get_current_user)
):
    # Get order details
    order = await sql("""
        SELECT o.id, o.total_amount, o.status, o.created_at, o.payment_intent_id
        FROM orders o
        WHERE o.id = $1 AND o.user_id = $2
    """, [order_id, current_user["id"]])
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get order items
    items = await sql("""
        SELECT oi.id, oi.product_id, oi.quantity, oi.price,
               p.name as product_name, p.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
    """, [order_id])
    
    order_details = order[0]
    order_details["items"] = items
    
    return order_details

@app.put("/orders/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    current_user: dict = Depends(get_current_user)
):
    order = await sql("SELECT * FROM orders WHERE id = $1 AND user_id = $2", [order_id, current_user["id"]])
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order[0]["status"] != "created":
        raise HTTPException(status_code=400, detail="Cannot cancel order that is not in created status")
    
    await sql("UPDATE orders SET status = 'cancelled' WHERE id = $1", [order_id])
    
    return {"message": "Order cancelled successfully"}

class OrderStatusUpdate(BaseModel):
    status: str

@app.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Check if user is admin or vendor
    if current_user["role"] not in [UserRole.ADMIN, UserRole.VENDOR]:
        raise HTTPException(status_code=403, detail="Not authorized to update order status")
    
    # Valid statuses
    valid_statuses = ["created", "confirmed", "shipped", "delivered", "cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Update order status
    result = await sql(
        "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
        [status_update.status, order_id]
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status_update.status}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
