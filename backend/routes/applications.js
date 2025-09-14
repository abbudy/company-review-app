// backend/routes/applications.js  -- defensive version (paste this)
const express = require("express");
const router = express.Router();
const {
  applyToJob,
  getApplicationsForCompany,
  updateApplicationStatus,
} = require("../controllers/applicationsController");
const { companyOwnerOrAdmin, applicationOwnerOrAdmin } = require("../middleware/ownerOrAdminMiddleware");

const auth = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Setup uploads dir for applications
const uploadDir = path.join(__dirname, "..", "uploads", "applications");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
  ];
  if (!allowed.includes(file.mimetype)) return cb(new Error("Only pdf/doc/docx/png/jpg allowed"));
  cb(null, true);
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Helper: ensure handler is a function, otherwise wrap with error responder
function ensureHandler(fn, name) {
  if (typeof fn === "function") return fn;
  console.warn(`[routes/applications] Warning: ${name} is not a function. Route will respond with 500 for safety until fixed.`);
  return (req, res) => res.status(500).json({ error: `Server misconfiguration: ${name} missing` });
}

// Helper: for roleMiddleware which is expected to be a factory, attempt to create middleware safely
function safeRoleMiddleware(roleParam) {
  if (typeof roleMiddleware === "function") {
    try {
      const m = roleMiddleware(roleParam);
      if (typeof m === "function") return m;
      console.warn(`[routes/applications] Warning: roleMiddleware(${roleParam}) did not return a function.`);
    } catch (e) {
      console.warn(`[routes/applications] Warning: calling roleMiddleware(${roleParam}) threw:`, e.message);
    }
  } else {
    console.warn("[routes/applications] Warning: roleMiddleware is not a function (import may be wrong).");
  }
  // fallback no-op middleware that denies access (safer than allowing through)
  return (req, res, next) => res.status(500).json({ error: "Server misconfiguration: role middleware not available" });
}

// POST /api/applications/jobs/:jobId/apply
router.post("/jobs/:jobId/apply",
  ensureHandler(auth, "auth"),
  upload.single("resume"),
  ensureHandler(applyToJob, "applyToJob")
);

// GET /api/applications/companies/:companyId  (admin/company owner)
router.get(
  "/companies/:companyId",
  ensureHandler(auth, "auth"),
  safeRoleMiddleware(1), // expect roleMiddleware to produce middleware for role 1 (admin)
  ensureHandler(companyOwnerOrAdmin, "companyOwnerOrAdmin"),
  ensureHandler(getApplicationsForCompany, "getApplicationsForCompany")
);

// PUT /api/applications/:id/status
router.put(
  "/:id/status",
  ensureHandler(auth, "auth"),
  safeRoleMiddleware(1),
  ensureHandler(applicationOwnerOrAdmin, "applicationOwnerOrAdmin"),
  ensureHandler(updateApplicationStatus, "updateApplicationStatus")
);

module.exports = router;
