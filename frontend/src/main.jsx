import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SocketProvider } from "./context/SocketContext";
import "./index.css";

import App from "./App.jsx";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";


createRoot(
  document.getElementById("root")
).render(
  
        <React.StrictMode>

       <ThemeProvider>
       <AuthProvider>
       <CartProvider>

      <SocketProvider>
        <App />
      </SocketProvider>

      </CartProvider>
      </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
);