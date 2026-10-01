# 🛒 Task 19 – Real-Time Notifications

## ShopZone E-Commerce Application

Task 19 extends my existing full-stack **ShopZone E-Commerce Application** by adding a real-time notification system using **Flask-SocketIO** and **Socket.IO Client**.

The application can now send notifications instantly from the Flask backend to the React frontend without manually refreshing the browser.

Notifications are also stored in **MySQL**, so they remain available after refreshing the page or logging in again.

---

## 🚀 Technologies Used

### Frontend

- React
- Vite
- React Router
- Axios
- Context API
- Socket.IO Client
- HTML
- CSS
- JavaScript

### Backend

- Python
- Flask
- Flask-SocketIO
- Flask-JWT-Extended
- Flask-CORS
- Flask-Bcrypt
- Eventlet
- MySQL Connector

### Database

- MySQL

---

# ✨ Task 19 Features

## 1. Real-Time Socket.IO Connection

The React frontend connects to the Flask backend using Socket.IO.

After login, each user joins a Socket.IO room.

Example:

```text
user_8
```

Admin users also join:

```text
admins
```

This allows the backend to send notifications only to the required users.

---

## 2. Real-Time Order Notifications

When a customer successfully places an order:

1. The order is saved in MySQL.
2. Order items are saved.
3. Product stock is updated.
4. A notification is created.
5. The notification is stored in MySQL.
6. Flask-SocketIO emits a `new_notification` event.
7. The admin receives the notification immediately.
8. The notification bell updates without refreshing the page.

Example notification:

```text
New order #8 placed by hari — ₹159998.00
```

---

## 3. Persistent Notifications

Notifications are not stored only in React state.

They are also stored permanently in the MySQL database.

The notification table contains fields such as:

```text
id
user_id
message
type
is_read
created_at
```

Because notifications are stored in MySQL, they remain available after:

- Browser refresh
- Logout and login
- Socket reconnection

This gives the application both **real-time delivery** and **persistent notification history**.

---

# 🔔 Notification Bell

A notification bell is displayed in the Navbar.

The notification system supports:

- Unread notification count
- Notification dropdown
- Recent notifications
- Relative notification time
- Order notification icon
- Alert notification icon
- Mark one notification as read
- Mark all notifications as read
- Delete notification

Example:

```text
🔔 3
```

The unread badge updates automatically when notifications are received.

---

# 🔌 Notification REST APIs

The application contains protected notification APIs.

## Get Notifications

```http
GET /api/notifications
```

Returns notifications belonging to the currently logged-in user.

---

## Mark One Notification as Read

```http
PUT /api/notifications/<id>/read
```

Updates a single notification as read.

---

## Mark All Notifications as Read

```http
PUT /api/notifications/read-all
```

Marks all notifications belonging to the current user as read.

---

## Delete Notification

```http
DELETE /api/notifications/<id>
```

Deletes the selected notification.

All notification APIs are protected using JWT authentication.

---

# ⭐ Bonus Features

## Bonus 1 – Low Stock Alert

After an order is placed, the backend checks the remaining stock of each purchased product.

If the remaining stock is:

```text
5 or less
```

the system automatically generates a low-stock notification for administrators.

Example:

```text
Low stock alert: Laptop has only 3 items remaining.
```

The low-stock alert is:

- Stored in MySQL
- Sent through Socket.IO
- Displayed in the notification bell
- Delivered instantly to admins

This allows administrators to identify products that need restocking.

---

# ⭐ Bonus 2 – Browser / Windows Notifications

The application also supports native browser notifications.

When the ShopZone tab is not active and a real-time notification arrives, the admin can receive a browser/Windows notification.

Example:

```text
🛒 New ShopZone Order
```

For low stock:

```text
⚠️ ShopZone Stock Alert
```

The application uses the browser **Notification API**.

The user must allow notification permission in the browser.

When the notification is clicked, the ShopZone browser window is brought back into focus.

---

# ⭐ Bonus 3 – Live Admin Dashboard

A dedicated Admin Dashboard was created.

Admin Dashboard URL:

```text
/admin
```

The dashboard displays:

- Total Orders
- Total Revenue
- Total Products
- Unread Alerts
- Low Stock Products
- Recent Orders
- LIVE indicator

When a new order notification arrives, the dashboard automatically reloads the latest order information.

Therefore, the admin can see updated order information without manually refreshing the browser.

---

# 📊 Admin Dashboard

The Admin Dashboard provides a real-time overview of the ShopZone application.

Main dashboard cards include:

```text
📦 Total Orders

💰 Total Revenue

🛍️ Products

🔔 Unread Alerts

⚠️ Low Stock
```

The dashboard also displays the latest customer orders in the **Recent Orders** section.

---

# 🔄 Complete Real-Time Notification Flow

```text
Customer
   ↓
Places Order
   ↓
React Checkout
   ↓
POST Order API
   ↓
Flask Backend
   ↓
Save Order in MySQL
   ↓
Save Order Items
   ↓
Update Product Stock
   ↓
Check Remaining Stock
   ↓
Create Notification
   ↓
Save Notification in MySQL
   ↓
Flask-SocketIO
   ↓
Emit "new_notification"
   ↓
Admin Socket.IO Room
   ↓
React SocketContext
   ↓
Receive Notification
   ↓
Reload Notifications from MySQL
   ↓
Notification Bell Updates
   ↓
Unread Count Updates
   ↓
Admin Dashboard Updates
   ↓
Browser / Windows Notification
```

---

# 🌐 HTTP vs WebSocket

## Normal HTTP

Normal HTTP communication follows a request-response model.

```text
Client
   ↓
Request
   ↓
Server
   ↓
Response
   ↓
Client
```

The frontend normally needs to send a request before receiving updated information.

---

## WebSocket

WebSockets maintain a persistent connection between the frontend and backend.

```text
React Client
      ↕
Persistent Connection
      ↕
Flask-SocketIO
```

This allows the server to push information to the frontend immediately.

WebSockets are useful for:

- Real-time notifications
- Chat applications
- Live dashboards
- Order tracking
- Live stock updates
- Real-time alerts

---

# 🏠 Why Socket.IO Rooms?

Socket.IO rooms allow the backend to send events only to selected users.

Every logged-in user can join a personal room.

Example:

```text
user_<user_id>
```

For example:

```text
user_8
```

Admin users additionally join:

```text
admins
```

When a customer places an order, the backend sends the order notification to the admin room.

```text
Customer places order
        ↓
Flask Backend
        ↓
admins room
        ↓
Logged-in Admin
```

Therefore, normal customers do not receive admin order-management notifications.

---

# 💾 Why Store Notifications in MySQL?

Socket.IO provides instant delivery, but a WebSocket event itself is temporary.

For example, if the admin refreshes the browser, React state alone would not provide permanent notification history.

Therefore, the project uses:

```text
MySQL + Socket.IO
```

### Socket.IO provides:

```text
Instant real-time delivery
```

### MySQL provides:

```text
Permanent notification storage
```

Combining both technologies provides:

```text
Real-Time Communication
+
Persistent Data
```

---

# ⚛️ SocketContext

The React application uses `SocketContext.jsx` to manage the Socket.IO connection globally.

The SocketContext is responsible for:

- Connecting React to Flask-SocketIO
- Joining user/admin rooms
- Receiving `new_notification`
- Loading notifications from MySQL
- Updating notification state
- Updating unread count
- Showing browser notifications
- Sharing Socket.IO data with React components

This prevents Socket.IO connection logic from being repeated in multiple components.

---

# 🔐 JWT Authentication

The application uses JWT authentication.

The authentication system includes:

- Access Token
- Refresh Token
- Protected API routes
- Role-based access
- Admin routes
- Automatic token refresh
- Logout token revocation
- MySQL token blacklist

Protected requests use:

```http
Authorization: Bearer <access_token>
```

---

# 👤 Customer Features

Customers can:

- Register
- Login
- Browse products
- Search products
- Filter products
- View product details
- Add products to cart
- Manage cart
- Checkout
- Place orders
- View order history
- Manage profile
- Change password
- Upload profile avatar
- Use dark/light theme
- Logout securely

---

# 👨‍💼 Admin Features

Admins can:

- Access Admin Dashboard
- View products
- Add products
- Edit products
- Delete products
- Upload product images
- View customer orders
- Update order status
- Receive real-time order notifications
- Receive low-stock alerts
- View unread notification count
- Mark notifications as read
- Mark all notifications as read
- Delete notifications
- Receive browser notifications
- Monitor live order statistics

---

# 🌙 Dark / Light Theme

The application supports:

- Light Mode
- Dark Mode
- Theme persistence
- System theme preference

The Admin Dashboard and notification system also follow the selected application theme.

---

# 👤 User Profile System

Logged-in users can manage their profile.

Features include:

- Update name
- Update email
- Upload avatar
- Change password
- Password strength indicator
- Member Since information
- Account activity information
- Delete account

---

# 📁 Frontend Project Structure

```text
frontend/
│
├── src/
│   │
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── NotificationBell.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── AdminRoute.jsx
│   │   └── TokenExpiryCountdown.jsx
│   │
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── CartContext.jsx
│   │   ├── ThemeContext.jsx
│   │   └── SocketContext.jsx
│   │
│   ├── hooks/
│   │   ├── useForm.js
│   │   └── useToast.js
│   │
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── ProductDetail.jsx
│   │   ├── Cart.jsx
│   │   ├── Checkout.jsx
│   │   ├── Orders.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── ProfilePage.jsx
│   │   │
│   │   └── admin/
│   │       ├── AdminDashboard.jsx
│   │       ├── AdminProducts.jsx
│   │       ├── AdminOrders.jsx
│   │       └── ProductForm.jsx
│   │
│   ├── api.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
```

---

# 📁 Backend Project Structure

```text
backend/
│
├── app.py
├── config.py
├── seed.py
├── requirements.txt
└── uploads/
```

---

# ▶️ How to Run the Project

## 1. Start Backend

Open the backend folder:

```bash
cd backend
```

Activate the virtual environment on Windows:

```bash
venv\Scripts\activate
```

Install required packages if needed:

```bash
pip install -r requirements.txt
```

Run the Flask backend:

```bash
python app.py
```

Backend runs at:

```text
http://localhost:5000
```

---

# ▶️ Start Frontend

Open another terminal.

Go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

# 🧪 Real-Time Notification Testing

For testing the complete real-time flow:

1. Start the Flask backend.
2. Start the React frontend.
3. Open one browser window.
4. Login using the admin account.
5. Open another browser or incognito window.
6. Login using a customer account.
7. Keep the Admin Dashboard open.
8. Place an order from the customer account.
9. Check the admin notification bell.
10. Verify that the unread badge increases.
11. Verify that the Admin Dashboard updates.
12. Verify that the notification exists in MySQL.
13. Test mark-as-read.
14. Test mark-all-as-read.
15. Test delete notification.
16. Reduce product stock to 5 or below.
17. Place another order.
18. Verify the low-stock alert.
19. Keep the admin browser tab inactive.
20. Verify the browser/Windows notification.

---

# 🧠 What I Learned

Through Task 19, I learned:

- What WebSockets are
- Difference between HTTP and WebSocket communication
- How Flask-SocketIO works
- How Socket.IO Client works with React
- How to maintain a persistent frontend/backend connection
- How Socket.IO rooms work
- How to send real-time events from Flask
- How React receives Socket.IO events
- How to manage Socket.IO using Context API
- How to store notifications in MySQL
- How to combine REST APIs with WebSockets
- How to implement read/unread notifications
- How to implement low-stock alerts
- How to use the browser Notification API
- How to build a live Admin Dashboard
- How JWT protects notification APIs
- How real-time and persistent systems work together

---

# 💡 Hardest Part

The most challenging part of Task 19 was integrating:

```text
React
+
Flask
+
MySQL
+
JWT
+
Socket.IO
```

The order needed to be saved correctly in MySQL while the notification also needed to reach the admin immediately.

I solved this by first storing the notification in MySQL and then emitting a Socket.IO event to the admin room.

On the frontend, `SocketContext` receives the real-time event and reloads the saved notifications from the backend.

This gives the application:

```text
Real-Time Updates
+
Persistent Notification Data
```

---

# 🔄 Order Notification Architecture

```text
CUSTOMER
   │
   │ Places Order
   ▼
REACT FRONTEND
   │
   │ HTTP POST
   ▼
FLASK API
   │
   ├── Save Order
   │
   ├── Save Order Items
   │
   ├── Update Stock
   │
   ├── Check Low Stock
   │
   └── Save Notification
   │
   ▼
MYSQL DATABASE
   │
   ▼
FLASK-SOCKETIO
   │
   │ new_notification
   ▼
ADMINS ROOM
   │
   ▼
SOCKETCONTEXT
   │
   ├── Reload Notifications
   ├── Update Bell
   ├── Update Unread Count
   ├── Update Dashboard
   └── Show Browser Notification
```

---

# 🎯 Task 19 Status

```text
✅ Flask-SocketIO Setup

✅ Socket.IO Client Setup

✅ React ↔ Flask Socket Connection

✅ Personal User Rooms

✅ Admin Socket.IO Room

✅ Real-Time Order Notifications

✅ MySQL Notification Persistence

✅ Notification Bell

✅ Unread Notification Badge

✅ Notification Dropdown

✅ Mark One as Read

✅ Mark All as Read

✅ Delete Notification

✅ JWT-Protected Notification APIs

✅ Bonus 1 - Low Stock Alert

✅ Bonus 2 - Browser / Windows Notification

✅ Bonus 3 - Live Admin Dashboard

✅ Live Total Order Updates

✅ Live Revenue Updates

✅ Low Stock Dashboard Count

✅ Recent Orders Dashboard

✅ Responsive Admin Dashboard

✅ Dark / Light Theme Support
```

---

# 🔜 Bonus 4 – Next Enhancement

The next enhancement planned for the application is:

```text
🔊 Real-Time Notification Sound
```

A short notification sound will play when the admin receives a new order or low-stock alert.

This feature will be added after the current Task 19 version is backed up to GitHub.

---

# 📌 Previous Improvements Included

This Task 19 project also contains functionality developed during the previous e-commerce tasks, including:

### Task 16
JWT Authentication

### Task 17
Dark / Light Theme System

### Task 18
User Profile & Settings

### Task 19
Real-Time Notification System

This demonstrates how an existing full-stack application can be progressively upgraded with new production-style features.

---

# 👨‍💻 Developed By

**Hariharan B**

Task 19 – Real-Time Notifications

Full-Stack E-Commerce Application

**React + Flask + MySQL + JWT + Socket.IO**

---

## ✅ Project Status

**Task 19 core requirements completed successfully.**

Completed bonus features:

```text
Bonus 1 ✅ Low Stock Alert
Bonus 2 ✅ Browser / Windows Notification
Bonus 3 ✅ Live Admin Dashboard
```

Next enhancement:

```text
Bonus 4 🔊 Notification Sound
```
