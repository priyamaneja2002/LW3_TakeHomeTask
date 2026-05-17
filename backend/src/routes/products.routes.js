import { Router } from "express";
import {
  appendEvent,
  createProduct,
  getProduct,
  listProducts,
  verifyProduct
} from "../controllers/products.controller.js";
import { authenticate, requireInternal } from "../middlewares/auth.middleware.js";
import { apiRateLimit } from "../middlewares/rate-limit.middleware.js";

const router = Router();

router.use(authenticate);
router.use(apiRateLimit);

router.post("/products", requireInternal, createProduct);
router.post("/products/:id/events", requireInternal, appendEvent);
router.get("/products/:id", getProduct);
router.get("/products", listProducts);
router.get("/products/:id/verify", verifyProduct);

export default router;
