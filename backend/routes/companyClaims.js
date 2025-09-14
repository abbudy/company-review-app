// backend/routes/companyClaims.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/companyClaimsController");

// Prepare uploads folder
const claimsDir = path.join(__dirname, "..", "uploads", "claims");
fs.mkdirSync(claimsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, claimsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Only PNG/JPG/PDF allowed"));
    cb(null, true);
  },
});

// Public: submit a claim (authenticated)
router.post("/companies/:id/claim", auth, upload.single("evidenceFile"), controller.submitClaim);

// Authenticated user: get his claims
router.get("/users/claims", auth, controller.getMyClaims);

// Admin: list claims
router.get("/admin/company-claims", auth, roleMiddleware(1), controller.listClaims);

// Admin: review a claim
router.put("/admin/company-claims/:id/review", auth, roleMiddleware(1), controller.reviewClaim);

module.exports = router;
