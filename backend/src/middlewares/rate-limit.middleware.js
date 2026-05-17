import rateLimit from "express-rate-limit";

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  max: (req) => (req.user?.role === "partner" ? 100 : 1000),
  keyGenerator: (req) => {
    if (req.user?.sub) return req.user.sub;
    if (req.user?.partnerId) return `${req.user.role}:${req.user.partnerId}`;
    return req.ip;
  },
  message: {
    error: "Too many requests. Please retry later."
  }
});
