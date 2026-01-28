import { useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api.login(email, password);
      // backend returns { message, user }
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>Login</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </label>

        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
        </label>

        {error && <div style={{ color: "crimson" }}>{error}</div>}

        <button type="submit">Login</button>

        <div style={{ color: "#555" }}>
          No account? <Link to="/signup">Create one</Link>
        </div>
      </form>
    </div>
  );
}
