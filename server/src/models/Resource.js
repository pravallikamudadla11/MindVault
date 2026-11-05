import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: "", maxlength: 2000 },
  type: { type: String, enum: ["link", "note", "file"], required: true },
  url: { type: String, default: "" },
  content: { type: String, default: "" },
  fileName: { type: String, default: "" },
  filePath: { type: String, default: "" },
  mimeType: { type: String, default: "" },
  fileSize: { type: Number, default: 0 },
  category: { type: String, default: "Uncategorized", trim: true },
  tags: [{ type: String, trim: true, lowercase: true }],
  favorite: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  trashed: { type: Boolean, default: false },
  viewedAt: { type: Date, default: null }
}, { timestamps: true });

resourceSchema.index({ user: 1, title: "text", description: "text", content: "text", tags: "text" });
export default mongoose.model("Resource", resourceSchema);
