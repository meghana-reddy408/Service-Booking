import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Compass,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Scissors,
  X,
} from "lucide-react";

const navigation = [
  { to: "/", label: "Home", icon: null, end: true },
  { to: "/services", label: "Services", icon: Scissors },
  { to: "/nearby", label: "Nearby", icon: Compass },
];

function SiteShell({ user, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);
  const linkClass = ({ isActive }) => `site-nav-link${isActive ? " is-active" : ""}`;

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand" to="/" onClick={closeMenu} aria-label="ServiceBook home">
            <span className="brand-mark"><Scissors size={19} strokeWidth={2.2} /></span>
            <span>service<span className="brand-light">book</span></span>
          </Link>

          <button
            className="mobile-menu-toggle icon-button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <nav className={`site-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
            <div className="site-nav-primary">
              {navigation.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={linkClass}
                  onClick={closeMenu}
                >
                  {Icon && <Icon size={16} aria-hidden="true" />}
                  {label}
                </NavLink>
              ))}
            </div>
            <div className="site-nav-account">
              {user && (
                <>
                  <NavLink to="/my-bookings" className={linkClass} onClick={closeMenu}>
                    <CalendarDays size={16} aria-hidden="true" /> My Bookings
                  </NavLink>
                  <NavLink to="/admin" className={linkClass} onClick={closeMenu}>
                    <LayoutDashboard size={16} aria-hidden="true" /> Admin
                  </NavLink>
                  <span className="account-email" title={user.email}>{user.email}</span>
                  <button className="nav-account-action" onClick={() => { closeMenu(); onLogout(); }}>
                    <LogOut size={15} aria-hidden="true" /> Log out
                  </button>
                </>
              )}
              {!user && (
                <NavLink to={`/login?next=${encodeURIComponent(location.pathname)}`} className="nav-login" onClick={closeMenu}>
                  <LogIn size={16} aria-hidden="true" /> Sign in
                </NavLink>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="site-main">
        {children}
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-brand-block">
            <Link className="brand footer-brand" to="/">
              <span className="brand-mark"><Scissors size={18} /></span>
              <span>service<span className="brand-light">book</span></span>
            </Link>
            <p>Book services around you, simply and securely.</p>
          </div>
          <div className="footer-links">
            <div><strong>Product</strong><Link to="/services">Services</Link><Link to="/nearby">Nearby Services</Link><Link to={user ? "/my-bookings" : "/login?next=%2Fmy-bookings"}>My bookings</Link></div>
            <div><strong>Company</strong><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/help">Help & FAQ</Link></div>
            <div><strong>Legal</strong><Link to="/privacy">Privacy notice</Link><Link to="/terms">Terms</Link></div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} ServiceBook</span>
            <span>Appointments made simpler.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SiteShell;