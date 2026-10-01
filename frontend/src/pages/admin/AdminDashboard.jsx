import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../../api";
import { useSocket } from "../../context/SocketContext";


function AdminDashboard() {

  const {
    notifications,
    unreadCount,
  } = useSocket();


  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);


  // =========================================
  // LOAD ADMIN DASHBOARD DATA
  // =========================================

  const loadDashboard = async () => {

    try {

      const [
        ordersResponse,
        productsResponse,
      ] = await Promise.all([

        api.get("/api/orders"),

        api.get("/api/products"),

      ]);


      setOrders(
        ordersResponse.data.data || []
      );


      setProducts(
        productsResponse.data.data || []
      );

    } catch (error) {

      console.error(
        "Admin dashboard error:",
        error
      );

    } finally {

      setLoading(false);

    }

  };


  // Load when dashboard opens
  useEffect(() => {

    loadDashboard();

  }, []);


  // =========================================
  // REAL-TIME ORDER UPDATE
  // =========================================
  // SocketContext updates notifications when
  // Flask sends a new_notification event.
  //
  // If the newest notification is an order,
  // reload orders automatically.
  // =========================================

  useEffect(() => {

    if (notifications.length === 0) {
      return;
    }


    const latestNotification =
      notifications[0];


    if (
      latestNotification.type === "order"
    ) {

      loadDashboard();

    }

  }, [notifications]);


  // =========================================
  // DASHBOARD CALCULATIONS
  // =========================================

  const totalOrders =
    orders.length;


  const totalRevenue =
    orders.reduce(
      (total, order) =>
        total +
        Number(order.total_amount || 0),
      0
    );


  const totalProducts =
    products.length;


  const lowStockProducts =
    products.filter(
      (product) =>
        Number(product.stock) <= 5
    ).length;


  if (loading) {

    return (

      <div className="admin-dashboard">

        <div className="dashboard-loading">
          Loading dashboard...
        </div>

      </div>

    );

  }


  return (

    <div className="admin-dashboard">


      {/* =====================================
          HEADER
      ====================================== */}

      <div className="admin-dashboard-header">

        <div>

          <span className="dashboard-live-label">
            ● LIVE
          </span>

          <h1>
            Admin Dashboard
          </h1>

          <p>
            Real-time overview of your
            ShopZone store.
          </p>

        </div>


        <div className="dashboard-header-actions">

          <Link
            to="/admin/products"
            className="dashboard-action-btn"
          >
            Manage Products
          </Link>


          <Link
            to="/admin/orders"
            className="dashboard-action-btn"
          >
            View Orders
          </Link>

        </div>

      </div>


      {/* =====================================
          STAT CARDS
      ====================================== */}

      <div className="dashboard-stat-grid">


        {/* TOTAL ORDERS */}

        <div className="dashboard-stat-card">

          <div className="dashboard-stat-icon">
            📦
          </div>

          <div>

            <span className="dashboard-stat-label">
              Total Orders
            </span>

            <h2>
              {totalOrders}
            </h2>

            <small>
              Updates automatically
            </small>

          </div>

        </div>


        {/* REVENUE */}

        <div className="dashboard-stat-card">

          <div className="dashboard-stat-icon">
            💰
          </div>

          <div>

            <span className="dashboard-stat-label">
              Total Revenue
            </span>

            <h2>
              ₹
              {totalRevenue.toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </h2>

            <small>
              From all orders
            </small>

          </div>

        </div>


        {/* PRODUCTS */}

        <div className="dashboard-stat-card">

          <div className="dashboard-stat-icon">
            🛍️
          </div>

          <div>

            <span className="dashboard-stat-label">
              Products
            </span>

            <h2>
              {totalProducts}
            </h2>

            <small>
              Products available
            </small>

          </div>

        </div>


        {/* NOTIFICATIONS */}

        <div className="dashboard-stat-card">

          <div className="dashboard-stat-icon">
            🔔
          </div>

          <div>

            <span className="dashboard-stat-label">
              Unread Alerts
            </span>

            <h2>
              {unreadCount}
            </h2>

            <small>
              Real-time notifications
            </small>

          </div>

        </div>


        {/* LOW STOCK */}

        <div className="dashboard-stat-card dashboard-warning-card">

          <div className="dashboard-stat-icon">
            ⚠️
          </div>

          <div>

            <span className="dashboard-stat-label">
              Low Stock
            </span>

            <h2>
              {lowStockProducts}
            </h2>

            <small>
              Products with ≤ 5 stock
            </small>

          </div>

        </div>

      </div>


      {/* =====================================
          RECENT ORDERS
      ====================================== */}

      <div className="dashboard-section">

        <div className="dashboard-section-header">

          <div>

            <h2>
              Recent Orders
            </h2>

            <p>
              Latest customer orders
            </p>

          </div>


          <Link
            to="/admin/orders"
            className="dashboard-view-all"
          >
            View All →
          </Link>

        </div>


        {orders.length === 0 ? (

          <div className="dashboard-empty">
            No orders yet.
          </div>

        ) : (

          <div className="dashboard-orders-table-wrapper">

            <table className="dashboard-orders-table">

              <thead>

                <tr>

                  <th>Order</th>

                  <th>Customer</th>

                  <th>Amount</th>

                  <th>Status</th>

                </tr>

              </thead>


              <tbody>

                {orders
                  .slice(0, 5)
                  .map((order) => (

                    <tr key={order.id}>

                      <td>
                        #{order.id}
                      </td>

                      <td>
                        {order.customer_name ||
                          "Customer"}
                      </td>

                      <td>
                        ₹
                        {Number(
                          order.total_amount || 0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>

                        <span
                          className={
                            `dashboard-order-status ${
                              order.status || "pending"
                            }`
                          }
                        >
                          {order.status ||
                            "Pending"}
                        </span>

                      </td>

                    </tr>

                  ))}

              </tbody>

            </table>

          </div>

        )}

      </div>


    </div>

  );

}


export default AdminDashboard;