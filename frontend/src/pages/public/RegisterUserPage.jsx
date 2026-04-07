import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { registerUserApi } from "../../api/users";
import { requestResetApi } from "../../api/auth";
import ErrorAlert from "../../components/common/ErrorAlert";

export default function RegisterUserPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone_number: "",
    postal_address: "",
    birthday: "",
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
      await registerUserApi({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone_number: form.phone_number.trim(),
        postal_address: form.postal_address.trim(),
        birthday: form.birthday || "1970-01-01",
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
          role: "regular",
        },
      });
    } catch (err) {
      setError(err.message || "Failed to register user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Register as User"
      subtitle="Create a regular user account."
    >
      <div className="card form-card">
        <form className="stack" onSubmit={handleSubmit}>
          <div className="grid grid--2">
            <div className="field">
              <label className="label" htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                name="first_name"
                className="input"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                name="last_name"
                className="input"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </div>
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
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="birthday">Birthday</label>
            <input
              id="birthday"
              name="birthday"
              type="date"
              className="input"
              value={form.birthday}
              onChange={handleChange}
            />
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