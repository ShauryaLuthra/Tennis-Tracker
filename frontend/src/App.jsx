import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Matches from "./pages/Matches";
import MatchForm from "./pages/MatchForm";

function ProtectedRoute({ user, children }) {
  if (user === undefined) return null; // still loading
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in
  const navigate = useNavigate();

  useEffect(() => {
    api.me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await api.logout();
    setUser(null);
    navigate("/login");
  }

  return (
    <div style={{ maxWidth: 1050, margin: "0 auto", padding: 28 }}>
      <header style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, padding: "14px 16px", border: "1px solid #e2e8f0", borderRadius: 14, background: "white",}}>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link to="/" style={{ textDecoration: "none", fontWeight: 900, fontSize: 18, color: "#0b6b3a" }}>
          Tennis Tracker
          </Link>
          {user && (
            <>
              <Link to="/matches">Matches</Link>
              <Link to="/matches/new">Add Match</Link>
            </>
          )}
        </div>

        <div>
          {user ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ color: "#555" }}>{user.email}</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <Link to="/login">Login</Link>
              <Link to="/signup">Signup</Link>
            </div>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to={user ? "/matches" : "/login"} replace />} />

        <Route path="/login" element={<Login onLogin={(u) => { setUser(u); navigate("/matches"); }} />} />
        <Route path="/signup" element={<Signup onSignup={(u) => { setUser(u); navigate("/matches"); }} />} />

        <Route
          path="/matches"
          element={
            <ProtectedRoute user={user}>
              <Matches />
            </ProtectedRoute>
          }
        />

        <Route
          path="/matches/new"
          element={
            <ProtectedRoute user={user}>
              <MatchForm mode="create" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/matches/:id/edit"
          element={
            <ProtectedRoute user={user}>
              <MatchForm mode="edit" />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<div>Not found</div>} />
      </Routes>
    </div>
  );
}
