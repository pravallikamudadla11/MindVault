import { Router } from "express";
import Collection from "../models/Collection.js";
import Resource from "../models/Resource.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

router.get("/", async (req, res) => {
  const collections = await Collection.find({ user: req.userId }).sort({ name: 1 }).lean();
  res.json(collections);
});

router.post("/", async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Collection name is required." });
  const collection = await Collection.create({ user: req.userId, name, description: req.body.description || "" });
  res.status(201).json(collection);
});

router.patch("/:id", async (req, res) => {
  const set = {};
  const update = {};
  if (req.body.name !== undefined) set.name = String(req.body.name).trim();
  if (req.body.description !== undefined) set.description = req.body.description;
  if (req.body.resourceId) {
    const resource = await Resource.findOne({ _id: req.body.resourceId, user: req.userId, trashed: false });
    if (!resource) return res.status(404).json({ message: "Resource not found." });
    update.$addToSet = { resources: resource._id };
  }
  if (Object.keys(set).length) update.$set = set;
  const collection = await Collection.findOneAndUpdate({ _id: req.params.id, user: req.userId }, update, { new: true });
  if (!collection) return res.status(404).json({ message: "Collection not found." });
  res.json(collection);
});

router.delete("/:id", async (req, res) => {
  const result = await Collection.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!result) return res.status(404).json({ message: "Collection not found." });
  res.json({ message: "Collection deleted." });
});

export default router;
