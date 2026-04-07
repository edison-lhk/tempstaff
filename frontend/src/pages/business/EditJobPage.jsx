import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getJobByIdApi } from "../../api/jobs";
import { updateBusinessJobApi } from "../../api/businesses";
import { getPositionTypesApi } from "../../api/positionTypes";

function toDateTimeLocal(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EditJobPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [positionTypes, setPositionTypes] = useState([]);

  const [form, setForm] = useState({
    positionTypeId: "",
    salary_min: "",
    salary_max: "",
    start_time: "",
    end_time: "",
    note: "",
  });

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [jobData, positionTypesData] = await Promise.all([
          getJobByIdApi(jobId),
          getPositionTypesApi(),
        ]);

        setJob(jobData);
        setPositionTypes(
          Array.isArray(positionTypesData)
            ? positionTypesData
            : positionTypesData.results || []
        );

        setForm({
          positionTypeId: String(jobData.position_type?.id ?? ""),
          salary_min: String(jobData.salary_min ?? ""),
          salary_max: String(jobData.salary_max ?? ""),
          start_time: toDateTimeLocal(jobData.start_time),
          end_time: toDateTimeLocal(jobData.end_time),
          note: jobData.note || "",
        });
      } catch (err) {
        setError(err.message || "Failed to load job for editing.");
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      loadData();
    }
  }, [jobId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (job?.status !== "open") {
      setError("Only open jobs can be edited.");
      return;
    }

    const salaryMin = Number(form.salary_min);
    const salaryMax = Number(form.salary_max);

    if (!form.positionTypeId) {
      setError("Please select a position type.");
      return;
    }

    if (Number.isNaN(salaryMin) || Number.isNaN(salaryMax)) {
      setError("Salary values must be valid numbers.");
      return;
    }

    if (salaryMin > salaryMax) {
      setError("Minimum salary cannot be greater than maximum salary.");
      return;
    }

    if (!form.start_time || !form.end_time) {
      setError("Start time and end time are required.");
      return;
    }

    if (new Date(form.start_time) >= new Date(form.end_time)) {
      setError("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        positionTypeId: Number(form.positionTypeId),
        salary_min: salaryMin,
        salary_max: salaryMax,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        note: form.note.trim(),
      };

      await updateBusinessJobApi(jobId, payload);

      setSuccess("Job updated successfully.");

      setTimeout(() => {
        navigate(`/business/jobs/${jobId}`);
      }, 700);
    } catch (err) {
      setError(err.message || "Failed to update job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Edit Job"
      subtitle="Update an open job posting."
    >
      {loading ? <div className="card">Loading job...</div> : null}

      {!loading && job?.status !== "open" ? (
        <div className="card card--muted">
          This job can no longer be edited because it is not open.
        </div>
      ) : null}

      {!loading ? (
        <div className="card stack">
          <form className="stack" onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="positionTypeId">
                Position Type
              </label>
              <select
                id="positionTypeId"
                name="positionTypeId"
                className="select"
                value={form.positionTypeId}
                onChange={handleChange}
                required
              >
                <option value="">Select a position type</option>
                {positionTypes
                  .filter((positionType) => !positionType.hidden)
                  .map((positionType) => (
                    <option key={positionType.id} value={positionType.id}>
                      {positionType.name || `Position #${positionType.id}`}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid--2">
              <div className="field">
                <label className="label" htmlFor="salary_min">
                  Minimum Salary
                </label>
                <input
                  id="salary_min"
                  name="salary_min"
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.salary_min}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="salary_max">
                  Maximum Salary
                </label>
                <input
                  id="salary_max"
                  name="salary_max"
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.salary_max}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid--2">
              <div className="field">
                <label className="label" htmlFor="start_time">
                  Start Time
                </label>
                <input
                  id="start_time"
                  name="start_time"
                  type="datetime-local"
                  className="input"
                  value={form.start_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="end_time">
                  End Time
                </label>
                <input
                  id="end_time"
                  name="end_time"
                  type="datetime-local"
                  className="input"
                  value={form.end_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="note">
                Note
              </label>
              <textarea
                id="note"
                name="note"
                className="textarea"
                rows="4"
                value={form.note}
                onChange={handleChange}
              />
            </div>

            {error ? <div className="error-alert">{error}</div> : null}
            {success ? <div className="card card--muted">{success}</div> : null}

            <div className="row">
              <button
                className="button"
                type="submit"
                disabled={isSubmitting || job?.status !== "open"}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>

              <button
                className="button button--secondary"
                type="button"
                onClick={() => navigate(`/business/jobs/${jobId}`)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </PageShell>
  );
}