import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api";


function Register() {

  const navigate = useNavigate();


  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });


  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  // =====================================
  // HANDLE INPUT CHANGE
  // =====================================

  const handleChange = (event) => {

    const { name, value } =
      event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    // Clear old error when user starts typing
    if (error) {
      setError("");
    }
  };


  // =====================================
  // PASSWORD STRENGTH
  // =====================================

  const passwordChecks = {

    length:
      formData.password.length >= 8,

    uppercase:
      /[A-Z]/.test(formData.password),

    lowercase:
      /[a-z]/.test(formData.password),

    number:
      /[0-9]/.test(formData.password),

    special:
      /[^A-Za-z0-9]/.test(
        formData.password
      ),

  };


  const passedChecks =
    Object.values(passwordChecks)
      .filter(Boolean)
      .length;


  const passwordStrength =

    !formData.password
      ? ""

      : passedChecks <= 2
      ? "Weak"

      : passedChecks <= 4
      ? "Medium"

      : "Strong";


  const isStrongPassword =
    Object.values(passwordChecks)
      .every(Boolean);


  // =====================================
  // REGISTER CUSTOMER
  // =====================================

  const handleSubmit = async (event) => {

    event.preventDefault();

    setError("");
    setSuccess("");


    const name =
      formData.name.trim();

    const email =
      formData.email
        .trim()
        .toLowerCase();


    // =====================================
    // NAME VALIDATION
    // =====================================

    if (!name) {

      setError(
        "Name is required"
      );

      return;
    }


    // =====================================
    // EMAIL VALIDATION
    // =====================================

    if (!email) {

      setError(
        "Email is required"
      );

      return;
    }


    // =====================================
    // PASSWORD VALIDATION
    // =====================================

    if (!formData.password) {

      setError(
        "Password is required"
      );

      return;
    }


    if (!isStrongPassword) {

      setError(
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character"
      );

      return;
    }


    // =====================================
    // CONFIRM PASSWORD
    // =====================================

    if (!formData.confirmPassword) {

      setError(
        "Please confirm your password"
      );

      return;
    }


    if (
      formData.password !==
      formData.confirmPassword
    ) {

      setError(
        "Passwords do not match"
      );

      return;
    }


    // =====================================
    // SEND REGISTER REQUEST
    // =====================================

    try {

      setLoading(true);


      await api.post(
        "/api/register",
        {
          name,
          email,
          password:
            formData.password,
        }
      );


      setSuccess(
        "Registration successful! Redirecting to login..."
      );


      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });


      setTimeout(() => {

        navigate(
          "/login",
          {
            replace: true,
          }
        );

      }, 1500);


    } catch (err) {

      console.log(
        "Registration Error:",
        err
      );


      setError(
        err.response?.data?.message ||
        err.response?.data?.msg ||
        "Unable to register. Please try again."
      );


    } finally {

      setLoading(false);

    }
  };


  // =====================================
  // PASSWORD STRENGTH WIDTH
  // =====================================

  const getStrengthWidth = () => {

    if (
      passwordStrength === "Weak"
    ) {
      return "33%";
    }

    if (
      passwordStrength === "Medium"
    ) {
      return "66%";
    }

    if (
      passwordStrength === "Strong"
    ) {
      return "100%";
    }

    return "0%";
  };


  return (

    <div className="peach-auth-page register-auth-page">


      {/* =====================================
          BACKGROUND DECORATIONS
      ====================================== */}

      <div className="auth-decoration auth-decoration-one" />

      <div className="auth-decoration auth-decoration-two" />

      <div className="auth-decoration auth-decoration-three" />



      {/* =====================================
          REGISTER CONTAINER
      ====================================== */}

      <div className="peach-auth-container register-auth-container">


        {/* =====================================
            LEFT PANEL
        ====================================== */}

        <div className="peach-auth-showcase register-showcase">


          <div className="auth-showcase-shine" />


          {/* BRAND */}

          <Link
            to="/"
            className="auth-brand"
          >

            <div className="auth-brand-logo">
              S
            </div>


            <div>

              <strong>
                ShopZone
              </strong>

              <span>
                Beautiful Shopping
              </span>

            </div>

          </Link>



          {/* MAIN CONTENT */}

          <div className="auth-showcase-content">


            <span className="auth-small-title">
              ✦ JOIN SHOPZONE
            </span>


            <h1>

              Your shopping

              <span>
                {" "}journey starts here.
              </span>

            </h1>


            <p>
              Create your ShopZone account
              and discover products you'll love,
              manage your cart and track your
              orders easily.
            </p>



            {/* FEATURES */}

            <div className="auth-feature-list">


              <div className="auth-feature">

                <div>
                  ♡
                </div>

                <span>

                  <strong>
                    Discover Products
                  </strong>

                  Explore our latest collection

                </span>

              </div>



              <div className="auth-feature">

                <div>
                  🛍
                </div>

                <span>

                  <strong>
                    Easy Shopping
                  </strong>

                  Add products and checkout easily

                </span>

              </div>



              <div className="auth-feature">

                <div>
                  ✓
                </div>

                <span>

                  <strong>
                    Track Your Orders
                  </strong>

                  Keep your purchases organized

                </span>

              </div>

            </div>

          </div>



          {/* FLOATING CARD */}

          <div className="auth-floating-card">

            <span>
              ✨
            </span>


            <div>

              <small>
                NEW MEMBER
              </small>

              <strong>
                Welcome to ShopZone
              </strong>

            </div>

          </div>

        </div>



        {/* =====================================
            RIGHT REGISTER FORM
        ====================================== */}

        <div className="peach-auth-form-side register-form-side">


          <div className="peach-auth-form register-form">


            {/* HEADING */}

            <div className="auth-form-heading">


              <span className="auth-form-small">
                CREATE ACCOUNT
              </span>


              <h2>
                Join us today.
              </h2>


              <p>
                Enter your details below to
                create your ShopZone account.
              </p>

            </div>



            {/* ERROR */}

            {error && (

              <div className="peach-auth-error">

                <span>
                  !
                </span>


                <div>

                  <strong>
                    Registration unsuccessful
                  </strong>

                  <p>
                    {error}
                  </p>

                </div>

              </div>

            )}



            {/* SUCCESS */}

            {success && (

              <div className="peach-auth-success">

                <span>
                  ✓
                </span>


                <div>

                  <strong>
                    Account created!
                  </strong>

                  <p>
                    {success}
                  </p>

                </div>

              </div>

            )}



            {/* =====================================
                FORM
            ====================================== */}

            <form
              onSubmit={handleSubmit}
              className="peach-login-form register-form-fields"
            >


              {/* =====================================
                  NAME
              ====================================== */}

              <div className="peach-form-group">

                <label htmlFor="register-name">
                  Full Name
                </label>


                <div className="peach-input-wrapper">

                  <span className="peach-input-icon">
                    ♙
                  </span>


                  <input
                    id="register-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    disabled={loading}
                    required
                  />

                </div>

              </div>



              {/* =====================================
                  EMAIL
              ====================================== */}

              <div className="peach-form-group">

                <label htmlFor="register-email">
                  Email Address
                </label>


                <div className="peach-input-wrapper">

                  <span className="peach-input-icon">
                    @
                  </span>


                  <input
                    id="register-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                    required
                  />

                </div>

              </div>



              {/* =====================================
                  PASSWORD
              ====================================== */}

              <div className="peach-form-group">


                <div className="password-label-row">

                  <label htmlFor="register-password">
                    Password
                  </label>


                  <span className="secure-text">
                    Strong password required
                  </span>

                </div>


                <div className="peach-input-wrapper">

                  <span className="peach-input-icon">
                    ◇
                  </span>


                  <input
                    id="register-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create your password"
                    autoComplete="new-password"
                    disabled={loading}
                    minLength="8"
                    required
                  />


                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showPassword
                      ? "Hide"
                      : "Show"
                    }

                  </button>

                </div>



                {/* =====================================
                    PASSWORD STRENGTH
                ====================================== */}

                {formData.password && (

                  <div className="register-password-strength">


                    <div className="register-strength-header">

                      <span>
                        Password Strength
                      </span>


                      <strong
                        className={
                          `register-strength-${passwordStrength.toLowerCase()}`
                        }
                      >
                        {passwordStrength}
                      </strong>

                    </div>



                    {/* STRENGTH BAR */}

                    <div className="register-strength-bar">

                      <div
                        className={
                          `register-strength-fill register-strength-${passwordStrength.toLowerCase()}`
                        }
                        style={{
                          width:
                            getStrengthWidth(),
                        }}
                      />

                    </div>



                    {/* PASSWORD RULES */}

                    <div className="register-password-rules">


                      <span
                        className={
                          passwordChecks.length
                            ? "passed"
                            : ""
                        }
                      >

                        {passwordChecks.length
                          ? "✓"
                          : "○"
                        }

                        {" "}8+ characters

                      </span>



                      <span
                        className={
                          passwordChecks.uppercase
                            ? "passed"
                            : ""
                        }
                      >

                        {passwordChecks.uppercase
                          ? "✓"
                          : "○"
                        }

                        {" "}Uppercase letter

                      </span>



                      <span
                        className={
                          passwordChecks.lowercase
                            ? "passed"
                            : ""
                        }
                      >

                        {passwordChecks.lowercase
                          ? "✓"
                          : "○"
                        }

                        {" "}Lowercase letter

                      </span>



                      <span
                        className={
                          passwordChecks.number
                            ? "passed"
                            : ""
                        }
                      >

                        {passwordChecks.number
                          ? "✓"
                          : "○"
                        }

                        {" "}Number

                      </span>



                      <span
                        className={
                          passwordChecks.special
                            ? "passed"
                            : ""
                        }
                      >

                        {passwordChecks.special
                          ? "✓"
                          : "○"
                        }

                        {" "}Special character

                      </span>


                    </div>

                  </div>

                )}

              </div>



              {/* =====================================
                  CONFIRM PASSWORD
              ====================================== */}

              <div className="peach-form-group">

                <label htmlFor="confirm-password">
                  Confirm Password
                </label>


                <div className="peach-input-wrapper">

                  <span className="peach-input-icon">
                    ✓
                  </span>


                  <input
                    id="confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    disabled={loading}
                    minLength="8"
                    required
                  />


                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >

                    {showConfirmPassword
                      ? "Hide"
                      : "Show"
                    }

                  </button>

                </div>



                {/* PASSWORD MATCH MESSAGE */}

                {formData.confirmPassword && (

                  <div
                    className={
                      formData.password ===
                      formData.confirmPassword
                        ? "register-password-match"
                        : "register-password-mismatch"
                    }
                  >

                    {formData.password ===
                    formData.confirmPassword
                      ? "✓ Passwords match"
                      : "✕ Passwords do not match"
                    }

                  </div>

                )}

              </div>



              {/* =====================================
                  REGISTER BUTTON
              ====================================== */}

              <button
                type="submit"
                className="peach-auth-button register-submit-button"
                disabled={loading}
              >

                {loading ? (

                  <>

                    <span className="auth-button-loader" />

                    Creating Account...

                  </>

                ) : (

                  <>

                    Create Account

                    <span className="auth-button-arrow">
                      →
                    </span>

                  </>

                )}

              </button>

            </form>



            {/* DIVIDER */}

            <div className="auth-divider">

              <span />

              <p>
                Already a member?
              </p>

              <span />

            </div>



            {/* LOGIN */}

            <Link
              to="/login"
              className="create-account-button"
            >
              Sign In to Your Account
            </Link>



            <p className="auth-security-note">
              🔒 Your account information is
              protected with secure authentication.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}


export default Register;