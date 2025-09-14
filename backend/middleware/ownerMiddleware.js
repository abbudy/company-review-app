// backend/middleware/ownerMiddleware.js
const db = require("../config/db");

/**
 * ownerOrCompanyMember
 * Allow access if:
 *  - user.roleId === 1 (admin)
 *  - OR user is the owner of the job (jobs.posted_by matches user.id)
 *  - OR user's companyId matches the companyId of the resource (route param or job's company)
 */
module.exports = function ownerOrCompanyMember(req, res, next) {
  try {
    const tokenUser = req.user;
    if (!tokenUser || !tokenUser.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Helper to perform checks once full user record is available
    function checkWithUser(fullUser) {
      // Admin is always allowed
      if (Number(fullUser.roleId) === 1) {
        return next();
      }

      // Determine companyId and jobId from request parameters
      let companyId = req.params.companyId || req.body.companyId || null;
      const jobId = req.params.jobId || req.params.id || null;

      // If a jobId is present and no explicit companyId, fetch job details
      if (!companyId && jobId) {
        db.query(
          "SELECT companyId, posted_by FROM jobs WHERE id = ?",
          [jobId],
          (err, rows) => {
            if (err) {
              console.error("ownerMiddleware: failed to fetch job:", err);
              return res.status(500).json({ message: "DB error" });
            }
            if (!rows || rows.length === 0) {
              return res.status(404).json({ message: "Resource not found" });
            }

            const job = rows[0];
            const jobCompanyId = job.companyId;
            const jobOwnerId = job.posted_by;

            // Allow if user is the owner of the job
            if (fullUser.id === jobOwnerId) {
              return next();
            }
            // Allow if user's companyId matches the job's companyId
            if (String(fullUser.companyId) === String(jobCompanyId)) {
              return next();
            }
            // Otherwise forbid
            return res
              .status(403)
              .json({ message: "Forbidden: not owner or company member" });
          }
        );
        return;
      }

      // If we have an explicit companyId (e.g. from URL param or request body)
      if (companyId) {
        if (String(fullUser.companyId) === String(companyId)) {
          return next();
        }
        return res
          .status(403)
          .json({ message: "Forbidden: not company member" });
      }

      // No relevant context found — deny access
      return res.status(403).json({ message: "Forbidden" });
    }

    // If JWT already contained roleId and companyId, use them directly
    if (
      tokenUser.roleId !== undefined &&
      tokenUser.companyId !== undefined
    ) {
      return checkWithUser(tokenUser);
    }

    // Otherwise, fetch the user's roleId and companyId from the database
    db.query(
      "SELECT id, roleId, companyId FROM users WHERE id = ? LIMIT 1",
      [tokenUser.id],
      (err, rows) => {
        if (err) {
          console.error("ownerMiddleware: failed to fetch user:", err);
          return res.status(500).json({ message: "DB error" });
        }
        if (!rows || rows.length === 0) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const fullUser = rows[0];
        // Attach full user info to req.user for downstream middleware/handlers
        req.user = Object.assign({}, req.user, fullUser);
        return checkWithUser(fullUser);
      }
    );
  } catch (e) {
    console.error("ownerMiddleware unexpected error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};
