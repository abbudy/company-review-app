import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);

  // Apply dark mode class to <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div
      className={`${
        darkMode
          ? "bg-gray-900 text-gray-100"
          : "bg-gray-50 text-gray-900"
      } min-h-screen`}
    >
      {/* Pass darkMode state and toggle function to Navbar */}
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="p-4">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
