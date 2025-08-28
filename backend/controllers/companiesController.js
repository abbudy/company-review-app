const db = require("../config/db");

// ✅ Get all companies with average rating
const getCompanies = (req, res) => {
  const sql = `
    SELECT c.*, COALESCE(AVG(r.rating), 0) AS avgRating
    FROM company c
    LEFT JOIN reviews r ON c.id = r.companyId
    GROUP BY c.id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// ✅ Get single company by ID
const getCompanyById = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM company WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0)
      return res.status(404).json({ message: "Company not found" });
    res.json(result[0]);
  });
};

// ✅ Create company
const createCompany = (req, res) => {
  const { name, address, typeId, image } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });

  db.query(
    "INSERT INTO company (name, address, typeId, image) VALUES (?, ?, ?, ?)",
    [name, address || null, typeId || null, image || null],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({ message: "Company created", id: result.insertId });
    }
  );
};

// ✅ Update company
const updateCompany = (req, res) => {
  const { id } = req.params;
  const { name, address, typeId, image } = req.body;

  db.query(
    "UPDATE company SET name=?, address=?, typeId=?, image=? WHERE id=?",
    [name, address || null, typeId || null, image || null, id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Company updated" });
    }
  );
};

// ✅ Delete company
const deleteCompany = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM company WHERE id=?", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Company deleted" });
  });
};

module.exports = {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
};
