const db = require("../config/db");

const getTypes = (req, res) => {
  db.query("SELECT * FROM type", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

const createType = (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });
  db.query("INSERT INTO type (name) VALUES (?)", [name], (err, result) => {
    if (err) return res.status(500).json(err);
    res.status(201).json({ message: "Type created", id: result.insertId });
  });
};

const deleteType = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM type WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Type deleted" });
  });
};

module.exports = { getTypes, createType, deleteType };
