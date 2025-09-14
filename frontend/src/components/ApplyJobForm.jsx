// src/components/ApplyJobForm.jsx
import { useState, useEffect } from "react";
import api from "../lib/api";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ApplyJobForm({ darkMode }) {
  const { id: companyId, jobId } = useParams(); // route: /companies/:id/jobs/:jobId/apply
  const [job, setJob] = useState(null);
  const [cover, setCover] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/api/jobs/${jobId}`);
        setJob(data);
      } catch (err) {
        console.error("Failed to load job", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to apply");
      navigate("/login");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("cover_letter", cover || "");
      // IMPORTANT: use field name 'resume' to match backend multer config
      if (resumeFile) fd.append("resume", resumeFile);

      const { data } = await api.post(`/api/jobs/${jobId}/apply`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Application submitted");
      // redirect back to company jobs
      navigate(`/companies/${companyId}`);
    } catch (err) {
      console.error("Apply error", err);
      alert(err?.response?.data?.message || "Failed to apply");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div>Loading job…</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div className={`max-w-2xl mx-auto p-4 rounded ${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"}`}>
      <h2 className="text-xl font-semibold">{job.title}</h2>
      <div className="text-sm text-gray-500 mb-4">{job.companyName} • {job.location || "Remote"}</div>
      <div className="prose mb-4">{job.description}</div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Cover letter</label>
          <textarea className="w-full border p-2 rounded" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Write a short cover note" />
        </div>
        <div>
          <label className="block text-sm">Resume (PDF / DOC)</label>
          <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setResumeFile(e.target.files?.[0])} />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded">
            {submitting ? "Submitting…" : "Submit Application"}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
