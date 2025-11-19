package main

import (
        "database/sql"
        "encoding/json"
        "fmt"
        "log"
        "net/http"
        "os"
        "strconv"
        "strings"
        "time"

        "github.com/gorilla/sessions"
        _ "github.com/lib/pq"
        "golang.org/x/crypto/bcrypt"
)

var (
        db    *sql.DB
        store *sessions.CookieStore
)

type User struct {
        ID           int       `json:"id"`
        Email        string    `json:"email"`
        PasswordHash string    `json:"-"`
        FullName     string    `json:"full_name"`
        IsAdmin      bool      `json:"is_admin"`
        CreatedAt    time.Time `json:"created_at"`
}

type Book struct {
        ID              int     `json:"id"`
        Title           string  `json:"title"`
        Author          string  `json:"author"`
        Description     string  `json:"description"`
        Price           float64 `json:"price"`
        StockQuantity   int     `json:"stock_quantity"`
        CategoryID      int     `json:"category_id"`
        CategoryName    string  `json:"category_name,omitempty"`
        CoverImageURL   string  `json:"cover_image_url"`
        ISBN            string  `json:"isbn"`
        PublicationYear int     `json:"publication_year"`
}

type Category struct {
        ID          int    `json:"id"`
        Name        string `json:"name"`
        Description string `json:"description"`
}

type CartItem struct {
        ID       int     `json:"id"`
        UserID   int     `json:"user_id"`
        BookID   int     `json:"book_id"`
        Quantity int     `json:"quantity"`
        Book     *Book   `json:"book,omitempty"`
}

type Order struct {
        ID                int       `json:"id"`
        UserID            int       `json:"user_id"`
        OrderNumber       string    `json:"order_number"`
        TotalAmount       float64   `json:"total_amount"`
        Status            string    `json:"status"`
        ShippingAddressID int       `json:"shipping_address_id"`
        PaymentMethod     string    `json:"payment_method"`
        CreatedAt         time.Time `json:"created_at"`
        UpdatedAt         time.Time `json:"updated_at"`
        Items             []OrderItem `json:"items,omitempty"`
        ShippingAddress   *Address    `json:"shipping_address,omitempty"`
}

type OrderItem struct {
        ID              int     `json:"id"`
        OrderID         int     `json:"order_id"`
        BookID          int     `json:"book_id"`
        Quantity        int     `json:"quantity"`
        PriceAtPurchase float64 `json:"price_at_purchase"`
        Subtotal        float64 `json:"subtotal"`
        BookTitle       string  `json:"book_title,omitempty"`
        BookAuthor      string  `json:"book_author,omitempty"`
}

type Address struct {
        ID           int    `json:"id"`
        UserID       int    `json:"user_id"`
        FullName     string `json:"full_name"`
        Phone        string `json:"phone"`
        AddressLine1 string `json:"address_line1"`
        AddressLine2 string `json:"address_line2"`
        City         string `json:"city"`
        State        string `json:"state"`
        PostalCode   string `json:"postal_code"`
        Country      string `json:"country"`
        IsDefault    bool   `json:"is_default"`
}

func initDB() error {
        var err error
        dbURL := os.Getenv("DATABASE_URL")
        if dbURL == "" {
                return fmt.Errorf("DATABASE_URL not set")
        }

        db, err = sql.Open("postgres", dbURL)
        if err != nil {
                return err
        }

        return db.Ping()
}

func main() {
        if err := initDB(); err != nil {
                log.Fatal("Failed to connect to database:", err)
        }
        defer db.Close()

        sessionSecret := os.Getenv("SESSION_SECRET")
        if sessionSecret == "" {
                sessionSecret = "your-secret-key-change-in-production"
        }
        store = sessions.NewCookieStore([]byte(sessionSecret))

        mux := http.NewServeMux()

        mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

        mux.HandleFunc("/", serveHome)
        mux.HandleFunc("/login", serveLogin)
        mux.HandleFunc("/register", serveRegister)
        mux.HandleFunc("/books", serveBooks)
        mux.HandleFunc("/book/", serveBookDetail)
        mux.HandleFunc("/cart", serveCart)
        mux.HandleFunc("/checkout", serveCheckout)
        mux.HandleFunc("/customer/dashboard", serveCustomerDashboard)
        mux.HandleFunc("/customer/orders", serveCustomerOrders)
        mux.HandleFunc("/admin", serveAdminDashboard)
        mux.HandleFunc("/admin/books", serveAdminBooks)
        mux.HandleFunc("/admin/orders", serveAdminOrders)

        mux.HandleFunc("/api/register", handleRegister)
        mux.HandleFunc("/api/login", handleLogin)
        mux.HandleFunc("/api/logout", handleLogout)
        mux.HandleFunc("/api/me", handleGetCurrentUser)
        mux.HandleFunc("/api/books", handleBooks)
        mux.HandleFunc("/api/books/", handleBookDetail)
        mux.HandleFunc("/api/categories", handleCategories)
        mux.HandleFunc("/api/cart", handleCart)
        mux.HandleFunc("/api/cart/add", handleAddToCart)
        mux.HandleFunc("/api/cart/update", handleUpdateCartItem)
        mux.HandleFunc("/api/cart/remove", handleRemoveFromCart)
        mux.HandleFunc("/api/checkout", handleCheckout)
        mux.HandleFunc("/api/orders", handleOrders)
        mux.HandleFunc("/api/orders/", handleOrderDetail)
        mux.HandleFunc("/api/admin/books", handleAdminBooks)
        mux.HandleFunc("/api/admin/books/", handleAdminBookDetail)
        mux.HandleFunc("/api/admin/orders", handleAdminOrders)
        mux.HandleFunc("/api/admin/orders/", handleAdminOrderUpdate)

        port := "5000"
        log.Printf("Server starting on port %s...", port)
        if err := http.ListenAndServe("0.0.0.0:"+port, mux); err != nil {
                log.Fatal(err)
        }
}

func getSession(r *http.Request) (*sessions.Session, error) {
        return store.Get(r, "bookstore-session")
}

func getCurrentUser(r *http.Request) (*User, error) {
        session, err := getSession(r)
        if err != nil {
                return nil, err
        }

        userID, ok := session.Values["user_id"].(int)
        if !ok {
                return nil, fmt.Errorf("not authenticated")
        }

        var user User
        err = db.QueryRow("SELECT id, email, full_name, is_admin, created_at FROM users WHERE id = $1", userID).
                Scan(&user.ID, &user.Email, &user.FullName, &user.IsAdmin, &user.CreatedAt)
        if err != nil {
                return nil, err
        }

        return &user, nil
}

func requireAuth(next http.HandlerFunc) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
                _, err := getCurrentUser(r)
                if err != nil {
                        http.Error(w, "Unauthorized", http.StatusUnauthorized)
                        return
                }
                next(w, r)
        }
}

func requireAdmin(next http.HandlerFunc) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
                user, err := getCurrentUser(r)
                if err != nil || !user.IsAdmin {
                        http.Error(w, "Forbidden", http.StatusForbidden)
                        return
                }
                next(w, r)
        }
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        var req struct {
                Email    string `json:"email"`
                Password string `json:"password"`
                FullName string `json:"full_name"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, "Invalid request", http.StatusBadRequest)
                return
        }

        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }

        var userID int
        err = db.QueryRow(
                "INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id",
                req.Email, string(hashedPassword), req.FullName,
        ).Scan(&userID)

        if err != nil {
                if strings.Contains(err.Error(), "duplicate") {
                        http.Error(w, "Email already exists", http.StatusConflict)
                        return
                }
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }

        session, _ := getSession(r)
        session.Values["user_id"] = userID
        session.Save(r, w)

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
                "success": true,
                "user_id": userID,
        })
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        var req struct {
                Email    string `json:"email"`
                Password string `json:"password"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, "Invalid request", http.StatusBadRequest)
                return
        }

        var user User
        err := db.QueryRow("SELECT id, email, password_hash, full_name, is_admin FROM users WHERE email = $1", req.Email).
                Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.IsAdmin)

        if err != nil {
                http.Error(w, "Invalid credentials", http.StatusUnauthorized)
                return
        }

        if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
                http.Error(w, "Invalid credentials", http.StatusUnauthorized)
                return
        }

        session, _ := getSession(r)
        session.Values["user_id"] = user.ID
        session.Save(r, w)

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
                "success":  true,
                "user_id":  user.ID,
                "is_admin": user.IsAdmin,
        })
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
        session, _ := getSession(r)
        session.Values["user_id"] = nil
        session.Options.MaxAge = -1
        session.Save(r, w)

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func handleGetCurrentUser(w http.ResponseWriter, r *http.Request) {
        user, err := getCurrentUser(r)
        if err != nil {
                http.Error(w, "Not authenticated", http.StatusUnauthorized)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(user)
}

func handleBooks(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        query := r.URL.Query()
        search := query.Get("search")
        categoryID := query.Get("category")
        sortBy := query.Get("sort")

        sql := `SELECT b.id, b.title, b.author, b.description, b.price, b.stock_quantity, 
                       b.category_id, c.name as category_name, b.cover_image_url, b.isbn, b.publication_year
                FROM books b
                LEFT JOIN categories c ON b.category_id = c.id
                WHERE 1=1`

        var args []interface{}
        argCount := 1

        if search != "" {
                sql += fmt.Sprintf(" AND (LOWER(b.title) LIKE $%d OR LOWER(b.author) LIKE $%d)", argCount, argCount)
                args = append(args, "%"+strings.ToLower(search)+"%")
                argCount++
        }

        if categoryID != "" {
                sql += fmt.Sprintf(" AND b.category_id = $%d", argCount)
                catID, _ := strconv.Atoi(categoryID)
                args = append(args, catID)
                argCount++
        }

        switch sortBy {
        case "price_asc":
                sql += " ORDER BY b.price ASC"
        case "price_desc":
                sql += " ORDER BY b.price DESC"
        case "title":
                sql += " ORDER BY b.title ASC"
        default:
                sql += " ORDER BY b.created_at DESC"
        }

        rows, err := db.Query(sql, args...)
        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }
        defer rows.Close()

        var books []Book
        for rows.Next() {
                var book Book
                var categoryName *string
                err := rows.Scan(&book.ID, &book.Title, &book.Author, &book.Description, &book.Price,
                        &book.StockQuantity, &book.CategoryID, &categoryName, &book.CoverImageURL,
                        &book.ISBN, &book.PublicationYear)
                if err != nil {
                        continue
                }
                if categoryName != nil {
                        book.CategoryName = *categoryName
                }
                books = append(books, book)
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(books)
}

func handleBookDetail(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        idStr := strings.TrimPrefix(r.URL.Path, "/api/books/")
        id, err := strconv.Atoi(idStr)
        if err != nil {
                http.Error(w, "Invalid book ID", http.StatusBadRequest)
                return
        }

        var book Book
        var categoryName *string
        err = db.QueryRow(`SELECT b.id, b.title, b.author, b.description, b.price, b.stock_quantity, 
                                  b.category_id, c.name as category_name, b.cover_image_url, b.isbn, b.publication_year
                           FROM books b
                           LEFT JOIN categories c ON b.category_id = c.id
                           WHERE b.id = $1`, id).
                Scan(&book.ID, &book.Title, &book.Author, &book.Description, &book.Price,
                        &book.StockQuantity, &book.CategoryID, &categoryName, &book.CoverImageURL,
                        &book.ISBN, &book.PublicationYear)

        if err != nil {
                http.Error(w, "Book not found", http.StatusNotFound)
                return
        }

        if categoryName != nil {
                book.CategoryName = *categoryName
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(book)
}

func handleCategories(w http.ResponseWriter, r *http.Request) {
        rows, err := db.Query("SELECT id, name, description FROM categories ORDER BY name")
        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }
        defer rows.Close()

        var categories []Category
        for rows.Next() {
                var cat Category
                rows.Scan(&cat.ID, &cat.Name, &cat.Description)
                categories = append(categories, cat)
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(categories)
}

func handleCart(w http.ResponseWriter, r *http.Request) {
        user, err := getCurrentUser(r)
        if err != nil {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
        }

        rows, err := db.Query(`SELECT c.id, c.user_id, c.book_id, c.quantity,
                                      b.title, b.author, b.price, b.cover_image_url, b.stock_quantity
                               FROM cart_items c
                               JOIN books b ON c.book_id = b.id
                               WHERE c.user_id = $1`, user.ID)
        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }
        defer rows.Close()

        var items []CartItem
        for rows.Next() {
                var item CartItem
                item.Book = &Book{}
                rows.Scan(&item.ID, &item.UserID, &item.BookID, &item.Quantity,
                        &item.Book.Title, &item.Book.Author, &item.Book.Price,
                        &item.Book.CoverImageURL, &item.Book.StockQuantity)
                item.Book.ID = item.BookID
                items = append(items, item)
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(items)
}

func handleAddToCart(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        user, err := getCurrentUser(r)
        if err != nil {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
        }

        var req struct {
                BookID   int `json:"book_id"`
                Quantity int `json:"quantity"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, "Invalid request", http.StatusBadRequest)
                return
        }

        if req.Quantity < 1 {
                req.Quantity = 1
        }

        _, err = db.Exec(`INSERT INTO cart_items (user_id, book_id, quantity) 
                          VALUES ($1, $2, $3)
                          ON CONFLICT (user_id, book_id) 
                          DO UPDATE SET quantity = cart_items.quantity + $3`,
                user.ID, req.BookID, req.Quantity)

        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func handleUpdateCartItem(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        user, err := getCurrentUser(r)
        if err != nil {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
        }

        var req struct {
                BookID   int `json:"book_id"`
                Quantity int `json:"quantity"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, "Invalid request", http.StatusBadRequest)
                return
        }

        if req.Quantity < 1 {
                http.Error(w, "Quantity must be at least 1", http.StatusBadRequest)
                return
        }

        _, err = db.Exec("UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND book_id = $3",
                req.Quantity, user.ID, req.BookID)

        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func handleRemoveFromCart(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        user, err := getCurrentUser(r)
        if err != nil {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
        }

        var req struct {
                BookID int `json:"book_id"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, "Invalid request", http.StatusBadRequest)
                return
        }

        _, err = db.Exec("DELETE FROM cart_items WHERE user_id = $1 AND book_id = $2",
                user.ID, req.BookID)

        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func handleCheckout(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        user, err := getCurrentUser(r)
        if err != nil {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
        }

        var req struct {
                FullName     string `json:"full_name"`
                Phone        string `json:"phone"`
                AddressLine1 string `json:"address_line1"`
                AddressLine2 string `json:"address_line2"`
                City         string `json:"city"`
                State        string `json:"state"`
                PostalCode   string `json:"postal_code"`
                Country      string `json:"country"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, "Invalid request", http.StatusBadRequest)
                return
        }

        tx, err := db.Begin()
        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }
        defer tx.Rollback()

        var addressID int
        err = tx.QueryRow(`INSERT INTO addresses (user_id, full_name, phone, address_line1, address_line2, city, state, postal_code, country)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
                user.ID, req.FullName, req.Phone, req.AddressLine1, req.AddressLine2,
                req.City, req.State, req.PostalCode, req.Country).Scan(&addressID)

        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }

        rows, err := tx.Query(`SELECT book_id, quantity FROM cart_items WHERE user_id = $1`, user.ID)
        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }
        defer rows.Close()

        type CartData struct {
                BookID   int
                Quantity int
        }
        var cartItems []CartData
        for rows.Next() {
                var item CartData
                rows.Scan(&item.BookID, &item.Quantity)
                cartItems = append(cartItems, item)
        }
        rows.Close()

        if len(cartItems) == 0 {
                http.Error(w, "Cart is empty", http.StatusBadRequest)
                return
        }

        var totalAmount float64
        for _, item := range cartItems {
                var price float64
                var stock int
                err = tx.QueryRow("SELECT price, stock_quantity FROM books WHERE id = $1", item.BookID).
                        Scan(&price, &stock)
                if err != nil || stock < item.Quantity {
                        http.Error(w, "Insufficient stock", http.StatusBadRequest)
                        return
                }
                totalAmount += price * float64(item.Quantity)
        }

        orderNumber := fmt.Sprintf("ORD-%d-%d", user.ID, time.Now().Unix())

        var orderID int
        err = tx.QueryRow(`INSERT INTO orders (user_id, order_number, total_amount, status, shipping_address_id, payment_method)
                           VALUES ($1, $2, $3, 'pending', $4, 'mock') RETURNING id`,
                user.ID, orderNumber, totalAmount, addressID).Scan(&orderID)

        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }

        for _, item := range cartItems {
                var price float64
                tx.QueryRow("SELECT price FROM books WHERE id = $1", item.BookID).Scan(&price)

                subtotal := price * float64(item.Quantity)
                _, err = tx.Exec(`INSERT INTO order_items (order_id, book_id, quantity, price_at_purchase, subtotal)
                                  VALUES ($1, $2, $3, $4, $5)`,
                        orderID, item.BookID, item.Quantity, price, subtotal)

                if err != nil {
                        http.Error(w, "Server error", http.StatusInternalServerError)
                        return
                }

                _, err = tx.Exec("UPDATE books SET stock_quantity = stock_quantity - $1 WHERE id = $2",
                        item.Quantity, item.BookID)
                if err != nil {
                        http.Error(w, "Server error", http.StatusInternalServerError)
                        return
                }
        }

        _, err = tx.Exec("DELETE FROM cart_items WHERE user_id = $1", user.ID)
        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }

        if err = tx.Commit(); err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
                "success":      true,
                "order_id":     orderID,
                "order_number": orderNumber,
        })
}

func handleOrders(w http.ResponseWriter, r *http.Request) {
        user, err := getCurrentUser(r)
        if err != nil {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
        }

        rows, err := db.Query(`SELECT id, order_number, total_amount, status, created_at
                               FROM orders WHERE user_id = $1 ORDER BY created_at DESC`, user.ID)
        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }
        defer rows.Close()

        var orders []Order
        for rows.Next() {
                var order Order
                rows.Scan(&order.ID, &order.OrderNumber, &order.TotalAmount, &order.Status, &order.CreatedAt)
                orders = append(orders, order)
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(orders)
}

func handleOrderDetail(w http.ResponseWriter, r *http.Request) {
        user, err := getCurrentUser(r)
        if err != nil {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
        }

        idStr := strings.TrimPrefix(r.URL.Path, "/api/orders/")
        id, err := strconv.Atoi(idStr)
        if err != nil {
                http.Error(w, "Invalid order ID", http.StatusBadRequest)
                return
        }

        var order Order
        order.ShippingAddress = &Address{}
        err = db.QueryRow(`SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at, o.shipping_address_id,
                                  a.full_name, a.phone, a.address_line1, a.address_line2, a.city, a.state, a.postal_code, a.country
                           FROM orders o
                           LEFT JOIN addresses a ON o.shipping_address_id = a.id
                           WHERE o.id = $1 AND o.user_id = $2`, id, user.ID).
                Scan(&order.ID, &order.OrderNumber, &order.TotalAmount, &order.Status, &order.CreatedAt, &order.ShippingAddressID,
                        &order.ShippingAddress.FullName, &order.ShippingAddress.Phone, &order.ShippingAddress.AddressLine1,
                        &order.ShippingAddress.AddressLine2, &order.ShippingAddress.City, &order.ShippingAddress.State,
                        &order.ShippingAddress.PostalCode, &order.ShippingAddress.Country)

        if err != nil {
                http.Error(w, "Order not found", http.StatusNotFound)
                return
        }

        rows, err := db.Query(`SELECT oi.id, oi.book_id, oi.quantity, oi.price_at_purchase, oi.subtotal,
                                      b.title, b.author
                               FROM order_items oi
                               JOIN books b ON oi.book_id = b.id
                               WHERE oi.order_id = $1`, order.ID)
        if err == nil {
                defer rows.Close()
                for rows.Next() {
                        var item OrderItem
                        rows.Scan(&item.ID, &item.BookID, &item.Quantity, &item.PriceAtPurchase, &item.Subtotal,
                                &item.BookTitle, &item.BookAuthor)
                        order.Items = append(order.Items, item)
                }
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(order)
}

func handleAdminBooks(w http.ResponseWriter, r *http.Request) {
        user, err := getCurrentUser(r)
        if err != nil || !user.IsAdmin {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
        }

        switch r.Method {
        case http.MethodGet:
                rows, err := db.Query(`SELECT b.id, b.title, b.author, b.description, b.price, b.stock_quantity, 
                                              b.category_id, c.name as category_name, b.cover_image_url, b.isbn, b.publication_year
                                       FROM books b
                                       LEFT JOIN categories c ON b.category_id = c.id
                                       ORDER BY b.created_at DESC`)
                if err != nil {
                        http.Error(w, "Server error", http.StatusInternalServerError)
                        return
                }
                defer rows.Close()

                var books []Book
                for rows.Next() {
                        var book Book
                        var categoryName *string
                        rows.Scan(&book.ID, &book.Title, &book.Author, &book.Description, &book.Price,
                                &book.StockQuantity, &book.CategoryID, &categoryName, &book.CoverImageURL,
                                &book.ISBN, &book.PublicationYear)
                        if categoryName != nil {
                                book.CategoryName = *categoryName
                        }
                        books = append(books, book)
                }

                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(books)

        case http.MethodPost:
                var book Book
                if err := json.NewDecoder(r.Body).Decode(&book); err != nil {
                        http.Error(w, "Invalid request", http.StatusBadRequest)
                        return
                }

                var bookID int
                err = db.QueryRow(`INSERT INTO books (title, author, description, price, stock_quantity, category_id, cover_image_url, isbn, publication_year)
                                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
                        book.Title, book.Author, book.Description, book.Price, book.StockQuantity,
                        book.CategoryID, book.CoverImageURL, book.ISBN, book.PublicationYear).Scan(&bookID)

                if err != nil {
                        http.Error(w, "Server error", http.StatusInternalServerError)
                        return
                }

                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(map[string]interface{}{
                        "success": true,
                        "book_id": bookID,
                })
        }
}

func handleAdminBookDetail(w http.ResponseWriter, r *http.Request) {
        user, err := getCurrentUser(r)
        if err != nil || !user.IsAdmin {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
        }

        idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/books/")
        id, err := strconv.Atoi(idStr)
        if err != nil {
                http.Error(w, "Invalid book ID", http.StatusBadRequest)
                return
        }

        switch r.Method {
        case http.MethodPut:
                var book Book
                if err := json.NewDecoder(r.Body).Decode(&book); err != nil {
                        http.Error(w, "Invalid request", http.StatusBadRequest)
                        return
                }

                _, err = db.Exec(`UPDATE books SET title=$1, author=$2, description=$3, price=$4, stock_quantity=$5, 
                                  category_id=$6, cover_image_url=$7, isbn=$8, publication_year=$9 WHERE id=$10`,
                        book.Title, book.Author, book.Description, book.Price, book.StockQuantity,
                        book.CategoryID, book.CoverImageURL, book.ISBN, book.PublicationYear, id)

                if err != nil {
                        http.Error(w, "Server error", http.StatusInternalServerError)
                        return
                }

                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(map[string]bool{"success": true})

        case http.MethodDelete:
                _, err = db.Exec("DELETE FROM books WHERE id = $1", id)
                if err != nil {
                        http.Error(w, "Server error", http.StatusInternalServerError)
                        return
                }

                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(map[string]bool{"success": true})
        }
}

func handleAdminOrders(w http.ResponseWriter, r *http.Request) {
        user, err := getCurrentUser(r)
        if err != nil || !user.IsAdmin {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
        }

        rows, err := db.Query(`SELECT o.id, o.user_id, o.order_number, o.total_amount, o.status, o.created_at,
                                      u.full_name, u.email
                               FROM orders o
                               JOIN users u ON o.user_id = u.id
                               ORDER BY o.created_at DESC`)
        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }
        defer rows.Close()

        type AdminOrder struct {
                Order
                CustomerName  string `json:"customer_name"`
                CustomerEmail string `json:"customer_email"`
        }

        var orders []AdminOrder
        for rows.Next() {
                var order AdminOrder
                rows.Scan(&order.ID, &order.UserID, &order.OrderNumber, &order.TotalAmount,
                        &order.Status, &order.CreatedAt, &order.CustomerName, &order.CustomerEmail)
                orders = append(orders, order)
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(orders)
}

func handleAdminOrderUpdate(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPut {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        user, err := getCurrentUser(r)
        if err != nil || !user.IsAdmin {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
        }

        idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/orders/")
        id, err := strconv.Atoi(idStr)
        if err != nil {
                http.Error(w, "Invalid order ID", http.StatusBadRequest)
                return
        }

        var req struct {
                Status string `json:"status"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, "Invalid request", http.StatusBadRequest)
                return
        }

        _, err = db.Exec("UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                req.Status, id)

        if err != nil {
                http.Error(w, "Server error", http.StatusInternalServerError)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func serveHome(w http.ResponseWriter, r *http.Request) {
        if r.URL.Path != "/" {
                http.NotFound(w, r)
                return
        }
        http.ServeFile(w, r, "static/index.html")
}

func serveLogin(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/login.html")
}

func serveRegister(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/register.html")
}

func serveBooks(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/books.html")
}

func serveBookDetail(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/book-detail.html")
}

func serveCart(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/cart.html")
}

func serveCheckout(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/checkout.html")
}

func serveCustomerDashboard(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/customer-dashboard.html")
}

func serveCustomerOrders(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/customer-orders.html")
}

func serveAdminDashboard(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/admin-dashboard.html")
}

func serveAdminBooks(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/admin-books.html")
}

func serveAdminOrders(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/admin-orders.html")
}
