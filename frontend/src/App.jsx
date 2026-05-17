import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const EVENT_TYPES = [
  "manufactured",
  "shipped",
  "received",
  "sold",
  "returned",
  "recycled"
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [productData, setProductData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState(EVENT_TYPES[1]);
  const [notes, setNotes] = useState("");

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedId) || null,
    [products, selectedId]
  );

  const loadProducts = async () => {
    setError("");
    try {
      const res = await api.listProducts("limit=50");
      setProducts(res.data || []);
      if (!selectedId && res.data?.length) {
        setSelectedId(res.data[0]._id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadProduct = async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.getProduct(id);
      setProductData(res);
    } catch (err) {
      setError(err.message);
      setProductData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadProduct(selectedId);
  }, [selectedId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;

    setError("");
    try {
      await api.appendEvent(selectedId, {
        eventType,
        payload: { notes: notes.trim() || undefined }
      });
      setNotes("");
      await loadProduct(selectedId);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="layout">
      <section className="panel">
        <h1>Products</h1>
        <button onClick={loadProducts}>Refresh</button>
        <div className="list">
          {products.map((product) => (
            <button
              key={product._id}
              className={product._id === selectedId ? "active" : ""}
              onClick={() => setSelectedId(product._id)}
            >
              <div>{product.name}</div>
              <small>
                {product.currentStatus} • {product.ownerPartnerId}
              </small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Product Timeline</h2>
        {loading && <p>Loading...</p>}
        {!loading && !productData && <p>Select a product.</p>}
        {!loading && productData && (
          <>
            <p>
              <strong>{selectedProduct?.name || productData.product.name}</strong> (
              {productData.product.serialNumber})
            </p>
            <div className="timeline">
              {productData.events.map((event) => (
                <div key={event._id} className="timelineItem">
                  <div>
                    <strong>{event.eventType}</strong> #{event.sequence}
                  </div>
                  <small>{new Date(event.occurredAt).toLocaleString()}</small>
                  {event.payload?.notes && <p>{event.payload.notes}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Add Event</h2>
        <form onSubmit={onSubmit}>
          <label>
            Event Type
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button type="submit" disabled={!selectedId}>
            Append Event
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  );
}
