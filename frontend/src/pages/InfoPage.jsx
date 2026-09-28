import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const information = {
  about: {
    eyebrow: "ABOUT SERVICEBOOK",
    title: "Appointments, made clearer.",
    introduction: "ServiceBook brings service discovery, appointment requests and payment confirmation together in one place.",
    sections: [
      ["Services from the live catalog", "The service menu is loaded from the connected ServiceBook API; prices and durations come from the active service records."],
      ["Local discovery", "Nearby businesses are requested from Google Maps Platform after you choose to share your browser location."],
      ["Verified payment status", "A booking remains pending until the existing server-side payment verification confirms it."],
    ],
  },
  contact: {
    eyebrow: "CONTACT",
    title: "Support details are not configured yet.",
    introduction: "This ServiceBook demonstration does not have a configured support inbox or contact form. No message is sent from this page.",
    sections: [["Project owner", "Use the contact details provided with your project demonstration. Avoid entering real customer information until a secure support and privacy setup is in place."]],
  },
  help: {
    eyebrow: "HELP CENTER",
    title: "A few booking basics.",
    introduction: "ServiceBook is a demonstration app using its existing service, booking and payment APIs.",
    sections: [
      ["How do I book?", "Choose an active service, select a future date and time, enter your details, review the summary and confirm. The backend checks whether that time is already booked."],
      ["When is a booking paid?", "Only after the backend verifies the Razorpay payment. If checkout is dismissed or verification fails, the booking remains pending."],
      ["Why does Nearby ask for location?", "The browser location is used to search Google Places near you. You can deny permission; nearby search will not run without a location."],
      ["Can I cancel?", "The interface offers cancellation for upcoming pending bookings. The existing server handles the final cancellation request."],
    ],
  },
  faq: {
    eyebrow: "FREQUENT QUESTIONS",
    title: "Frequently asked questions.",
    introduction: "Answers for the current ServiceBook demo experience.",
    sections: [
      ["Are service listings live?", "Yes. The catalog loads from the existing GET /api/services endpoint."],
      ["Are nearby businesses sample data?", "No. Nearby listings are requested from Google Places (New) after location is granted."],
      ["Is this ready for real customer data?", "Not yet. Authentication and access controls are still demo-level; review the privacy notice before using personal data."],
    ],
  },
  privacy: {
    eyebrow: "PRIVACY NOTICE · DEMO",
    title: "How this demonstration handles information.",
    introduction: "This notice describes the current project behavior and is not a substitute for a reviewed production privacy policy.",
    sections: [
      ["Booking details", "The existing API stores the customer name, email, phone, selected service, appointment time and payment references with the booking record."],
      ["Location", "Nearby Services requests your location only when that page is opened. Coordinates are used in the browser to request real Google Places results."],
      ["Important limitation", "The current demo login is stored in the browser, and the existing bookings API is not scoped to an authenticated user. Do not use real personal or payment data until server-side authentication, authorization and a production privacy policy are added."],
    ],
  },
  terms: {
    eyebrow: "TERMS · DEMO",
    title: "Use of the ServiceBook demonstration.",
    introduction: "ServiceBook is a student/demo application and is not currently presented as a production booking service.",
    sections: [
      ["Appointments", "A selected time is a request until the existing backend creates the booking. The server is authoritative for duplicate time-slot conflicts."],
      ["Payments", "Use only Razorpay test credentials and test payment methods. Payment completion is determined by backend verification, not by the browser alone."],
      ["Availability", "The current API does not expose a live availability calendar. A slot can be rejected at confirmation if another booking already occupies it."],
      ["Production use", "Production deployment requires reviewed legal terms, real support details, server-side identity/access controls and tested payment configuration."],
    ],
  },
};

function InfoPage() {
  const { infoPage } = useParams();
  const page = information[infoPage];

  if (!page) return <section className="page-width content-page not-found-page"><h1>Page not found.</h1><Link className="button button-primary" to="/">Back to ServiceBook</Link></section>;

  return (
    <section className="page-width content-page information-page">
      <Link className="breadcrumb-link" to="/"><ArrowLeft size={14} /> Back to ServiceBook</Link>
      <div className="page-heading"><span className="section-kicker">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.introduction}</p></div>
      <div className="information-list">{page.sections.map(([title, copy]) => <article key={title}><h2>{title}</h2><p>{copy}</p></article>)}</div>
    </section>
  );
}

export default InfoPage;