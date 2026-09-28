import { useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api.js";
import { LoadingRows, Notice, StatusBadge } from "../components/ProductUI.jsx";
import useCurrentTime from "../hooks/useCurrentTime.js";

const formatDate = (date) => new Date(date).toLocaleString("en-IN", {
  weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
});
function MyBookingsPage({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [section, setSection] = useState("upcoming");
  const [query, setQuery] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const now = useCurrentTime();

  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/bookings")
      .then((data) => {
        if (!cancelled) setBookings(data.filter((booking) => booking.customerEmail?.toLowerCase() === user.email.toLowerCase()));
      })
      .catch((requestError) => { if (!cancelled) setError(requestError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh, user.email]);

  const reloadBookings = () => {
    setLoading(true);
    setError("");
    setRefresh((value) => value + 1);
  };

  const userBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status = booking.status;
      const upcoming = ["PENDING", "PAID"].includes(status) && new Date(booking.bookingDate).getTime() >= now;
      const past = ["PENDING", "PAID"].includes(status) && new Date(booking.bookingDate).getTime() < now;
      if (section === "upcoming" && !upcoming) return false;
      if (section === "past" && !past) return false;
      if (section === "cancelled" && !["CANCELLED", "REFUNDED"].includes(status)) return false;
      return `${booking.service?.name || ""} ${booking._id} ${booking.status}`.toLowerCase().includes(query.trim().toLowerCase());
    });
  }, [bookings, section, query, now]);

  const cancelBooking = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setActionMessage("");
    try {
      await apiRequest(`/api/bookings/${cancelTarget._id}/cancel`, { method: "PATCH" });
      setCancelTarget(null);
      setActionMessage("Booking cancelled successfully.");
      reloadBookings();
    } catch (requestError) {
      setActionMessage(requestError.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section className="page-width content-page my-bookings-page">
      <div className="page-heading page-heading-actions"><div><span className="section-kicker">YOUR SERVICEBOOK ACCOUNT</span><h1>My bookings</h1><p>Appointments associated with {user.email}.</p></div><button className="button button-secondary" onClick={reloadBookings}><RefreshCw size={16} /> Refresh</button></div>
      <div className="booking-tabs" role="tablist" aria-label="Booking history">
        {[["upcoming", "Upcoming"], ["past", "Past"], ["cancelled", "Cancelled"]].map(([value, label]) => <button key={value} role="tab" aria-selected={section === value} className={section === value ? "booking-tab is-active" : "booking-tab"} onClick={() => setSection(value)}>{label}</button>)}
      </div>
      <label className="search-field booking-search"><Search size={17} /><span className="sr-only">Search bookings</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bookings" /></label>
      {actionMessage && <Notice type={actionMessage.includes("success") ? "success" : "error"} title={actionMessage}>{null}</Notice>}
      {error ? <Notice type="error" title="Unable to load bookings" action="Retry" onAction={reloadBookings}>{error}</Notice> : loading ? <LoadingRows count={3} /> : userBookings.length === 0 ? <div className="empty-panel"><CalendarDays size={25} /><h2>{query ? "No bookings match" : `No ${section} bookings`}</h2><p>{query ? "Try another search term." : "Your bookings will appear here after you confirm an appointment."}</p><Link className="button button-primary" to="/services">Explore services</Link></div> : (
        <div className="customer-booking-list">{userBookings.map((booking) => {
          const canCancel = now > 0 && booking.status === "PENDING" && new Date(booking.bookingDate).getTime() >= now;
          return <article className="customer-booking-card" key={booking._id}>
            <div className="customer-booking-main"><div className="booking-card-heading"><div><span className="section-kicker">{booking.service?.duration || "—"} MINUTES</span><h2>{booking.service?.name || "Service"}</h2></div><StatusBadge status={booking.status} /></div><div className="customer-booking-info"><span><CalendarDays size={15} />{formatDate(booking.bookingDate)}</span><span>₹{Number(booking.service?.price || 0).toLocaleString("en-IN")}</span>{booking.createdAt && <span>Booked {new Date(booking.createdAt).toLocaleDateString("en-IN")}</span>}<span className="booking-reference">#{booking._id}</span></div></div>
            <div className="customer-booking-actions"><Link className="button button-secondary" to={`/booking/${booking._id}`}>View details</Link>{canCancel && <button className="button button-danger-quiet" onClick={() => setCancelTarget(booking)}>Cancel booking</button>}</div>
          </article>;
        })}</div>
      )}
      {cancelTarget && <div className="modal-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-heading"><span className="section-kicker">CANCEL APPOINTMENT</span><h2 id="cancel-heading">Cancel this booking?</h2><p>{cancelTarget.service?.name} · {formatDate(cancelTarget.bookingDate)}</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setCancelTarget(null)} disabled={cancelling}>Keep booking</button><button className="button button-danger" onClick={cancelBooking} disabled={cancelling}>{cancelling ? "Cancelling…" : "Confirm cancellation"}</button></div></section></div>}
    </section>
  );
}

export default MyBookingsPage;