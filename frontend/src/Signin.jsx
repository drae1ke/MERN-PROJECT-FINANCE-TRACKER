import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import api, { saveSession } from "./api";

const Signin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState(location.state?.message || "");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const { data } = await api.post("/auth/signin", form);
      saveSession(data);
      navigate("/", { replace: true });
    } catch (error) {
      setMessage(error.response?.data?.msg || "Sign in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Kenyan money clarity"
      title="Track every shilling with confidence."
      subtitle="Plan your monthly budget in KES, keep an eye on daily spend, and stay grounded in the categories that match life in Kenya."
      sideTitle="Built for day-to-day realities"
      sideCopy="From M-Pesa spending and airtime to matatu fare and rent, the tracker now gives you a cleaner home for everyday decisions."
      highlights={[
        { value: "KES", label: "Default currency" },
        { value: "M-Pesa", label: "Payment ready" },
        { value: "Month view", label: "Budget focused" },
      ]}
      footerText="New here?"
      footerLinkTo="/signup"
      footerLinkLabel="Create an account"
    >
      <div className="form-header">
        <h2>Sign in</h2>
        <p>Pick up where your budget left off.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
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
              placeholder="Enter your password"
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

        {message ? (
          <p className={`form-message ${message.toLowerCase().includes("success") ? "success" : "error"}`}>
            {message}
          </p>
        ) : null}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
};

export default Signin;
