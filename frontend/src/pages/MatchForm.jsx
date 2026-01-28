import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate, useParams } from "react-router-dom";

export default function MatchForm({ mode }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [match_date, setMatchDate] = useState("");
  const [opponent_name, setOpponentName] = useState("");
  const [result, setResult] = useState("W");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => {
    async function loadMatch() {
      if (mode !== "edit") return;
      setLoading(true);
      setError("");
      try {
        const data = await api.getMatch(id);
        const m = data.match;
        setMatchDate(m.match_date);
        setOpponentName(m.opponent_name);
        setResult(m.result);
        setScore(m.score || "");
        setNotes(m.notes || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadMatch();
  }, [mode, id]);

  async function submit(e) {
    e.preventDefault();
    setError("");

    const payload = {
      match_date,
      opponent_name,
      result,
      score: score || null,
      notes: notes || null,
    };

    try {
      if (mode === "create") {
        await api.createMatch(payload);
      } else {
        await api.updateMatch(id, payload);
      }
      navigate("/matches");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>{mode === "create" ? "Add Match" : "Edit Match"}</h2>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label>
          Match date (YYYY-MM-DD)
          <input value={match_date} onChange={(e) => setMatchDate(e.target.value)} placeholder="2026-01-26" />
        </label>

        <label>
          Opponent name
          <input value={opponent_name} onChange={(e) => setOpponentName(e.target.value)} placeholder="Opponent" />
        </label>

        <label>
          Result
          <select value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="W">W</option>
            <option value="L">L</option>
          </select>
        </label>

        <label>
          Score (optional)
          <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="6-4 3-6 10-8" />
        </label>

        <label>
          Notes (optional)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="What went well / what to improve…" />
        </label>

        {error && <div style={{ color: "crimson" }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit">{mode === "create" ? "Create" : "Save"}</button>
          <button type="button" onClick={() => navigate("/matches")}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
