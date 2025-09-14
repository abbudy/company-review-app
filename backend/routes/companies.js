// backend/routes/companies.js
const express = require("express");
const router = express.Router();
const db = require("../config/db"); // MySQL connection
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// controllers
const {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/companiesController");

const { getCompanyFull } = require("../controllers/companiesProfileController");
const companyClaimsController = require("../controllers/companyClaimsController");

/* Helper: Normalize request body */
function normalizeCompanyFields(req, _res, next) {
  if (req.body) {
    if (req.body.type_id && !req.body.typeId) req.body.typeId = req.body.type_id;
    if (req.body.image_url && !req.body.image) req.body.image = req.body.image_url;
  }
  next();
}

/* ROUTES */

// GET all companies
router.get("/", getCompanies);

// GET /api/companies/:id/full  (detailed view)
router.get("/:id/full", getCompanyFull);

/* -----------------------
   Claim upload config: store evidence files under backend/uploads/claims
   Accept: evidenceFile (single)
------------------------ */
const claimUploadDir = path.join(__dirname, "..", "uploads", "claims");
fs.mkdirSync(claimUploadDir, { recursive: true });

const claimStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, claimUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // keep unique filename
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
function claimFileFilter(_req, file, cb) {
  // allow images and pdf/doc for evidence
  const allowed = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowed.includes(file.mimetype)) return cb(new Error("Invalid file type for evidence"));
  cb(null, true);
}
const claimUpload = multer({
  storage: claimStorage,
  fileFilter: claimFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max evidence file
});

/* POST /api/companies/:id/claim
   - Accepts multipart/form-data (optional evidenceFile) OR application/json
   - Protected route (logged-in users)
*/
router.post("/:id/claim", authMiddleware, claimUpload.single("evidenceFile"), companyClaimsController.submitClaim);

// GET single company (by id)
router.get("/:id", getCompanyById);

/* FILE UPLOAD (company images) - existing logic */
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

router.post(
  "/upload",
  authMiddleware,
  roleMiddleware(1),
  upload.single("file"),
  (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const fileUrlPath = `/uploads/company/${req.file.filename}`;
      const absoluteUrl = `${req.protocol}://${req.get("host")}${fileUrlPath}`;
      return res.json({ url: absoluteUrl, path: fileUrlPath });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: err.message || "Upload failed" });
    }
  }
);

/* CREATE company (admin only) */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(1),
  normalizeCompanyFields,
  async (req, res) => {
    try {
      const { name, address } = req.body;
      const typeId = req.body.typeId || null;
      const image = req.body.image || "";
      if (!name || !address || !typeId || !image) {
        return res.status(400).json({ error: "All fields are required (name, address, typeId, image)" });
      }
      db.query(
        "INSERT INTO company (name, address, typeId, image) VALUES (?, ?, ?, ?)",
        [name, address, typeId, image],
        (err, result) => {
          if (err) {
            console.error("DB insert error (company):", err);
            return res.status(500).json({ error: err.message });
          }
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

/* UPDATE company (admin only) */
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(1),
  normalizeCompanyFields,
  updateCompany
);

/* DELETE company (admin only) */
router.delete("/:id", authMiddleware, roleMiddleware(1), deleteCompany);

module.exports = router;
