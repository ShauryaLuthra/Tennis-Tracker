import { useEffect, useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api.listMatches();
      const s = await api.opponentSummary();

      setMatches(data.matches);
      setSummary(s.opponents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id) {
    const ok = confirm("Delete this match?");
    if (!ok) return;

    try {
      await api.deleteMatch(id);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  // Totals for dashboard
  const totalMatches = summary.reduce((a, b) => a + b.matches, 0);
  const totalWins = summary.reduce((a, b) => a + b.wins, 0);
  const totalLosses = summary.reduce((a, b) => a + b.losses, 0);
  const winRate = totalMatches ? Math.round((totalWins / totalMatches) * 100) : 0;

  return (
    <div>
      {/* Dashboard */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard label="Matches" value={totalMatches} />
        <StatCard label="Wins" value={totalWins} />
        <StatCard label="Losses" value={totalLosses} />
        <StatCard label="Win Rate" value={`${winRate}%`} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Matches</h2>
        <Link to="/matches/new">
          <button>Add match</button>
        </Link>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Opponent</th>
              <th>Result</th>
              <th>Score</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td>{m.match_date}</td>
                <td>{m.opponent_name}</td>

                {/* Wimbledon badge */}
                <td>
                  <span className={`badge ${m.result === "W" ? "badge-win" : "badge-loss"}`}>
                    {m.result === "W" ? "WIN" : "LOSS"}
                  </span>
                </td>

                <td>{m.score || "-"}</td>
                <td style={{ maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.notes || "-"}
                </td>

                <td style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Link to={`/matches/${m.id}/edit`}>
                    <button>Edit</button>
                  </Link>
                  <button onClick={() => onDelete(m.id)}>Delete</button>
                </td>
              </tr>
            ))}

            {matches.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 12, color: "#666" }}>
                  No matches yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Small reusable stat card
function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#0b6b3a" }}>{value}</div>
    </div>
  );
}