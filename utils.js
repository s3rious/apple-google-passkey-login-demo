import fs from "node:fs/promises";
import jwt from "jsonwebtoken";

const loadUserData = async () => {
  try {
    const data = await fs.readFile("users.json", "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const saveUserData = async (users) => {
  await fs.writeFile("users.json", JSON.stringify(users, null, 2));
};

const authenticateToken = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.redirect("/login");
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.redirect("/login");
    }

    req.user = user;
    next();
  });
};

export { loadUserData, saveUserData, authenticateToken };
