# E-Commerce Bookstore

A simple but functional e-commerce bookstore built with Golang backend, PostgreSQL database (raw SQL), and Tailwind CSS frontend.

## Features

### Customer Features
- **User Registration & Login** - Secure authentication with bcrypt password hashing
- **Book Catalog** - Browse books with search, category filtering, and sorting
- **Book Details** - View detailed information about each book
- **Shopping Cart** - Add books to cart, update quantities, and manage items
- **Checkout Process** - Complete orders with shipping address (mock payment)
- **Order History** - View past orders and track order status
- **Order Details** - View detailed information about each order

### Admin Features
- **Admin Dashboard** - Overview of total books, orders, revenue, and recent orders
- **Book Management** - Add, edit, delete books with details like title, author, price, stock, etc.
- **Order Management** - View all orders and update order status (pending, processing, shipped, delivered, cancelled)
- **Category Management** - Books organized by categories

## Technology Stack

- **Backend**: Golang (raw HTTP handlers, no frameworks)
- **Database**: PostgreSQL with raw SQL queries
- **Frontend**: HTML, Tailwind CSS (CDN), Vanilla JavaScript
- **Session Management**: gorilla/sessions
- **Password Hashing**: bcrypt

## Database Schema

- **users** - User accounts (customers and admins)
- **categories** - Book categories
- **books** - Book inventory
- **addresses** - Shipping addresses
- **cart_items** - Shopping cart items
- **orders** - Customer orders
- **order_items** - Items in each order

## Getting Started

### Prerequisites
- Go 1.24+
- PostgreSQL database

### Default Accounts

**Admin Account:**
- Email: `admin@bookstore.com`
- Password: `admin123`

**Test Customer Account:**
- Email: `customer@test.com`
- Password: `customer123`

Note: The actual password hash is a placeholder. You can create new accounts through the registration page.

### Running the Application

1. The server is configured to run automatically on port 5000
2. Access the application through the webview
3. Browse books, add to cart, and checkout
4. Login as admin to manage books and orders

## Project Structure

```
.
├── main.go                 # Golang backend server
├── go.mod                  # Go module dependencies
├── static/                 # Frontend files
│   ├── css/
│   │   └── style.css      # Custom styles
│   ├── js/
│   │   ├── common.js      # Shared JavaScript utilities
│   │   ├── home.js        # Homepage functionality
│   │   ├── login.js       # Login page
│   │   ├── register.js    # Registration page
│   │   ├── books.js       # Book catalog page
│   │   ├── book-detail.js # Book details page
│   │   ├── cart.js        # Shopping cart
│   │   ├── checkout.js    # Checkout process
│   │   ├── customer-dashboard.js  # Customer dashboard
│   │   ├── admin-dashboard.js     # Admin dashboard
│   │   ├── admin-books.js         # Admin book management
│   │   └── admin-orders.js        # Admin order management
│   ├── index.html         # Homepage
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   ├── books.html         # Book catalog
│   ├── book-detail.html   # Book details
│   ├── cart.html          # Shopping cart
│   ├── checkout.html      # Checkout page
│   ├── customer-dashboard.html    # Customer dashboard
│   ├── admin-dashboard.html       # Admin dashboard
│   ├── admin-books.html           # Admin book management
│   └── admin-orders.html          # Admin order management
└── README.md              # This file
```

## API Endpoints

### Public Endpoints
- `GET /` - Homepage
- `GET /books` - Book catalog page
- `GET /book/:id` - Book detail page
- `GET /login` - Login page
- `GET /register` - Registration page
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `GET /api/books` - Get all books (with filters)
- `GET /api/books/:id` - Get book details
- `GET /api/categories` - Get all categories

### Authenticated Endpoints
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user
- `GET /api/cart` - Get cart items
- `POST /api/cart/add` - Add item to cart
- `POST /api/cart/update` - Update cart item quantity
- `POST /api/cart/remove` - Remove item from cart
- `POST /api/checkout` - Complete checkout
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details

### Admin Endpoints
- `GET /admin` - Admin dashboard
- `GET /api/admin/books` - Get/Create books
- `PUT /api/admin/books/:id` - Update book
- `DELETE /api/admin/books/:id` - Delete book
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id` - Update order status

## Features Implementation

### Authentication
- Session-based authentication using cookies
- Passwords hashed with bcrypt
- User roles (customer and admin)

### Shopping Cart
- Persistent cart stored in database
- Cart items tied to user accounts
- Quantity management with stock validation

### Order Processing
- Mock payment system
- Order number generation
- Stock management (inventory reduced on order)
- Order status tracking
- Shipping address storage

### Admin Panel
- Separate admin interface with purple theme
- Complete CRUD operations for books
- Order status management
- Dashboard with statistics

## Sample Data

The database is pre-seeded with:
- 8 book categories (Fiction, Science Fiction, Mystery, Romance, Biography, Self-Help, Technology, History)
- 12 sample books with cover images from Unsplash
- 2 test user accounts (admin and customer)

## Security Notes

- This is a pet project for demonstration purposes
- Session secret should be changed in production
- HTTPS should be used in production
- Additional validation and error handling should be added for production use
- Mock payment system should be replaced with real payment gateway

## Future Enhancements

Potential features to add:
- User profile management
- Book reviews and ratings
- Wishlist functionality
- Advanced search and filters
- Email notifications
- Real payment integration (Stripe, PayPal)
- Image upload for book covers
- Sales analytics and reports
- Inventory alerts for low stock





psql -U postgres -c "CREATE DATABASE bookstore;"

# create extension (run as superuser if needed)
psql -U postgres -d bookstore -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# apply schema and seed (run from project root where schema.sql and seed.sql are)
psql -U postgres -d bookstore -f schema.sql
psql -U postgres -d bookstore -f seed.sql


export DATABASE_URL="postgres://postgres:4132@localhost:5432/bookstore?sslmode=disable"
export SESSION_SECRET="123"

go mod tidy
go run .