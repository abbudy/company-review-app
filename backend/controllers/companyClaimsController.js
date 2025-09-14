// backend/controllers/companyClaimsController.js
const db = require("../config/db");
const path = require("path");
const nodemailer = require("nodemailer");

// --- Setup nodemailer transporter using env vars ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function sendNotificationEmail(to, subject, html) {
  if (!to) return Promise.resolve();
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

/**
 * Submit a new claim for a company
 * Accepts either JSON body or multipart/form-data with file field 'evidenceFile'
 * POST /api/companies/:id/claim
 */
const submitClaim = (req, res) => {
  const companyId = req.params.id || req.params.companyId;
  const userId = req.user?.id;
  let { contact_email, contact_phone, evidence } = req.body || {};

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!companyId) return res.status(400).json({ message: "Company id required" });

  // If file uploaded, build absolute URL and append/use it
  if (req.file) {
    const fileUrlPath = `/uploads/claims/${req.file.filename}`;
    const absoluteUrl = `${req.protocol}://${req.get("host")}${fileUrlPath}`;
    evidence = evidence ? `${evidence}\n\nFile: ${absoluteUrl}` : `File: ${absoluteUrl}`;
  }

  const sql = `INSERT INTO company_claims (companyId, userId, contact_email, contact_phone, evidence)
               VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [companyId, userId, contact_email || null, contact_phone || null, evidence || null], (err, result) => {
    if (err) {
      console.error("Insert claim error:", err);
      return res.status(500).json({ error: err.message });
    }
    return res.status(201).json({ message: "Claim submitted", id: result.insertId });
  });
};

/**
 * Get current user's claims
 * GET /api/users/claims
 */
const getMyClaims = (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const sql = `
    SELECT c.*, co.name AS companyName
    FROM company_claims c
    LEFT JOIN company co ON co.id = c.companyId
    WHERE c.userId = ? ORDER BY c.submitted_at DESC
  `;
  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

/**
 * Admin: list claims (optional ?status=pending|approved|rejected)
 * GET /api/admin/company-claims
 */
const listClaims = (req, res) => {
  const status = req.query.status;
  let sql = `
    SELECT c.*, u.name AS userName, u.email AS userEmail, co.name AS companyName
    FROM company_claims c
    LEFT JOIN users u ON u.id = c.userId
    LEFT JOIN company co ON co.id = c.companyId
  `;
  const params = [];
  if (status) {
    sql += " WHERE c.status = ?";
    params.push(status);
  }
  sql += " ORDER BY c.submitted_at DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

/**
 * Admin: review a claim (approve/reject)
 * PUT /api/admin/company-claims/:id/review
 * Body: { action: 'approve'|'reject', review_note }
 */
const reviewClaim = (req, res) => {
  const id = req.params.id;
  const { action, review_note } = req.body;
  const adminId = req.user?.id;

  if (!id) return res.status(400).json({ message: "Claim id required" });
  if (!["approve", "reject"].includes(action)) return res.status(400).json({ message: "Invalid action" });

  const newStatus = action === "approve" ? "approved" : "rejected";

  const updateSql = `
    UPDATE company_claims
    SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ?
    WHERE id = ?
  `;
  db.query(updateSql, [newStatus, adminId, review_note || null, id], (err) => {
    if (err) {
      console.error("Update claim status error:", err);
      return res.status(500).json({ error: err.message });
    }

    // fetch claim details to notify claimant (and optionally mark company verified)
    const fetchSql = `
      SELECT c.*, u.email AS userEmail, u.name AS userName, co.name AS companyName, co.id AS companyId
      FROM company_claims c
      LEFT JOIN users u ON u.id = c.userId
      LEFT JOIN company co ON co.id = c.companyId
      WHERE c.id = ? LIMIT 1
    `;
    db.query(fetchSql, [id], (err2, rows) => {
      if (err2) {
        console.error("Fetch claim for notification failed:", err2);
        return res.json({ message: "Claim reviewed" });
      }
      if (!rows || rows.length === 0) return res.json({ message: "Claim reviewed" });

      const claim = rows[0];
      const claimantEmail = claim.contact_email || claim.userEmail;
      const claimantName = claim.userName || "User";
      const companyName = claim.companyName || "the company";

      if (newStatus === "approved") {
        // optional: set company.verified = 1 if such column exists
        db.query("UPDATE company SET verified = 1 WHERE id = ?", [claim.companyId], (err3) => {
          if (err3) console.error("Failed to set company verified:", err3);
          const subj = `Your claim for "${companyName}" has been approved`;
          const html = `<p>Hi ${claimantName},</p>
            <p>Your claim for <b>${companyName}</b> has been <b>approved</b>.</p>
            ${review_note ? `<p>Note from admin: ${review_note}</p>` : ""}
            <p>Thanks,<br/>Company Review Team</p>`;
          sendNotificationEmail(claimantEmail, subj, html)
            .then(() => res.json({ message: "Claim reviewed and claimant notified" }))
            .catch((e) => {
              console.error("Approval email failed:", e);
              res.json({ message: "Claim reviewed (email failed)" });
            });
        });
      } else {
        // rejected
        const subj = `Your claim for "${companyName}" was rejected`;
        const html = `<p>Hi ${claimantName},</p>
          <p>Your claim for <b>${companyName}</b> has been <b>rejected</b>.</p>
          ${review_note ? `<p>Note from admin: ${review_note}</p>` : ""}
          <p>If you think this is a mistake, contact support.</p>
          <p>Thanks,<br/>Company Review Team</p>`;
        sendNotificationEmail(claimantEmail, subj, html)
          .then(() => res.json({ message: "Claim reviewed and claimant notified" }))
          .catch((e) => {
            console.error("Rejection email failed:", e);
            res.json({ message: "Claim reviewed (email failed)" });
          });
      }
    });
  });
};

module.exports = {
  submitClaim,
  getMyClaims,
  listClaims,
  reviewClaim,
};
