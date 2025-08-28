const db = require("../config/db");

// Get all roles
const getRoles = (req, res) => {
  db.query("SELECT * FROM role", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Get single role by id
const getRoleById = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM role WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Role not found" });
    res.json(results[0]);
  });
};

// Create new role
const createRole = (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Role name is required" });

  db.query("INSERT INTO role (name) VALUES (?)", [name], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Role created", id: result.insertId });
  });
};

// Update role
const updateRole = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Role name is required" });

  db.query("UPDATE role SET name = ? WHERE id = ?", [name, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Role not found" });
    res.json({ message: "Role updated" });
  });
};

// Delete role
const deleteRole = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM role WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Role not found" });
    res.json({ message: "Role deleted" });
  });
};

module.exports = { getRoles, getRoleById, createRole, updateRole, deleteRole };
