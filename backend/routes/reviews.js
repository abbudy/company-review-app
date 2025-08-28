const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// GET all reviews
router.get("/", (req, res) => {
  const sql = "SELECT * FROM reviews ORDER BY id DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET reviews by company
router.get("/by-company/:companyId", (req, res) => {
  const { companyId } = req.params;
  const sql = `
    SELECT r.id, r.rating, r.comment, r.user_id, u.name AS userName
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.companyId = ?
    ORDER BY r.id DESC
  `;
  db.query(sql, [companyId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


router.get("/my", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT r.*, c.name AS companyName
    FROM reviews r
    JOIN company c ON r.companyId = c.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


// 
// GET my reviews (authenticated)
router.get("/my", authMiddleware, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      r.id,
      r.rating,
      r.comment,
      r.companyId,
      r.user_id,
      c.name     AS companyName,
      c.address  AS companyAddress
    FROM reviews r
    JOIN company c ON c.id = r.companyId
    WHERE r.user_id = ?
    ORDER BY r.id DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});



// POST create review (authenticated)
router.post("/", authMiddleware, (req, res) => {
  const { companyId, rating, comment } = req.body;
  const userId = req.user.id;

  if (!companyId || !rating || !comment) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  db.query(
    "INSERT INTO reviews (user_id, companyId, rating, comment) VALUES (?, ?, ?, ?)",
    [userId, companyId, rating, comment],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Review added", id: result.insertId });
    }
  );
});

// PUT update review (authenticated, own review only)
router.put("/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  db.query(
    "UPDATE reviews SET rating = ?, comment = ? WHERE id = ? AND user_id = ?",
    [rating, comment, id, userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0)
        return res.status(403).json({ message: "Not authorized to update this review" });
      res.json({ message: "Review updated" });
    }
  );
});

// DELETE review (authenticated, own review or admin)
router.delete("/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const isAdmin = req.user.roleId === 1;

  const sql = "DELETE FROM reviews WHERE id = ? AND (user_id = ? OR ?)";
  db.query(sql, [id, userId, isAdmin], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0)
      return res.status(403).json({ message: "Not authorized to delete this review" });
    res.json({ message: "Review deleted" });
  });
});

module.exports = router;
