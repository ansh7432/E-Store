# Full-Stack E-commerce Application

A complete e-commerce solution built with FastAPI backend and Next.js frontend.

## Features

### Backend (FastAPI)
- **Authentication**: JWT-based auth with access & refresh tokens
- **User Management**: Customer and vendor roles
- **Product Management**: CRUD operations for vendors
- **Shopping Cart**: Add, update, remove items
- **Checkout**: Order creation and payment processing
- **Database**: SQLite with SQLAlchemy ORM

### Frontend (Next.js)
- **Modern UI**: Built with shadcn/ui components
- **Authentication**: Login/signup with role selection
- **Product Catalog**: Browse, search, and filter products
- **Shopping Cart**: Real-time cart management
- **Vendor Dashboard**: Product management for vendors
- **Responsive Design**: Mobile-first approach

## API Endpoints

### Authentication
- `POST /auth/signup` - Create user account
- `POST /auth/token` - Login and get JWT tokens
- `POST /auth/refresh` - Refresh access token

### Products
- `GET /products` - List products with filters and pagination
- `GET /products/{id}` - Get single product details
- `POST /vendor/products` - Create product (vendor only)
- `PUT /vendor/products/{id}` - Update product (vendor only)
- `DELETE /vendor/products/{id}` - Delete product (vendor only)

### Cart & Checkout
- `GET /cart` - Get current user's cart
- `POST /cart/items` - Add/update cart item
- `DELETE /cart/items/{item_id}` - Remove cart item
- `POST /checkout` - Create order and process payment

## Setup Instructions

### Backend Setup
1. Install Python dependencies:
   \`\`\`bash
   cd backend
   pip install -r requirements.txt
   \`\`\`

2. Run the FastAPI server:
   \`\`\`bash
   python main.py
   \`\`\`
   The API will be available at `https://e-store-tau-sooty.vercel.app`

### Frontend Setup
1. Install Node.js dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`
   The frontend will be available at `http://localhost:3000`

## Usage

1. **Sign Up**: Create an account as either a customer or vendor
2. **Browse Products**: View the product catalog with search and filters
3. **Add to Cart**: Add products to your shopping cart
4. **Checkout**: Complete your purchase
5. **Vendor Features**: If you're a vendor, manage your products through the vendor dashboard

## Technology Stack

### Backend
- FastAPI
- SQLAlchemy
- SQLite
- JWT Authentication
- Pydantic
- Uvicorn

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Context API

## Security Features
- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- CORS protection
- Input validation with Pydantic

## Future Enhancements
- Payment gateway integration (Stripe/PayPal)
- Order tracking and history
- Product reviews and ratings
- Email notifications
- Advanced search with Elasticsearch
- Image upload functionality
- Admin dashboard
- Inventory management
