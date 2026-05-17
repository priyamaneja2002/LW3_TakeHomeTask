const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const MOCK_INTERNAL_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmcm9udGVuZC1tb2NrLWludGVybmFsIiwicm9sZSI6ImludGVybmFsIiwiaWF0IjoxNzc5MDE5NjY4LCJleHAiOjE4MTA1NTU2Njh9.--5VhYPbUvJhXqWxJjeRO3QAouoP1P9eiBJj4O0Og2c";
const JWT_TOKEN = import.meta.env.VITE_JWT_TOKEN || MOCK_INTERNAL_JWT;

const request = async (path, options = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(JWT_TOKEN ? { Authorization: `Bearer ${JWT_TOKEN}` } : {}),
      ...(options.headers || {})
    }
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || "Request failed");
  }
  return body;
};

export const api = {
  listProducts: (query = "") => request(`/products${query ? `?${query}` : ""}`),
  getProduct: (productId) => request(`/products/${productId}`),
  createProduct: (payload) =>
    request("/products", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  appendEvent: (productId, payload) =>
    request(`/products/${productId}/events`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  verifyProduct: (productId) => request(`/products/${productId}/verify`)
};
