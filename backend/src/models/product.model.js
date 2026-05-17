import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerPartnerId: { type: String, required: true, index: true },
    serialNumber: { type: String, required: true, unique: true, trim: true },
    currentStatus: { type: String, required: true, default: "manufactured", index: true },
    currentEventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    manufacturedAt: { type: Date, default: Date.now, index: true },
    lastEventAt: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

productSchema.index({ ownerPartnerId: 1, currentStatus: 1, lastEventAt: -1, _id: -1 });
productSchema.index({ currentStatus: 1, lastEventAt: -1, _id: -1 });
productSchema.index({ lastEventAt: -1, _id: -1 });
productSchema.index({ createdAt: -1 });

export const Product = mongoose.model("Product", productSchema);
