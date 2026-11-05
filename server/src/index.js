import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import resourceRoutes from "./routes/resources.js";
import collectionRoutes from "./routes/collections.js";
import auth from "./middleware/auth.js";
import Resource from "./models/Resource.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.resolve("uploads")));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "MindVault API" }));
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/collections", collectionRoutes);

app.get("/api/dashboard", auth, async (req, res) => {
  try {
    const active = await Resource.find({ user: req.userId, trashed: false, archived: false }).lean();
    const all = await Resource.find({ user: req.userId }).lean();
    const recent = active.filter(x => x.viewedAt).sort((a,b) => new Date(b.viewedAt)-new Date(a.viewedAt)).slice(0,5);
    res.json({
      total: active.length,
      links: active.filter(x => x.type === "link").length,
      notes: active.filter(x => x.type === "note").length,
      files: active.filter(x => x.type === "file").length,
      favorites: active.filter(x => x.favorite).length,
      archived: all.filter(x => x.archived && !x.trashed).length,
      trash: all.filter(x => x.trashed).length,
      storageBytes: active.reduce((sum,x) => sum + (x.fileSize || 0), 0),
      recent
    });
  } catch { res.status(500).json({ message: "Could not load dashboard." }); }
});

const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"), err => { if (err) res.status(404).send("MindVault client build not found. Run npm run build."); });
});

console.log("Starting MindVault API...");
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(port, "0.0.0.0", () => {
      console.log(`MindVault API running on port ${port}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });