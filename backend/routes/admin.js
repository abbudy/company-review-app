// backend/routes/admin.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const { listClaims, reviewClaim } = require("../controllers/companyClaimsController");


// Only admins
router.use(auth, roleMiddleware(1));

/**
 * GET /api/admin/users
 */
router.get("/users", (req, res) => {
  const sql = `SELECT id, name, email, roleId FROM users ORDER BY id DESC`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json({ users: rows });
  });
});

/**
 * GET /api/admin/companies
 * Includes avg rating + review count
 */
router.get("/companies", (req, res) => {
  const sql = `
    SELECT 
      c.id, c.name, c.address,
      COALESCE(ROUND(AVG(r.rating), 1), 0) AS avgRating,
      COUNT(r.id) AS reviewCount
    FROM company c
    LEFT JOIN reviews r ON r.companyId = c.id
    GROUP BY c.id
    ORDER BY c.id DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json({ companies: rows });
  });
});

/**
 * GET /api/admin/reviews
 * Detects if "approved" column exists and returns it if present.
 */
router.get("/reviews", (req, res) => {
  db.query(`SHOW COLUMNS FROM reviews LIKE 'approved'`, (err, cols) => {
    const hasApproved = !err && cols && cols.length > 0;
    const sql = `
      SELECT 
        r.id, r.user_id AS userId, u.name AS userName,
        r.companyId, c.name AS companyName,
        r.rating, r.comment
        ${hasApproved ? ", r.approved" : ""}
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      JOIN company c ON c.id = r.companyId
      ORDER BY r.id DESC
    `;
    db.query(sql, (err2, rows) => {
      if (err2) return res.status(500).json({ message: "DB error", error: err2 });
      res.json({ hasApproved, reviews: rows });
    });
  });
});

/**
 * PUT /api/admin/reviews/:id
 * Edit rating/comment
 */
router.put("/reviews/:id", (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  if (!rating) return res.status(400).json({ message: "Rating is required" });

  const sql = `UPDATE reviews SET rating=?, comment=? WHERE id=?`;
  db.query(sql, [rating, comment || null, id], (err) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json({ message: "Review updated" });
  });
});

/**
 * DELETE /api/admin/reviews/:id
 */
router.delete("/reviews/:id", (req, res) => {
  const { id } = req.params;
  db.query(`DELETE FROM reviews WHERE id=?`, [id], (err) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json({ message: "Review deleted" });
  });
});

/**
 * PUT /api/admin/reviews/:id/approve
 * Requires "approved" TINYINT(1) in reviews table.
 * If not present, returns how to add it (doesn't break anything else).
 */
router.put("/reviews/:id/approve", (req, res) => {
  const { id } = req.params;
  const { approved } = req.body; // 1 or 0
  db.query(`SHOW COLUMNS FROM reviews LIKE 'approved'`, (err, cols) => {
    if (err || !cols || cols.length === 0) {
      return res.status(400).json({
        message: "The 'approved' column does not exist on 'reviews'.",
        fix: "Run: ALTER TABLE reviews ADD COLUMN approved TINYINT(1) NOT NULL DEFAULT 1;"
      });
    }
    db.query(`UPDATE reviews SET approved=? WHERE id=?`, [approved ? 1 : 0, id], (e2) => {
      if (e2) return res.status(500).json({ message: "DB error", error: e2 });
      res.json({ message: "Review approval updated" });
    });
  });
});

// GET /api/admin/company-claims?status=pending
router.get("/company-claims", listClaims);

// PUT /api/admin/company-claims/:id/approve
router.put("/company-claims/:id/review", reviewClaim);


module.exports = router;
