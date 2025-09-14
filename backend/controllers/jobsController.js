// backend/controllers/jobsController.js
const db = require("../config/db");

// List jobs for a company
const getJobsByCompany = (req, res) => {
  const companyId = req.params.companyId;
  const sql = "SELECT * FROM jobs WHERE companyId = ? ORDER BY created_at DESC";
  db.query(sql, [companyId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Get single job by id
const getJobById = (req, res) => {
  const id = req.params.id;
  db.query("SELECT j.*, c.name AS companyName FROM jobs j LEFT JOIN company c ON c.id = j.companyId WHERE j.id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Job not found" });
    res.json(rows[0]);
  });
};

// Create job (admin only — enforced by route using roleMiddleware(1))
const createJob = (req, res) => {
  const companyId = req.params.companyId;
  const { title, description, location, salary } = req.body;
  const salary_range = salary || null;
  const posted_by = req.user?.id || null;

  if (!title) return res.status(400).json({ message: "Title is required" });

  const sql = "INSERT INTO jobs (companyId, title, description, location, salary_range, posted_by) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [companyId, title, description || null, location || null, salary_range, posted_by], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Job created", id: result.insertId });
  });
};

// Update job (owner/admin)
const updateJob = (req, res) => {
  const id = req.params.id;
  const { title, description, location, salary } = req.body;
  const salary_range = salary || null;

  db.query(
    "UPDATE jobs SET title=?, description=?, location=?, salary_range=? WHERE id=?",
    [title, description || null, location || null, salary_range, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Job updated" });
    }
  );
};

// Delete job (owner/admin)
const deleteJob = (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM jobs WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Job deleted" });
  });
};

module.exports = {
  getJobsByCompany,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
};
