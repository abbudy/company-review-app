// backend/controllers/applicationsController.js
const db = require("../config/db");
const path = require("path");
const nodemailer = require("nodemailer");

// nodemailer transporter (uses env vars)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

function sendMail(to, subject, html) {
  if (!to) return Promise.resolve();
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

/**
 * Apply to a job (authenticated)
 * - Verifies job exists first
 * - Accepts job id from req.params.jobId OR req.params.id
 * - Accepts cover_letter or message
 * - If file uploaded, records it in application_files
 * - Snapshots applicant_name and applicant_email from users table if available
 */
const applyToJob = (req, res) => {
  const jobId = req.params.jobId || req.params.id;
  const userId = req.user?.id;
  const message = req.body.cover_letter || req.body.message || null;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!jobId) return res.status(400).json({ message: "Missing job id" });

  // 1) Check job exists
  db.query("SELECT id, companyId, title FROM jobs WHERE id = ? LIMIT 1", [jobId], (jobErr, jobRows) => {
    if (jobErr) {
      console.error("DB error checking job existence:", jobErr);
      return res.status(500).json({ error: jobErr.message });
    }
    if (!jobRows || jobRows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    const job = jobRows[0];

    // 2) Fetch user info to snapshot name/email (best-effort)
    db.query("SELECT id, name, email FROM users WHERE id = ? LIMIT 1", [userId], (uErr, uRows) => {
      if (uErr) {
        console.error("DB error fetching user for application:", uErr);
        return res.status(500).json({ error: uErr.message });
      }

      const userRow = (uRows && uRows[0]) || null;
      const applicant_name = (userRow && userRow.name) || req.body.applicant_name || null;
      const applicant_email = (userRow && userRow.email) || req.body.applicant_email || null;

      // Build resume relative path if file uploaded
      let resumeRelPath = null;
      if (req.file) {
        const dest = req.file.destination || "";
        const filename = req.file.filename;
        const subfolder = path.basename(dest) || "resumes";
        resumeRelPath = `/uploads/${subfolder}/${filename}`;
      } else if (req.body.resumeUrl) {
        resumeRelPath = req.body.resumeUrl;
      }

      // 3) Insert application (include applicant name/email snapshot if columns exist)
      // We'll attempt to insert applicant_name/applicant_email — these usually exist.
      const insertAppSql = `INSERT INTO applications
        (job_id, user_id, applicant_name, applicant_email, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'applied', NOW())`;

      db.query(insertAppSql, [jobId, userId, applicant_name, applicant_email, message], (insErr, insRes) => {
        if (insErr) {
          console.error("Apply error (insert application):", insErr);
          return res.status(500).json({ error: insErr.message });
        }

        const applicationId = insRes.insertId;

        // 4) If file uploaded or external url provided, record in application_files
        if (resumeRelPath) {
          const insFileSql = `INSERT INTO application_files (application_id, file_path, original_name, created_at)
                              VALUES (?, ?, ?, NOW())`;
          const originalName = req.file ? req.file.originalname : (req.body.resumeName || null);
          db.query(insFileSql, [applicationId, resumeRelPath, originalName], (fErr) => {
            if (fErr) console.error("Failed to save application file record:", fErr);
          });
        }

        // 5) Notify company users (email) — fire-and-forget
        db.query("SELECT email FROM users WHERE companyId = ?", [job.companyId], (err3, users) => {
          if (!err3 && users && users.length > 0) {
            const toList = users.map((u) => u.email).filter(Boolean).join(",");
            const subject = `New application for job at ${job.title || "Company job"}`;
            const html = `<p>A new application was submitted for <b>${job.title || "a job"}</b>.</p>
                          <p><b>Job id:</b> ${job.id}</p>
                          <p><b>Applicant user id:</b> ${userId}</p>
                          <p>Login to admin dashboard to view applications.</p>`;
            sendMail(toList, subject, html).catch((e) => console.error("Notify company error:", e));
          }
        });

        return res.status(201).json({ message: "Application submitted", id: applicationId });
      });
    });
  });
};

/**
 * List applications for a job (owner/admin)
 * - Returns each application with applicantName/applicantEmail and files: [{id, file_path, original_name, url, created_at}]
 */
const listApplicationsForJob = (req, res) => {
  const jobId = req.params.jobId || req.params.id;
  const status = req.query.status;

  if (!jobId) return res.status(400).json({ message: "Missing job id" });

  const sql = `
    SELECT a.id, a.job_id, a.user_id, a.applicant_name, a.applicant_email, a.message, a.status, a.created_at,
           u.name AS user_name, u.email AS user_email
    FROM applications a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.job_id = ?
    ${status ? " AND a.status = ?" : ""}
    ORDER BY a.created_at DESC
  `;
  const params = status ? [jobId, status] : [jobId];

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Error fetching applications for job:", err);
      return res.status(500).json({ error: err.message });
    }
    if (!rows || rows.length === 0) return res.json([]);

    const appIds = rows.map((r) => r.id);

    // Fetch files for these applications
    db.query(
      `SELECT id, application_id, file_path, original_name, created_at FROM application_files WHERE application_id IN (?)`,
      [appIds],
      (fErr, files) => {
        if (fErr) {
          console.error("Error fetching application files:", fErr);
          // return applications without files if files query fails
          const withoutFiles = (rows || []).map((r) => ({
            id: r.id,
            job_id: r.job_id,
            user_id: r.user_id,
            applicant_name: r.applicant_name,
            applicant_email: r.applicant_email,
            message: r.message,
            status: r.status,
            created_at: r.created_at,
            files: [],
          }));
          return res.json(withoutFiles);
        }

        // Map files to apps
        const filesByApp = {};
        (files || []).forEach((f) => {
          if (!filesByApp[f.application_id]) filesByApp[f.application_id] = [];
          let url = f.file_path;
          if (url && typeof url === "string" && url.startsWith("/")) {
            url = `${req.protocol}://${req.get("host")}${url}`;
          }
          filesByApp[f.application_id].push({
            id: f.id,
            application_id: f.application_id,
            file_path: f.file_path,
            original_name: f.original_name,
            url,
            created_at: f.created_at,
          });
        });

        const out = rows.map((r) => ({
          id: r.id,
          job_id: r.job_id,
          user_id: r.user_id,
          applicant_name: r.applicant_name || r.user_name || null,
          applicant_email: r.applicant_email || r.user_email || null,
          message: r.message,
          status: r.status,
          created_at: r.created_at,
          files: filesByApp[r.id] || [],
        }));

        return res.json(out);
      }
    );
  });
};

/**
 * Get single application detail (owner/admin)
 * - Returns application fields + files array (like listApplicationsForJob single item)
 */
const getApplicationById = (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ message: "Missing application id" });

  const sql = `
    SELECT a.*, u.name AS applicantName, u.email AS applicantEmail, j.id AS jobId, j.title AS jobTitle
    FROM applications a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN jobs j ON j.id = a.job_id
    WHERE a.id = ?
    LIMIT 1
  `;
  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error("Error fetching application by id:", err);
      return res.status(500).json({ error: err.message });
    }
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Application not found" });

    const app = rows[0];
    // Fetch files
    db.query(
      `SELECT id, application_id, file_path, original_name, created_at FROM application_files WHERE application_id = ?`,
      [id],
      (fErr, files) => {
        if (fErr) {
          console.error("Error fetching files for application:", fErr);
          return res.json({
            id: app.id,
            jobId: app.job_id,
            jobTitle: app.jobTitle,
            status: app.status,
            message: app.message,
            created_at: app.created_at,
            applicantName: app.applicantName,
            applicantEmail: app.applicantEmail,
            files: [],
          });
        }

        const filesOut = (files || []).map((f) => {
          let url = f.file_path;
          if (url && typeof url === "string" && url.startsWith("/")) {
            url = `${req.protocol}://${req.get("host")}${url}`;
          }
          return {
            id: f.id,
            application_id: f.application_id,
            file_path: f.file_path,
            original_name: f.original_name,
            url,
            created_at: f.created_at,
          };
        });

        return res.json({
          id: app.id,
          jobId: app.job_id,
          jobTitle: app.jobTitle,
          status: app.status,
          message: app.message,
          created_at: app.created_at,
          reviewed_by: app.reviewed_by || null,
          reviewed_at: app.reviewed_at || null,
          review_note: app.review_note || null,
          applicantName: app.applicantName,
          applicantEmail: app.applicantEmail,
          files: filesOut,
        });
      }
    );
  });
};

/**
 * Review an application (owner/admin)
 * - Always updates status.
 * - If optional columns reviewed_by, reviewed_at, review_note exist, update them too (safe-check).
 * - Notifies applicant by email if email available.
 */
const reviewApplication = (req, res) => {
  const id = req.params.id;
  const { action, review_note } = req.body;
  const adminId = req.user?.id;
  const allowed = { shortlist: "shortlisted", accept: "accepted", reject: "rejected" };
  if (!allowed[action]) return res.status(400).json({ message: "Invalid action" });

  const newStatus = allowed[action];

  // Check which optional columns exist in `applications` so we don't attempt to update missing columns
  const colsToCheck = ["reviewed_by", "reviewed_at", "review_note"];
  db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME IN (?)`,
    [colsToCheck],
    (cErr, colRows) => {
      if (cErr) {
        console.error("Error checking applications columns:", cErr);
        // fallback: only update status
        db.query("UPDATE applications SET status = ? WHERE id = ?", [newStatus, id], (uErr) => {
          if (uErr) {
            console.error("Failed to update application status (fallback):", uErr);
            return res.status(500).json({ error: uErr.message });
          }
          return notifyAfterReview(id, newStatus, review_note, res);
        });
        return;
      }

      const presentCols = (colRows || []).map((r) => r.COLUMN_NAME);

      // Build dynamic update
      const parts = ["status = ?"];
      const params = [newStatus];

      if (presentCols.includes("reviewed_by")) {
        parts.push("reviewed_by = ?");
        params.push(adminId || null);
      }
      if (presentCols.includes("reviewed_at")) {
        parts.push("reviewed_at = NOW()");
        // no param needed
      }
      if (presentCols.includes("review_note")) {
        parts.push("review_note = ?");
        params.push(review_note || null);
      }

      const sql = `UPDATE applications SET ${parts.join(", ")} WHERE id = ?`;
      params.push(id);

      db.query(sql, params, (uErr) => {
        if (uErr) {
          console.error("Failed to update application status:", uErr);
          return res.status(500).json({ error: uErr.message });
        }
        // Notify applicant & return
        return notifyAfterReview(id, newStatus, review_note, res);
      });
    }
  );
};

// Helper: fetch application (with job title + applicant email) and send notification to applicant
function notifyAfterReview(applicationId, newStatus, review_note, res) {
  const fetchSql = `
    SELECT a.id, a.status, a.message, u.email as applicantEmail, u.name as applicantName,
           j.title as jobTitle
    FROM applications a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN jobs j ON j.id = a.job_id
    WHERE a.id = ? LIMIT 1
  `;
  db.query(fetchSql, [applicationId], (err2, rows) => {
    if (err2) {
      console.error("fetch application after review error", err2);
      return res.json({ message: "Application reviewed" });
    }
    if (!rows || rows.length === 0) return res.json({ message: "Application reviewed" });

    const app = rows[0];
    const to = app.applicantEmail;
    const subject = `Update on your application for "${app.jobTitle || "the job"}"`;
    const html = `<p>Hi ${app.applicantName || "Applicant"},</p>
      <p>Your application for <b>${app.jobTitle || "the job"}</b> has been updated: <b>${newStatus}</b>.</p>
      ${review_note ? `<p>Note from reviewer: ${review_note}</p>` : ""}
      <p>Thanks,<br/>Company Review Team</p>`;
    sendMail(to, subject, html).catch((e) => console.error("Notify applicant error:", e));
    return res.json({ message: "Application reviewed and applicant notified", status: newStatus });
  });
}

module.exports = {
  applyToJob,
  listApplicationsForJob,
  getApplicationById,
  reviewApplication,
};
