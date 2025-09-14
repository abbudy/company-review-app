// src/components/JobList.jsx
import { useEffect, useState } from "react";
import api from "../lib/api";
import { Link, useParams } from "react-router-dom";

export default function JobList({ darkMode, jobs: initialJobs, companyId: propCompanyId, onApplied }) {
  const params = useParams();
  const companyId = propCompanyId || params.id;
  const [jobs, setJobs] = useState(Array.isArray(initialJobs) ? initialJobs : []);
  const [loading, setLoading] = useState(!Array.isArray(initialJobs));

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/companies/${companyId}/jobs`);
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("load jobs error", err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // If initialJobs provided, we don't refetch automatically.
    if (Array.isArray(initialJobs)) {
      setJobs(initialJobs);
      setLoading(false);
      return;
    }
    if (companyId) load();
    // eslint-disable-next-line
  }, [companyId, initialJobs]);

  if (loading) return <div className={darkMode ? "text-gray-200" : ""}>Loading jobs…</div>;
  if (!jobs || jobs.length === 0) return <div className={darkMode ? "text-gray-400" : "text-gray-600"}>No current openings.</div>;

  return (
    <div className="space-y-3">
      {jobs.map((j) => (
        <div key={j.id} className={`p-4 rounded border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{j.title}</h3>
              <div className="text-sm text-gray-400">{j.location || "Remote / Not specified"}</div>
            </div>
            <div className="text-right">
              <div className="text-sm">{j.salary || j.salary_range || "-"}</div>
              <Link to={`/companies/${companyId}/jobs/${j.id}/apply`} className="inline-block mt-2 text-blue-600 hover:underline">
                Apply
              </Link>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">{j.description ? String(j.description).slice(0, 260) : ""}</div>
        </div>
      ))}
    </div>
  );
}
