require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const matchRoutes = require("./routes/matches");
const opponentRoutes = require("./routes/opponents");

const app = express();

app.use(express.json());
app.use(cookieParser());

// Mount route files
// These routers already contain full paths like "/login", "/matches", etc.
app.use(authRoutes);
app.use(matchRoutes);
app.use(opponentRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
