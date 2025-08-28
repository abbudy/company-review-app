/* eslint-disable no-unused-vars */
// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";

export default function Dashboard({ darkMode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ reviews: [], companies: [] });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");

  const [reviews, setReviews] = useState([]);
  const [myCompanies, setMyCompanies] = useState([]); // add this

  // Load reviews + companies from backend
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    async function load() {
      try {
        const { data } = await api.get("/api/users/dashboard"); // correct endpoint
        setReviews(data.reviews);        // populate reviews
        setMyCompanies(data.companies);  // populate companies
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, navigate]);

  function startEdit(r) {
    setEditingId(r.id);
    setEditRating(r.rating);
    setEditComment(r.comment || "");
  }

  async function saveEdit(id) {
    try {
      await api.put(`/api/reviews/${id}`, {
        rating: editRating,
        comment: editComment,
      });
      // refresh dashboard data
      const { data } = await api.get("/users/dashboard");
      setData(data);
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this review?")) return;
    try {
      await api.delete(`/api/reviews/${id}`);
      setData((prev) => ({
        reviews: prev.reviews.filter((r) => r.id !== id),
        companies: prev.companies.filter(
          (c) => !prev.reviews.some((r) => r.id === id && r.companyId === c.id)
        ),
      }));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${darkMode ? "text-gray-100" : ""}`}>
        Loading…
      </div>
    );
  }

  return (
    <div className={`max-w-5xl mx-auto p-6 space-y-8 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
      {/* Profile summary */}
      <section className={`rounded-xl border p-5 ${darkMode ? "border-gray-600 bg-gray-800" : ""}`}>
        <h2 className="text-xl font-semibold mb-2">My Profile</h2>
        <div className={darkMode ? "text-gray-200" : "text-gray-700"}>
          <div><span className="font-medium">Name:</span> {user?.name}</div>
          <div><span className="font-medium">Email:</span> {user?.email}</div>
        </div>
      </section>

      {/* My Reviews */}
      <section className={`rounded-xl border p-5 ${darkMode ? "border-gray-600 bg-gray-800" : ""}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">My Reviews</h2>
          <Link to="/" className="text-blue-600 hover:underline">Browse companies</Link>
        </div>

        {data.reviews.length === 0 ? (
          <div className={darkMode ? "text-gray-400" : "text-gray-500"}>
            You haven’t posted any reviews yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {data.reviews.map((r) => (
              <li key={r.id} className={`border rounded-lg p-4 ${darkMode ? "border-gray-600 bg-gray-700" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{r.companyName}</div>
                    <div className={darkMode ? "text-gray-400 text-sm" : "text-sm text-gray-500"}>{r.companyAddress}</div>
                  </div>
                  <Link to="/" className="text-sm text-blue-600 hover:underline">View</Link>
                </div>

                {editingId === r.id ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <label>Edit rating:</label>
                      <select
                        className={`border p-1 rounded ${darkMode ? "bg-gray-700 text-gray-100 border-gray-600" : ""}`}
                        value={editRating}
                        onChange={(e) => setEditRating(Number(e.target.value))}
                      >
                        {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <textarea
                      className={`border p-2 w-full mt-2 rounded ${darkMode ? "bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400" : ""}`}
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                    />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => saveEdit(r.id)} className="bg-green-600 text-white px-3 py-1 rounded">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1 rounded">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-col gap-1">
                    <div>
                      Rating: <span className="font-medium">{r.rating}</span>
                    </div>
                    {r.comment && <div className={darkMode ? "text-gray-200" : "text-gray-700"}>{r.comment}</div>}
                    <div className="mt-2 flex gap-3">
                      <button onClick={() => startEdit(r)} className="text-blue-600">Edit</button>
                      <button onClick={() => handleDelete(r.id)} className="text-red-600">Delete</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Companies I reviewed */}
      <section className={`rounded-xl border p-5 ${darkMode ? "border-gray-600 bg-gray-800" : ""}`}>
        <h2 className="text-xl font-semibold mb-3">Companies I Reviewed</h2>
        {myCompanies.length === 0 ? (
          <div className={darkMode ? "text-gray-400" : "text-gray-500"}>No companies yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCompanies.map((c) => (
              <div key={c.id} className={`border rounded-lg p-4 ${darkMode ? "border-gray-600 bg-gray-700" : ""}`}>
                <div className="font-semibold">{c.name}</div>
                <div className={darkMode ? "text-gray-400 text-sm" : "text-sm text-gray-500"}>{c.address}</div>
                <div className="text-sm mt-1">
                  ⭐Your last rating: <span className="font-medium">{c.myLastRating}</span>
                </div>
                {c.myLastComment && (
                  <div className={darkMode ? "text-gray-200 text-sm mt-1 line-clamp-2" : "text-sm text-gray-700 mt-1 line-clamp-2"}>
                    {c.myLastComment}
                  </div>
                )}
                <Link to="/" className="inline-block mt-2 text-blue-600 hover:underline text-sm">
                  Open on Home
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
