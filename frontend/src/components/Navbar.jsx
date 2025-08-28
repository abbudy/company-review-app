import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ darkMode, setDarkMode }) {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav
      className={`  flex justify-between items-center px-6 py-3 ${
        darkMode ? "bg-gray-800 text-gray-100" : "bg-gray-800 text-gray-100"
      }`}
      style={{ position: "sticky", top: 0, zIndex: 100 }}
    >
      <Link to="/" className="text-xl font-bold">
        Company Review
      </Link>

      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <Link to="/dashboard" className="hover:underline">
              Dashboard
            </Link>

            {/* Admin link for roleId 1 */}
            {user?.roleId === 1 && (
              <Link to="/admin" className="hover:underline">
                Admin
              </Link>
            )}

            <span className="text-gray-500 dark:text-gray-300">
              Hi, {user.name}
            </span>
            <button
              onClick={logout}
              className="bg-red-500 px-3 py-1 rounded text-white"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:underline">
              Login
            </Link>
            <Link to="/register" className="hover:underline">
              Register
            </Link>
          </>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`px-3 py-1 rounded border ${
            darkMode
              ? "bg-gray-700 text-yellow-300 border-yellow-300"
              : "bg-gray-200 text-gray-800 border-gray-400"
          }`}
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>
    </nav>
  );
}
