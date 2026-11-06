import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = Router();
const makeToken = (user) => jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const safeUser = (user) => ({ id: user._id, name: user.name, email: user.email });
const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{9,}$/;

const mailer = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: "Name, email and password are required." });
    if (!passwordPolicy.test(password)) return res.status(400).json({ message: "Password must be at least 9 characters and include uppercase, lowercase, a number and a special character." });
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: makeToken(user), user: safeUser(user) });
  } catch (error) { res.status(500).json({ message: "Could not create account." }); }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: (req.body.email || "").toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) return res.status(401).json({ message: "Invalid email or password." });
    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch { res.status(500).json({ message: "Could not sign in." }); }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = (req.body?.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email address is required." });

    const user = await User.findOne({ email });
    // Do not disclose whether an account exists.
    const genericMessage = "If an account exists for that email, a password reset link has been sent.";
    if (!user) return res.json({ message: genericMessage });

    const transport = mailer();
    if (!transport) {
      return res.status(503).json({ message: "Password recovery email is not configured yet. Add SMTP settings to the server environment and try again." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const clientOrigin = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
    const resetUrl = `${clientOrigin}/?resetToken=${rawToken}`;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transport.sendMail({
      from,
      to: user.email,
      subject: "Reset your MindVault password",
      text: `Hello ${user.name},\n\nUse this link to reset your MindVault password. It expires in 15 minutes:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Hello ${user.name.replace(/[&<>"]/g, "")},</p><p>Use the link below to reset your MindVault password. It expires in <strong>15 minutes</strong>.</p><p><a href="${resetUrl}">Reset my password</a></p><p>If you did not request this, you can ignore this email.</p>`
    });
    return res.json({ message: genericMessage });
  } catch (error) {
    console.error("Password recovery request failed:", error.message);
    return res.status(500).json({ message: "Could not send the password recovery email. Please try again later." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ message: "Reset token and new password are required." });
    if (!passwordPolicy.test(password)) return res.status(400).json({ message: "Password must be at least 9 characters and include uppercase, lowercase, a number and a special character." });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });
    if (!user) return res.status(400).json({ message: "This password reset link is invalid or has expired. Request a new one." });

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    return res.json({ message: "Password reset successfully. You can now sign in." });
  } catch (error) {
    return res.status(500).json({ message: "Could not reset password." });
  }
});

router.post("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new passwords are required." });
    if (!passwordPolicy.test(newPassword)) return res.status(400).json({ message: "New password must be at least 9 characters and include uppercase, lowercase, a number and a special character." });
    const user = await User.findById(req.userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ message: "Current password is incorrect." });
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: "Password updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Could not update password." });
  }
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.userId).select("name email");
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json(safeUser(user));
});

export default router;
