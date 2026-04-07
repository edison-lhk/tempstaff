import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import {
  getCurrentUserApi,
  updateUserApi,
  uploadUserAvatarApi,
  uploadUserResumeApi,
} from "../../api/users";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { toAssetUrl, getFileNameFromPath } from "../../utils/helper";

export default function EditUserProfilePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    postal_address: "",
    birthday: "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  const [currentAvatar, setCurrentAvatar] = useState("");
  const [currentResume, setCurrentResume] = useState("");

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  const [error, setError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [resumeError, setResumeError] = useState("");

  const [success, setSuccess] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const [resumeSuccess, setResumeSuccess] = useState("");

  const normalizedAvatarUrl = useMemo(
    () => toAssetUrl(currentAvatar),
    [currentAvatar]
  );

  const normalizedResumeUrl = useMemo(
    () => toAssetUrl(currentResume),
    [currentResume]
  );

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }
    return normalizedAvatarUrl || "";
  }, [avatarFile, normalizedAvatarUrl]);

  const resumeFileName = useMemo(() => {
    if (resumeFile?.name) return resumeFile.name;
    return getFileNameFromPath(currentResume);
  }, [resumeFile, currentResume]);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const data = await getCurrentUserApi();

        setForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone_number: data.phone_number || "",
          postal_address: data.postal_address || "",
          birthday: data.birthday || "",
        });

        setCurrentAvatar(data.avatar || data.avatar_url || "");
        setCurrentResume(data.resume || data.resume_url || "");
      } catch (err) {
        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
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
    setIsSubmitting(true);

    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone_number: form.phone_number.trim(),
        postal_address: form.postal_address.trim(),
        ...(form.birthday ? { birthday: form.birthday } : {}),
      };

      await updateUserApi(payload);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile.");
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

      const updated = await uploadUserAvatarApi(formData);

      setCurrentAvatar(updated?.avatar || currentAvatar);
      setAvatarFile(null);
      setAvatarSuccess("Avatar uploaded successfully.");
    } catch (err) {
      setAvatarError(err.message || "Failed to upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUploadResume = async (event) => {
    event.preventDefault();
    setResumeError("");
    setResumeSuccess("");

    if (!resumeFile) {
      setResumeError("Please choose a resume file.");
      return;
    }

    setIsUploadingResume(true);

    try {
      const formData = new FormData();
      formData.append("file", resumeFile);

      const updated = await uploadUserResumeApi(formData);

      setCurrentResume(updated?.resume || currentResume);
      setResumeFile(null);
      setResumeSuccess("Resume uploaded successfully.");
    } catch (err) {
      setResumeError(err.message || "Failed to upload resume.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  return (
    <PageShell
      title="Edit Profile"
      subtitle="Update your personal details, avatar, and resume."
    >
      {loading ? <LoadingSpinner text="Loading profile..." /> : null}

      {!loading ? (
        <div className="grid grid--2">
          <div className="card stack">
            <form className="stack" onSubmit={handleSubmitProfile}>
              <h2 className="section-title" style={{ margin: 0 }}>
                Personal Information
              </h2>

              <div className="grid grid--2">
                <div className="field">
                  <label className="label" htmlFor="first_name">
                    First Name
                  </label>
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
                  <label className="label" htmlFor="last_name">
                    Last Name
                  </label>
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
                <label className="label" htmlFor="phone_number">
                  Phone Number
                </label>
                <input
                  id="phone_number"
                  name="phone_number"
                  className="input"
                  value={form.phone_number}
                  onChange={handleChange}
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
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="birthday">
                  Birthday
                </label>
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
              {success ? <div className="card card--muted">{success}</div> : null}

              <div className="row">
                <button className="button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Profile"}
                </button>

                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => navigate("/user/profile")}
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
                  Avatar
                </h2>

                <div className="stack">
                  <strong>Preview</strong>

                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
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
                  <label className="label" htmlFor="avatar">
                    Choose Avatar File
                  </label>
                  <input
                    id="avatar"
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
              <form className="stack" onSubmit={handleUploadResume}>
                <h2 className="section-title" style={{ margin: 0 }}>
                  Resume
                </h2>

                <div className="stack">
                  <strong>Current Resume</strong>

                  {resumeFileName ? (
                    <div className="card card--muted">
                      <div className="row row--between">
                        <span>{resumeFileName}</span>

                        {normalizedResumeUrl ? (
                          <a
                            href={normalizedResumeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="button button--secondary"
                          >
                            View
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="card card--muted">No resume uploaded yet.</div>
                  )}
                </div>

                <div className="field">
                  <label className="label" htmlFor="resume">
                    Choose Resume File
                  </label>
                  <input
                    id="resume"
                    type="file"
                    className="input"
                    accept=".pdf,.doc,.docx"
                    onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                  />
                </div>

                {resumeFile ? (
                  <div className="card card--muted">
                    Selected file: {resumeFile.name}
                  </div>
                ) : null}

                <ErrorAlert message={resumeError} />
                {resumeSuccess ? (
                  <div className="card card--muted">{resumeSuccess}</div>
                ) : null}

                <button className="button" type="submit" disabled={isUploadingResume}>
                  {isUploadingResume ? "Uploading..." : "Upload Resume"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}