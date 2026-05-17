import mongoose from "mongoose";

const immutableOperationError = new Error("Events are append-only and cannot be modified or deleted.");

const eventSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    eventType: { type: String, required: true, trim: true, index: true },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    sequence: { type: Number, required: true, min: 1 },
    previousEventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    previousEventHash: { type: String, default: null },
    currentHash: { type: String, required: true, index: true },
    createdBy: {
      role: { type: String, enum: ["internal", "partner"], required: true },
      partnerId: { type: String, default: null },
      subject: { type: String, default: "system" }
    }
  },
  { timestamps: true }
);

eventSchema.index({ productId: 1, sequence: 1 }, { unique: true });
eventSchema.index({ productId: 1, occurredAt: 1 });

const forbiddenModelMethods = [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "findByIdAndUpdate",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
  "findByIdAndDelete"
];

for (const method of forbiddenModelMethods) {
  eventSchema.pre(method, function immutableGuard(next) {
    next(immutableOperationError);
  });
}

export const Event = mongoose.model("Event", eventSchema);
