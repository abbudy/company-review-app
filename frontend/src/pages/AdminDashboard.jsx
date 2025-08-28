// src/pages/AdminDashboard.jsx (with dark/light mode support)
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function Admin({ darkMode = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("users"); // 'users' | 'companies' | 'reviews'

  // Data states
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [hasApproved, setHasApproved] = useState(false);

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
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
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

    
