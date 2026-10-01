import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import api from "../api";


function NotificationBell() {

  const {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    markAsRead,
  } = useSocket();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);


  // =========================================
  // LOAD SAVED NOTIFICATIONS
  // =========================================
  useEffect(() => {

    const loadNotifications = async () => {

      try {

        setLoading(true);

        const response =
          await api.get("/api/notifications");

        const data =
            response.data.data || [];

        setNotifications(data);

        const unread =
          data.filter(
            (notification) =>
              !notification.is_read
          ).length;

        setUnreadCount(unread);

      } catch (error) {

        console.error(
          "Load notifications error:",
          error.response?.data ||
          error.message
        );

      } finally {

        setLoading(false);

      }

    };

    loadNotifications();

  }, [setNotifications, setUnreadCount]);


  // =========================================
  // MARK ONE AS READ
  // =========================================
  const handleNotificationClick =
    async (notification) => {

      if (notification.is_read) {
        return;
      }

      try {

        await api.put(
          `/api/notifications/${notification.id}/read`
        );

        markAsRead(notification.id);

      } catch (error) {

        console.error(
          "Mark notification read error:",
          error.response?.data ||
          error.message
        );

      }

    };


  // =========================================
  // MARK ALL AS READ
  // =========================================
  const handleMarkAllRead = async () => {

    try {

      await api.put(
        "/api/notifications/read-all"
      );

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      setUnreadCount(0);

    } catch (error) {

      console.error(
        "Mark all read error:",
        error.response?.data ||
        error.message
      );

    }

  };


  // =========================================
  // DELETE NOTIFICATION
  // =========================================
  const handleDelete = async (
    event,
    notification
  ) => {

    event.stopPropagation();

    try {

      await api.delete(
        `/api/notifications/${notification.id}`
      );

      setNotifications((previous) =>
        previous.filter(
          (item) =>
            item.id !== notification.id
        )
      );

      if (!notification.is_read) {

        setUnreadCount((count) =>
          Math.max(0, count - 1)
        );

      }

    } catch (error) {

      console.error(
        "Delete notification error:",
        error.response?.data ||
        error.message
      );

    }

  };


  // =========================================
  // NOTIFICATION ICON
  // =========================================
  const getTypeIcon = (type) => {

    if (type === "order") {
      return "🛒";
    }

    if (type === "alert") {
      return "⚠️";
    }

    return "ℹ️";
  };


  // =========================================
  // TIME AGO
  // =========================================
  const getTimeAgo = (dateString) => {

    if (!dateString) {
      return "Just now";
    }

    const created =
      new Date(dateString);

    const now =
      new Date();

    const seconds =
      Math.floor(
        (now - created) / 1000
      );


    if (seconds < 60) {
      return "Just now";
    }


    const minutes =
      Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
    }


    const hours =
      Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }


    const days =
      Math.floor(hours / 24);

    return `${days} day${days === 1 ? "" : "s"} ago`;
  };


  // Show latest 10
  const latestNotifications =
    notifications.slice(0, 10);


  return (

    <div className="notification-wrapper">


      {/* =====================================
          BELL BUTTON
      ====================================== */}

      <button
        type="button"
        className="notification-bell-button"
        onClick={() =>
          setOpen((current) => !current)
        }
        title="Notifications"
        aria-label={
          `Notifications. ${unreadCount} unread`
        }
      >

        <span className="notification-bell-icon">
          🔔
        </span>


        {unreadCount > 0 && (

          <span className="notification-badge">

            {unreadCount > 99
              ? "99+"
              : unreadCount}

          </span>

        )}

      </button>



      {/* =====================================
          DROPDOWN
      ====================================== */}

      {open && (

        <div className="notification-dropdown">


          {/* HEADER */}

          <div className="notification-header">

            <div>

              <h3>
                Notifications
              </h3>

              <p>
                {unreadCount} unread
              </p>

            </div>


            {unreadCount > 0 && (

              <button
                type="button"
                className="notification-mark-all"
                onClick={handleMarkAllRead}
              >
                Mark all as read
              </button>

            )}

          </div>



          {/* BODY */}

          <div className="notification-list">


            {loading ? (

              <div className="notification-empty">
                Loading notifications...
              </div>

            ) : latestNotifications.length === 0 ? (

              <div className="notification-empty">

                <span>
                  🔔
                </span>

                <strong>
                  No notifications
                </strong>

                <p>
                  You're all caught up.
                </p>

              </div>

            ) : (

              latestNotifications.map(
                (notification) => (

                  <div
                    key={notification.id}
                    className={
                      notification.is_read
                        ? "notification-item"
                        : "notification-item unread"
                    }
                    onClick={() =>
                      handleNotificationClick(
                        notification
                      )
                    }
                  >


                    {/* TYPE ICON */}

                    <div className="notification-type-icon">

                      {getTypeIcon(
                        notification.type
                      )}

                    </div>



                    {/* MESSAGE */}

                    <div className="notification-content">

                      <p>
                        {notification.message}
                      </p>

                      <span>
                        {getTimeAgo(
                          notification.created_at
                        )}
                      </span>

                    </div>



                    {/* UNREAD DOT */}

                    {!notification.is_read && (

                      <span className="notification-unread-dot" />

                    )}



                    {/* DELETE */}

                    <button
                      type="button"
                      className="notification-delete"
                      title="Delete notification"
                      onClick={(event) =>
                        handleDelete(
                          event,
                          notification
                        )
                      }
                    >
                      ×
                    </button>

                  </div>

                )
              )

            )}

          </div>

        </div>

      )}

    </div>
  );
}


export default NotificationBell;