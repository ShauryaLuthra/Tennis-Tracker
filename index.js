const { isValidISODate, cleanTrimmedString } = require("./validators");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const express = require("express");
const bcrypt = require("bcrypt"); // password hashing
const db = require("./db"); // PostgreSQL connection (client)

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in .env");
}

const app = express();
app.use(express.json());
app.use(cookieParser());

// ==============================
// Auth middleware
// ==============================
function requireAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post("/signup", async (req, res) => {
  // Read input from the request body
  const { email, password } = req.body;

  // Normalize email: trim spaces + lowercase
  // Why: users often type spaces / caps. Normalizing prevents duplicates like "A@a.com" vs "a@a.com".
  const cleanEmail = cleanTrimmedString(email).toLowerCase();

  // Validate required fields
  if (!cleanEmail || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Hash password before storing (never store raw passwords)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert normalized email
    const result = await db.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [cleanEmail, hashedPassword]
    );

    return res.status(201).json({
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    // Postgres unique violation (email already exists)
    if (error.code === "23505") {
      return res.status(400).json({ message: "Email already exists" });
    }

    return res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Normalize email the same way as signup
  // Why: if you stored lowercase at signup, login must query lowercase too.
  const cleanEmail = cleanTrimmedString(email).toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Query by normalized email
    const result = await db.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    // Cookie holds JWT (HTTP-only so JS can't read it)
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true only with HTTPS in production
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: "Login successful",
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Login failed" });
  }
});



app.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await db.query("SELECT id, email FROM users WHERE id = $1", [
      req.userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  });

  res.json({ message: "Logged out" });
});

// ==============================
// Matches endpoints (protected)
// ==============================

// Create a new match for the logged-in user
app.post("/matches", requireAuth, async (req, res) => {
  const { match_date, opponent_name, result, score, notes } = req.body;

  // Normalize opponent name
  const cleanOpponent = cleanTrimmedString(opponent_name);

  // Required fields
  if (!match_date || !cleanOpponent || !result) {
    return res.status(400).json({
      error: "match_date, opponent_name, and result are required",
    });
  }

  // Validate result
  if (result !== "W" && result !== "L") {
    return res.status(400).json({ error: "result must be 'W' or 'L'" });
  }

  // Validate date format and that it's a real date (prevents DB errors/500s)
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
        cleanOpponent,          // use cleaned value
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

app.get("/matches", requireAuth, async (req, res) => {
  try {
    const { opponent, result, from, to } = req.query;

    // Validate date filters early so you return 400 (not random 500)
    if (from && !isValidISODate(from)) {
      return res.status(400).json({ error: "from must be a real date in YYYY-MM-DD format" });
    }
    if (to && !isValidISODate(to)) {
      return res.status(400).json({ error: "to must be a real date in YYYY-MM-DD format" });
    }

    const conditions = ["user_id = $1"];
    const values = [req.userId];
    let i = 2;

    if (opponent) {
      // Note: this matches EXACTLY the cleaned text. If you want "contains", use `%${...}%` later.
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


// Get ONE match by id (only if it belongs to the logged-in user)
app.get("/matches/:id", requireAuth, async (req, res) => {
  const matchId = Number(req.params.id);

  // Validate the URL param is a number
  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: "Match id must be an integer" });
  }

  try {
    // Only return the match if it belongs to this user
    const result = await db.query(
        `SELECT id,
        to_char(match_date, 'YYYY-MM-DD') AS match_date,
        opponent_name, result, score, notes, created_at
        FROM matches
        WHERE id = $1 AND user_id = $2`,
        [matchId, req.userId]
    );


    if (result.rows.length === 0) {
      // Either it doesn't exist OR it's not owned by you
      return res.status(404).json({ error: "Match not found" });
    }

    res.json({ match: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch match" });
  }
});


app.put("/matches/:id", requireAuth, async (req, res) => {
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
        cleanOpponent,        // use cleaned value
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


// Delete ONE match (only if it belongs to the logged-in user)
app.delete("/matches/:id", requireAuth, async (req, res) => {
  const matchId = Number(req.params.id);

  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: "Match id must be an integer" });
  }

  try {
    // Delete only if owned by user
    const deleteResult = await db.query(
      `DELETE FROM matches
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [matchId, req.userId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json({ message: "Match deleted", id: deleteResult.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete match" });
  }
});


// ==============================
// Opponent summary (protected)
// ==============================

// For the logged-in user, show stats grouped by opponent
app.get("/opponents/summary", requireAuth, async (req, res) => {
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

    res.json({ opponents: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch opponent summary" });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});