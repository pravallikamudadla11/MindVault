import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import Resource from "../models/Resource.js";
import Collection from "../models/Collection.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const allowed = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/png", "image/jpeg", "image/webp"]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, allowed.has(file.mimetype))
});

const parseTags = (tags) => Array.isArray(tags) ? tags : String(tags || "").split(",");
const cleanTags = (tags) => [...new Set(parseTags(tags).map(t => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
const baseQuery = (userId) => ({ user: userId });

router.get("/", async (req, res) => {
  try {
    const { search = "", type, category, view = "active", sort = "newest", favorite, collection } = req.query;
    const query = baseQuery(req.userId);
    if (view === "trash") query.trashed = true;
    else if (view === "archive") { query.archived = true; query.trashed = false; }
    else { query.trashed = false; query.archived = false; }
    if (view === "recent") query.viewedAt = { $ne: null };
    if (type && type !== "all") query.type = type;
    if (category && category !== "all") query.category = category;
    if (favorite === "true") query.favorite = true;
    if (search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: rx }, { description: rx }, { content: rx }, { category: rx }, { tags: rx }];
    }
    if (collection) {
      const found = await Collection.findOne({ _id: collection, user: req.userId });
      if (!found) return res.json([]);
      query._id = { $in: found.resources };
    }
    const sortMap = { newest: { pinned: -1, createdAt: -1 }, oldest: { createdAt: 1 }, title: { title: 1 }, viewed: { viewedAt: -1, createdAt: -1 } };
    const items = await Resource.find(query).sort(sortMap[sort] || sortMap.newest).lean();
    res.json(items);
  } catch { res.status(500).json({ message: "Could not load resources." }); }
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { title, description, type, url, content, category, tags } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "A title is required." });
    if (!["link", "note", "file"].includes(type)) return res.status(400).json({ message: "Choose a valid resource type." });
    if (type === "link" && !/^https?:\/\/.+/i.test(url || "")) return res.status(400).json({ message: "Enter a valid URL beginning with http:// or https://." });
    if (type === "file" && !req.file) return res.status(400).json({ message: "Choose a file to upload." });
    const item = await Resource.create({
      user: req.userId, title: title.trim(), description: description || "", type,
      url: type === "link" ? url : "",
      content: type === "note" ? (content || "") : "",
      category: category?.trim() || "Uncategorized", tags: cleanTags(tags),
      ...(req.file ? { fileName: req.file.originalname, filePath: `/uploads/${req.file.filename}`, mimeType: req.file.mimetype, fileSize: req.file.size } : {})
    });
    res.status(201).json(item);
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ message: "Could not save resource." });
  }
});

router.get("/:id", async (req, res) => {
  const item = await Resource.findOne({ _id: req.params.id, user: req.userId });
  if (!item) return res.status(404).json({ message: "Resource not found." });
  item.viewedAt = new Date();
  await item.save();
  res.json(item);
});

router.patch("/:id", upload.single("file"), async (req, res) => {
  try {
    const allowedFields = ["title", "description", "url", "content", "category", "tags", "favorite", "pinned", "archived", "trashed"];
    const updates = {};
    for (const key of allowedFields) if (req.body[key] !== undefined) updates[key] = key === "tags" ? cleanTags(req.body[key]) : req.body[key];
    if (req.file) Object.assign(updates, { fileName: req.file.originalname, filePath: `/uploads/${req.file.filename}`, mimeType: req.file.mimetype, fileSize: req.file.size });
    if (updates.title !== undefined && !String(updates.title).trim()) return res.status(400).json({ message: "Title cannot be empty." });
    const item = await Resource.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { $set: updates }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Resource not found." });
    res.json(item);
  } catch { res.status(500).json({ message: "Could not update resource." }); }
});

router.patch("/:id/restore", async (req, res) => {
  const item = await Resource.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { $set: { trashed: false, archived: false } }, { new: true });
  if (!item) return res.status(404).json({ message: "Resource not found." });
  res.json(item);
});

router.delete("/:id", async (req, res) => {
  const item = await Resource.findOne({ _id: req.params.id, user: req.userId });
  if (!item) return res.status(404).json({ message: "Resource not found." });
  if (item.trashed) {
    if (item.filePath) {
      const localPath = path.join(uploadDir, path.basename(item.filePath));
      fs.existsSync(localPath) && fs.unlink(localPath, () => {});
    }
    await Collection.updateMany({ user: req.userId }, { $pull: { resources: item._id } });
    await item.deleteOne();
    return res.json({ message: "Resource permanently deleted." });
  }
  item.trashed = true;
  await item.save();
  res.json({ message: "Moved to recycle bin.", item });
});

export default router;
