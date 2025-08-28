const db = require("../config/db");

// Get all reviews
const getReviews = (req, res) => {
  db.query("SELECT * FROM reviews", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

import Review from "../models/Review.js";

export const getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id }).populate("company");
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to load your reviews" });
  }
};



// Get reviews by companyId
const getReviewsByCompany = (req, res) => {
  const { companyId } = req.params;
  db.query(
    "SELECT * FROM reviews WHERE companyId = ?",
    [companyId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
};

// Create review
const createReview = (req, res) => {
  const { user_id, companyId, rating, comment } = req.body;
  if (!user_id || !companyId || !rating)
    return res.status(400).json({ message: "Required fields missing" });

  db.query(
    "INSERT INTO reviews (user_id, companyId, rating, comment) VALUES (?, ?, ?, ?)",
    [user_id, companyId, rating, comment || null],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({ message: "Review created", id: result.insertId });
    }
  );
};

// Update review
const updateReview = (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  db.query(
    "UPDATE reviews SET rating=?, comment=? WHERE id=?",
    [rating, comment || null, id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Review updated" });
    }
  );
};

// Delete review
const deleteReview = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM reviews WHERE id=?", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Review deleted" });
  });
};

module.exports = {
  getReviews,
  getReviewsByCompany,
  createReview,
  updateReview,
  deleteReview,
};
