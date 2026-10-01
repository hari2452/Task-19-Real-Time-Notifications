import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import api from "../api";


const SocketContext = createContext();


export function SocketProvider({ children }) {

  const { user } = useAuth();

  const [socket, setSocket] = useState(null);

  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);


  // =========================================
  // TASK 19 BONUS 2
  // REQUEST BROWSER NOTIFICATION PERMISSION
  // =========================================

  useEffect(() => {

    if (!user) {
      return;
    }


    if (!("Notification" in window)) {

      console.log(
        "Browser notifications are not supported."
      );

      return;
    }


    if (Notification.permission === "default") {

      Notification.requestPermission()
        .then((permission) => {

          console.log(
            "Notification permission:",
            permission
          );

        })
        .catch((error) => {

          console.error(
            "Notification permission error:",
            error
          );

        });

    }

  }, [user]);


  // =========================================
  // TASK 19 BONUS 4
  // PLAY NOTIFICATION SOUND
  // =========================================

  const playNotificationSound = () => {

    try {

      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;


      if (!AudioContext) {

        console.log(
          "Web Audio API is not supported."
        );

        return;
      }


      const audioContext =
        new AudioContext();


      const oscillator =
        audioContext.createOscillator();


      const gainNode =
        audioContext.createGain();


      // Soft notification tone
      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      );


      // Keep volume subtle
      gainNode.gain.setValueAtTime(
        0.08,
        audioContext.currentTime
      );


      // Fade sound smoothly
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.25
      );


      oscillator.connect(gainNode);

      gainNode.connect(
        audioContext.destination
      );


      oscillator.start(
        audioContext.currentTime
      );


      oscillator.stop(
        audioContext.currentTime + 0.25
      );


      oscillator.onended = () => {

        audioContext.close();

      };


      console.log(
        "🔊 Notification sound played"
      );

    } catch (error) {

      console.log(
        "Notification sound could not play:",
        error
      );

    }

  };


  // =========================================
  // LOAD SAVED NOTIFICATIONS FROM MYSQL
  // =========================================

  const loadNotifications = async () => {

    try {

      const response =
        await api.get(
          "/api/notifications"
        );


      const notificationData =
        response.data.data ||
        response.data.notifications ||
        [];


      setNotifications(
        notificationData
      );


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


  // =========================================
  // TASK 19 BONUS 2
  // BROWSER / WINDOWS NOTIFICATION
  // =========================================

  const showBrowserNotification = (data) => {

    if (!("Notification" in window)) {
      return;
    }


    // Native popup only when ShopZone
    // is not the active tab
    if (!document.hidden) {
      return;
    }


    if (
      Notification.permission !==
      "granted"
    ) {
      return;
    }


    let title =
      "ShopZone Notification";

    let icon =
      "🔔";


    if (data.type === "order") {

      title =
        "🛒 New ShopZone Order";

      icon =
        "🛒";

    } else if (
      data.type === "alert"
    ) {

      title =
        "⚠️ ShopZone Stock Alert";

      icon =
        "⚠️";

    } else {

      title =
        "ℹ️ ShopZone Notification";

      icon =
        "ℹ️";

    }


    try {

      const browserNotification =
        new Notification(
          title,
          {

            body:
              data.message,

            tag:
              data.type === "order"

                ? `order-${
                    data.order_id ||
                    Date.now()
                  }`

                : `notification-${
                    Date.now()
                  }`,

            renotify: true,

          }
        );


      // Close notification automatically
      // after 6 seconds
      setTimeout(() => {

        browserNotification.close();

      }, 6000);


      // Bring ShopZone window forward
      // when notification is clicked
      browserNotification.onclick =
        () => {

          window.focus();

          browserNotification.close();

        };


      console.log(
        `${icon} Browser notification displayed`
      );

    } catch (error) {

      console.error(
        "Browser notification error:",
        error
      );

    }

  };


  // =========================================
  // SOCKET.IO CONNECTION
  // =========================================

  useEffect(() => {

    if (!user) {

      setNotifications([]);

      setUnreadCount(0);

      return;

    }


    console.log(
      "Creating Socket.IO connection..."
    );


    const newSocket =
      io(
        "http://localhost:5000"
      );


    setSocket(newSocket);


    // =====================================
    // SOCKET CONNECTED
    // =====================================

    newSocket.on(
      "connect",
      () => {

        console.log(
          "Socket connected:",
          newSocket.id
        );


        newSocket.emit(
          "join",
          {

            user_id:
              user.id,

            role:
              user.role,

          }
        );

      }
    );


    // =====================================
    // ROOM JOIN CONFIRMATION
    // =====================================

    newSocket.on(
      "joined",
      (data) => {

        console.log(
          "Joined Socket.IO room:",
          data
        );

      }
    );


    // =====================================
    // RECEIVE REAL-TIME NOTIFICATION
    // =====================================

    newSocket.on(
      "new_notification",
      async (data) => {

        console.log(
          "New notification received:",
          data
        );


        // =================================
        // BONUS 4
        // PLAY SOUND IMMEDIATELY
        // =================================

        playNotificationSound();


        // =================================
        // BONUS 2
        // WINDOWS / BROWSER POPUP
        // =================================

        showBrowserNotification(
          data
        );


        // =================================
        // REFRESH FROM MYSQL
        // =================================
        // This gets the real database ID,
        // read status and created_at.

        await loadNotifications();

      }
    );


    // =====================================
    // CONNECTION ERROR
    // =====================================

    newSocket.on(
      "connect_error",
      (error) => {

        console.error(
          "Socket connection error:",
          error.message
        );

      }
    );


    // =====================================
    // CLEANUP
    // =====================================

    return () => {

      console.log(
        "Disconnecting Socket.IO..."
      );


      newSocket.off(
        "new_notification"
      );

      newSocket.off(
        "connect"
      );

      newSocket.off(
        "joined"
      );

      newSocket.off(
        "connect_error"
      );


      newSocket.disconnect();

      setSocket(null);

    };

  }, [user]);


  // =====================================
  // MARK ONE AS READ
  // =====================================

  const markAsRead = (id) => {

    setNotifications(
      (previous) =>

        previous.map(
          (notification) =>

            notification.id === id

              ? {
                  ...notification,
                  is_read: true,
                }

              : notification

        )

    );


    setUnreadCount(
      (count) =>
        Math.max(
          0,
          count - 1
        )
    );

  };


  // =========================================
  // CONTEXT PROVIDER
  // =========================================

  return (

    <SocketContext.Provider
      value={{

        socket,

        notifications,
        setNotifications,

        unreadCount,
        setUnreadCount,

        markAsRead,

        loadNotifications,

      }}
    >

      {children}

    </SocketContext.Provider>

  );

}


export function useSocket() {

  return useContext(
    SocketContext
  );

}