const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ------------------- REGISTER -------------------
const register = (req, res) => {
  const { name, email, password, companyId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if user exists
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length > 0)
      return res.status(400).json({ message: "Email already exists" });

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Check if this is the first user
    db.query("SELECT COUNT(*) AS count FROM users", (err, usersResult) => {
      if (err) return res.status(500).json(err);

      // First user becomes Admin, others become normal users
      const roleId = usersResult[0].count === 0 ? 1 : 2;

      // Insert user
      db.query(
        "INSERT INTO users (name, email, password, companyId, roleId) VALUES (?, ?, ?, ?, ?)",
        [name, email, hashedPassword, companyId || null, roleId],
        (err, result) => {
          if (err) return res.status(500).json(err);

          res.status(201).json({
            message: "User registered successfully",
            roleId, // returns role for verification
          });
        }
      );
    });
  });
};

// ------------------- LOGIN -------------------
const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "All fields are required" });

  // Find user
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0)
      return res.status(400).json({ message: "Invalid email or password" });

    const user = result[0];

    // Compare password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, roleId: user.roleId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Send back user info including roleId
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId, // needed for Admin link
      },
    });
  });
};

module.exports = { register, login };
