import cors from "cors";
import express from "express";
import morgan from "morgan";
import productRoutes from "./routes/products.routes.js";
import { HttpError } from "./utils/errors.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", productRoutes);

app.use((_req, _res, next) => {
  next(new HttpError(404, "Route not found."));
});

app.use((err, _req, res, _next) => {
  if (err?.name === "ValidationError") {
    return res.status(400).json({ error: "Validation error", details: err.message });
  }

  if (err?.code === 11000) {
    return res.status(409).json({ error: "Duplicate key error", details: err.keyValue });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  return res.status(500).json({ error: "Internal server error." });
});
