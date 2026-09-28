import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, CreditCard, Printer, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import { Notice, StatusBadge } from "../components/ProductUI.jsx";

const TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"];
const BOOKING_STEPS = ["Service", "Date & time", "Your details", "Review"];

const todayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatBookingDate = (value) => new Date(value).toLocaleString("en-IN", {
  weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
});

function BookingFlowPage({ services, loadingServices, user, onCreateBooking }) {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState(serviceId ? 2 : 1);
  const [chosenServiceId, setChosenServiceId] = useState(serviceId || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [customer, setCustomer] = useState({ name: "", email: user?.email || "", phone: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const selectedServiceId = serviceId || chosenServiceId;
  const service = services.find((item) => item._id === selectedServiceId);

  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (loadingServices && !service) return <section className="page-width content-page"><div className="quiet-state">Loading service details…</div></section>;
  if (serviceId && !service) return <section className="page-width content-page"><div className="empty-panel"><h2>Service unavailable</h2><p>This service may have been removed from the active catalog.</p><Link className="button button-secondary" to="/services">Back to services</Link></div></section>;

  const continueFromService = () => {
    if (!service) return setError("Choose a service to continue.");
    setError("");
    setStage(2);
  };

  const continueFromSlot = () => {
    if (!date || !time) return setError("Choose a date and available time slot.");
    if (date < todayLocal()) return setError("Choose today or a future date.");
    setError("");
    setStage(3);
  };

  const continueFromDetails = (event) => {
    event.preventDefault();
    if (!customer.name.trim() || !customer.email.trim() || !customer.phone.trim()) return setError("Complete each customer detail before continuing.");
    if (!/^\S+@\S+\.\S+$/.test(customer.email)) return setError("Enter a valid email address.");
    if (!/^\+?[\d\s()-]{7,18}$/.test(customer.phone)) return setError("Enter a valid phone number.");
    setError("");
    setStage(4);
  };

  const createBooking = async () => {
    const [timeText, period] = time.split(" ");
    let [hours, minutes] = timeText.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    const dateTime = new Date(`${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
    if (Number.isNaN(dateTime.getTime()) || dateTime.getTime() < Date.now()) {
      setError("Choose a future appointment time.");
      setStage(2);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const booking = await onCreateBooking({
        service: selectedServiceId,
        customerName: customer.name.trim(),
        customerEmail: customer.email.trim(),
        customerPhone: customer.phone.trim(),
        bookingDate: dateTime.toISOString(),
      });
      navigate(`/booking/${booking._id}`, { state: { booking } });
    } catch (requestError) {
      setError(requestError.message || "Unable to create this booking.");
      if (requestError.status === 409) setStage(2);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-width content-page booking-flow-page">
      <div className="page-heading"><div><span className="section-kicker">APPOINTMENT REQUEST</span><h1>Make it official.</h1><p>Your time is reserved after the server confirms your booking.</p></div></div>
      <ol className="booking-progress" aria-label="Booking progress">
        {BOOKING_STEPS.map((label, index) => <li key={label} className={stage === index + 1 ? "is-current" : stage > index + 1 ? "is-complete" : ""}><span>{stage > index + 1 ? <Check size={15} /> : `0${index + 1}`}</span><small>{label}</small></li>)}
      </ol>
      <div className="booking-workspace">
        <div className="booking-step-panel">
          {error && <Notice type="error" title="There’s a detail to fix">{error}</Notice>}
          {stage === 1 && <>
            <div className="step-panel-heading"><span>STEP 01</span><h2>Choose a service</h2></div>
            {loadingServices ? <p className="quiet-state">Loading live services…</p> : <div className="booking-service-options">{services.map((item) => <button key={item._id} className={`booking-service-option${item._id === chosenServiceId ? " is-selected" : ""}`} onClick={() => { setChosenServiceId(item._id); setError(""); }}><span><strong>{item.name}</strong><small>{item.duration} minutes</small></span><b>₹{Number(item.price).toLocaleString("en-IN")}</b></button>)}</div>}
            <button className="button button-primary step-next" onClick={continueFromService} disabled={!service}>Choose date and time <ArrowRight size={16} /></button>
          </>}
          {stage === 2 && <>
            <div className="step-panel-heading"><span>STEP 02</span><h2>Choose your appointment</h2></div>
            <label className="field-label">Appointment date<input className="product-input" type="date" min={todayLocal()} value={date} onChange={(event) => { setDate(event.target.value); setTime(""); setError(""); }} /></label>
            <div className="field-label">Available times<div className="booking-time-grid">{TIME_SLOTS.map((slot) => <button key={slot} disabled={!date} className={`booking-time-slot${time === slot ? " is-selected" : ""}`} onClick={() => { setTime(slot); setError(""); }}><Clock3 size={14} />{slot}</button>)}</div></div>
            <p className="field-helper">The backend checks for existing bookings when you confirm. If a slot is taken, you’ll be asked to choose another.</p>
            <div className="step-actions"><button className="button button-secondary" onClick={() => setStage(1)}><ArrowLeft size={16} /> Back</button><button className="button button-primary" onClick={continueFromSlot}>Your details <ArrowRight size={16} /></button></div>
          </>}
          {stage === 3 && <>
            <div className="step-panel-heading"><span>STEP 03</span><h2>Who is the appointment for?</h2></div>
            <form className="customer-form" onSubmit={continueFromDetails}>
              <label className="field-label">Full name<input className="product-input" autoComplete="name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} required /></label>
              <label className="field-label">Email address<input className="product-input" type="email" autoComplete="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} required /></label>
              <label className="field-label">Phone number<input className="product-input" type="tel" autoComplete="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} minLength={7} maxLength={18} required /></label>
              <div className="step-actions"><button className="button button-secondary" type="button" onClick={() => setStage(2)}><ArrowLeft size={16} /> Back</button><button className="button button-primary" type="submit">Review booking <ArrowRight size={16} /></button></div>
            </form>
          </>}
          {stage === 4 && <>
            <div className="step-panel-heading"><span>STEP 04</span><h2>Review your booking</h2></div>
            <div className="review-list">
              <div><span>Service</span><strong>{service?.name}</strong></div>
              <div><span>Date and time</span><strong>{new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {time}</strong></div>
              <div><span>Duration</span><strong>{service?.duration} minutes</strong></div>
              <div><span>Customer</span><strong>{customer.name}</strong></div>
              <div><span>Email</span><strong>{customer.email}</strong></div>
              <div className="review-total"><span>Total</span><strong>₹{Number(service?.price || 0).toLocaleString("en-IN")}</strong></div>
            </div>
            <div className="step-actions"><button className="button button-secondary" onClick={() => setStage(3)}><ArrowLeft size={16} /> Edit details</button><button className="button button-primary" disabled={submitting} onClick={createBooking}>{submitting ? "Creating booking…" : "Confirm booking"}<ArrowRight size={16} /></button></div>
          </>}
        </div>
        <aside className="booking-summary-card"><span className="section-kicker">YOUR SELECTION</span>{service ? <><h2>{service.name}</h2><div className="summary-line"><span><Clock3 size={15} /> Duration</span><strong>{service.duration} min</strong></div><div className="summary-line"><span><CalendarDays size={15} /> Appointment</span><strong>{date && time ? `${new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${time}` : "Not selected"}</strong></div><div className="summary-line summary-price"><span>Price</span><strong>₹{Number(service.price).toLocaleString("en-IN")}</strong></div><p><ShieldCheck size={15} /> Payment is verified securely by the server.</p></> : <p>Select a current ServiceBook service to begin.</p>}</aside>
      </div>
    </section>
  );
}

function BookingDetailsPage({ activeBooking, onPay }) {
  const { bookingId } = useParams();
  const location = useLocation();
  const [lookup, setLookup] = useState(null);
  const [paymentStarting, setPaymentStarting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const routeBooking = location.state?.booking?._id === bookingId
    ? location.state.booking
    : null;
  const currentBooking = activeBooking?._id === bookingId ? activeBooking : routeBooking;
  const matchingLookup = lookup?.bookingId === bookingId ? lookup : null;
  const booking = currentBooking || matchingLookup?.booking;
  const loading = !currentBooking && !matchingLookup;
  const error = matchingLookup?.error || "";

  useEffect(() => {
    if (routeBooking || activeBooking?._id === bookingId) return undefined;

    let cancelled = false;
    apiRequest("/api/bookings")
      .then((items) => {
        if (cancelled) return;
        const found = items.find((item) => item._id === bookingId);
        setLookup({
          bookingId,
          booking: found || null,
          error: found ? "" : "This booking could not be found.",
        });
      })
      .catch((requestError) => {
        if (!cancelled) setLookup({ bookingId, booking: null, error: requestError.message });
      });
    return () => { cancelled = true; };
  }, [bookingId, activeBooking, routeBooking]);

  if (loading) return <section className="page-width content-page"><div className="quiet-state">Loading booking…</div></section>;
  if (!booking) return <section className="page-width content-page"><Notice type="error" title="Booking unavailable">{error || "This booking could not be loaded."}</Notice><Link className="button button-secondary" to="/my-bookings">My bookings</Link></section>;

  const isPaid = booking.status === "PAID";
  const isCancelled = booking.status === "CANCELLED";
  const isRefunded = booking.status === "REFUNDED";
  const startPayment = async () => {
    setPaymentStarting(true);
    setPaymentError("");
    try { await onPay(booking); }
    catch (error) { setPaymentError(error.message || "Unable to start payment. Please retry."); }
    finally { setPaymentStarting(false); }
  };

  return (
    <section className="page-width content-page booking-confirmation-page">
      <div className={`confirmation-banner${isPaid ? " is-paid" : isCancelled || isRefunded ? " is-cancelled" : " is-pending"}`}>
        <span className="confirmation-mark">{isPaid ? <Check size={24} /> : isCancelled || isRefunded ? <ArrowLeft size={22} /> : <Clock3 size={22} />}</span>
        <div><span className="section-kicker">{isPaid ? "PAYMENT VERIFIED" : isCancelled ? "BOOKING CANCELLED" : isRefunded ? "PAYMENT REFUNDED" : "BOOKING CREATED"}</span><h1>{isPaid ? "Your booking is confirmed." : isCancelled ? "This booking was cancelled." : isRefunded ? "This booking was refunded." : "Your appointment is reserved."}</h1><p>{isPaid ? "Your payment was verified by ServiceBook." : isCancelled ? "This appointment is no longer active." : isRefunded ? "The payment is recorded as refunded." : "Complete payment to confirm this appointment."}</p></div>
        <StatusBadge status={booking.status} />
      </div>
      {(paymentError || error) && <Notice type="error" title="Booking needs attention">{paymentError || error}</Notice>}
      <div className="confirmation-layout">
        <section className="confirmation-details"><div className="section-title-row"><div><span className="section-kicker">BOOKING REFERENCE</span><h2>Booking details</h2></div><button className="icon-text-button" onClick={() => window.print()}><Printer size={16} /> Print</button></div>
          <div className="review-list confirmation-review">
            <div><span>Booking ID</span><strong className="booking-reference">{booking._id}</strong></div>
            <div><span>Service</span><strong>{booking.service?.name}</strong></div>
            <div><span>Date and time</span><strong>{formatBookingDate(booking.bookingDate)}</strong></div>
            {booking.createdAt && <div><span>Booked on</span><strong>{new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong></div>}
            <div><span>Duration</span><strong>{booking.service?.duration} minutes</strong></div>
            <div><span>Customer</span><strong>{booking.customerName}</strong></div>
            <div><span>Amount</span><strong>₹{Number(booking.service?.price || 0).toLocaleString("en-IN")}</strong></div>
            {booking.paymentId && <div><span>Payment reference</span><strong className="booking-reference">{booking.paymentId}</strong></div>}
          </div>
          <div className="booking-timeline" aria-label="Booking status timeline">
            <div className="timeline-step is-complete"><span><Check size={13} /></span><div><strong>Booking created</strong><small>{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("en-IN") : "Recorded by ServiceBook"}</small></div></div>
            <div className={`timeline-step ${isPaid ? "is-complete" : booking.status === "PENDING" ? "is-current" : "is-inactive"}`}><span>{isPaid ? <Check size={13} /> : "2"}</span><div><strong>{isPaid ? "Payment verified" : booking.status === "PENDING" ? "Payment pending" : booking.status}</strong><small>{isPaid ? "Confirmed by the server" : booking.status === "PENDING" ? "Awaiting secure checkout" : "Current booking status"}</small></div></div>
            <div className={`timeline-step ${isPaid ? "is-current" : "is-inactive"}`}><span>3</span><div><strong>Service scheduled</strong><small>{isPaid ? formatBookingDate(booking.bookingDate) : "After payment confirmation"}</small></div></div>
          </div>
          <div className="confirmation-actions"><Link className="button button-secondary" to="/my-bookings">View my bookings</Link><Link className="button button-primary" to="/services">Book another service</Link></div>
          {!isPaid && booking.status === "PENDING" && <button className="button button-primary payment-continue" disabled={paymentStarting} onClick={startPayment}><CreditCard size={17} />{paymentStarting ? "Connecting to secure checkout…" : `Continue to payment · ₹${Number(booking.service?.price || 0).toLocaleString("en-IN")}`}</button>}
        </section>
        <aside className="confirmation-side"><div className="payment-assurance"><ShieldCheck size={20} /><div><strong>Secure test payment</strong><p>ServiceBook marks payment complete only after server verification.</p></div></div>{isPaid && <div className="confirmation-qr"><h3>Booking reference</h3><QRCodeSVG value={`ServiceBook booking ${booking._id}`} size={148} bgColor="#ffffff" fgColor="#17221d" level="M" /><p>Scan to verify this booking reference.</p></div>}</aside>
      </div>
    </section>
  );
}

export { BookingFlowPage, BookingDetailsPage };