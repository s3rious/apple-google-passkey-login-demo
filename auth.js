import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";

import { loadUserData, saveUserData } from "./utils.js";

export const authRouter = express.Router();

// Register a new user
authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const users = await loadUserData();
  const existingUser = users.find((u) => u.email === email);

  if (existingUser) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { email, password: hashedPassword };
  users.push(newUser);
  await saveUserData(users);

  const token = jwt.sign({ email: newUser.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  res.cookie("jwt", token);

  res.redirect("/dashboard");
});

// Login an existing user
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const users = await loadUserData();
  const user = users.find((u) => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  res.cookie("jwt", token);

  res.redirect("/dashboard");
});
