// src/pages/AdminDashboard.jsx (with dark/light mode support)
// UPDATED: added Create Job per company and improved Applications handling
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function Admin({ darkMode = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("users"); // 'users' | 'companies' | 'reviews' | 'claims' | 'applications'

  // Data states
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [hasApproved, setHasApproved] = useState(false);

  // Claims state (added)
  const [claims, setClaims] = useState([]);
  const [claimFilter, setClaimFilter] = useState("pending"); // pending | approved | rejected

  async function fetchClaims() {
    try {
      const { data } = await api.get(`/api/admin/company-claims?status=${claimFilter}`);
      setClaims(Array.isArray(data) ? data : data.claims || []);
    } catch (err) {
      console.error("Failed to load claims:", err);
      alert("Failed to load claims");
    }
  }

  // Extra for Companies create form
  const [types, setTypes] = useState([]);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    address: "",
    typeId: "",
    image: "", // URL or uploaded path
  });
  const [uploading, setUploading] = useState(false);

  // Editing states (existing)
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [companyForm, setCompanyForm] = useState({ name: "", address: "" });

  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });

  // --- New: Applications states & helpers ---
  const [appsCompanies, setAppsCompanies] = useState([]); // companies for the selector
  const [appsJobs, setAppsJobs] = useState([]); // jobs for selected company
  const [selectedAppCompanyId, setSelectedAppCompanyId] = useState("");
  const [selectedAppJobId, setSelectedAppJobId] = useState("");
  const [appsList, setAppsList] = useState([]); // fetched applications
  const [loadingApps, setLoadingApps] = useState(false);
  const [appsNoteMap, setAppsNoteMap] = useState({}); // per-application reviewer note

  // --- New: Create Job states ---
  const [showCreateJobForCompany, setShowCreateJobForCompany] = useState(null); // company id being created for
  const [createJobForm, setCreateJobForm] = useState({
    title: "",
    description: "",
    location: "",
    salary: "",
  });
  const [creatingJob, setCreatingJob] = useState(false);

  // --- Dark/light mode classes ---
  const wrapperBg = darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900";
  const sectionBg = darkMode ? "bg-gray-800" : "bg-white";
  const sectionBorder = darkMode ? "border-gray-700" : "border-gray-200";
  const tableHeaderText = darkMode ? " text-left text-gray-300 border-gray-600" : " text-left text-gray-600 border-gray-200";
  const inputFieldClass = darkMode
    ? "border rounded px-3 py-2 bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400"
    : "border rounded px-3 py-2 bg-white text-gray-900";
  const buttonPrimary = darkMode
    ? "px-3 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
    : "px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700";
  const buttonSecondary = darkMode
    ? "px-3 py-2 bg-gray-700 text-gray-100 rounded hover:bg-gray-600"
    : "px-3 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300";
  const badgeApproved = darkMode
    ? "inline-flex items-center px-2 py-0.5 rounded bg-emerald-700 text-white"
    : "inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700";
  const badgeUnapproved = darkMode
    ? "inline-flex items-center px-2 py-0.5 rounded bg-amber-700 text-white"
    : "inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-700";

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.roleId !== 1) {
      navigate("/");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.roleId === 1) {
      fetchSection(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user]);

  // Re-fetch claims when filter changes and claims tab is active
  useEffect(() => {
    if (tab === "claims") {
      fetchClaims();
    }
    if (tab === "applications") {
      fetchCompaniesForApps();
      // reset selections
      setSelectedAppCompanyId("");
      setSelectedAppJobId("");
      setAppsJobs([]);
      setAppsList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimFilter, tab]);

  async function fetchSection(section) {
    try {
      if (section === "users") {
        const { data } = await api.get("/api/admin/users");
        setUsers(data.users || []);
      } else if (section === "companies") {
        const { data } = await api.get("/api/admin/companies");
        setCompanies(data.companies || []);
        try {
          const t = await api.get("/api/types");
          setTypes(Array.isArray(t.data) ? t.data : t.data?.types || []);
        } catch (err) {
          console.warn("Failed to load types list (optional):", err);
        }
      } else if (section === "reviews") {
        const { data } = await api.get("/api/admin/reviews");
        setReviews(data.reviews || []);
        setHasApproved(!!data.hasApproved);
      } else if (section === "claims") {
        // load claims when admin clicks Claims tab
        await fetchClaims();
      } else if (section === "applications") {
        // handled in useEffect when tab changes
        await fetchCompaniesForApps();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load admin data");
    }
  }

  // --- Users: change role (promote/demote)
  async function setUserRole(id, roleId) {
    try {
      await api.put(`/api/users/${id}/role`, { roleId });
      fetchSection("users");
    } catch (e) {
      console.error(e);
      alert("Failed to update role");
    }
  }

  // --- Companies: inline edit + save (existing)
  function startEditCompany(c) {
    setEditingCompanyId(c.id);
    setCompanyForm({ name: c.name || "", address: c.address || "" });
  }
  function cancelEditCompany() {
    setEditingCompanyId(null);
    setCompanyForm({ name: "", address: "" });
  }
  async function saveCompany(id) {
    try {
      await api.put(`/api/companies/${id}`, {
        name: companyForm.name,
        address: companyForm.address,
      });
      setEditingCompanyId(null);
      fetchSection("companies");
    } catch (e) {
      console.error(e);
      alert("Failed to update company");
    }
  }
  async function deleteCompany(id) {
    if (!confirm("Delete this company?")) return;
    try {
      await api.delete(`/api/companies/${id}`);
      fetchSection("companies");
    } catch (e) {
      console.error(e);
      alert("Failed to delete company");
    }
  }

  // --- Companies: create (NEW)
  async function handleCreateCompany(e) {
    e.preventDefault();
    if (!newCompany.name.trim() || !newCompany.address.trim() || !newCompany.typeId) {
      alert("Please fill Name, Address, and Type.");
      return;
    }
    if (!newCompany.image || !newCompany.image.trim()) {
      alert("Please provide an image URL or upload a file.");
      return;
    }
    try {
      await api.post("/api/companies", {
        name: newCompany.name.trim(),
        address: newCompany.address.trim(),
        typeId: Number(newCompany.typeId) || null,
        image: newCompany.image.trim(),
      });
      setNewCompany({ name: "", address: "", typeId: "", image: "" });
      setShowCreateCompany(false);
      fetchSection("companies");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.error || "Error creating company");
    }
  }

  async function handleUploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const { data } = await api.post("/api/companies/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.url) {
        setNewCompany((prev) => ({ ...prev, image: data.url }));
      } else {
        alert("Upload failed: no URL returned");
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert(err?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // --- Reviews: inline edit, delete, approve (existing)
  function startEditReview(r) {
    setEditingReviewId(r.id);
    setReviewForm({ rating: r.rating, comment: r.comment || "" });
  }
  function cancelEditReview() {
    setEditingReviewId(null);
    setReviewForm({ rating: 5, comment: "" });
  }
  async function saveReview(id) {
    try {
      await api.put(`/api/admin/reviews/${id}`, {
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      setEditingReviewId(null);
      fetchSection("reviews");
    } catch (e) {
      console.error(e);
      alert("Failed to update review");
    }
  }
  async function deleteReview(id) {
    if (!confirm("Delete this review?")) return;
    try {
      await api.delete(`/api/admin/reviews/${id}`);
      fetchSection("reviews");
    } catch (e) {
      console.error(e);
      alert("Failed to delete review");
    }
  }
  async function approveReview(id, approved) {
    try {
      await api.put(`/api/admin/reviews/${id}/approve`, { approved });
      fetchSection("reviews");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to update approval");
    }
  }

  // --- Claims: review (approve/reject)
  async function reviewClaim(id, action) {
    if (!confirm(`Are you sure to ${action} this claim?`)) return;
    try {
      await api.put(`/api/admin/company-claims/${id}/review`, { action });
      fetchClaims();
    } catch (err) {
      console.error(err);
      alert("Failed to review claim");
    }
  }

  // --- Applications helpers ---

  async function fetchCompaniesForApps() {
    try {
      const { data } = await api.get("/api/admin/companies");
      const list = Array.isArray(data) ? data : data.companies || [];
      setAppsCompanies(list);
      // also set companies if empty
      setCompanies((prev) => (prev.length ? prev : list));
    } catch (err) {
      console.error("Failed to load companies for applications", err);
    }
  }

  async function fetchJobsForCompany(companyId) {
    if (!companyId) {
      setAppsJobs([]);
      return;
    }
    try {
      const { data } = await api.get(`/api/companies/${companyId}/jobs`);
      setAppsJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load jobs for company", err);
      setAppsJobs([]);
    }
  }

  async function loadApplicationsForJob(jobId) {
    if (!jobId) {
      setAppsList([]);
      return;
    }
    try {
      setLoadingApps(true);
      const { data } = await api.get(`/api/jobs/${jobId}/applications`);
      setAppsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load applications", err);
      setAppsList([]);
    } finally {
      setLoadingApps(false);
    }
  }

  async function reviewApplicationAction(appId, action) {
    const note = appsNoteMap[appId] || "";
    try {
      await api.put(`/api/applications/${appId}/review`, { action, review_note: note });
      alert("Updated");
      if (selectedAppJobId) await loadApplicationsForJob(selectedAppJobId);
    } catch (err) {
      console.error("Review error", err);
      alert(err?.response?.data?.message || "Failed to update");
    }
  }

  // --- Create Job (admin) ---
  function openCreateJobForCompany(companyId) {
    setShowCreateJobForCompany(companyId);
    setCreateJobForm({ title: "", description: "", location: "", salary: "" });
  }

  function cancelCreateJob() {
    setShowCreateJobForCompany(null);
    setCreateJobForm({ title: "", description: "", location: "", salary: "" });
  }

  async function submitCreateJob(companyId) {
    if (!createJobForm.title.trim()) {
      alert("Title is required");
      return;
    }
    setCreatingJob(true);
    try {
      await api.post(`/api/companies/${companyId}/jobs`, {
        title: createJobForm.title,
        description: createJobForm.description,
        location: createJobForm.location,
        salary: createJobForm.salary,
      });
      alert("Job created");
      // refresh jobs for currently selected company if matches
      if (String(selectedAppCompanyId) === String(companyId)) {
        await fetchJobsForCompany(companyId);
      }
      // collapse form
      cancelCreateJob();
    } catch (err) {
      console.error("Create job error", err);
      alert(err?.response?.data?.message || "Failed to create job");
    } finally {
      setCreatingJob(false);
    }
  }

  // hook: when selected company changes in Applications tab
  useEffect(() => {
    if (selectedAppCompanyId) {
      fetchJobsForCompany(selectedAppCompanyId);
      setSelectedAppJobId("");
      setAppsList([]);
    } else {
      setAppsJobs([]);
      setSelectedAppJobId("");
      setAppsList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppCompanyId]);

  // hook: when selected job changes in Applications tab
  useEffect(() => {
    if (selectedAppJobId) {
      loadApplicationsForJob(selectedAppJobId);
    } else {
      setAppsList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppJobId]);

  return (
    <div className={`max-w-7xl mx-auto p-6 ${wrapperBg}`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          Signed in as <span className="font-medium">{user?.name}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "users", label: "Users", icon: "👤" },
          { key: "companies", label: "Companies", icon: "🏢" },
          { key: "reviews", label: "Reviews", icon: "⭐" },
          { key: "claims", label: "Claims", icon: "📝" },
          { key: "applications", label: "Applications", icon: "📄" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg border text-sm transition
              ${
                tab === t.key
                  ? darkMode
                    ? "bg-gray-700 text-white border-gray-600"
                    : "bg-gray-900 text-white border-gray-900"
                  : darkMode
                  ? "bg-gray-800 text-gray-100 hover:bg-gray-700"
                  : "bg-white hover:bg-gray-50"
              }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`rounded-xl border p-4 ${sectionBg} ${sectionBorder}`}>
        {/* USERS */}
        {tab === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`${tableHeaderText}`}>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-none">
                    <td className="py-2 pr-3">{u.id}</td>
                    <td className="py-2 pr-3">{u.name}</td>
                    <td className="py-2 pr-3">{u.email}</td>
                    <td className="py-2 pr-3">{u.roleId === 1 ? "Admin" : "User"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        {u.roleId !== 1 && (
                          <button
                            onClick={() => setUserRole(u.id, 1)}
                            className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Make Admin
                          </button>
                        )}
                        {u.roleId !== 2 && (
                          <button
                            onClick={() => setUserRole(u.id, 2)}
                            className="px-2 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-800"
                          >
                            Make User
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* COMPANIES */}
        {tab === "companies" && (
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Manage Companies</h2>
              <button
                onClick={() => setShowCreateCompany((v) => !v)}
                className={buttonPrimary}
              >
                {showCreateCompany ? "Close" : "+ Add New Company"}
              </button>
            </div>

            {showCreateCompany && (
              <div className={`border rounded-lg p-4 mb-6 ${darkMode ? "bg-gray-800" : "bg-gray-50"}`}>
                <form onSubmit={handleCreateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Company Name</label>
                    <input
                      type="text"
                      className={inputFieldClass}
                      value={newCompany.name}
                      onChange={(e) => setNewCompany((s) => ({ ...s, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input
                      type="text"
                      className={inputFieldClass}
                      value={newCompany.address}
                      onChange={(e) => setNewCompany((s) => ({ ...s, address: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      className={inputFieldClass}
                      value={newCompany.typeId}
                      onChange={(e) => setNewCompany((s) => ({ ...s, typeId: e.target.value }))}
                      required
                    >
                      <option value="">Select type…</option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Image URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      className={inputFieldClass}
                      value={newCompany.image}
                      onChange={(e) => setNewCompany((s) => ({ ...s, image: e.target.value }))}
                    />
                    <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      You can paste a direct image URL, or upload a file below.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Or Upload Image</label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleUploadFile}
                      className="block w-full text-sm"
                    />
                    {uploading && <p className="text-sm mt-1 text-gray-400">Uploading…</p>}
                  </div>

                  {newCompany.image && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Preview</label>
                      <img
                        src={newCompany.image}
                        alt="Preview"
                        className="h-16 w-16 rounded object-cover border"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/64?text=%20";
                        }}
                      />
                    </div>
                  )}

                  <div className="md:col-span-2 flex gap-3">
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateCompany(false);
                        setNewCompany({ name: "", address: "", typeId: "", image: "" });
                      }}
                      className={buttonSecondary}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Companies Table */}
            <table className="w-full text-sm">
              <thead>
                <tr className={`${tableHeaderText}`}>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Avg Rating</th>
                  <th className="py-2 pr-3">Reviews</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b last:border-none">
                    <td className="py-2 pr-3">{c.id}</td>
                    <td className="py-2 pr-3">
                      {editingCompanyId === c.id ? (
                        <input
                          className={inputFieldClass}
                          value={companyForm.name}
                          onChange={(e) =>
                            setCompanyForm((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <img
                            src={c.image || "https://via.placeholder.com/32?text=%20"}
                            alt=""
                            className="h-8 w-8 rounded object-cover border"
                            onError={(e) => {
                              e.currentTarget.src = "https://via.placeholder.com/32?text=%20";
                            }}
                          />
                          <span>{c.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {editingCompanyId === c.id ? (
                        <input
                          className={inputFieldClass}
                          value={companyForm.address}
                          onChange={(e) =>
                            setCompanyForm((f) => ({ ...f, address: e.target.value }))
                          }
                        />
                      ) : (
                        c.address || "-"
                      )}
                    </td>
                    <td className="py-2 pr-3">{c.avgRating}</td>
                    <td className="py-2 pr-3">{c.reviewCount}</td>
                    <td className="py-2 pr-3">
                      {editingCompanyId === c.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveCompany(c.id)}
                            className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditCompany}
                            className="px-2 py-1 text-xs rounded bg-gray-300 hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditCompany(c)}
                            className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCompany(c.id)}
                            className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                          >
                            Delete
                          </button>

                          {/* Create Job button - admin only (we are on admin page) */}
                          <button
                            onClick={() => openCreateJobForCompany(c.id)}
                            className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            Create Job
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Inline Create Job form for a company (rendered as a table row when active) */}
                {showCreateJobForCompany && (
                  <tr>
                    <td colSpan={6} className="py-3">
                      <div className="p-4 border rounded bg-gray-50">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input
                              className={inputFieldClass}
                              placeholder="Job title"
                              value={createJobForm.title}
                              onChange={(e) => setCreateJobForm((s) => ({ ...s, title: e.target.value }))}
                            />
                            <input
                              className={inputFieldClass}
                              placeholder="Location"
                              value={createJobForm.location}
                              onChange={(e) => setCreateJobForm((s) => ({ ...s, location: e.target.value }))}
                            />
                            <input
                              className={inputFieldClass}
                              placeholder="Salary / price"
                              value={createJobForm.salary}
                              onChange={(e) => setCreateJobForm((s) => ({ ...s, salary: e.target.value }))}
                            />
                            <input
                              className={inputFieldClass}
                              placeholder="Short description"
                              value={createJobForm.description}
                              onChange={(e) => setCreateJobForm((s) => ({ ...s, description: e.target.value }))}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => submitCreateJob(showCreateJobForCompany)}
                              disabled={creatingJob}
                              className="px-3 py-1 rounded bg-emerald-600 text-white"
                            >
                              {creatingJob ? "Creating…" : "Create Job"}
                            </button>
                            <button
                              onClick={cancelCreateJob}
                              className="px-3 py-1 rounded bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {companies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      No companies found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* APPLICATIONS */}
        {tab === "applications" && (
          <div>
            <div className="mb-4 flex flex-col md:flex-row md:items-end md:gap-4 gap-2">
              <div className="flex-1">
                <label className="block text-sm mb-1">Select Company</label>
                <select
                  className={inputFieldClass}
                  value={selectedAppCompanyId}
                  onChange={(e) => setSelectedAppCompanyId(e.target.value)}
                >
                  <option value="">-- Choose company --</option>
                  {appsCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm mb-1">Select Job</label>
                <select
                  className={inputFieldClass}
                  value={selectedAppJobId}
                  onChange={(e) => setSelectedAppJobId(e.target.value)}
                  disabled={!appsJobs.length}
                >
                  <option value="">-- Choose job --</option>
                  {appsJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={() => {
                    if (selectedAppJobId) loadApplicationsForJob(selectedAppJobId);
                    else if (selectedAppCompanyId) fetchJobsForCompany(selectedAppCompanyId);
                    else fetchCompaniesForApps();
                  }}
                  className={buttonPrimary + " mt-6 md:mt-0"}
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Applications list */}
            <div className="space-y-4">
              {loadingApps && <div>Loading applications…</div>}
              {!loadingApps && !appsList.length && (
                <div className="text-gray-500">No applications found.</div>
              )}
              {!loadingApps &&
                appsList.map((a) => (
                  <div
                    key={a.id}
                    className={`p-4 rounded border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">
                          {a.applicantName || a.name || "Applicant"}{" "}
                          {a.applicantEmail ? `(${a.applicantEmail})` : ""}
                        </div>
                        <div className="text-sm text-gray-500">
                          Status: <span className="font-medium">{a.status}</span>
                        </div>
                        <div className="mt-2 whitespace-pre-wrap">{a.message || a.cover_letter || ""}</div>

                        {/* Files (if backend provides files array) */}
                        {a.files && a.files.length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm font-medium">Resume / files:</div>
                            <ul className="list-disc ml-5">
                              {a.files.map((f, i) => (
                                <li key={i}>
                                  <a
                                    href={f.url || f.file_path}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {f.original_name || f.file_path || "file"}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="mb-2 text-sm">
                          Applied: {a.created_at ? new Date(a.created_at).toLocaleString() : "-"}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => reviewApplicationAction(a.id, "shortlist")}
                            className="px-3 py-1 rounded bg-yellow-500 text-white"
                          >
                            Shortlist
                          </button>
                          <button
                            onClick={() => reviewApplicationAction(a.id, "accept")}
                            className="px-3 py-1 rounded bg-green-600 text-white"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => reviewApplicationAction(a.id, "reject")}
                            className="px-3 py-1 rounded bg-red-600 text-white"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm">Reviewer note (optional)</label>
                      <textarea
                        value={appsNoteMap[a.id] || ""}
                        onChange={(e) =>
                          setAppsNoteMap((s) => ({ ...s, [a.id]: e.target.value }))
                        }
                        className="w-full border p-2 rounded"
                        placeholder="Write feedback or note to applicant"
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* CLAIMS */}
        {tab === "claims" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Company Claims</h2>
              <div>
                <select value={claimFilter} onChange={(e) => setClaimFilter(e.target.value)} className={inputFieldClass}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={fetchClaims} className={buttonPrimary + " ml-2"}>Refresh</button>
              </div>
            </div>

            <div className="space-y-3">
              {claims.map((c) => (
                <div key={c.id} className={`p-3 rounded ${darkMode ? "bg-gray-700" : "bg-white"} border`}>
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{c.companyName || `Company ${c.companyId}`}</div>
                      <div className="text-sm text-gray-400">By: {c.userName || c.userEmail} — {c.submitted_at ? new Date(c.submitted_at).toLocaleString() : "-"}</div>
                      <div className="text-sm mt-2">{c.evidence || "-"}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {c.status === "pending" ? (
                        <>
                          <button onClick={() => reviewClaim(c.id, "approve")} className="px-2 py-1 bg-emerald-600 text-white rounded">Approve</button>
                          <button onClick={() => reviewClaim(c.id, "reject")} className="px-2 py-1 bg-amber-600 text-white rounded">Reject</button>
                        </>
                      ) : (
                        <div className="text-sm">Status: {c.status}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {claims.length === 0 && <div className="py-4 text-gray-500">No claims found.</div>}
            </div>
          </div>
        )}

        {/* REVIEWS */}
        {tab === "reviews" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`${tableHeaderText}`}>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Rating</th>
                  <th className="py-2 pr-3">Comment</th>
                  {hasApproved && <th className="py-2 pr-3">Approved</th>}
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b last:border-none">
                    <td className="py-2 pr-3">{r.id}</td>
                    <td className="py-2 pr-3">{r.userName}</td>
                    <td className="py-2 pr-3">{r.companyName}</td>
                    <td className="py-2 pr-3">
                      {editingReviewId === r.id ? (
                        <select
                          className={inputFieldClass}
                          value={reviewForm.rating}
                          onChange={(e) =>
                            setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))
                          }
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      ) : (
                        r.rating
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {editingReviewId === r.id ? (
                        <input
                          className={inputFieldClass}
                          value={reviewForm.comment}
                          onChange={(e) =>
                            setReviewForm((f) => ({ ...f, comment: e.target.value }))
                          }
                        />
                      ) : (
                        r.comment || "-"
                      )}
                    </td>
                    {hasApproved && (
                      <td className="py-2 pr-3">
                        {r.approved ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                            No
                          </span>
                        )}
                      </td>
                    )}
                    <td className="py-2 pr-3">
                      {editingReviewId === r.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveReview(r.id)}
                            className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditReview}
                            className="px-2 py-1 text-xs rounded bg-gray-300 hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditReview(r)}
                            className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteReview(r.id)}
                            className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                          {hasApproved && (
                            <>
                              {!r.approved ? (
                                <button
                                  onClick={() => approveReview(r.id, 1)}
                                  className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  Approve
                                </button>
                              ) : (
                                <button
                                  onClick={() => approveReview(r.id, 0)}
                                  className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700"
                                >
                                  Unapprove
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr>
                    <td colSpan={hasApproved ? 7 : 6} className="py-6 text-center text-gray-500">
                      No reviews found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
