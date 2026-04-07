import { useState } from "react";
import PageShell from "../../components/layout/PageShell";
import {
  updateAvailabilityTimeoutApi,
  updateJobStartWindowApi,
  updateNegotiationWindowApi,
  updateResetCooldownApi,
} from "../../api/admin";

export default function AdminSystemConfigPage() {
  const [form, setForm] = useState({
    reset_cooldown: "",
    negotiation_window: "",
    job_start_window: "",
    availability_timeout: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateSetting = async (type) => {
    setError("");
    setSuccess("");

    try {
      if (type === "reset_cooldown") {
        await updateResetCooldownApi({ reset_cooldown: Number(form.reset_cooldown) });
      } else if (type === "negotiation_window") {
        await updateNegotiationWindowApi({ negotiation_window: Number(form.negotiation_window) });
      } else if (type === "job_start_window") {
        await updateJobStartWindowApi({ job_start_window: Number(form.job_start_window) });
      } else if (type === "availability_timeout") {
        await updateAvailabilityTimeoutApi({ availability_timeout: Number(form.availability_timeout) });
      }

      setSuccess("System setting updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update system setting.");
    }
  };

  return (
    <PageShell
      title="System Configuration"
      subtitle="Update global timing and workflow settings."
    >
      {error ? <div className="error-alert">{error}</div> : null}
      {success ? <div className="card card--muted">{success}</div> : null}

      <div className="grid grid--2">
        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>Reset Cooldown</h2>
          <input
            name="reset_cooldown"
            type="number"
            className="input"
            value={form.reset_cooldown}
            onChange={handleChange}
            placeholder="Enter reset cooldown"
          />
          <button className="button" type="button" onClick={() => updateSetting("reset_cooldown")}>
            Save
          </button>
        </div>

        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>Negotiation Window</h2>
          <input
            name="negotiation_window"
            type="number"
            className="input"
            value={form.negotiation_window}
            onChange={handleChange}
            placeholder="Enter negotiation window"
          />
          <button className="button" type="button" onClick={() => updateSetting("negotiation_window")}>
            Save
          </button>
        </div>

        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>Job Start Window</h2>
          <input
            name="job_start_window"
            type="number"
            className="input"
            value={form.job_start_window}
            onChange={handleChange}
            placeholder="Enter job start window"
          />
          <button className="button" type="button" onClick={() => updateSetting("job_start_window")}>
            Save
          </button>
        </div>

        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>Availability Timeout</h2>
          <input
            name="availability_timeout"
            type="number"
            className="input"
            value={form.availability_timeout}
            onChange={handleChange}
            placeholder="Enter availability timeout"
          />
          <button className="button" type="button" onClick={() => updateSetting("availability_timeout")}>
            Save
          </button>
        </div>
      </div>
    </PageShell>
  );
}