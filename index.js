import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import express from "express";
import session from "express-session";

import { appleRouter } from "./apple.js";
import { authRouter } from "./auth.js";
import { googleRouter } from "./google.js";
import { passkeyRouter } from "./passkey.js";
import { authenticateToken, loadUserData } from "./utils.js";

// Set up paths for current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load HTTPS credentials
const key = await fs.readFile(process.env.HTTPS_PATH_TO_KEY, "utf8");
const cert = await fs.readFile(process.env.HTTPS_PATH_TO_CERT, "utf8");
const credentials = { key, cert };

const app = express();
const server = https.createServer(credentials, app);
const PORT = 443;

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  }),
);

// Serve login page
app.get("/login", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Serve dashboard page, requires authentication
app.get("/dashboard", authenticateToken, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Handle logout, clear JWT cookie
app.post("/logout", (_req, res) => {
  res.clearCookie("jwt");
  res.redirect("/login");
});

// Get user info, requires authentication
app.get("/user-info", authenticateToken, async (req, res) => {
  const users = await loadUserData();
  const user = users.find((u) => u.email === req.user?.email) ?? {};

  res.json({
    ...req.user,
    ...user,
  });
});

// Use routers for different authentication strategies
app.use("/auth", authRouter);
app.use("/auth/apple", appleRouter);
app.use("/auth/google", googleRouter);
app.use("/auth/passkey", passkeyRouter);

// Start HTTPS server
server.listen(PORT, () => {
  console.log(`Server is running on https://localhost:${PORT}`);
});
