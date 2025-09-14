// src/components/JobCreate.jsx
import { useState } from "react";
import api from "../lib/api";
import { useNavigate, useParams } from "react-router-dom";

export default function JobCreate({ darkMode }) {
  const { id: companyId } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/api/companies/${companyId}/jobs`, { title, description, location, salary });
      alert("Job created");
      navigate(`/companies/${companyId}`);
    } catch (err) {
      console.error("Create job error", err);
      alert(err?.response?.data?.message || "Failed to create job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`max-w-3xl mx-auto p-4 rounded ${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"}`}>
      <h2 className="text-xl font-semibold mb-3">Create Job</h2>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm">Salary</label>
          <input value={salary} onChange={(e) => setSalary(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? "Creating…" : "Create Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
