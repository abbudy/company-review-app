/* eslint-disable no-unused-vars */
// src/pages/CompanyPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import ReviewsList from "../components/ReviewsList";
import ReviewForm from "../components/ReviewForm";
import JobList from "../components/JobList";

import ClaimCompanyModal from "../components/ClaimCompanyModal";
import { useAuth } from "../context/AuthContext";

export default function CompanyPage({ darkMode }) {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [stats, setStats] = useState({ avgRating: 0, reviewCount: 0 });
  const [jobs, setJobs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const [showClaimModal, setShowClaimModal] = useState(false);

  async function loadCompany() {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/companies/${id}/full`);
      setCompany(data.company);
      setStats(data.stats || {});
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (err) {
      console.error("Failed to load company:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompany();
  }, [id]);

  if (loading) return <div className="p-6">Loading company...</div>;
  if (!company) return <div className="p-6">Company not found</div>;

  return (
    <div
      className={`max-w-5xl mx-auto p-6 ${
        darkMode ? "text-gray-100" : "text-gray-900"
      }`}
    >
      <div
        className={`rounded-lg overflow-hidden ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <div className="h-48 w-full relative">
          <img
            src={
              company.image ||
              "https://via.placeholder.com/900x200?text=Company"
            }
            alt={company.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4">
          <h1 className="text-2xl font-bold">
            {company.name}{" "}
            {company.verified ? (
              <span className="ml-2 text-xs px-2 py-1 bg-emerald-600 rounded text-white">
                Verified
              </span>
            ) : null}
          </h1>
          <div className="text-sm text-gray-400">{company.address}</div>
          {company.website && (
            <div className="mt-2">
              <a href={company.website} className="text-blue-500">
                {company.website}
              </a>
            </div>
          )}
          {company.description && <p className="mt-3">{company.description}</p>}

          <div className="mt-4 flex items-center gap-4">
            <div>
              ⭐ {Number(stats.avgRating || 0).toFixed(1)} (
              {stats.reviewCount || 0} reviews)
            </div>
          </div>

          {/* Claim button logic */}
          {!company.verified && (
            <div className="mt-3">
              {user ? (
                user.companyId !== company.id ? (
                  <button
                    onClick={() => setShowClaimModal(true)}
                    className="px-3 py-1 rounded bg-yellow-500 text-white"
                  >
                    Claim this company
                  </button>
                ) : (
                  <span className="text-sm text-gray-400">
                    You are listed as company staff
                  </span>
                )
              ) : (
                <div className="text-sm text-gray-400">
                  Log in to claim this company
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Jobs */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-3">Jobs</h2>
          {user && user.roleId === 1 && (
            <a
              href={`/companies/${company.id}/jobs/create`}
              className={`inline-block px-3 py-1 rounded ${
                darkMode
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Create Job
            </a>
          )}
        </div>

        <JobList
          jobs={jobs}
          companyId={company.id}
          onApplied={() => loadCompany()}
          darkMode={darkMode}
        />

        {/* For admins: quick links to applications for each job */}
        {user && user.roleId === 1 && jobs && jobs.length > 0 && (
          <div className="mt-3 space-y-2">
            {jobs.map((j) => (
              <div key={j.id} className="text-sm">
                <a
                  href={`/companies/${company.id}/jobs/${j.id}/applications`}
                  className={`hover:underline ${
                    darkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviews & add form */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-3">Reviews</h2>
        <ReviewForm
          companyId={company.id}
          darkMode={darkMode}
          onReviewAdded={() => loadCompany()}
        />
        <div className="mt-4">
          <ReviewsList
            companyId={company.id}
            onReviewChanged={() => loadCompany()}
            darkMode={darkMode}
          />
        </div>
      </section>

      {/* Claim modal */}
      {showClaimModal && (
        <ClaimCompanyModal
          companyId={company.id}
          onClose={() => setShowClaimModal(false)}
          onSubmitted={() => {
            loadCompany();
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
