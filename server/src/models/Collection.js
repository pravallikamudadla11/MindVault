import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: "", maxlength: 300 },
  resources: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resource" }]
}, { timestamps: true });

export default mongoose.model("Collection", collectionSchema);
