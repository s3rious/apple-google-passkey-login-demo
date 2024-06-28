import appleSignIn from "apple-signin-auth";
import express from "express";
import jwt from "jsonwebtoken";

import { authenticateToken, loadUserData, saveUserData } from "./utils.js";

const appleRouter = express.Router();

// Constructs the authorization URL using apple-signin-auth.getAuthorizationUrl(options)
// with necessary parameters like clientID, redirectUri, and scope.
function getAppleSignInUrl(callbackUri) {
  const options = {
    clientID: process.env.APPLE_CLIENT_ID,
    redirectUri: `${process.env.ORIGIN}${callbackUri}`,
    scope: "email name",
  };

  return appleSignIn.getAuthorizationUrl(options);
}

async function getAppleSignInDataByCode(code, callbackUri) {
  try {
    /**
     Exchange code for tokens:
     * The server generates a client secret using apple-signin-auth.getClientSecret with parameters
     like clientID, teamID, privateKey, and keyIdentifier.
     * The server exchanges the authorization code for an access token and ID token
     by making a request to Apple's token endpoint.
     */
    const clientSecret = appleSignIn.getClientSecret({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      keyIdentifier: process.env.APPLE_PRIVATE_KEY_ID,
    });

    const options = {
      clientID: process.env.APPLE_CLIENT_ID,
      redirectUri: `${process.env.ORIGIN}${callbackUri}`,
      clientSecret,
    };

    /**
     Verify ID token:
     * The server verifies the ID token using apple-signin-auth.verifyIdToken.
     * The verified ID token contains user information like sub (unique identifier) and email.
     */
    const tokenResponse = await appleSignIn.getAuthorizationToken(
      code,
      options,
    );

    return await appleSignIn.verifyIdToken(tokenResponse.id_token, {
      audience: process.env.APPLE_CLIENT_ID,
    });
  } catch (error) {
    throw new Error("Failed to get apple client data", { cause: error });
  }
}

/**
 Initiate authorization request:
 * The user navigates to the Apple login page by accessing the /auth/apple endpoint.
 * The user is redirected to the Apple authorization URL where they log in with their Apple ID.
 */
appleRouter.get("/", (_req, res) => {
  res.redirect(getAppleSignInUrl("/auth/apple/callback"));
});

/**
 Handle callback:
 * After successful login, Apple redirects the user to the callback URL specified in redirectUri with an authorization code.
 * The callback endpoint (/auth/apple/callback) receives this authorization code, gets apple data and processes the user.
 */
appleRouter.post("/callback", async (req, res) => {
  const { code } = req.body;

  try {
    const appleSignInData = await getAppleSignInDataByCode(
      code,
      "/auth/apple/callback",
    );

    // The server checks if the user exists in the database based on the sub value.
    const users = await loadUserData();
    let user = users.find((u) => u.apple?.sub === appleSignInData.sub);

    // If the user doesn't exist, a new user is created with the provided email and Apple ID information.
    if (!user) {
      user = {
        email: appleSignInData.email,
        password: null,
        apple: appleSignInData,
      };

      users.push(user);
    }
    // If the user exists, the Apple ID information is updated.
    else {
      user.apple = appleSignInData;
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
 * The user navigates to the Apple login page by accessing the /auth/apple/link endpoint.
 * The user is redirected to the Apple authorization URL where they log in with their Apple ID.
 */
appleRouter.get("/link", authenticateToken, (_req, res) => {
  res.redirect(getAppleSignInUrl("/auth/apple/link/callback"));
});

/**
 Handle linking callback:
 * After successful login, Apple redirects the user to the callback URL specified in redirectUri with an authorization code.
 * The callback endpoint (/auth/apple/callback/link) receives this authorization code, gets apple data and processes the user.
 */
appleRouter.post("/link/callback", authenticateToken, async (req, res) => {
  const { code } = req.body;

  try {
    const appleSignInData = await getAppleSignInDataByCode(
      code,
      "/auth/apple/link/callback",
    );

    // The server gets the user by their email.
    const users = await loadUserData();
    const user = users.find((u) => u.email === req.user.email);

    // If user somehow not found, raise the error.
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // If the user exists, the Apple ID information is updated.
    user.apple = appleSignInData;
    await saveUserData(users);

    // Redirect user back to the dasbhoard
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Error:", err);
    res.redirect("/login");
  }
});

export { appleRouter };
