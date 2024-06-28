import express from "express";
import jwt from "jsonwebtoken";

import { authenticateToken, loadUserData, saveUserData } from "./utils.js";

const googleRouter = express.Router();

// Constructs the authorization URL using parameters
// like client_id, redirect_uri, response_type, and scope.
function getGoogleSignInUrl(callbackUri) {
  const googleAuthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
  const scope = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");
  const params = [
    `?client_id=${process.env.GOOGLE_CLIENT_ID}`,
    `&redirect_uri=${process.env.ORIGIN}${callbackUri}`,
    "&response_type=code",
    `&scope=${scope}`,
  ].join("");

  return `${googleAuthEndpoint}${params}`;
}

async function getGoogleSignInDataByCode(code, redirectUri) {
  try {
    /**
     Exchange code for tokens:
     * The server exchanges the authorization code for an access token and ID token
     by making a request to Google's token endpoint.
     */
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.ORIGIN}${redirectUri}`,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenResponse.json();
    const { id_token } = tokenData;

    console.log(tokenResponse);

    /**
     Decode ID token:
     * The server decodes the ID token to extract user information
     like sub (unique identifier) and email.
     */
    return jwt.decode(id_token);
  } catch (error) {
    throw new Error("Failed to get google client data", { cause: error });
  }
}

/**
 Initiate authorization request:
 * The user navigates to the Google login page by accessing the /auth/google endpoint.
 * The user is redirected to the Google authorization URL where they log in with their Google account.
 */
googleRouter.get("/", (_req, res) => {
  res.redirect(getGoogleSignInUrl("/auth/google/callback"));
});

/**
 Handle callback:
 * After successful login, Google redirects the user to the callback URL specified in redirectUri with an authorization code.
 * The callback endpoint (/auth/google/callback) receives this authorization code, gets google data and processes the user.
 */
googleRouter.get("/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const googleSignInData = await getGoogleSignInDataByCode(
      code,
      "/auth/google/callback",
    );

    // The server checks if the user exists in the database based on the sub value.
    const users = await loadUserData();
    let user = users.find((u) => u.google?.sub === googleSignInData.sub);

    // If the user doesn't exist, a new user is created with the provided email and Goole account information.
    if (!user) {
      user = {
        email: googleSignInData.email,
        password: null,
        google: googleSignInData,
      };
      users.push(user);
    }
    // If the user exists, the Google account information is updated.
    else {
      user.google = googleSignInData;
    }

    // Saves new or updated user to the db
    await saveUserData(users);

    // A JWT token is generated and sent back to the user in a cookie,
    // which is used for subsequent authenticated requests.
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("jwt", token);

    // Redirect authenthicated user to the dasbhoard
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Error:", err);
    res.redirect("/login");
  }
});

/**
 Initiate linking request:
 * The user navigates to the Google login page by accessing the /auth/google/link endpoint.
 * The user is redirected to the Google authorization URL where they log in with their Google account.
 */
googleRouter.get("/link", authenticateToken, (_req, res) => {
  res.redirect(getGoogleSignInUrl("/auth/google/link/callback"));
});

/**
 Handle linking callback:
 * After successful login, Google redirects the user to the callback URL specified in redirectUri with an authorization code.
 * The callback endpoint (/auth/google/callback/link) receives this authorization code, gets google data and processes the user.
 */
googleRouter.get("/link/callback", authenticateToken, async (req, res) => {
  const { code } = req.query;

  try {
    const googleSignInData = await getGoogleSignInDataByCode(
      code,
      "/auth/google/link/callback",
    );

    console.log("@@googleSignInData", googleSignInData);

    // The server gets the user by their email.
    const users = await loadUserData();
    const user = users.find((u) => u.email === req.user.email);

    // If user somehow not found, raise the error
    if (!user) {
      throw new Error("User not found");
    }

    // If the user exists, the Google account information is updated.
    user.google = googleSignInData;
    await saveUserData(users);

    // Redirect user back to the dasbhoard
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Error:", err);
    res.redirect("/login");
  }
});

export { googleRouter };
