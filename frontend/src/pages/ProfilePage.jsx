import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import useToast from "../hooks/useToast";
import useForm from "../hooks/useForm";

function ProfilePage() {
  const { user, updateUser, clearAuth } = useAuth();
  const navigate = useNavigate();

  // =========================================
  // TOAST
  // =========================================
  const { toast, showToast } = useToast();

  // =========================================
  // EDIT PROFILE FORM
  // =========================================
  const {
    values: profileForm,
    errors: profileErrors,
    setErrors: setProfileErrors,
    handleChange: handleProfileChange,
    setValues: setProfileValues,
  } = useForm({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [savingProfile, setSavingProfile] =
    useState(false);

  const {
    values: passwordForm,
    errors: passwordErrors,
    setErrors: setPasswordErrors,
    handleChange: handlePasswordChange,
    resetForm: resetPasswordForm,
  } = useForm({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [changingPassword, setChangingPassword] = useState(false);

  // =========================================
  // PROFILE IMAGE STATES
  // =========================================
  const [selectedFile, setSelectedFile] =
    useState(null);

  const [preview, setPreview] =
    useState(null);

  const [uploading, setUploading] =
    useState(false);

  // =========================================
  // BONUS 3 - ACTIVITY SUMMARY
  // =========================================
  const [activity, setActivity] = useState({
    total_orders: 0,
    total_spent: 0,
  });

  const [activityLoading, setActivityLoading] =
    useState(true);

  // =========================================
  // BONUS 4 - DELETE ACCOUNT
  // =========================================
  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [deletingAccount, setDeletingAccount] =
    useState(false);


  // =========================================
  // KEEP FORM SYNCED WITH CURRENT USER
  // =========================================
  useEffect(() => {
    if (user) {
      setProfileValues({
        name: user.name || "",
        email: user.email || "",
      });
    }
  }, [user, setProfileValues]);


  // =========================================
  // CLEAN TEMPORARY IMAGE PREVIEW
  // =========================================
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);


  // =========================================
  // BONUS 3 - LOAD ACTIVITY SUMMARY
  // =========================================
  useEffect(() => {
    if (!user) {
      setActivityLoading(false);
      return;
    }

    const loadActivity = async () => {
      try {
        setActivityLoading(true);

        const response = await api.get(
          "/api/me/activity"
        );

        setActivity({
          total_orders:
            response.data.activity?.total_orders || 0,
          total_spent:
            response.data.activity?.total_spent || 0,
        });
      } catch (error) {
        console.error(
          "Profile activity error:",
          error
        );

        setActivity({
          total_orders: 0,
          total_spent: 0,
        });
      } finally {
        setActivityLoading(false);
      }
    };

    loadActivity();
  }, [user]);


  // =========================================
  // USER NOT AVAILABLE
  // =========================================
  if (!user) {
    return (
      <div className="profile-page">
        <p>Please login to view your profile.</p>
      </div>
    );
  }


  const initial =
    user.name?.charAt(0).toUpperCase() || "U";


  // =========================================
  // SELECT PROFILE IMAGE
  // =========================================
  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      return;
    }

    // Maximum 5 MB
    if (file.size > 5 * 1024 * 1024) {
      showToast(
        "Image size must be 5 MB or less",
        "error"
      );
      return;
    }

    // Supported image types
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      showToast(
        "Only PNG, JPG, JPEG and WEBP images are allowed",
        "error"
      );
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(file);

    setPreview(
      URL.createObjectURL(file)
    );
  };


  // =========================================
  // UPLOAD PROFILE IMAGE
  // =========================================
  const handleUpload = async () => {
    if (!selectedFile) {
      showToast(
        "Please select a profile picture",
        "error"
      );
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append(
        "image",
        selectedFile
      );

      const response = await api.post(
        "/api/me/avatar",
        formData
      );

      const newAvatar =
        response.data.avatar_url;

      // Update global user immediately
      updateUser({
        avatar_url: newAvatar,
      });

      setSelectedFile(null);

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      setPreview(null);

      showToast(
        "Profile picture updated successfully",
        "success"
      );

    } catch (error) {
      console.error(
        "Avatar upload error:",
        error
      );

      showToast(
        error.response?.data?.message ||
          "Unable to upload profile picture",
        "error"
      );

    } finally {
      setUploading(false);
    }
  };


  // =========================================
  // UPDATE NAME AND EMAIL
  // =========================================
  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    const name =
      profileForm.name.trim();

    const email =
      profileForm.email.trim();

    const newErrors = {};


    // Name validation
    if (!name) {
      newErrors.name =
        "Name is required";
    }


    // Email validation
    if (!email) {
      newErrors.email =
        "Email is required";
    }


    // Stop if validation failed
    if (
      Object.keys(newErrors).length > 0
    ) {
      setProfileErrors(newErrors);
      return;
    }


    try {
      setSavingProfile(true);

      setProfileErrors({});


      // Send updated data to Flask
      const response = await api.put(
        "/api/me",
        {
          name,
          email,
        }
      );


      // Update React Context immediately
      updateUser({
        name,
        email,
      });


      showToast(
        response.data.message ||
          "Profile updated successfully",
        "success"
      );

    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );


      const status =
        error.response?.status;

      const message =
        error.response?.data?.message;


      // Duplicate email
      if (status === 409) {
        setProfileErrors({
          email:
            message ||
            "Email already in use",
        });

        return;
      }


      showToast(
        message ||
          "Unable to update profile",
        "error"
      );

    } finally {
      setSavingProfile(false);
    }
  };


  // =========================================
  // CHANGE PASSWORD
  // =========================================
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { current_password, new_password, confirm_password } = passwordForm;
    const newErrors = {};

    if (!current_password) newErrors.current_password = "Current password is required";
    if (!new_password) newErrors.new_password = "New password is required";
    else if (new_password.length < 6) newErrors.new_password = "Password must be at least 6 characters";
    if (!confirm_password) newErrors.confirm_password = "Please confirm your new password";
    else if (new_password !== confirm_password) newErrors.confirm_password = "Passwords do not match";

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordErrors({});
      const response = await api.put("/api/me/password", {
        current_password, new_password, confirm_password,
      });
      resetPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      showToast(response.data.message || "Password changed successfully", "success");
    } catch (error) {
      console.error("Password change error:", error);
      const status = error.response?.status;
      const message = error.response?.data?.message;
      if (status === 401) {
        setPasswordErrors({ current_password: message || "Current password is incorrect" });
        return;
      }
      showToast(message || "Unable to change password", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // =========================================
  // BONUS 4 - DELETE ACCOUNT
  // =========================================
  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);

      await api.delete("/api/me");

      // User no longer exists, so clear JWT tokens and
      // React authentication state locally.
      clearAuth();

      navigate("/login", {
        replace: true,
      });

    } catch (error) {
      console.error(
        "Delete account error:",
        error
      );

      setShowDeleteModal(false);

      showToast(
        error.response?.data?.message ||
          "Unable to delete account",
        "error"
      );

    } finally {
      setDeletingAccount(false);
    }
  };


  const formatMemberSince = (dateString) => {
  if (!dateString) return "—";

  const date = new Date(dateString);

  return `Member since ${date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      year: "numeric",
    }
  )}`;
};


const getPasswordStrength = (password) => {
  if (!password) {
    return {
      level: "",
      score: 0,
    };
  }

  let score = 0;

  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return {
      level: "Weak",
      score: 33,
    };
  }

  if (score <= 4) {
    return {
      level: "Medium",
      score: 66,
    };
  }

  return {
    level: "Strong",
    score: 100,
  };
};

const passwordStrength =
  getPasswordStrength(
    passwordForm.new_password
  );


  return (
    <div className="profile-page">

      {/* =====================================
          TOAST
      ====================================== */}

      {toast && (
        <div
          className={`profile-toast ${toast.type}`}
        >
          {toast.message}
        </div>
      )}


      <div className="profile-container">


        {/* =====================================
            PROFILE HEADER
        ====================================== */}

        <div className="profile-header">

          <div className="profile-avatar">

            {preview ? (

              <img
                src={preview}
                alt="Profile preview"
              />

            ) : user.avatar_url ? (

              <img
                src={user.avatar_url}
                alt="Profile"
              />

            ) : (

              <span>{initial}</span>

            )}

          </div>


          <div className="profile-header-info">

            <p className="profile-label">
              MY ACCOUNT
            </p>

            <h1>
              {user.name}
            </h1>

            <p>
              {user.email}
            </p>

            <span className="profile-role">
              {user.role}
            </span>

          </div>

        </div>


        {/* =====================================
            PROFILE PICTURE
        ====================================== */}

        <div className="profile-section">

          <div className="profile-section-title">

            <h2>
              📷 Profile Picture
            </h2>

            <p>
              Upload a photo for your
              ShopZone account.
            </p>

          </div>


          <div className="profile-upload-area">

            <label
              htmlFor="profile-image"
              className="profile-file-button"
            >
              Choose Photo
            </label>


            <input
              id="profile-image"
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              hidden
            />


            {selectedFile && (

              <div className="profile-selected-file">

                <span>
                  {selectedFile.name}
                </span>


                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="profile-upload-button"
                >
                  {uploading
                    ? "Uploading..."
                    : "Upload Photo"}
                </button>

              </div>

            )}

          </div>

        </div>


        {/* =====================================
            PROFILE INFORMATION
        ====================================== */}

        <div className="profile-section">

          <div className="profile-section-title">

            <h2>
              Profile Information
            </h2>

            <p>
              Your personal account
              information.
            </p>

          </div>


          <div className="profile-info-grid">

            <div className="profile-info-item">

              <span>
                Name
              </span>

              <strong>
                {user.name}
              </strong>

            </div>


            <div className="profile-info-item">

              <span>
                Email Address
              </span>

              <strong>
                {user.email}
              </strong>

            </div>


            <div className="profile-info-item">

              <span>
                Account Type
              </span>

              <strong>
                {user.role}
              </strong>

            </div>


            <div className="profile-info-item">

              <span>
                Member Since
              </span>

              <strong>
                {formatMemberSince(user.created_at)}
              </strong>

            </div>

          </div>

        </div>


        {/* =====================================
            BONUS 3 - ACTIVITY SUMMARY
        ====================================== */}

        <div className="profile-section">
          <div className="profile-section-title">
            <h2>📊 Activity Summary</h2>
            <p>
              A quick summary of your ShopZone
              order activity.
            </p>
          </div>

          <div className="profile-activity-grid">
            <div className="profile-activity-card">
              <div className="profile-activity-icon">
                📦
              </div>

              <div>
                <span>Total Orders</span>
                <strong>
                  {activityLoading
                    ? "..."
                    : activity.total_orders}
                </strong>
              </div>
            </div>

            <div className="profile-activity-card">
              <div className="profile-activity-icon">
                ₹
              </div>

              <div>
                <span>Total Amount Spent</span>
                <strong>
                  {activityLoading
                    ? "..."
                    : `₹${Number(
                        activity.total_spent
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </strong>
              </div>
            </div>
          </div>
        </div>


        {/* =====================================
            EDIT PROFILE
        ====================================== */}

        <div className="profile-section">

          <div className="profile-section-title">

            <h2>
              ✏️ Edit Profile
            </h2>

            <p>
              Update your name and
              email address.
            </p>

          </div>


          <form
            className="profile-form"
            onSubmit={handleProfileSubmit}
          >


            {/* NAME */}

            <div className="profile-form-group">

              <label htmlFor="profile-name">
                Full Name
              </label>

              <input
                id="profile-name"
                type="text"
                name="name"
                value={profileForm.name}
                onChange={handleProfileChange}
                placeholder="Enter your name"
              />


              {profileErrors.name && (

                <span className="profile-field-error">
                  {profileErrors.name}
                </span>

              )}

            </div>


            {/* EMAIL */}

            <div className="profile-form-group">

              <label htmlFor="profile-email">
                Email Address
              </label>

              <input
                id="profile-email"
                type="email"
                name="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                placeholder="Enter your email"
              />


              {profileErrors.email && (

                <span className="profile-field-error">
                  {profileErrors.email}
                </span>

              )}

            </div>


            {/* SAVE BUTTON */}

            <button
              type="submit"
              className="profile-save-button"
              disabled={savingProfile}
            >
              {savingProfile
                ? "Saving..."
                : "Save Changes"}
            </button>

          </form>

        </div>


        {/* =====================================
            CHANGE PASSWORD
        ====================================== */}

        <div className="profile-section">
          <div className="profile-section-title">
            <h2>🔐 Change Password</h2>
            <p>Enter your current password before choosing a new password.</p>
          </div>

          <form className="profile-password-form" onSubmit={handlePasswordSubmit}>
            <div className="profile-form-group">
              <label htmlFor="current-password">Current Password</label>
              <input id="current-password" type="password" name="current_password" value={passwordForm.current_password} onChange={handlePasswordChange} placeholder="Enter current password" autoComplete="current-password" />
              {passwordErrors.current_password && <span className="profile-field-error">{passwordErrors.current_password}</span>}
            </div>

            <div className="profile-form-group">
              <label htmlFor="new-password">New Password</label>
              <input id="new-password" type="password" name="new_password" value={passwordForm.new_password} onChange={handlePasswordChange} placeholder="Minimum 6 characters" autoComplete="new-password" />

              {passwordForm.new_password && (
                <div className="password-strength">
                  <div className="password-strength-top">
                    <span>Password Strength</span>
                    <strong
                      className={`strength-${passwordStrength.level.toLowerCase()}`}
                    >
                      {passwordStrength.level}
                    </strong>
                  </div>

                  <div className="password-strength-bar">
                    <div
                      className={`password-strength-fill strength-${passwordStrength.level.toLowerCase()}`}
                      style={{
                        width: `${passwordStrength.score}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {passwordErrors.new_password && <span className="profile-field-error">{passwordErrors.new_password}</span>}
            </div>

            <div className="profile-form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input id="confirm-password" type="password" name="confirm_password" value={passwordForm.confirm_password} onChange={handlePasswordChange} placeholder="Enter new password again" autoComplete="new-password" />
              {passwordErrors.confirm_password && <span className="profile-field-error">{passwordErrors.confirm_password}</span>}
            </div>

            <button type="submit" className="profile-save-button" disabled={changingPassword}>
              {changingPassword ? "Changing Password..." : "Change Password"}
            </button>
          </form>
        </div>


        {/* =====================================
            BONUS 4 - DANGER ZONE
        ====================================== */}

        <div className="profile-section danger-zone">
          <div className="profile-section-title">
            <h2>⚠️ Danger Zone</h2>
            <p>
              Permanently delete your ShopZone
              account and associated order data.
            </p>
          </div>

          <div className="danger-zone-content">
            <div>
              <strong>Delete Account</strong>
              <p>
                This action is permanent and cannot
                be undone.
              </p>
            </div>

            <button
              type="button"
              className="delete-account-button"
              onClick={() =>
                setShowDeleteModal(true)
              }
            >
              Delete Account
            </button>
          </div>
        </div>


      </div>


      {/* =====================================
          DELETE ACCOUNT CONFIRMATION MODAL
      ====================================== */}

      {showDeleteModal && (
        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (!deletingAccount) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="delete-modal-icon">
              ⚠️
            </div>

            <h2 id="delete-account-title">
              Delete your account?
            </h2>

            <p>
              This will permanently delete your
              account and associated order data.
              This action cannot be undone.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-modal-cancel"
                disabled={deletingAccount}
                onClick={() =>
                  setShowDeleteModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-modal-confirm"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
              >
                {deletingAccount
                  ? "Deleting..."
                  : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default ProfilePage;