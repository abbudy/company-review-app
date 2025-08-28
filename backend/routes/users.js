const express = require("express");
const router = express.Router();
const db = require("../config/db"); // your MySQL connection
const auth = require("../middleware/authMiddleware"); // protected routes
const roleMiddleware = require("../middleware/roleMiddleware");

// Assign role to a user (protected)
router.put("/:id/role", auth, roleMiddleware(1), (req, res) => {
  const { roleId } = req.body;
  const { id } = req.params;

  db.query(
    "UPDATE users SET roleId = ? WHERE id = ?",
    [roleId, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Role assigned successfully" });
    }
  );
});

// ------------------------------
// Dashboard route: get user reviews + companies
// Dashboard route: get user reviews + companies
router.get("/dashboard", auth, (req, res) => {
  const userId = req.user.id;

  // Query reviews with company info
  const sql = `
    SELECT r.id AS reviewId, r.rating, r.comment,
           c.id AS companyId, c.Name AS companyName, c.address AS companyAddress
    FROM reviews r
    JOIN company c ON r.companyId = c.id
    WHERE r.user_id = ?       -- <-- use correct column name here
    ORDER BY r.id DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });

    // Build companies list unique by companyId
    const companiesMap = new Map();
    results.forEach(r => {
      if (!companiesMap.has(r.companyId)) {
        companiesMap.set(r.companyId, {
          id: r.companyId,
          name: r.companyName,
          address: r.companyAddress,
          myLastRating: r.rating,
          myLastComment: r.comment
        });
      }
    });

    res.json({
      reviews: results.map(r => ({
        id: r.reviewId,
        companyId: r.companyId,
        companyName: r.companyName,
        companyAddress: r.companyAddress,
        rating: r.rating,
        comment: r.comment
      })),
      companies: Array.from(companiesMap.values())
    });
  });
});
module.exports = router;