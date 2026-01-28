import { useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

export default function Signup({ onSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.signup(email, password);
      // After signup, log in automatically for a smooth UX
      const data = await api.login(email, password);
      onSignup(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>Signup</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </label>

        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Choose a password" />
        </label>

        {error && <div style={{ color: "crimson" }}>{error}</div>}

        <button type="submit">Create account</button>

        <div style={{ color: "#555" }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}
