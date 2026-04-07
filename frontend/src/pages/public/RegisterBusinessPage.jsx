import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { registerBusinessApi } from "../../api/businesses";
import { requestResetApi } from "../../api/auth";
import ErrorAlert from "../../components/common/ErrorAlert";

export default function RegisterBusinessPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    email: "",
    password: "",
    phone_number: "",
    postal_address: "",
    lat: "",
    lon: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setLoading(true);

    try {
      const lat = Number(form.lat);
      const lon = Number(form.lon);

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        throw new Error("Latitude and longitude must be valid numbers.");
      }

      await registerBusinessApi({
        business_name: form.business_name.trim(),
        owner_name: form.owner_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone_number: form.phone_number.trim(),
        postal_address: form.postal_address.trim(),
        location: { lat, lon },
      });

      const resetResponse = await requestResetApi({
        email: form.email.trim(),
      });

      const resetToken =
        resetResponse.resetToken ||
        resetResponse.token ||
        resetResponse.results?.resetToken;

      if (!resetToken) {
        throw new Error("Activation token was not returned by the server.");
      }

      navigate(`/activate/${resetToken}`, {
        state: {
          email: form.email.trim(),
          role: "business",
        },
      });
    } catch (err) {
      setError(err.message || "Failed to register business.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Register as Business"
      subtitle="Create a business account."
    >
      <div className="card form-card">
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="business_name">Business Name</label>
            <input
              id="business_name"
              name="business_name"
              className="input"
              value={form.business_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="owner_name">Owner Name</label>
            <input
              id="owner_name"
              name="owner_name"
              className="input"
              value={form.owner_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="phone_number">Phone Number</label>
            <input
              id="phone_number"
              name="phone_number"
              className="input"
              value={form.phone_number}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="postal_address">Postal Address</label>
            <input
              id="postal_address"
              name="postal_address"
              className="input"
              value={form.postal_address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid--2">
            <div className="field">
              <label className="label" htmlFor="lat">Latitude</label>
              <input
                id="lat"
                name="lat"
                type="number"
                step="any"
                className="input"
                value={form.lat}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="lon">Longitude</label>
              <input
                id="lon"
                name="lon"
                type="number"
                step="any"
                className="input"
                value={form.lon}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <ErrorAlert message={error} />

          <button className="button" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}