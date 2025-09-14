// backend/routes/jobs.js
const express = require("express");
const router = express.Router();
const jobsController = require("../controllers/jobsController");
const applicationsController = require("../controllers/applicationsController");
const auth = require("../middleware/authMiddleware");
const owner = require("../middleware/ownerMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// resume uploads directory
const resumeDir = path.join(__dirname, "..", "uploads", "resumes");
fs.mkdirSync(resumeDir, { recursive: true });

const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumeDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  }
});
const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf","image/png","image/jpeg","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Invalid resume type"));
    cb(null, true);
  }
});

/**
 * toHandler(fn)
 * ensures router receives a function. If the controller export is missing/undefined,
 * we return a middleware that responds with 500 and a helpful message instead of crashing the process.
 */
function toHandler(fn, name = "handler") {
  if (typeof fn === "function") return fn;
  return (req, res) => {
    console.error(`Route ${req.method} ${req.originalUrl} attempted to call missing controller: ${name}`);
    return res.status(500).json({ message: `Server misconfiguration: ${name} not implemented` });
  };
}

/* ROUTES */

// Company jobs listing (public)
router.get("/companies/:companyId/jobs", toHandler(jobsController.getJobsByCompany, "jobsController.getJobsByCompany"));
// Create job (owner or admin)
router.post("/companies/:companyId/jobs", auth, owner, toHandler(jobsController.createJob, "jobsController.createJob"));

// Single job endpoints
router.get("/jobs/:id", toHandler(jobsController.getJobById, "jobsController.getJobById"));
router.put("/jobs/:id", auth, owner, toHandler(jobsController.updateJob, "jobsController.updateJob"));
router.delete("/jobs/:id", auth, owner, toHandler(jobsController.deleteJob, "jobsController.deleteJob"));

// Apply to a job (auth) - supports resume file field 'resume'
router.post("/jobs/:id/apply", auth, resumeUpload.single("resume"), toHandler(applicationsController.applyToJob, "applicationsController.applyToJob"));

// Owner/admin: list applications for a job
router.get("/jobs/:jobId/applications", auth, owner, toHandler(applicationsController.listApplicationsForJob, "applicationsController.listApplicationsForJob"));

// Owner/admin: review application (accept/reject/shortlist)
router.put("/applications/:id/review", auth, owner, toHandler(applicationsController.reviewApplication, "applicationsController.reviewApplication"));

module.exports = router;
