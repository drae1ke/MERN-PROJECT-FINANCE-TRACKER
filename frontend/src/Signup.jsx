import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import api from "./api";

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const { data } = await api.post("/auth/signup", form);
      navigate("/signin", {
        replace: true,
        state: { message: data.msg },
      });
    } catch (error) {
      setMessage(error.response?.data?.msg || "Sign up failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Fresh start"
      title="Build a monthly plan that fits Kenyan life."
      subtitle="Start with one account, one budget, and a clearer picture of how your money moves across transport, rent, bundles, and everyday essentials."
      sideTitle="What changes after sign-up"
      sideCopy="You’ll land in a cleaner dashboard with local categories, KES formatting, better validation, and a more practical flow for reviewing expenses."
      highlights={[
        { value: "Secure", label: "Hashed passwords" },
        { value: "Responsive", label: "Mobile friendly" },
        { value: "Actionable", label: "Daily spend view" },
      ]}
      footerText="Already have an account?"
      footerLinkTo="/signin"
      footerLinkLabel="Sign in"
    >
      <div className="form-header">
        <h2>Create account</h2>
        <p>Set up your finance space in less than a minute.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Username</span>
          <input
            type="text"
            placeholder="e.g. Wanjiku"
            value={form.username}
            required
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
        </label>

        <label>
          <span>Email address</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            required
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>

        <label>
          <span>Password</span>
          <div className="password-row">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              value={form.password}
              required
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <button
              className="ghost-button inline-button"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {message ? <p className="form-message error">{message}</p> : null}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
};

export default Signup;
