import mongoose from "mongoose";
import { Event } from "../models/event.model.js";
import { Product } from "../models/product.model.js";
import { appendEventToProduct, verifyProductEventChain } from "../services/event-chain.service.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";

const encodeCursor = (product) =>
  Buffer.from(`${new Date(product.lastEventAt).toISOString()}::${String(product._id)}`).toString(
    "base64url"
  );

const decodeCursor = (cursor) => {
  try {
    const [lastEventAtString, id] = Buffer.from(cursor, "base64url").toString("utf8").split("::");
    const lastEventAt = new Date(lastEventAtString);
    if (Number.isNaN(lastEventAt.getTime()) || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return { lastEventAt, id: new mongoose.Types.ObjectId(id) };
  } catch (_err) {
    return null;
  }
};

const ensureProductAccess = (product, user) => {
  if (!product) throw notFound("Product not found.");
  if (user.role === "partner" && product.ownerPartnerId !== user.partnerId) {
    throw forbidden("You can only access your own products.");
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const { name, ownerPartnerId, serialNumber, status, metadata } = req.body;
    if (!name || !ownerPartnerId || !serialNumber) {
      throw badRequest("name, ownerPartnerId and serialNumber are required.");
    }

    const product = await Product.create({
      name,
      ownerPartnerId,
      serialNumber,
      currentStatus: status || "manufactured",
      metadata: metadata || {}
    });

    const initialEvent = await appendEventToProduct({
      productId: product._id,
      eventType: status || "manufactured",
      occurredAt: new Date(),
      payload: { source: "product-registration", metadata: metadata || {} },
      user: req.user
    });

    return res.status(201).json({
      product: {
        ...product.toObject(),
        currentEventId: initialEvent._id,
        currentStatus: initialEvent.eventType
      }
    });
  } catch (err) {
    return next(err);
  }
};

export const appendEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { eventType, occurredAt, payload } = req.body;

    if (!eventType) {
      throw badRequest("eventType is required.");
    }

    const product = await Product.findById(id).lean();
    ensureProductAccess(product, req.user);

    const event = await appendEventToProduct({
      productId: id,
      eventType,
      occurredAt,
      payload,
      user: req.user
    });

    return res.status(201).json({ event });
  } catch (err) {
    return next(err);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw badRequest("Invalid product ID.");
    }

    const product = await Product.findById(id).lean();
    ensureProductAccess(product, req.user);

    const events = await Event.find({ productId: id }).sort({ sequence: 1 }).lean();
    return res.json({ product, events });
  } catch (err) {
    return next(err);
  }
};

export const listProducts = async (req, res, next) => {
  try {
    const {
      status,
      startDate,
      endDate,
      partnerId,
      page,
      limit = 20,
      cursor
    } = req.query;

    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const query = {};

    if (status) query.currentStatus = status;

    if (startDate || endDate) {
      query.lastEventAt = {};
      if (startDate) query.lastEventAt.$gte = new Date(startDate);
      if (endDate) query.lastEventAt.$lte = new Date(endDate);
    }

    if (req.user.role === "partner") {
      query.ownerPartnerId = req.user.partnerId;
    } else if (partnerId) {
      query.ownerPartnerId = partnerId;
    }

    // Cursor/keyset pagination is preferred for deep traversal at scale.
    if (cursor && !page) {
      const decoded = decodeCursor(cursor);
      if (!decoded) {
        throw badRequest("Invalid cursor.");
      }

      query.$or = [
        { lastEventAt: { $lt: decoded.lastEventAt } },
        { lastEventAt: decoded.lastEventAt, _id: { $lt: decoded.id } }
      ];

      const items = await Product.find(query)
        .sort({ lastEventAt: -1, _id: -1 })
        .limit(parsedLimit + 1)
        .lean();

      const hasNext = items.length > parsedLimit;
      const data = hasNext ? items.slice(0, parsedLimit) : items;
      const nextCursor = hasNext ? encodeCursor(data[data.length - 1]) : null;

      return res.json({
        data,
        pagination: {
          mode: "cursor",
          limit: parsedLimit,
          nextCursor,
          hasNext
        }
      });
    }

    // Offset pagination retained for compatibility/simple UIs.
    const parsedPage = Math.max(Number(page) || 1, 1);
    const [items, total] = await Promise.all([
      Product.find(query)
        .sort({ lastEventAt: -1, _id: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean(),
      Product.countDocuments(query)
    ]);

    return res.json({
      data: items,
      pagination: {
        mode: "offset",
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (err) {
    return next(err);
  }
};

export const verifyProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    ensureProductAccess(product, req.user);

    const verification = await verifyProductEventChain(id);
    return res.json({ productId: id, ...verification });
  } catch (err) {
    return next(err);
  }
};
