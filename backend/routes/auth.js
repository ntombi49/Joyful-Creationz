const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { clearAdminCookie, isAdminRequest, setAdminCookie } = require("../middleware/adminAuth");

function validateAdminPassword(password) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return false;
  }

  const left = Buffer.from(String(password || ""));
  const right = Buffer.from(String(expectedPassword));

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

router.get("/me", (req, res) => {
  res.json({ authenticated: isAdminRequest(req) });
});

router.post("/login", (req, res) => {
  const password = String(req.body?.password || "");

  if (!password.trim()) {
    return res.status(400).json({ message: "Password is required." });
  }

  if (!validateAdminPassword(password)) {
    return res.status(401).json({ message: "Incorrect admin password." });
  }

  setAdminCookie(res);
  return res.json({ message: "Admin access granted.", authenticated: true });
});

router.post("/logout", (req, res) => {
  clearAdminCookie(res);
  return res.json({ message: "Logged out successfully." });
});

module.exports = router;
