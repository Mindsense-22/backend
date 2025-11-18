const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Test Route
app.get("/", (req, res) => {
  res.send("MindSense AI Backend is Running... 🧠");
});

module.exports = app;
