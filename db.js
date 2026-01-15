// db.js
// This file sets up a connection to PostgreSQL

const { Client } = require("pg");

// Replace these values if your Postgres username or password is different
const client = new Client({
  host: "localhost",
  port: 5432,
  user: "shauryaluthra",   // your Postgres username
  password: "",             // your Postgres password, leave empty if none
  database: "tennis_tracker"
});

// Connect to the database
client.connect()
  .then(() => console.log("Connected to Postgres database!"))
  .catch(err => console.error("Database connection error:", err));

module.exports = client;
