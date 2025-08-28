// controllers/usersController.js
import db from "../config/db.js";

export const getUserDashboard = (req, res) => {
  const userId = req.user.id;

  // 1. Get user's reviews with company info
  const reviewsQuery = `
    SELECT r.id, r.rating, r.comment, c.id AS companyId, c.name AS companyName, c.address AS companyAddress
    FROM reviews r
    JOIN company c ON r.companyId = c.id
    WHERE r.userId = ?
    ORDER BY r.id DESC
  `;

  // 2. Get distinct companies user reviewed
  const companiesQuery = `
    SELECT DISTINCT c.id, c.name, c.address
    FROM company c
    JOIN reviews r ON r.companyId = c.id
    WHERE r.userId = ?
  `;

  db.query(reviewsQuery, [userId], (err, reviews) => {
    if (err) return res.status(500).json({ message: "Failed to fetch reviews" });

    db.query(companiesQuery, [userId], (err2, companies) => {
      if (err2) return res.status(500).json({ message: "Failed to fetch companies" });

      res.json({ reviews, companies });
    });
  });
};
