// backend/server.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); 

const JWT_SECRET = "supersecretkey"; // Use env var in real projects

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./config/db");
const path = require("path");
dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;

// Route modules
const jobsRoutes = require("./routes/jobs");
const applicationsRoutes = require("./routes/applications");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test root
app.get("/", (req, res) => {
  res.send("Company Review API is running");
});

// Routes (existing)
const adminRoutes = require("./routes/admin");
const rolesRoutes = require("./routes/roles");
const authRoutes = require("./routes/auth");
const companyRoutes = require("./routes/companies");
const reviewRoutes = require("./routes/reviews");
const typeRoutes = require("./routes/types");
const userRoutes = require("./routes/users");
const companyClaimsRoutes = require("./routes/companyClaims");


// Mount existing API routes
app.use("/api/roles", rolesRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/types", typeRoutes);
app.use("/api/users", userRoutes);

// ---- CORRECT MOUNT for jobs & applications ----
// Mount the jobs/applications routers under /api so that routes defined
// inside them like "/companies/:companyId/jobs" become "/api/companies/:companyId/jobs"
app.use("/api", jobsRoutes);
app.use("/api", applicationsRoutes);

app.use("/api/claims", companyClaimsRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Test DB connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("DB Connection Failed:", err);
  } else {
    console.log("DB Connected!");
    connection.release();
  }
});


// ---- legacy/in-file register & login (kept as in your original file) ----
// NOTE: these handler implementations reference `users` (in-memory).
// They are duplicate to your auth routes (controllers/auth) but kept to preserve original behavior.

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  const existing = users.find((u) => u.email === email);
  if (existing) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, name, email, password: hashed };
  users.push(newUser);

  const token = jwt.sign({ id: newUser.id, email }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, user: { id: newUser.id, name, email } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, user: { id: user.id, name: user.name, email } });
});

// add middleware (kept as in your original file)
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// sample route kept (as in your original file)
app.get("/api/companies", authMiddleware, (req, res) => {
  res.json(companies);
});
