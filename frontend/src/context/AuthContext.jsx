import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import axios from "axios";
import api from "../api";

const AuthContext = createContext();


export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  // =====================================================
  // CHECK USER
  // Restore logged-in user when React starts / refreshes
  // =====================================================
  const checkUser = async () => {

    const accessToken =
      localStorage.getItem("access_token");

    const refreshToken =
      localStorage.getItem("refresh_token");


    if (!accessToken && !refreshToken) {

      setUser(null);
      setLoading(false);
      return;
    }


    try {

      const response =
        await api.get("/api/me");

      setUser(response.data.user);

    } catch (error) {

      console.log(
        "User check failed:",
        error
      );

      setUser(null);

    } finally {

      setLoading(false);

    }
  };


  // =====================================================
  // RUN ONCE WHEN REACT STARTS
  // =====================================================
  useEffect(() => {

    checkUser();

  }, []);


  // =====================================================
  // LOGIN
  // =====================================================
  const login = async (email, password) => {

    const response =
      await api.post("/api/login", {
        email,
        password,
      });


    const {
      access_token,
      refresh_token,
      user,
    } = response.data;


    localStorage.setItem(
      "access_token",
      access_token
    );


    localStorage.setItem(
      "refresh_token",
      refresh_token
    );


    setUser(user);

    return response.data;
  };


  // =====================================================
  // UPDATE USER
  //
  // Updates the user stored in React Context.
  // This lets Navbar/Profile update immediately without
  // refreshing the browser.
  // =====================================================
  const updateUser = (updatedData) => {

    setUser((currentUser) => {

      if (!currentUser) {
        return currentUser;
      }

      return {
        ...currentUser,
        ...updatedData,
      };

    });
  };

    // =====================================================
  // CLEAR AUTH AFTER ACCOUNT DELETION
  // =====================================================
  const clearAuth = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    setUser(null);
  };

  // =====================================================
  // LOGOUT
  // =====================================================
  const logout = async () => {

    const accessToken =
      localStorage.getItem("access_token");

    const refreshToken =
      localStorage.getItem("refresh_token");


    // Revoke access token
    if (accessToken) {

      try {

        await api.post("/api/logout");

        console.log(
          "Access token revoked successfully"
        );

      } catch (error) {

        console.log(
          "Access token logout error:",
          error.response?.data || error.message
        );

      }
    }


    // Revoke refresh token
    if (refreshToken) {

      try {

        await axios.post(
          "http://localhost:5000/api/logout/refresh",
          {},
          {
            headers: {
              Authorization:
                `Bearer ${refreshToken}`,
            },
          }
        );


        console.log(
          "Refresh token revoked successfully"
        );

      } catch (error) {

        console.log(
          "Refresh token logout error:",
          error.response?.data || error.message
        );

      }
    }


    // Remove tokens
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "refresh_token"
    );


    // Clear logged-in user
    setUser(null);

  };


  // =====================================================
  // AUTH CONTEXT
  // =====================================================
  return (

    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        checkUser,
        updateUser,
        clearAuth,
      }}
    >

      {children}

    </AuthContext.Provider>

  );
}


// =====================================================
// CUSTOM AUTH HOOK
// =====================================================
export function useAuth() {

  return useContext(AuthContext);

}