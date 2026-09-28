import { useDeferredValue, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { LoadingRows, Notice, ServiceCard } from "../components/ProductUI.jsx";

const getCategory = (service) => {
  const name = `${service.name} ${service.description}`.toLowerCase();
  if (name.includes("facial") || name.includes("skin")) return "Skin";
  if (name.includes("beard") || name.includes("barber")) return "Grooming";
  if (name.includes("hair") || name.includes("salon")) return "Hair";
  return "Other";
};

export function ServicesPage({ services, loading, error, onRetry, onBook }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState(Infinity);
  const [sort, setSort] = useState("recommended");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const highestPrice = Math.max(0, ...services.map((service) => Number(service.price) || 0));

  const visibleServices = useMemo(() => {
    const filtered = services.filter((service) => {
      const matchesQuery = `${service.name} ${service.description}`.toLowerCase().includes(deferredQuery);
      const matchesCategory = category === "All" || getCategory(service) === category;
      return matchesQuery && matchesCategory && Number(service.price) <= maxPrice;
    });

    if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
    if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
    if (sort === "duration") filtered.sort((a, b) => a.duration - b.duration);
    return filtered;
  }, [services, deferredQuery, category, maxPrice, sort]);

  const clearFilters = () => {
    setQuery("");
    setCategory("All");
    setMaxPrice(Infinity);
    setSort("recommended");
  };

  return (
    <section className="page-width content-page services-page">
      <div className="page-heading">
        <div><span className="section-kicker">SERVICE MENU</span><h1>Find your service</h1><p>Browse the services currently available to book.</p></div>
      </div>
      <div className="discovery-toolbar">
        <label className="search-field"><Search size={18} /><span className="sr-only">Search services</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}</label>
        <label className="sort-field"><SlidersHorizontal size={16} /><span className="sr-only">Sort services</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="duration">Duration</option></select></label>
      </div>
      <div className="discovery-filters">
        <div className="category-filters" role="group" aria-label="Filter by service category">
          {["All", "Hair", "Grooming", "Skin", "Other"].map((item) => <button key={item} type="button" className={category === item ? "filter-chip is-active" : "filter-chip"} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <label className="price-filter">Up to ₹{Number.isFinite(maxPrice) ? maxPrice : highestPrice}<input type="range" min="0" max={Math.max(1, highestPrice)} value={Number.isFinite(maxPrice) ? Math.min(maxPrice, highestPrice) : highestPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} aria-label="Maximum service price" /></label>
      </div>
      {error ? <Notice type="error" title="Unable to load services" action="Retry" onAction={onRetry}>{error}</Notice> : loading ? <LoadingRows count={4} /> : visibleServices.length === 0 ? <div className="empty-panel"><Search size={23} /><h2>{services.length ? "No services found" : "No services available"}</h2><p>{services.length ? "Try a different search or clear some filters." : "Available services will appear here when loaded from ServiceBook."}</p>{services.length > 0 && <button className="button button-secondary" onClick={clearFilters}>Clear filters</button>}</div> : <><p className="result-count">{visibleServices.length} {visibleServices.length === 1 ? "service" : "services"}</p><div className="product-service-grid">{visibleServices.map((service) => <ServiceCard key={service._id} service={service} onSelect={onBook} />)}</div></>}
    </section>
  );
}

export function ServiceDetailsPage({ services, loading, onBook }) {
  const { serviceId } = useParams();
  const service = services.find((item) => item._id === serviceId);

  if (loading) return <section className="page-width content-page"><LoadingRows count={1} /></section>;
  if (!service) return <section className="page-width content-page"><Notice type="error" title="Service not found">This service may have been removed or is no longer available.</Notice><Link className="text-link" to="/services">Back to services</Link></section>;

  return (
    <section className="page-width content-page detail-page">
      <Link className="breadcrumb-link" to="/services">Services / <span>{service.name}</span></Link>
      <div className="service-detail-grid">
        <div className="service-detail-main"><div className="detail-icon">{getCategory(service)}</div><span className="section-kicker">SERVICE DETAILS</span><h1>{service.name}</h1><p className="detail-description">{service.description}</p><div className="detail-facts"><span>{service.duration} minute appointment</span><span>Listed in {getCategory(service)}</span><span>Availability confirmed when booked</span></div><div className="detail-information"><h2>What to expect</h2><p>Your booking request is checked against the current ServiceBook schedule. The server confirms the appointment and prevents duplicate time slots.</p><h2>Payment and cancellation</h2><p>Payment is verified by the server. Pending bookings can be cancelled through the existing booking management flow.</p></div></div>
        <aside className="detail-booking-panel"><span className="section-kicker">BOOK THIS SERVICE</span><strong className="detail-price">₹{Number(service.price).toLocaleString("en-IN")}</strong><span className="detail-duration">{service.duration} minutes</span><button className="button button-primary detail-book-cta" onClick={() => onBook(service)}>Book now</button><p>Price is sourced from the active service record.</p></aside>
      </div>
    </section>
  );
}

export default ServicesPage;