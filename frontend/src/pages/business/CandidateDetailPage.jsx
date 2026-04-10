import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getCandidateByIdApi, setCandidateInterestApi, getJobCandidatesApi } from "../../api/jobs";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import { toAssetUrl, getFileNameFromPath } from "../../utils/helper";

export default function CandidateDetailPage() {
  const { jobId, userId } = useParams();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interestLoading, setInterestLoading] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const [businessInterest, setBusinessInterest] = useState(false);

  useEffect(() => {
    async function loadCandidate() {
      try {
        setLoading(true);
        setError("");
        const [candidateData, candidatesData] = await Promise.all([
          getCandidateByIdApi(jobId, userId),
          getJobCandidatesApi(jobId),
        ]);
        setCandidate(candidateData);

        const candidates = candidatesData.results || [];
        const match = candidates.find(c => c.id === candidateData.user?.id);
        setBusinessInterest(match.invited);
      } catch (err) {
        setError(err.message || "Failed to load candidate details.");
      } finally {
        setLoading(false);
      }
    }

    if (jobId && userId) {
      loadCandidate();
    }
  }, [jobId, userId]);

  const handleExpressInterest = async (interest) => {
    try {
      setInterestLoading(true);
      setActionError("");
      setSuccess("");

      await setCandidateInterestApi(jobId, userId, { interested: interest });
      setBusinessInterest(interest);
      setSuccess("Business interest recorded successfully.");
    } catch (err) {
      setActionError(err.message || "Failed to express interest.");
    } finally {
      setInterestLoading(false);
    }
  };

  const user = candidate?.user || null;
  const job = candidate?.job || null;
  const qualification = user?.qualification || null;

  const fullName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || `Candidate #${user.id}`
    : "";

  const avatarUrl = useMemo(() => toAssetUrl(user?.avatar || ""), [user]);
  const resumeUrl = useMemo(() => toAssetUrl(user?.resume || ""), [user]);
  const qualificationDocumentUrl = useMemo(
    () => toAssetUrl(qualification?.document || ""),
    [qualification]
  );

  const resumeFileName = getFileNameFromPath(user?.resume || "");
  const qualificationDocumentName = getFileNameFromPath(qualification?.document || "");

  const showPrivateContact =
    job?.status === "filled" || job?.status === "completed";

  const positionTypeName =
    job?.position_type?.name || `Position #${qualification?.position_type_id ?? "Unknown"}`;

  return (
    <PageShell
      title="Candidate Detail"
      subtitle="Review the candidate profile, qualification, and job context."
      actions={
        <Link
          to={`/business/jobs/${jobId}/candidates`}
          className="button button--secondary"
        >
          Back to Candidates
        </Link>
      }
    >
      {loading ? <LoadingSpinner text="Loading candidate..." /> : null}
      <ErrorAlert message={error} />

      {!loading && !error && !candidate ? (
        <EmptyState message="Candidate not found." />
      ) : null}

      {!loading && !error && candidate ? (
        <div className="grid grid--2">
          <div className="card stack" style={{ alignContent: 'start', gap: '1.5rem' }}>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${fullName} avatar`}
                  style={{
                    width: "110px",
                    height: "110px",
                    objectFit: "cover",
                    borderRadius: "16px",
                    border: "1px solid #d1d5db",
                  }}
                />
              ) : (
                <div
                  className="card card--muted"
                  style={{
                    width: "110px",
                    height: "110px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  No Avatar
                </div>
              )}

              <div className="stack" style={{ gap: "0.35rem" }}>
                <h2 className="section-title" style={{ margin: 0 }}>
                  {fullName}
                </h2>
                <p className="helper-text" style={{ margin: 0 }}>
                  {positionTypeName}
                </p>
              </div>
            </div>

            <div>
              <strong>Biography</strong>
              <p>{user?.biography || "No biography provided."}</p>
            </div>
            
            <div className="stack">
              <strong>Contact Information</strong>
              {showPrivateContact ? (
                <>
                  <div>
                    <strong>Email</strong>
                    <p>{user?.email || "Not available"}</p>
                  </div>

                  <div>
                    <strong>Phone Number</strong>
                    <p>{user?.phone_number || "Not available"}</p>
                  </div>
                </>
              ) : (
                <div className="card card--muted">
                  Email and phone number are only shown when this candidate has filled
                  the job.
                </div>
              )}
            </div>

            <div className="stack">
              <strong>Resume</strong>
              {resumeUrl ? (
                <div className="card card--muted">
                  <div className="row row--between">
                    <span>{resumeFileName || "Resume"}</span>
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="button button--secondary button--sm"
                    >
                      View
                    </a>
                  </div>
                </div>
              ) : (
                <div className="card card--muted">
                  No resume uploaded yet.
                </div>
              )}
            </div>
          </div>

          <div className="stack">
            <div className="card stack">
              <div className="row row--between">
                <h2 className="section-title" style={{ margin: 0 }}>
                  Qualification
                </h2>
              </div>

              <div>
                <strong>Position Type</strong>
                <p>{positionTypeName}</p>
              </div>

              <div>
                <strong>Qualification Note</strong>
                <p>{qualification?.note || "No qualification note provided."}</p>
              </div>

              <div className="stack">
                <strong>Qualification Document</strong>
                {qualificationDocumentUrl ? (
                  <div className="card card--muted">
                    <div className="row row--between">
                      <span>{qualificationDocumentName || "Document"}</span>
                      <a
                        href={qualificationDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="button button--secondary button--sm"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="card card--muted">
                    No qualification document uploaded.
                  </div>
                )}
              </div>

              <div>
                <strong>Last Updated</strong>
                <p>
                  {qualification?.updatedAt
                    ? new Date(qualification.updatedAt).toLocaleString()
                    : "Unknown"}
                </p>
              </div>
            </div>

            <div className="card stack">
              <div className="row row--between">
                <h2 className="section-title" style={{ margin: 0 }}>
                  Job Details
                </h2>
                <StatusBadge status={job?.status} />
              </div>

              <div>
                <strong>Name</strong>
                <p>{job?.position_type?.name || "Unknown"}</p>
              </div>

              <div>
                <strong>Description</strong>
                <p>{job?.position_type?.description || "Unknown"}</p>
              </div>

              <div>
                <strong>Work Window</strong>
                <p>
                  {job?.start_time
                    ? `Start: ${new Date(job.start_time).toLocaleString()}`
                    : "Unknown"}
                </p>
                <p>
                  {job?.end_time
                    ? `End: ${new Date(job.end_time).toLocaleString()}`
                    : "Unknown"}
                </p>
              </div>

              <ErrorAlert message={actionError} />
              {success ? <div className="card card--muted">{success}</div> : null}

              <div className="row">
                {!businessInterest ? (
                  <button
                    className="button"
                    type="button"
                    disabled={interestLoading}
                    onClick={() => handleExpressInterest(true)}
                  >
                    {interestLoading ? "Saving..." : "Express Interest"}
                  </button>
                  ) : (
                    <button
                      className="button button--danger"
                      type="button"
                      disabled={interestLoading}
                      onClick={() => handleExpressInterest(false)}
                    >
                      {interestLoading ? "Saving..." : "Withdraw Interest"}
                    </button>
                  )
                }
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
