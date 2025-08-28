/*const express = require("express");
const router = express.Router();
const db = require("../config/db"); // MySQL connection
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const path = require("path");
const fs = require("fs");
const multer = require("multer");



const {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/companiesController");

// GET all companies
router.get("/", getCompanies);

// GET single company
router.get("/:id", getCompanyById);

// POST create company
router.post("/", createCompany);

// PUT update company
router.put("/:id", updateCompany);

// DELETE company
router.delete("/:id", deleteCompany);

module.exports = router;

const auth = require("../middleware/authMiddleware");
// ...
router.post("/", auth, createCompany);
router.put("/:id", auth, updateCompany);
router.delete("/:id", auth, deleteCompany);

// routes/companies.js


// Get all companies with average rating
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      c.id, 
      c.name, 
      c.address, 
      c.image,
      IFNULL(ROUND(AVG(r.rating), 2), 0) AS avgRating
    FROM company c
    LEFT JOIN reviews r ON c.id = r.companyId
    GROUP BY c.id, c.name, c.address, c.image
    ORDER BY c.id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Convert avgRating from string to number (MySQL returns it as string)
    const formatted = results.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address,
      image: row.image,
      avgRating: Number(row.avgRating)
    }));

    res.json(formatted);
  });
});

module.exports = router;




// Create a new company (admin only)
router.post("/", authMiddleware, roleMiddleware(1), (req, res) => {
  const { name, address, typeId, image } = req.body;

  db.query(
    "INSERT INTO company (name, address, typeId, image) VALUES (?, ?, ?, ?)",
    [name, address, typeId, image],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Company created successfully", id: result.insertId });
    }
  );
});


// POST: Create new company
router.post("/", async (req, res) => {
  try {
    const { name, address, type_id, image_url } = req.body;

    if (!name || !address || !type_id || !image_url) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const [result] = await pool.query(
      "INSERT INTO companies (name, address, type_id, image_url) VALUES (?, ?, ?, ?)",
      [name, address, type_id, image_url]
    );

    res.json({ id: result.insertId, name, address, type_id, image_url });
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ error: "Failed to create company" });
  }
});



// Update a company (admin only)
router.put("/:id", authMiddleware, roleMiddleware(1), (req, res) => {
  const { id } = req.params;
  const { name, address, typeId, image } = req.body;

  db.query(
    "UPDATE company SET name = ?, address = ?, typeId = ?, image = ? WHERE id = ?",
    [name, address, typeId, image, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Company updated successfully" });
    }
  );
});

// Delete a company (admin only)
router.delete("/:id", authMiddleware, roleMiddleware(1), (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM company WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Company deleted successfully" });
  });
});


// Storage config
const uploadDir = path.join(__dirname, "..", "uploads", "company");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = ["image/png", "image/jpeg", "image/jpg"];
  if (!allowed.includes(file.mimetype)) return cb(new Error("Only PNG/JPG allowed"));
  cb(null, true);
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// POST /api/companies/upload  (admin only)
router.post(
  "/upload",
  authMiddleware,
  roleMiddleware(1),
  upload.single("file"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    // Public URL clients can use:
    const url = `/uploads/company/${req.file.filename}`;
    return res.json({ url });
  }
);*/

// backend/routes/companies.js
const express = require("express");
const router = express.Router();
const db = require("../config/db"); // MySQL connection
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Use your controllers where you already have them implemented
const {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/companiesController");

/**
 * NOTE:
 * This file keeps your existing endpoints and behavior, and fixes the image upload handling.
 * - Upload endpoint returns an absolute URL (protocol + host) so frontend can render images from different origin.
 * - Normalizes alternate field names (type_id, image_url) -> typeId, image so both payload styles work.
 *
 * Make sure your server (server.js) serves the uploads folder:
 *   app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
 *
 * This file is intentionally verbose (lots of comments) so you can see what's happening.
 */

/* ---------------------------
   Helper: Normalize request body
   Accepts both snake_case and camelCase fields from various frontend payloads.
   e.g. type_id -> typeId, image_url -> image
---------------------------- */
function normalizeCompanyFields(req, _res, next) {
  if (req.body) {
    if (req.body.type_id && !req.body.typeId) req.body.typeId = req.body.type_id;
    if (req.body.image_url && !req.body.image) req.body.image = req.body.image_url;
    // older variants: some code used `name`/`address` variants — keep as-is
  }
  next();
}

/* ---------------------------
   ROUTES - using controllers where appropriate
---------------------------- */

// GET all companies (controller is expected to return avgRating etc.)
router.get("/", getCompanies);

// GET single company (by id)
router.get("/:id", getCompanyById);

/* ---------------------------
   FILE UPLOAD (multer)
   - Saves files under backend/uploads/company
   - Returns full absolute URL so frontend (localhost:3000) can load image from backend origin
---------------------------- */
const uploadDir = path.join(__dirname, "..", "uploads", "company");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = ["image/png", "image/jpeg", "image/jpg"];
  if (!allowed.includes(file.mimetype)) return cb(new Error("Only PNG/JPG allowed"));
  cb(null, true);
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

/**
 * POST /api/companies/upload
 * - admin only (auth + roleMiddleware(1))
 * - accepts form-data { file: <image> }
 * - returns { url: 'http://host:port/uploads/company/xxxx.png' }
 */
router.post(
  "/upload",
  authMiddleware,
  roleMiddleware(1),
  upload.single("file"),
  (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      // Build an absolute URL (so frontend on different origin can use it directly)
      // Example: http://localhost:5000/uploads/company/12345.png
      const fileUrlPath = `/uploads/company/${req.file.filename}`;
      const absoluteUrl = `${req.protocol}://${req.get("host")}${fileUrlPath}`;

      return res.json({ url: absoluteUrl, path: fileUrlPath });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: err.message || "Upload failed" });
    }
  }
);

/* ---------------------------
   CREATE company (admin only)
   - Accepts image as either:
       a) an absolute URL (http://...), or
       b) an upload returned path (e.g. /uploads/company/xxx.png) OR
       c) frontend may send image_url or image field (we normalize)
---------------------------- */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(1),
  normalizeCompanyFields,
  async (req, res) => {
    try {
      const { name, address } = req.body;
      // Accept either typeId or type_id normalized above
      const typeId = req.body.typeId || null;
      // Accept either image or image_url normalized above
      const image = req.body.image || "";

      // If you want to enforce image always present, keep this. User earlier required it.
      // If you prefer optional image, remove this check.
      if (!name || !address || !typeId || !image) {
        return res.status(400).json({ error: "All fields are required (name, address, typeId, image)" });
      }

      // Use prepared statement to insert new company
      db.query(
        "INSERT INTO company (name, address, typeId, image) VALUES (?, ?, ?, ?)",
        [name, address, typeId, image],
        (err, result) => {
          if (err) {
            console.error("DB insert error (company):", err);
            return res.status(500).json({ error: err.message });
          }
          // Return created company info (id + passed fields)
          return res.json({
            message: "Company created successfully",
            id: result.insertId,
            name,
            address,
            typeId,
            image,
          });
        }
      );
    } catch (err) {
      console.error("Create company error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/* ---------------------------
   UPDATE company (admin only)
   - Normalizes fields and calls controller.updateCompany (which expects id + body)
---------------------------- */
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(1),
  normalizeCompanyFields,
  updateCompany
);

/* ---------------------------
   DELETE company (admin only)
---------------------------- */
router.delete("/:id", authMiddleware, roleMiddleware(1), deleteCompany);

/* ---------------------------
   EXPORT
---------------------------- */
module.exports = router;

