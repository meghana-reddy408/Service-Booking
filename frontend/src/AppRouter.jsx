import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Admin from "./Admin.jsx";
import { apiRequest } from "./api.js";
import { BookingDetailsPage, BookingFlowPage } from "./pages/BookingPages.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MyBookingsPage from "./pages/MyBookingsPage.jsx";
import InfoPage from "./pages/InfoPage.jsx";
import { ServiceDetailsPage, ServicesPage } from "./pages/ServicesPage.jsx";
import SiteShell from "./components/SiteShell.jsx";
import NearbyServices from "./NearbyServices.jsx";

const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

const readSavedUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("serviceBookUser") || "null");
    return user?.email ? user : null;
  } catch {
    localStorage.removeItem("serviceBookUser");
    return null;
  }
};

function RouteContent() {
  const [user, setUser] = useState(readSavedUser);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [serviceReload, setServiceReload] = useState(0);
  const [activeBooking, setActiveBooking] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/services")
      .then((data) => { if (!cancelled) setServices(Array.isArray(data) ? data : []); })
      .catch((error) => { if (!cancelled) setServicesError(error.message); })
      .finally(() => { if (!cancelled) setServicesLoading(false); });
    return () => { cancelled = true; };
  }, [serviceReload]);

  useEffect(() => {
    const pageNames = {
      "/": "Book trusted services, effortlessly",
      "/services": "Explore services",
      "/nearby": "Nearby services",
      "/my-bookings": "My bookings",
      "/admin": "Booking dashboard",
      "/login": "Sign in",
    };
    const title = pageNames[location.pathname] || (location.pathname.startsWith("/services/") ? "Service details" : location.pathname.startsWith("/booking/") ? "Booking details" : "ServiceBook");
    document.title = `${title} | ServiceBook`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = "Discover local services and book your next appointment with ServiceBook.";
  }, [location.pathname]);

  const reloadServices = () => {
    setServicesLoading(true);
    setServicesError("");
    setServiceReload((value) => value + 1);
  };

  const login = (email, nextPath) => {
    const nextUser = { email };
    localStorage.setItem("serviceBookUser", JSON.stringify(nextUser));
    setUser(nextUser);
    const safeNextPath = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
    navigate(safeNextPath, { replace: true });
  };

  const logout = () => {
    localStorage.removeItem("serviceBookUser");
    setUser(null);
    setActiveBooking(null);
    navigate("/", { replace: true });
  };

  const bookService = (service) => {
    const target = service?._id ? `/book/${service._id}` : "/book";
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  };

  const createBooking = async (payload) => {
    const booking = await apiRequest("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActiveBooking(booking);
    return booking;
  };

  const startPayment = async (booking) => {
    if (!booking) throw new Error("Booking details are missing.");
    const orderData = await apiRequest(`/api/bookings/${booking._id}/create-order`, { method: "POST" });
    if (!window.Razorpay) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = RAZORPAY_CHECKOUT_URL;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Unable to load secure checkout. Please retry."));
        document.body.appendChild(script);
      });
    }

    await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "ServiceBook",
          description: booking.service?.name,
          order_id: orderData.orderId,
          prefill: { name: booking.customerName, email: booking.customerEmail, contact: booking.customerPhone },
          theme: { color: "#205a46" },
          handler: async (paymentResponse) => {
            try {
              const result = await apiRequest(`/api/bookings/${booking._id}/verify-payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentResponse),
              });
              const confirmed = result.booking || result;
              setActiveBooking(confirmed);
              resolve(confirmed);
            } catch (error) {
              reject(error);
            }
          },
          modal: { ondismiss: () => reject(new Error("Payment was not completed. You can retry from this booking.")) },
        });
        checkout.open();
    });
  };

  const requireUser = (element, from = location.pathname) => user
    ? element
    : <Navigate to={`/login?next=${encodeURIComponent(from)}`} replace />;

  return (
    <SiteShell user={user} onLogout={logout}>
      <Routes>
        <Route index element={<LandingPage services={services} loading={servicesLoading} error={servicesError} onRetry={reloadServices} onBook={bookService} />} />
        <Route path="login" element={<LoginPage user={user} onLogin={login} />} />
        <Route path="services" element={<ServicesPage services={services} loading={servicesLoading} error={servicesError} onRetry={reloadServices} onBook={bookService} />} />
        <Route path="services/:serviceId" element={<ServiceDetailsPage services={services} loading={servicesLoading} onBook={bookService} />} />
        <Route path="nearby" element={<NearbyServices />} />
        <Route path="book" element={requireUser(<BookingFlowPage services={services} loadingServices={servicesLoading} user={user} onCreateBooking={createBooking} />, "/book")} />
        <Route path="book/:serviceId" element={requireUser(<BookingFlowPage services={services} loadingServices={servicesLoading} user={user} onCreateBooking={createBooking} />, location.pathname)} />
        <Route path="booking/:bookingId" element={requireUser(<BookingDetailsPage activeBooking={activeBooking} onPay={startPayment} />, location.pathname)} />
        <Route path="my-bookings" element={requireUser(<MyBookingsPage user={user} />, "/my-bookings")} />
        <Route path="admin" element={requireUser(<Admin />, "/admin")} />
        <Route path=":infoPage" element={<InfoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteShell>
  );
}

function NotFoundPage() {
  return <section className="page-width not-found-page"><span className="section-kicker">404 · PAGE NOT FOUND</span><h1>We can’t find that page.</h1><p>The page may have moved, or the address may be incorrect.</p><Link className="button button-primary" to="/"><ArrowLeft size={16} /> Back to ServiceBook</Link></section>;
}

function AppRouter() {
  return <BrowserRouter><RouteContent /></BrowserRouter>;
}

export default AppRouter;