# Task 19 – Real-Time Notifications
## Write-Up

**Project:** ShopZone E-Commerce Application  
**Technologies:** React, Flask, MySQL, JWT, Flask-SocketIO, Socket.IO Client

---

# 1. What is the difference between HTTP and WebSocket communication?

## HTTP Communication

HTTP mainly follows a **request-response** model.

The client sends a request to the server, and the server sends a response back.

### HTTP Flow

```text
React Client
     │
     │ HTTP Request
     │ GET / POST / PUT / DELETE
     ▼
Flask Server
     │
     │ Process Request
     │
     ▼
MySQL Database
     │
     │ Result
     ▼
Flask Server
     │
     │ HTTP Response
     ▼
React Client
```

In simple form:

```text
Client → Request → Server
Client ← Response ← Server
```

For example, in my project:

```text
React
  ↓
GET /api/notifications
  ↓
Flask
  ↓
MySQL
  ↓
Flask Response
  ↓
React
```

The client has to make the request to receive the latest data.

---

## WebSocket Communication

WebSocket communication keeps a connection open between the frontend and backend.

After the connection is established, the server can send information to the client immediately.

### WebSocket Flow

```text
React Client
      ↕
Socket Connection
      ↕
Flask-SocketIO Server
```

After connecting:

```text
Customer Places Order
        ↓
Flask Backend
        ↓
socketio.emit()
        ↓
Socket.IO Connection
        ↓
Admin React Application
        ↓
Notification Appears Instantly
```

The admin does not need to manually refresh the browser to know that a new order was placed.

---

## HTTP vs WebSocket

```text
HTTP

Client → Request → Server
Client ← Response ← Server

Connection is mainly request-response.
The client asks for data.


WebSocket

Client ↔ Server

Connection stays active.
Both sides can send events.
The server can push new information immediately.
```

In my Task 19 project, I use both.

### HTTP is used for:

```text
GET notifications
Mark notification as read
Mark all as read
Delete notification
Orders
Products
Authentication
```

### Socket.IO is used for:

```text
New order notification
Low-stock alert
Real-time admin updates
```

So my application combines:

```text
HTTP
   +
WebSocket / Socket.IO
   =
Persistent APIs + Real-Time Updates
```

---

# 2. What is a Socket.IO room and why did you use one for admin users instead of broadcasting to everyone?

A **Socket.IO room** is a logical group of connected socket clients.

Instead of sending an event to every connected user, the server can send an event only to users who have joined a particular room.

In my project, after the socket connects, the user sends their user ID and role.

Example:

```javascript
newSocket.emit("join", {
  user_id: user.id,
  role: user.role,
});
```

The backend can place the user into a personal room.

Example:

```text
user_8
```

For admin users, the application also uses:

```text
admins
```

So the structure looks like:

```text
Socket.IO Server
       │
       ├── user_8
       │
       ├── user_9
       │
       ├── user_10
       │
       └── admins
              │
              ├── Admin 1
              └── Admin 2
```

When a customer places an order, I do not want every customer to receive an admin notification.

For example:

```text
New order #8 placed by hari
```

This information is useful for administrators.

Therefore, the backend sends the notification to:

```text
admins
```

instead of broadcasting it to every connected socket.

Example:

```python
socketio.emit(
    "new_notification",
    notification_data,
    room="admins"
)
```

The flow is:

```text
Customer
   │
   │ Places Order
   ▼
Flask Backend
   │
   │ new_notification
   ▼
"admins" Room
   │
   ├── Admin 1
   └── Admin 2
```

Normal customers do not receive the admin event.

---

## Why did I use an admin room?

I used an admin room because it provides **targeted communication**.

Without a room:

```text
New Order
   ↓
Broadcast to Everyone
   ↓
Admin + Customer + Other Users
```

With the admin room:

```text
New Order
   ↓
admins Room
   ↓
Admin Users Only
```

This makes the real-time notification system more organized and prevents unnecessary admin notifications from being sent to normal customers.

---

# 3. When a user refreshes the page, the socket disconnects and reconnects. How do previously saved notifications still appear in the bell dropdown?

Socket.IO provides real-time communication, but the socket connection itself is temporary.

When the browser refreshes:

```text
Existing Socket
      ↓
Disconnect
      ↓
Page Reload
      ↓
React Loads Again
      ↓
New Socket Connection
```

If I stored notifications only inside the socket or React state, old notifications could disappear after refreshing.

To solve this problem, I store notifications permanently in **MySQL**.

The flow when a notification is created is:

```text
New Order
   ↓
Flask Backend
   ↓
Insert Notification into MySQL
   ↓
socketio.emit()
   ↓
Admin receives notification
```

So Socket.IO is responsible for:

```text
Real-Time Delivery
```

and MySQL is responsible for:

```text
Persistent Storage
```

---

## What happens after refresh?

When the page loads again, React can call the notification API:

```http
GET /api/notifications
```

My `SocketContext.jsx` contains the `loadNotifications()` function.

Example:

```javascript
const loadNotifications = async () => {
  try {
    const response =
      await api.get("/api/notifications");

    const notificationData =
      response.data.data ||
      response.data.notifications ||
      [];

    setNotifications(notificationData);

    const unread =
      notificationData.filter(
        (notification) =>
          !notification.is_read
      ).length;

    setUnreadCount(unread);

  } catch (error) {
    console.error(
      "Unable to load notifications:",
      error
    );
  }
};
```

The backend reads the notifications from MySQL and sends them back to React.

Then React updates:

```text
notifications state
        +
unreadCount state
```

The Notification Bell uses this data to display the previously saved notifications.

### Refresh Flow

```text
Browser Refresh
      ↓
Old Socket Disconnects
      ↓
React Application Loads Again
      ↓
User Authentication Restored
      ↓
Socket Reconnects
      ↓
User Joins Socket.IO Room Again
      ↓
GET /api/notifications
      ↓
Flask
      ↓
MySQL
      ↓
Previously Saved Notifications
      ↓
React SocketContext
      ↓
Notification Bell Dropdown
```

Therefore, the notifications do not depend only on the current WebSocket connection.

They are stored permanently in the database.

The important concept is:

```text
Socket.IO = Instant Notification

MySQL = Notification History
```

Using both gives:

```text
Real-Time + Persistence
```

---

# 4. What does socketio.emit() do versus emit() inside a @socketio.on() handler? What is the difference?

Both are used to send Socket.IO events, but they are normally used in different situations.

---

## socketio.emit()

`socketio.emit()` uses the Flask-SocketIO server instance to send an event.

Example:

```python
socketio.emit(
    "new_notification",
    {
        "message": "New order received",
        "type": "order"
    },
    room="admins"
)
```

In my project, this is useful when I want to send a Socket.IO event from normal Flask/backend application logic.

For example:

```text
Customer
   ↓
POST /api/orders
   ↓
Flask Order Route
   ↓
Save Order
   ↓
Save Notification
   ↓
socketio.emit()
   ↓
admins Room
```

The order route is an HTTP route.

It is not itself a Socket.IO event handler.

Therefore, using the Socket.IO server instance allows the backend to push the new notification after the order has been created.

---

## emit() inside @socketio.on()

`emit()` can be imported from Flask-SocketIO:

```python
from flask_socketio import emit
```

It is commonly used inside a Socket.IO event handler.

Example:

```python
@socketio.on("join")
def handle_join(data):

    emit(
        "joined",
        {
            "success": True
        }
    )
```

Here, the server has received a socket event:

```text
join
```

and responds from inside that socket event handler.

The flow is:

```text
React
   ↓
socket.emit("join")
   ↓
Flask-SocketIO
   ↓
@socketio.on("join")
   ↓
emit("joined")
   ↓
React
```

---

# Main Difference

### socketio.emit()

Usually used through the main Socket.IO server object.

Example:

```python
socketio.emit(...)
```

It is useful when sending an event from other backend logic, including a normal Flask route.

Example from Task 19:

```text
HTTP Order Route
      ↓
Order Created
      ↓
socketio.emit()
      ↓
Admin receives notification
```

---

### emit()

Commonly used while handling a Socket.IO event.

Example:

```python
@socketio.on("join")
def handle_join(data):

    emit(
        "joined",
        {
            "success": True
        }
    )
```

Flow:

```text
Socket Event Received
        ↓
@socketio.on(...)
        ↓
emit(...)
        ↓
Socket Response/Event Sent
```

---

# Simple Comparison

```text
socketio.emit()
     │
     ├── Uses SocketIO server instance
     │
     ├── Can be used from normal backend logic
     │
     └── Used in my order flow to notify admins


emit()
     │
     ├── Flask-SocketIO helper function
     │
     ├── Commonly used inside socket event handlers
     │
     └── Can respond/send events from the active
         Socket.IO event context
```

---

# Example From My Project

## Joining a Room

React sends:

```javascript
newSocket.emit("join", {
  user_id: user.id,
  role: user.role,
});
```

Flask receives:

```python
@socketio.on("join")
def handle_join(data):

    # Join room logic

    emit(
        "joined",
        {
            "success": True
        }
    )
```

This uses `emit()` because it is happening inside a Socket.IO event handler.

---

## New Order Notification

A customer places an order through an HTTP API.

```text
POST /api/orders
```

After saving the order, Flask can send:

```python
socketio.emit(
    "new_notification",
    {
        "message": "New order received",
        "type": "order"
    },
    room="admins"
)
```

This uses `socketio.emit()` because the notification is being triggered from the application's order-processing logic.

---

# Complete Task 19 Communication Flow

```text
CUSTOMER
    │
    │ Place Order
    ▼
REACT
    │
    │ HTTP POST
    ▼
FLASK ORDER API
    │
    ├── Save Order
    ├── Save Order Items
    ├── Update Stock
    ├── Check Low Stock
    └── Save Notification
    │
    ▼
MYSQL
    │
    ▼
socketio.emit(
    "new_notification",
    room="admins"
)
    │
    ▼
SOCKET.IO ADMINS ROOM
    │
    ▼
ADMIN REACT APPLICATION
    │
    ▼
SocketContext
    │
    ├── Receives new_notification
    ├── Reloads notifications
    ├── Updates unread count
    ├── Updates notification bell
    ├── Updates Admin Dashboard
    └── Shows browser notification
```

---

# Short Mentor Explanation

If I need to explain Task 19 shortly during review, I can say:

> In Task 19, I implemented real-time notifications using Flask-SocketIO and Socket.IO Client. HTTP is used for normal API operations, while Socket.IO is used for instant server-to-client notifications. Admin users join an `admins` room so order and low-stock notifications are sent only to admins. Notifications are also stored in MySQL, so they remain available after refresh or socket reconnection. I use `socketio.emit()` from backend application logic such as the order route, while `emit()` is commonly used inside a Socket.IO event handler such as the join handler.

---

# Key Points to Remember

```text
HTTP
= Request → Response

WebSocket / Socket.IO
= Persistent real-time connection

Socket.IO Room
= Group of selected connected clients

admins Room
= Admin notifications only

Socket.IO
= Instant delivery

MySQL
= Persistent notification history

socketio.emit()
= Send using SocketIO server instance

emit()
= Commonly send/respond inside
  a Socket.IO event handler
```

---

# Conclusion

Task 19 taught me how to combine traditional REST APIs with real-time WebSocket-style communication.

Instead of replacing HTTP completely, the application uses both technologies for different purposes.

```text
HTTP
   +
Socket.IO
   +
MySQL
   +
JWT
   =
Secure Real-Time Notification System
```

This allows ShopZone to provide instant admin notifications while also keeping notification history safely stored in the database.

---

**Developed By:** Hariharan B  
**Task:** Task 19 – Real-Time Notifications  
**Project:** ShopZone E-Commerce Application
