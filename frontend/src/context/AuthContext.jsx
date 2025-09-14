/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext();

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * The AuthProvider component is responsible for managing the user's authentication
 * state. It stores the user's authentication token and user data in local storage
 * and keeps track of whether the user is authenticated or not. It also provides
 * `login` and `logout` functions to update the user's authentication state.
 * 
 * @param {Object} props The component props.
 * @param {JSX.Element|JSX.Element[]} props.children The children of the component.
 * @returns {JSX.Element} The AuthProvider component.
 */
/*******  bfbdb3a8-c2d0-42c0-bfbc-39fee7099300  *******/
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);
  

  function login(token, userData) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
