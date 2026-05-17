const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const JWT_TOKEN = import.meta.env.VITE_JWT_TOKEN || "";

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
  appendEvent: (productId, payload) =>
    request(`/products/${productId}/events`, {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
