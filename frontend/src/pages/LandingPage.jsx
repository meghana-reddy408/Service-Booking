import { useMemo } from "react";
import { ArrowDownRight, ArrowRight, BadgeCheck, CalendarCheck2, Clock3, CreditCard, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "../assets/hero.png";
import { LoadingRows, Notice, ServiceCard } from "../components/ProductUI.jsx";

function LandingPage({ services, loading, error, onRetry, onBook }) {
  const featured = useMemo(() => services.slice(0, 4), [services]);

  return (
    <div className="landing-page">
      <section className="home-hero">
        <img className="home-hero-image" src={heroImage} alt="" />
        <div className="home-hero-shade" />
        <div className="home-hero-content page-width">
          <span className="hero-kicker"><span /> Local care, made simple</span>
          <h1>Book trusted services,<br /><em>effortlessly.</em></h1>
          <p>Find your next appointment, choose a time that works, and book with confidence.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/services">Book a service <ArrowRight size={17} /></Link>
            <Link className="button button-quiet" to="/nearby"><MapPin size={17} /> Explore nearby</Link>
          </div>
          <div className="hero-trust">
            <span><ShieldCheck size={16} /> Secure checkout</span>
            <span><BadgeCheck size={16} /> Clear pricing</span>
            <span><CalendarCheck2 size={16} /> Simple scheduling</span>
          </div>
        </div>
        <a className="hero-scroll" href="#popular-services" aria-label="Scroll to popular services"><ArrowDownRight size={19} /></a>
      </section>

      <section className="home-section page-width" id="popular-services">
        <div className="section-title-row">
          <div><span className="section-kicker">THE SERVICE MENU</span><h2>Popular services</h2><p>Choose from services currently offered by ServiceBook.</p></div>
          <Link className="text-link desktop-link" to="/services">View all services <ArrowRight size={16} /></Link>
        </div>
        {error ? <Notice type="error" title="Unable to load services" action="Retry" onAction={onRetry}>{error}</Notice> : loading ? <LoadingRows count={3} /> : services.length === 0 ? <Notice title="No services available yet">New services will appear here when they are added.</Notice> : (
          <div className="product-service-grid">
            {featured.map((service) => <ServiceCard key={service._id} service={service} onSelect={onBook} />)}
          </div>
        )}
        <Link className="text-link mobile-link" to="/services">View all services <ArrowRight size={16} /></Link>
      </section>

      <section className="steps-section">
        <div className="page-width">
          <div className="section-title-row"><div><span className="section-kicker">A BETTER BOOKING ROUTINE</span><h2>From browse to booked</h2></div></div>
          <div className="steps-grid">
            {[
              ["01", "Choose a service", "Compare service details and transparent prices."],
              ["02", "Pick your time", "Select a date and an appointment slot that suits you."],
              ["03", "Confirm details", "Review your booking before it is created."],
              ["04", "Pay securely", "Complete payment and keep your confirmation handy."],
            ].map(([number, title, copy]) => <article className="step-item" key={number}><span className="step-number">{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="home-section page-width why-section">
        <div className="section-title-row"><div><span className="section-kicker">THE SERVICEBOOK STANDARD</span><h2>Time well spent</h2><p>A clearer way to manage the details around your appointment.</p></div></div>
        <div className="benefit-grid">
          <article><CalendarCheck2 size={21} /><h3>Easy booking</h3><p>Service details, dates and available appointment times in one flow.</p></article>
          <article><MapPin size={21} /><h3>Nearby discovery</h3><p>Explore real local salons, barbers and spas with Google Maps.</p></article>
          <article><CreditCard size={21} /><h3>Secure payments</h3><p>Payments stay pending until the server verifies the transaction.</p></article>
          <article><Clock3 size={21} /><h3>Clear status</h3><p>See whether a booking is pending, paid, cancelled or refunded.</p></article>
        </div>
      </section>

      <section className="nearby-promo">
        <div className="nearby-promo-inner page-width">
          <div className="nearby-promo-icon"><MapPin size={22} /></div>
          <div><span className="section-kicker">LOCAL SERVICE DISCOVERY</span><h2>Find a great service around you.</h2><p>Use your current location to explore real businesses nearby.</p></div>
          <Link className="button button-primary" to="/nearby">Explore nearby <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="trust-strip page-width">
        <Sparkles size={18} /><p>Thoughtful discovery. Transparent booking. A smoother appointment from start to finish.</p>
      </section>
    </div>
  );
}

export default LandingPage;