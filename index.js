const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const express = require("express");
const bcrypt = require("bcrypt"); // password hashing
const db = require("./db");       // PostgreSQL connection (client)

const JWT_SECRET = "replace_this_with_a_long_random_string";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1) Hash password (never store plain passwords)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2) Insert user into DB
    const result = await db.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, hashedPassword]
    );

    // 3) Respond (do NOT send password back)
    res.status(201).json({
      message: "User created successfully",
      user: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    // Duplicate email error (Postgres unique constraint)
    if (error.code === "23505") {
      return res.status(400).json({ message: "Email already exists" });
    }

    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1) Find user
    const result = await db.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    // 2) Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // 3) Success response
    // Create a token that stores the user's id (that's all we need)
    const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
    
    // Store token in an HTTP-only cookie (frontend JS can't read it)
    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // set true only when using HTTPS in production
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
        message: "Login successful",
        user: { id: user.id, email: user.email }
    });

} catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/me", (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ message: "Logged in", userId: payload.userId });
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
