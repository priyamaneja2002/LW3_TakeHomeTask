import crypto from "crypto";
import mongoose from "mongoose";
import { Event } from "../models/event.model.js";
import { Product } from "../models/product.model.js";
import { badRequest, notFound } from "../utils/errors.js";

const canonicalizePayload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload ?? {};
  }

  const sortedKeys = Object.keys(payload).sort();
  const normalized = {};
  for (const key of sortedKeys) {
    normalized[key] = payload[key];
  }
  return normalized;
};

export const computeEventHash = ({
  productId,
  eventType,
  occurredAt,
  payload,
  sequence,
  previousEventId,
  previousEventHash
}) => {
  const normalized = JSON.stringify({
    productId: String(productId),
    eventType,
    occurredAt: new Date(occurredAt).toISOString(),
    payload: canonicalizePayload(payload),
    sequence,
    previousEventId: previousEventId ? String(previousEventId) : null,
    previousEventHash: previousEventHash || null
  });

  return crypto.createHash("sha256").update(normalized).digest("hex");
};

export const appendEventToProduct = async ({ productId, eventType, occurredAt, payload, user }) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw badRequest("Invalid product ID.");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw notFound("Product not found.");
  }

  const previousEvent = product.currentEventId ? await Event.findById(product.currentEventId) : null;
  const sequence = previousEvent ? previousEvent.sequence + 1 : 1;
  const previousEventId = previousEvent?._id ?? null;
  const previousEventHash = previousEvent?.currentHash ?? null;
  const occurredTimestamp = occurredAt ? new Date(occurredAt) : new Date();

  if (Number.isNaN(occurredTimestamp.getTime())) {
    throw badRequest("Invalid occurredAt value.");
  }

  const currentHash = computeEventHash({
    productId,
    eventType,
    occurredAt: occurredTimestamp,
    payload: payload ?? {},
    sequence,
    previousEventId,
    previousEventHash
  });

  const event = await Event.create({
    productId,
    eventType,
    occurredAt: occurredTimestamp,
    payload: payload ?? {},
    sequence,
    previousEventId,
    previousEventHash,
    currentHash,
    createdBy: {
      role: user.role,
      partnerId: user.partnerId ?? null,
      subject: user.sub ?? "api-user"
    }
  });

  product.currentStatus = eventType;
  product.currentEventId = event._id;
  product.lastEventAt = occurredTimestamp;
  await product.save();

  return event;
};

export const verifyProductEventChain = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw badRequest("Invalid product ID.");
  }

  const product = await Product.findById(productId).lean();
  if (!product) {
    throw notFound("Product not found.");
  }

  const events = await Event.find({ productId }).sort({ sequence: 1 }).lean();

  if (events.length === 0) {
    return { isValid: true, checkedEvents: 0, brokenAtEventId: null, reason: null };
  }

  let previous = null;

  for (const event of events) {
    if (!previous) {
      if (event.sequence !== 1 || event.previousEventId || event.previousEventHash) {
        return {
          isValid: false,
          checkedEvents: 1,
          brokenAtEventId: String(event._id),
          reason: "First event has invalid chain pointers."
        };
      }
    } else {
      if (String(event.previousEventId) !== String(previous._id)) {
        return {
          isValid: false,
          checkedEvents: event.sequence,
          brokenAtEventId: String(event._id),
          reason: "Event previousEventId does not match predecessor."
        };
      }

      if (event.previousEventHash !== previous.currentHash) {
        return {
          isValid: false,
          checkedEvents: event.sequence,
          brokenAtEventId: String(event._id),
          reason: "Event previousEventHash does not match predecessor hash."
        };
      }
    }

    const expectedHash = computeEventHash({
      productId: event.productId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      payload: event.payload,
      sequence: event.sequence,
      previousEventId: event.previousEventId,
      previousEventHash: event.previousEventHash
    });

    if (expectedHash !== event.currentHash) {
      return {
        isValid: false,
        checkedEvents: event.sequence,
        brokenAtEventId: String(event._id),
        reason: "Stored currentHash does not match recomputed hash."
      };
    }

    previous = event;
  }

  return {
    isValid: true,
    checkedEvents: events.length,
    brokenAtEventId: null,
    reason: null
  };
};
