/* src/pages/Home.jsx */

import { useEffect, useState, useMemo } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ReviewForm from "../components/ReviewForm";
import ReviewsList from "../components/ReviewsList";
import { Link } from "react-router-dom";


export default function Home({ darkMode }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviews, setShowReviews] = useState({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [toast, setToast] = useState({ message: "", type: "" });

  const navigate = useNavigate();
  const { user } = useAuth();

  

  async function loadCompanies() {
    try {
      setLoading(true);
      const { data } = await api.get("/api/companies");
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load companies:", err);
      showToast("Failed to load companies", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadCompanies();
  }, [user]);

  function showToast(message, type = "info", ms = 3000) {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), ms);
  }

  function toggleReviews(companyId) {
    setShowReviews((prev) => ({ ...prev, [companyId]: !prev[companyId] }));
  }

  const filteredCompanies = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return companies;
    return companies.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [companies, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]);

  const paginatedCompanies = filteredCompanies.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const StarRating = ({ rating = 0 }) => {
    const r = Math.round(Number(rating) || 0);
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill={i < r ? "currentColor" : "none"}
            stroke="currentColor"
            className={`${
              i < r ? "text-yellow-400" : darkMode ? "text-gray-600" : "text-gray-300"
            }`}
          >
            <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.837 1.48 8.28L12 18.896l-7.416 4.527 1.48-8.28L0 9.306l8.332-1.151z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Toast */}
      {toast.message && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded shadow-md text-sm ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Sticky Header */}
      <div
        className={`sticky top-0 z-40 shadow-sm ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
        style={{ position: "sticky", top: 50, zIndex: 99 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Companies</h1>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className={`border px-3 py-1 rounded-md focus:outline-none focus:ring ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-600"
                  : "bg-white border-gray-300 text-gray-900 focus:ring-blue-200"
              }`}
            />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedCompanies.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-transform duration-300 overflow-hidden flex flex-col ${
                    darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"
                  }`}
                      

                >
                  {/* Banner */}
                  
                  <div className="h-36 w-full relative">
                    <img
                      src={
                        c.image ||
                        "https://via.placeholder.com/300x150?text=Company"
                      }
                      alt={c.name || "Company"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://via.placeholder.com/300x150?text=Company";
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-45 text-white p-2">
                      <div className="font-semibold text-lg truncate">
                        <Link to={`/companies/${c.id}`} className="hover:underline">
                        {c.name}
                        </Link>
                        </div>

                      <div className="text-xs truncate">{c.address || "-"}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <StarRating rating={c.avgRating ?? 0} />
                        <span className="text-xs">
                          {Number(c.avgRating || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col gap-3">
                    {/* Pass darkMode into ReviewForm */}
                    <ReviewForm
                      companyId={c.id}
                      darkMode={darkMode}
                      onReviewAdded={() => {
                        showToast("Review added", "success");
                        loadCompanies();
                      }}
                    />

                    {/* Toggle Reviews */}

                    <button
                      
                      onClick={() => toggleReviews(c.id)}
                      className={`flex items-center gap-2 text-sm hover:underline self-start ${
                        darkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      {showReviews[c.id] ? "Hide Reviews" : "View Reviews"}
                      <svg
                        className={`w-4 h-4 transform transition-transform duration-200 ${
                          showReviews[c.id] ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Collapsible Reviews */}
                    <div
                      style={{
                        maxHeight: showReviews[c.id] ? 1000 : 0,
                        opacity: showReviews[c.id] ? 1 : 0,
                        transition: "max-height 400ms ease, opacity 400ms ease",
                      }}
                      className="overflow-hidden"
                      aria-hidden={!showReviews[c.id]}
                    >
                      {showReviews[c.id] && (
                        <div className="mt-2">
                          <ReviewsList
                            companyId={c.id}
                            darkMode={darkMode}
                            onReviewChanged={() => {
                              showToast("Reviews updated", "success");
                              loadCompanies();
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            

            {/* Pagination */}
            {filteredCompanies.length === 0 ? (
              <div
                className={`text-center py-10 ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                No companies found.
              </div>
            ) : (
              <div className="flex justify-center items-center gap-3 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-4 py-2 border rounded ${
                    page === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : darkMode
                      ? "hover:bg-gray-700 border-gray-600"
                      : "hover:bg-gray-100 border-gray-300"
                  }`}
                  
                >
                  Prev
                </button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-4 py-2 border rounded ${
                    page === totalPages
                      ? "text-gray-400 cursor-not-allowed"
                      : darkMode
                      ? "hover:bg-gray-700 border-gray-600"
                      : "hover:bg-gray-100 border-gray-300"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
  
}


