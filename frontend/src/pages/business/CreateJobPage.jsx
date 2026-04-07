import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { createBusinessJobApi, getCurrentBusinessApi } from "../../api/businesses";
import { getPositionTypesApi } from "../../api/positionTypes";

export default function CreateJobPage() {
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
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

        const [businessData, positionTypesData] = await Promise.all([
          getCurrentBusinessApi(),
          getPositionTypesApi(),
        ]);

        setBusiness(businessData);
        setPositionTypes(
          Array.isArray(positionTypesData)
            ? positionTypesData
            : positionTypesData.results || []
        );
      } catch (err) {
        setError(err.message || "Failed to load form data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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

    if (!business?.verified) {
      setError("Only verified businesses can create jobs.");
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
        position_type_id: Number(form.positionTypeId),
        salary_min: salaryMin,
        salary_max: salaryMax,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        note: form.note.trim(),
      };

      const created = await createBusinessJobApi(payload);

      setSuccess("Job created successfully.");

      setTimeout(() => {
        navigate(`/business/jobs/${created.id}`);
      }, 700);
    } catch (err) {
      setError(err.message || "Failed to create job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Create Job"
      subtitle="Post a new temporary staffing opportunity."
    >
      {loading ? <div className="card">Loading form...</div> : null}

      {!loading ? (
        <div className="card stack">
          {!business?.verified ? (
            <div className="card card--muted">
              Your business is not verified. Job creation may be unavailable
              until verification is complete.
            </div>
          ) : null}

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
                placeholder="Add extra details about the shift or staffing needs."
              />
            </div>

            {error ? <div className="error-alert">{error}</div> : null}
            {success ? <div className="card card--muted">{success}</div> : null}

            <div className="row">
              <button className="button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Job"}
              </button>

              <button
                className="button button--secondary"
                type="button"
                onClick={() => navigate("/business/jobs")}
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