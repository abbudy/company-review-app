// backend/middleware/ownerOrAdminMiddleware.js
const db = require("../config/db");

/**
 * companyOwnerOrAdmin
 * - allows if user.roleId === 1 (admin)
 * - or if users.companyId === req.params.companyId (or req.params.id)
 */
async function companyOwnerOrAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (user.roleId === 1) return next();

  const companyId = req.params.companyId || req.params.id;
  if (!companyId) return res.status(400).json({ message: "companyId missing" });

  db.query("SELECT companyId FROM users WHERE id = ?", [user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const userCompanyId = rows && rows[0] ? rows[0].companyId : null;
    if (userCompanyId == null) return res.status(403).json({ message: "Forbidden" });
    if (Number(userCompanyId) === Number(companyId)) return next();
    return res.status(403).json({ message: "Forbidden: not company owner" });
  });
}

/**
 * jobOwnerOrAdmin
 * - allows if admin
 * - or if user's companyId === job.companyId
 */
async function jobOwnerOrAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (user.roleId === 1) return next();

  const jobId = req.params.id || req.params.jobId;
  if (!jobId) return res.status(400).json({ message: "job id missing" });

  db.query("SELECT companyId FROM jobs WHERE id = ?", [jobId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Job not found" });
    const jobCompanyId = rows[0].companyId;

    db.query("SELECT companyId FROM users WHERE id = ?", [user.id], (err2, urows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const userCompanyId = urows && urows[0] ? urows[0].companyId : null;
      if (userCompanyId == null) return res.status(403).json({ message: "Forbidden" });
      if (Number(userCompanyId) === Number(jobCompanyId)) return next();
      return res.status(403).json({ message: "Forbidden: not job owner" });
    });
  });
}

/**
 * applicationOwnerOrAdmin
 * - allows if admin
 * - or if user's companyId === job.companyId (job linked to the application)
 */
async function applicationOwnerOrAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (user.roleId === 1) return next();

  const applicationId = req.params.id;
  if (!applicationId) return res.status(400).json({ message: "application id missing" });

  const sql = `
    SELECT j.companyId
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.id = ?
  `;
  db.query(sql, [applicationId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Application not found" });
    const appCompanyId = rows[0].companyId;

    db.query("SELECT companyId FROM users WHERE id = ?", [user.id], (err2, urows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const userCompanyId = urows && urows[0] ? urows[0].companyId : null;
      if (userCompanyId == null) return res.status(403).json({ message: "Forbidden" });
      if (Number(userCompanyId) === Number(appCompanyId)) return next();
      return res.status(403).json({ message: "Forbidden: not application owner" });
    });
  });
}

module.exports = { companyOwnerOrAdmin, jobOwnerOrAdmin, applicationOwnerOrAdmin };
