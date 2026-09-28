import { useEffect, useMemo, useState } from "react";
import { IndianRupee, RefreshCw, Search, TrendingUp, Users, Wallet } from "lucide-react";
import { apiRequest } from "./api.js";
import { LoadingRows, Notice, StatusBadge } from "./components/ProductUI.jsx";
import useCurrentTime from "./hooks/useCurrentTime.js";

const formatDate = (value) => new Date(value).toLocaleString("en-IN", {
  day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
});
function Admin() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("newest");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState("");
  const now = useCurrentTime();

  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/bookings")
      .then((data) => { if (!cancelled) setBookings(data); })
      .catch((requestError) => { if (!cancelled) setError(requestError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh]);

  const reloadBookings = () => {
    setLoading(true);
    setError("");
    setRefresh((value) => value + 1);
  };

  const services = useMemo(() => [...new Set(bookings.map((booking) => booking.service?.name).filter(Boolean))].sort(), [bookings]);
  const totals = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter((booking) => booking.status === "PENDING").length,
    paid: bookings.filter((booking) => booking.status === "PAID").length,
    cancelled: bookings.filter((booking) => booking.status === "CANCELLED").length,
    revenue: bookings.filter((booking) => booking.status === "PAID").reduce((sum, booking) => sum + (Number(booking.paymentAmount) > 0 ? Number(booking.paymentAmount) / 100 : Number(booking.service?.price || 0)), 0),
  }), [bookings]);
  const visibleBookings = useMemo(() => bookings
    .filter((booking) => statusFilter === "ALL" || booking.status === statusFilter)
    .filter((booking) => serviceFilter === "ALL" || booking.service?.name === serviceFilter)
    .filter((booking) => `${booking.customerName} ${booking.customerEmail} ${booking.service?.name} ${booking._id}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (new Date(a.bookingDate) - new Date(b.bookingDate)) * (sortOrder === "newest" ? -1 : 1)), [bookings, statusFilter, serviceFilter, query, sortOrder]);

  const cancelBooking = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setNotice("");
    try {
      await apiRequest(`/api/bookings/${cancelTarget._id}/cancel`, { method: "PATCH" });
      setCancelTarget(null);
      setNotice("Booking cancelled successfully.");
      reloadBookings();
    } catch (requestError) {
      setNotice(requestError.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section className="page-width content-page admin-page">
      <div className="page-heading page-heading-actions"><div><span className="section-kicker">SERVICEBOOK OPERATIONS</span><h1>Bookings</h1><p>Live booking records from the ServiceBook database.</p></div><button className="button button-secondary" onClick={reloadBookings}><RefreshCw size={16} /> Refresh</button></div>
      <Notice title="Demo administrator access">The current login has no server-enforced roles. Do not expose this dashboard publicly until backend authorization is added.</Notice>
      {notice && <Notice type={notice.includes("success") ? "success" : "error"} title={notice}>{null}</Notice>}
      {error && <Notice type="error" title="Unable to load bookings" action="Retry" onAction={reloadBookings}>{error}</Notice>}
      <div className="admin-stat-grid">
        <article><span>Total bookings</span><strong>{loading ? "—" : totals.all}</strong><Users size={17} /></article>
        <article><span>Payment pending</span><strong>{loading ? "—" : totals.pending}</strong><Wallet size={17} /></article>
        <article><span>Paid</span><strong>{loading ? "—" : totals.paid}</strong><TrendingUp size={17} /></article>
        <article><span>Cancelled</span><strong>{loading ? "—" : totals.cancelled}</strong><RefreshCw size={17} /></article>
        <article className="revenue-stat"><span>Paid revenue</span><strong><IndianRupee size={18} />{loading ? "—" : totals.revenue.toLocaleString("en-IN")}</strong><small>Verified PAID bookings only</small></article>
      </div>
      <div className="admin-table-toolbar">
        <label className="search-field"><Search size={17} /><span className="sr-only">Search bookings</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, service or ID" /></label>
        <label className="select-control"><span className="sr-only">Filter booking status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option>{["PENDING", "PAID", "CANCELLED", "REFUNDED"].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="select-control"><span className="sr-only">Filter service</span><select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option value="ALL">All services</option>{services.map((service) => <option key={service}>{service}</option>)}</select></label>
        <label className="select-control"><span className="sr-only">Sort bookings</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="newest">Newest appointment</option><option value="oldest">Oldest appointment</option></select></label>
      </div>
      {loading ? <LoadingRows count={4} /> : !error && visibleBookings.length === 0 ? <div className="empty-panel"><Users size={24} /><h2>{bookings.length ? "No bookings match" : "No bookings yet"}</h2><p>{bookings.length ? "Try changing your filters." : "Bookings created through ServiceBook will appear here."}</p></div> : !error && <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Customer</th><th>Service</th><th>Appointment</th><th>Amount</th><th>Status</th><th>Booking ID</th><th>Action</th></tr></thead><tbody>{visibleBookings.map((booking) => <tr key={booking._id}><td><strong>{booking.customerName}</strong><span>{booking.customerEmail}</span><span>{booking.customerPhone}</span></td><td><strong>{booking.service?.name || "Unknown"}</strong></td><td>{formatDate(booking.bookingDate)}</td><td>₹{Number(booking.service?.price || 0).toLocaleString("en-IN")}</td><td><StatusBadge status={booking.status} /></td><td className="booking-id">{booking._id}</td><td>{booking.status === "PENDING" && now > 0 && new Date(booking.bookingDate).getTime() >= now ? <button className="button-danger-quiet" onClick={() => setCancelTarget(booking)}>Cancel</button> : <span className="quiet-text">—</span>}</td></tr>)}</tbody></table></div>}
      {cancelTarget && <div className="modal-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-cancel-heading"><span className="section-kicker">CANCEL APPOINTMENT</span><h2 id="admin-cancel-heading">Cancel this booking?</h2><p>{cancelTarget.customerName} · {cancelTarget.service?.name}</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setCancelTarget(null)} disabled={cancelling}>Keep booking</button><button className="button button-danger" onClick={cancelBooking} disabled={cancelling}>{cancelling ? "Cancelling…" : "Confirm cancellation"}</button></div></section></div>}
    </section>
  );
}

export default Admin;