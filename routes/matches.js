// routes/matches.js
const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/requireAuth");
const { isValidISODate, cleanTrimmedString } = require("../validators");

const router = express.Router();

// POST /matches (protected)
router.post("/matches", requireAuth, async (req, res) => {
  const { match_date, opponent_name, result, score, notes } = req.body;
  const cleanOpponent = cleanTrimmedString(opponent_name);

  if (!match_date || !cleanOpponent || !result) {
    return res.status(400).json({
      error: "match_date, opponent_name, and result are required",
    });
  }

  if (result !== "W" && result !== "L") {
    return res.status(400).json({ error: "result must be 'W' or 'L'" });
  }

  if (!isValidISODate(match_date)) {
    return res
      .status(400)
      .json({ error: "match_date must be a real date in YYYY-MM-DD format" });
  }

  try {
    const insertResult = await db.query(
      `INSERT INTO matches (user_id, match_date, opponent_name, result, score, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, match_date, opponent_name, result, score, notes, created_at`,
      [
        req.userId,
        match_date,
        cleanOpponent,
        result,
        score || null,
        notes || null,
      ]
    );

    return res.status(201).json({ match: insertResult.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create match" });
  }
});

// GET /matches (protected) with filters
router.get("/matches", requireAuth, async (req, res) => {
  try {
    const { opponent, result, from, to } = req.query;

    if (from && !isValidISODate(from)) {
      return res.status(400).json({
        error: "from must be a real date in YYYY-MM-DD format",
      });
    }

    if (to && !isValidISODate(to)) {
      return res.status(400).json({
        error: "to must be a real date in YYYY-MM-DD format",
      });
    }

    const conditions = ["user_id = $1"];
    const values = [req.userId];
    let i = 2;

    if (opponent) {
      conditions.push(`TRIM(opponent_name) ILIKE $${i}`);
      values.push(cleanTrimmedString(opponent));
      i++;
    }

    if (result) {
      if (result !== "W" && result !== "L") {
        return res.status(400).json({ error: "result must be 'W' or 'L'" });
      }
      conditions.push(`result = $${i}`);
      values.push(result);
      i++;
    }

    if (from) {
      conditions.push(`match_date >= $${i}`);
      values.push(from);
      i++;
    }

    if (to) {
      conditions.push(`match_date <= $${i}`);
      values.push(to);
      i++;
    }

    const sql = `
      SELECT id,
             to_char(match_date, 'YYYY-MM-DD') AS match_date,
             opponent_name, result, score, notes, created_at
      FROM matches
      WHERE ${conditions.join(" AND ")}
      ORDER BY match_date DESC, id DESC
    `;

    const dbRes = await db.query(sql, values);
    return res.json({ matches: dbRes.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// GET /matches/:id (protected)
router.get("/matches/:id", requireAuth, async (req, res) => {
  const matchId = Number(req.params.id);

  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: "Match id must be an integer" });
  }

  try {
    const result = await db.query(
      `SELECT id,
              to_char(match_date, 'YYYY-MM-DD') AS match_date,
              opponent_name, result, score, notes, created_at
       FROM matches
       WHERE id = $1 AND user_id = $2`,
      [matchId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }

    return res.json({ match: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch match" });
  }
});

// PUT /matches/:id (protected)
router.put("/matches/:id", requireAuth, async (req, res) => {
  const matchId = Number(req.params.id);
  const { match_date, opponent_name, result, score, notes } = req.body;

  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: "Match id must be an integer" });
  }

  const cleanOpponent = cleanTrimmedString(opponent_name);

  if (!match_date || !cleanOpponent || !result) {
    return res.status(400).json({
      error: "match_date, opponent_name, and result are required",
    });
  }

  if (result !== "W" && result !== "L") {
    return res.status(400).json({ error: "result must be 'W' or 'L'" });
  }

  if (!isValidISODate(match_date)) {
    return res
      .status(400)
      .json({ error: "match_date must be a real date in YYYY-MM-DD format" });
  }

  try {
    const updateResult = await db.query(
      `UPDATE matches
       SET match_date = $1,
           opponent_name = $2,
           result = $3,
           score = $4,
           notes = $5
       WHERE id = $6 AND user_id = $7
       RETURNING id, match_date, opponent_name, result, score, notes, created_at`,
      [
        match_date,
        cleanOpponent,
        result,
        score || null,
        notes || null,
        matchId,
        req.userId,
      ]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }

    return res.json({ match: updateResult.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update match" });
  }
});

// DELETE /matches/:id (protected)
router.delete("/matches/:id", requireAuth, async (req, res) => {
  const matchId = Number(req.params.id);

  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: "Match id must be an integer" });
  }

  try {
    const deleteResult = await db.query(
      `DELETE FROM matches
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [matchId, req.userId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }

    return res.json({ message: "Match deleted", id: deleteResult.rows[0].id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete match" });
  }
});

module.exports = router;
