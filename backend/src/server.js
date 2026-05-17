import mongoose from "mongoose";
import { app } from "./app.js";
import { config } from "./config.js";

const start = async () => {
  await mongoose.connect(config.mongodbUri);
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${config.port}`);
  });
};

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", err);
  process.exit(1);
});
