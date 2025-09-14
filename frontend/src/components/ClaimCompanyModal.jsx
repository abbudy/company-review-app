// src/components/ClaimCompanyModal.jsx
import { useState } from "react";
import api from "../lib/api";

export default function ClaimCompanyModal({ companyId, onClose, onSubmitted, darkMode }) {
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [evidence, setEvidence] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!contactEmail && !contactPhone) return setErr("Please provide email or phone to contact you.");
    setLoading(true);
    try {
      // Use FormData so we can optionally upload a file (backend claim route accepts evidenceFile)
      const fd = new FormData();
      fd.append("contact_email", contactEmail);
      fd.append("contact_phone", contactPhone);
      fd.append("evidence", evidence);
      if (evidenceFile) fd.append("evidenceFile", evidenceFile);

      await api.post(`/api/companies/${companyId}/claim`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (onSubmitted) onSubmitted();
      onClose();
    } catch (error) {
      setErr(error?.response?.data?.message || "Failed to submit claim");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className={`relative w-full max-w-md p-6 rounded-lg ${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"}`}>
        <h3 className="text-lg font-semibold mb-3">Claim this company</h3>
        {err && <div className="text-red-500 mb-2">{err}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm">Contact Email</label>
            <input className="w-full border p-2 rounded" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div>
            <label className="block text-sm">Contact Phone</label>
            <input className="w-full border p-2 rounded" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 555 555 555" />
          </div>
          <div>
            <label className="block text-sm">Evidence (link or message)</label>
            <textarea className="w-full border p-2 rounded" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Proof that you represent this company (email, domain, docs...)" />
          </div>
          <div>
            <label className="block text-sm">Optional evidence file (PDF / image)</label>
            <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1 rounded border">Cancel</button>
            <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded" disabled={loading}>
              {loading ? "Submitting…" : "Submit Claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
