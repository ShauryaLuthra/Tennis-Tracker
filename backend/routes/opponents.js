// routes/opponents.js
const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// GET /opponents/summary (protected)
router.get("/opponents/summary", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         TRIM(opponent_name) AS opponent_name,
         COUNT(*)::int AS matches,
         SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END)::int AS wins,
         SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END)::int AS losses
       FROM matches
       WHERE user_id = $1
       GROUP BY TRIM(opponent_name)
       ORDER BY matches DESC, opponent_name ASC`,
      [req.userId]
    );

    return res.json({ opponents: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch opponent summary" });
  }
});

module.exports = router;
