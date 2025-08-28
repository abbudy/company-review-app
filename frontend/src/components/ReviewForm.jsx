/* eslint-disable no-unused-vars */
import { useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function ReviewForm({ companyId, onReviewAdded, darkMode }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const { user } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return setErr("You must be logged in to review");

    try {
      const { data } = await api.post("/api/reviews", {
        companyId,
        rating,
        comment,
      });
      setRating(5);
      setComment("");
      setErr("");
      onReviewAdded(); // refresh reviews after adding
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to submit review");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-3 border-t pt-3 space-y-2 ${
        darkMode ? "border-gray-600" : "border-gray-300"
      }`}
    >
      {err && <div className="text-red-500">{err}</div>}
      <div className="flex items-center space-x-2">
        <label>Rating:</label>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
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
        className={`border p-2 w-full rounded ${
          darkMode
            ? "bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400"
            : "bg-white text-gray-900 border-gray-300 placeholder-gray-500"
        }`}
        placeholder="Write a review..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button className="bg-green-600 text-white px-3 py-1 rounded">
        Submit Review
      </button>
    </form>
  );
}
