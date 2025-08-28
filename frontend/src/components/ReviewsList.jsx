/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function ReviewsList({ companyId, onReviewChanged, darkMode }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const { user } = useAuth();

  async function loadReviews() {
    try {
      const { data } = await api.get(`/api/reviews/by-company/${companyId}`);
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [companyId]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this review?")) return;
    try {
      await api.delete(`/api/reviews/${id}`);
      loadReviews();
      onReviewChanged();
    } catch (err) {
      console.error(err);
    }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setEditRating(r.rating);
    setEditComment(r.comment);
  }

  async function saveEdit(id) {
    try {
      await api.put(`/api/reviews/${id}`, {
        rating: editRating,
        comment: editComment,
      });
      setEditingId(null);
      loadReviews();
      onReviewChanged();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading)
    return (
      <div className={darkMode ? "text-gray-200" : ""}>Loading reviews…</div>
    );
  if (reviews.length === 0)
    return (
      <div className={darkMode ? "text-gray-400" : "text-gray-500"}>
        No reviews yet.
      </div>
    );

  return (
    <ul className="mt-2 space-y-2">
      {reviews.map((r) => (
        <li
          key={r.id}
          className={`border p-2 rounded ${
            darkMode ? "border-gray-600 bg-gray-800 text-gray-100" : ""
          }`}
        >
          {editingId === r.id ? (
            <div>
              <div className="flex items-center space-x-2">
                <label>Edit Rating:</label>
                <select
                  value={editRating}
                  onChange={(e) => setEditRating(Number(e.target.value))}
                  className={`border p-1 rounded ${
                    darkMode
                      ? "bg-gray-700 text-gray-100 border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className={`border p-2 w-full mt-2 rounded ${
                  darkMode
                    ? "bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400"
                    : "bg-white text-gray-900 border-gray-300 placeholder-gray-500"
                }`}
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
              />
              <div className="mt-2 space-x-2">
                <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => saveEdit(r.id)}>Save</button>
                <button className="bg-gray-400 text-white px-3 py-1 rounded" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="font-semibold">{r.userName}</div>
              <div>
                Rating:{" "}
                <span className={darkMode ? "text-yellow-400" : ""}>
                  {r.rating}
                </span>
              </div>
              {r.comment && (
                <div className={darkMode ? "text-gray-200" : "text-gray-700"}>
                  {r.comment}
                </div>
              )}
              {user && user.id === r.user_id && (
                <div className="mt-2 space-x-2">
                  <button className="text-blue-600" onClick={() => startEdit(r)}>
                    Edit
                  </button>
                  <button className="text-red-600" onClick={() => handleDelete(r.id)}>
                    Delete
                  </button>
                </div>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
