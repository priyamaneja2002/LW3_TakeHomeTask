import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { forbidden, unauthorized } from "../utils/errors.js";

export const authenticate = (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(unauthorized("Missing bearer token."));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (!payload.role || !["internal", "partner"].includes(payload.role)) {
      return next(unauthorized("Invalid JWT role claim."));
    }
    req.user = payload;
    return next();
  } catch (_err) {
    return next(unauthorized("Invalid or expired token."));
  }
};

export const requireInternal = (req, _res, next) => {
  if (req.user.role !== "internal") {
    return next(forbidden("Internal role required."));
  }
  return next();
};
