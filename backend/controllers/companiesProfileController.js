// backend/controllers/companiesProfileController.js
const db = require("../config/db");

// GET /api/companies/:id/full
const getCompanyFull = (req, res) => {
  const { id } = req.params;

  // 1) company info
  db.query("SELECT * FROM company WHERE id = ?", [id], (err, companyRes) => {
    if (err) return res.status(500).json({ error: err.message });
    if (companyRes.length === 0) return res.status(404).json({ message: "Company not found" });

    const company = companyRes[0];

    // 2) average rating + review count
    db.query(
      "SELECT COALESCE(AVG(rating), 0) AS avgRating, COUNT(*) AS reviewCount FROM reviews WHERE companyId = ? AND approved = 1",
      [id],
      (err2, statsRes) => {
        if (err2) return res.status(500).json({ error: err2.message });
        const stats = statsRes[0] || { avgRating: 0, reviewCount: 0 };

        // 3) recent reviews (approved)
        db.query(
          `SELECT r.id, r.rating, r.comment, r.created_at, r.user_id, u.name AS userName
           FROM reviews r
           LEFT JOIN users u ON r.user_id = u.id
           WHERE r.companyId = ? AND r.approved = 1
           ORDER BY r.created_at DESC
           LIMIT 20`,
          [id],
          (err3, reviewsRes) => {
            if (err3) return res.status(500).json({ error: err3.message });

            // 4) jobs for this company
            db.query(
              `SELECT id, title, location, employment_type, salary_range, created_at
               FROM jobs WHERE companyId = ? ORDER BY created_at DESC`,
              [id],
              (err4, jobsRes) => {
                if (err4) return res.status(500).json({ error: err4.message });

                // Build final payload
                res.json({
                  company,
                  stats,
                  reviews: reviewsRes,
                  jobs: jobsRes,
                });
              }
            );
          }
        );
      }
    );
  });
};

module.exports = { getCompanyFull };
