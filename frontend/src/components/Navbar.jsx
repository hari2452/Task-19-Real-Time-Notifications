import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import TokenExpiryCountdown from "./TokenExpiryCountdown";

function Navbar() {
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const { cartCount } = useCart();

  // =========================================
  // TASK 17 - THEME
  // =========================================
  const { theme, toggleTheme } = useTheme();

  // =========================================
  // LOGOUT
  // =========================================
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="peach-navbar">

      <div className="peach-nav-container">

        {/* =====================================
            LOGO
        ====================================== */}
        <Link to="/" className="peach-logo">

          <div className="peach-logo-icon">
            S
          </div>

          <div className="peach-logo-text">
            <strong>ShopZone</strong>
            <span>Simply Beautiful Shopping</span>
          </div>

        </Link>


        {/* =====================================
            NAVIGATION
        ====================================== */}
        <nav className="peach-nav-links">

          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? "peach-nav-link active"
                : "peach-nav-link"
            }
          >
            Home
          </NavLink>


          {user && (
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                isActive
                  ? "peach-nav-link active"
                  : "peach-nav-link"
              }
            >
              My Orders
            </NavLink>
          )}


          {/* ADMIN LINKS */}
          {user?.role === "admin" && (
            <>

              <NavLink
                to="/admin/products"
                className={({ isActive }) =>
                  isActive
                    ? "peach-nav-link active"
                    : "peach-nav-link"
                }
              >
                Products
              </NavLink>


              <NavLink
                to="/admin/orders"
                className={({ isActive }) =>
                  isActive
                    ? "peach-nav-link active"
                    : "peach-nav-link"
                }
              >
                Orders
              </NavLink>

            </>
          )}

        </nav>


        {/* =====================================
            RIGHT SIDE
        ====================================== */}
        <div className="peach-nav-right">


          {/* =================================
              THEME TOGGLE - TASK 17
          ================================== */}
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "light"
                ? "Switch to dark mode"
                : "Switch to light mode"
            }
            title={
              theme === "light"
                ? "Switch to Dark Mode"
                : "Switch to Light Mode"
            }
          >

            <span className="theme-toggle-icon">
              {theme === "light" ? "🌙" : "☀️"}
            </span>

            <span className="theme-toggle-text">
              {theme === "light" ? "Dark" : "Light"}
            </span>

          </button>


          {/* =================================
              CART
          ================================== */}
          <Link
            to="/cart"
            className="peach-cart-button"
            aria-label={`Cart with ${cartCount} items`}
          >

            <span className="cart-icon">
              🛍️
            </span>

            <span className="cart-text">
              Cart
            </span>

            {cartCount > 0 && (
              <span className="cart-badge">
                {cartCount}
              </span>
            )}

          </Link>


          {/* =================================
              LOGGED IN USER
          ================================== */}
          {user ? (

            <div className="peach-user-section">


              {/* USER AVATAR */}
              <div className="peach-user-avatar">

                {user.name
                  ?.charAt(0)
                  .toUpperCase()}

              </div>


              {/* USER NAME */}
              <div className="peach-user-info">

                <span>
                  Welcome
                </span>

                <strong>
                  {user.name}
                </strong>

              </div>


              {/* JWT TOKEN EXPIRY COUNTDOWN */}
              <TokenExpiryCountdown />


              {/* LOGOUT */}
              <button
                type="button"
                className="peach-logout-button"
                onClick={handleLogout}
                title="Logout"
              >
                Logout
              </button>

            </div>

          ) : (

            /* =================================
               NOT LOGGED IN
            ================================== */
            <div className="peach-auth-links">

              <Link
                to="/login"
                className="peach-login-link"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="peach-register-link"
              >
                Join Now
              </Link>

            </div>

          )}

        </div>

      </div>

    </header>
  );
}

export default Navbar;