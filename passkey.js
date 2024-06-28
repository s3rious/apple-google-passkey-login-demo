import crypto from "node:crypto";
import base64url from "base64url";
import express from "express";
import jwt from "jsonwebtoken";

import { authenticateToken, loadUserData, saveUserData } from "./utils.js";

export const passkeyRouter = express.Router();

// Verify login
passkeyRouter.post("/login", async (req, res) => {
  // Get user unique data, in that case email, from the request.
  const { email } = req.body;

  // The server gets the user by their email.
  const users = await loadUserData();
  const user = users.find((u) => u.email === email);

  // Check if user with that email exists.
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Check if user with that email has the passkey infomation/
  if (!user.passkey) {
    return res.status(404).json({ error: "User not found" });
  }

  // If valid, the server stores the public key and associated device information in the user's session
  const challenge = base64url(crypto.randomBytes(32));
  const options = {
    challenge,
    allowCredentials: [
      {
        // If passkey.rawId willn't match user would not be able to sign in
        id: user.passkey.rawId,
        type: "public-key",
      },
    ],
    timeout: 60000,
  };
  req.session.challenge = challenge;
  req.session.email = email;

  // Sends back login options for client to securely verify
  res.json(options);
});

// Finish login
passkeyRouter.post("/login/callback", async (req, res) => {
  // Find user by their passkey id
  const users = await loadUserData();
  const user = users.find((u) => u.passkey?.rawId === req.body.rawId);

  // If user somehow not found, raise the error.
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // A JWT token is generated and sent back to the user in a cookie,
  // which is used for subsequent authenticated requests.
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.cookie("jwt", token);

  // OK is sent back.
  res.json({ status: "ok" });
});

/**
 Initiate linking:
 * The user initiates the registration process by accessing the /auth/passkey/register endpoint.
*/
passkeyRouter.post("/link", authenticateToken, async (req, res) => {
  // The server gets the user by their email.
  const users = await loadUserData();
  const user = users.find((u) => u.email === req.user.email);

  // If user somehow not found, raise the error.
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // The server generates registration options using startRegistration with parameters
  // like rpName, rpID, user, and challenge.
  // The challenge is a random string used to ensure the registration process is secure.
  const challenge = base64url(crypto.randomBytes(32));
  const options = {
    challenge,
    rp: { name: "Passkey test" },
    user: {
      id: base64url(Buffer.from(user.email)),
      name: user.email,
      displayName: user.name ?? `User ${base64url(Buffer.from(user.email))}`,
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    timeout: 60000,
    attestation: "direct",
    authenticatorSelection: { authenticatorAttachment: "platform" },
  };

  // Saves the challenge to the session and sends the registration options back to the client.
  req.session.challenge = challenge;
  res.json(options);
});

/**
 Complete linking:
 * The client (browser) uses the WebAuthn API to prompt the user
   to create a new passkey (public-private key pair) on their device.
 * The client sends the response back to the server, which includes the newly created public key.
*/
passkeyRouter.post("/link/callback", authenticateToken, async (req, res) => {
  // Get WebAuthn data from the request
  const { id, rawId, response, type } = req.body;

  // The server gets the user by their email.
  const users = await loadUserData();
  const user = users.find((u) => u.email === req.user.email);

  // If user somehow not found, raise the error.
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // If the user exists, the passkey information is updated.
  user.passkey = { id, rawId, response, type };
  await saveUserData(users);

  // OK is sent back.
  res.json({ status: "ok" });
});
