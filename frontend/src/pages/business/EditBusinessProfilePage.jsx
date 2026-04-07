import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import {
  getCurrentBusinessApi,
  updateBusinessApi,
  uploadBusinessAvatarApi,
} from "../../api/businesses";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { toAssetUrl } from "../../utils/helper";

export default function EditBusinessProfilePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    phone_number: "",
    postal_address: "",
    biography: "",
    lat: "",
    lon: "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [currentAvatar, setCurrentAvatar] = useState("");

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [error, setError] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const [success, setSuccess] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");

  const normalizedAvatarUrl = useMemo(
    () => toAssetUrl(currentAvatar),
    [currentAvatar]
  );

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }
    return normalizedAvatarUrl || "";
  }, [avatarFile, normalizedAvatarUrl]);

  useEffect(() => {
    async function loadBusinessProfile() {
      try {
        setLoading(true);
        setError("");

        const data = await getCurrentBusinessApi();

        setForm({
          business_name: data.business_name || "",
          owner_name: data.owner_name || "",
          phone_number: data.phone_number || "",
          postal_address: data.postal_address || "",
          biography: data.biography || "",
          lat:
            data.location && typeof data.location.lat === "number"
              ? String(data.location.lat)
              : "",
          lon:
            data.location && typeof data.location.lon === "number"
              ? String(data.location.lon)
              : "",
        });

        setCurrentAvatar(data.avatar || data.avatar_url || "");
      } catch (err) {
        setError(err.message || "Failed to load business profile.");
      } finally {
        setLoading(false);
      }
    }

    loadBusinessProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarFile, avatarPreview]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmitProfile = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const lat = Number(form.lat);
    const lon = Number(form.lon);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      setError("Latitude and longitude must be valid numbers.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        business_name: form.business_name.trim(),
        owner_name: form.owner_name.trim(),
        phone_number: form.phone_number.trim(),
        postal_address: form.postal_address.trim(),
        biography: form.biography.trim(),
        location: {
          lat,
          lon,
        },
      };

      await updateBusinessApi(payload);
      setSuccess("Business profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update business profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadAvatar = async (event) => {
    event.preventDefault();
    setAvatarError("");
    setAvatarSuccess("");

    if (!avatarFile) {
      setAvatarError("Please choose an avatar file.");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", avatarFile);

      const updated = await uploadBusinessAvatarApi(formData);

      setCurrentAvatar(updated?.avatar || updated?.avatar_url || currentAvatar);
      setAvatarFile(null);
      setAvatarSuccess("Avatar uploaded successfully.");
    } catch (err) {
      setAvatarError(err.message || "Failed to upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <PageShell
      title="Edit Business Profile"
      subtitle="Update your business details, avatar, and location."
    >
      {loading ? <LoadingSpinner text="Loading business profile..." /> : null}

      {!loading ? (
        <div className="grid grid--2">
          <div className="card stack">
            <form className="stack" onSubmit={handleSubmitProfile}>
              <h2 className="section-title" style={{ margin: 0 }}>
                Business Information
              </h2>

              <div className="field">
                <label className="label" htmlFor="business_name">
                  Business Name
                </label>
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
                <label className="label" htmlFor="owner_name">
                  Owner Name
                </label>
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
                <label className="label" htmlFor="phone_number">
                  Phone Number
                </label>
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
                <label className="label" htmlFor="postal_address">
                  Postal Address
                </label>
                <input
                  id="postal_address"
                  name="postal_address"
                  className="input"
                  value={form.postal_address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="biography">
                  Biography
                </label>
                <textarea
                  id="biography"
                  name="biography"
                  className="textarea"
                  rows="4"
                  value={form.biography}
                  onChange={handleChange}
                  placeholder="Describe your business and staffing needs."
                />
              </div>

              <div className="grid grid--2">
                <div className="field">
                  <label className="label" htmlFor="lat">
                    Latitude
                  </label>
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
                  <label className="label" htmlFor="lon">
                    Longitude
                  </label>
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
              {success ? <div className="card card--muted">{success}</div> : null}

              <div className="row">
                <button className="button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Business Profile"}
                </button>

                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => navigate("/business/profile")}
                >
                  Back
                </button>
              </div>
            </form>
          </div>

          <div className="stack">
            <div className="card stack">
              <form className="stack" onSubmit={handleUploadAvatar}>
                <h2 className="section-title" style={{ margin: 0 }}>
                  Business Avatar
                </h2>

                <div className="stack">
                  <strong>Preview</strong>

                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Business avatar preview"
                      style={{
                        width: "140px",
                        height: "140px",
                        objectFit: "cover",
                        borderRadius: "16px",
                        border: "1px solid #d1d5db",
                      }}
                    />
                  ) : (
                    <div className="card card--muted">No avatar uploaded yet.</div>
                  )}
                </div>

                <div className="field">
                  <label className="label" htmlFor="business-avatar">
                    Choose Avatar File
                  </label>
                  <input
                    id="business-avatar"
                    type="file"
                    className="input"
                    accept="image/*"
                    onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                  />
                </div>

                <ErrorAlert message={avatarError} />
                {avatarSuccess ? (
                  <div className="card card--muted">{avatarSuccess}</div>
                ) : null}

                <button className="button" type="submit" disabled={isUploadingAvatar}>
                  {isUploadingAvatar ? "Uploading..." : "Upload Avatar"}
                </button>
              </form>
            </div>

            <div className="card stack">
              <div className="stack">
                <h2 className="section-title" style={{ margin: 0 }}>
                  Location Summary
                </h2>

                <div>
                  <strong>Postal Address</strong>
                  <p>{form.postal_address || "No address provided."}</p>
                </div>

                <div>
                  <strong>Latitude</strong>
                  <p>{form.lat || "Not set"}</p>
                </div>

                <div>
                  <strong>Longitude</strong>
                  <p>{form.lon || "Not set"}</p>
                </div>

                <div className="card card--muted">
                  Keep these coordinates accurate so job distance and ETA features work properly.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}