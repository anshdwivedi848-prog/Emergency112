import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { Icon } from "./Icons";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router";
import { getRoleNavigationLinks } from "../lib/roleNavigation";

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const navigationLinks = getRoleNavigationLinks(user?.roles ?? null);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="demo-ribbon" role="note">
        <Icon name="alert" width={15} height={15} />
        <span>Not for real emergencies · no emergency services are connected</span>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" onClick={closeMenu} aria-label={user?.roles.includes("Admin") ? "Emergency112 administrator dashboard" : "Emergency112 home"}>
            <span className="brand-mark"><Icon name="shield" width={25} height={25} /></span>
            <span className="brand-copy">
              <strong>Emergency<span>112</span></strong>
            </span>
          </Link>
          <button
            className="mobile-menu-button"
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
          <nav
            id="primary-navigation"
            className={"primary-nav" + (menuOpen ? " is-open" : "")}
            aria-label="Primary navigation"
          >
            {navigationLinks.map((item) => <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={closeMenu}>{item.label}</NavLink>)}
            {user ? <button className="nav-account-button" onClick={() => { void signOut().catch(() => undefined).finally(() => { closeMenu(); navigate("/"); }); }} type="button">Sign out</button> : <NavLink to="/sign-in" onClick={closeMenu}>Sign in</NavLink>}
            <Link className="nav-help" to="/assistance" onClick={closeMenu}>
              Assistance <Icon name="arrow" width={16} height={16} />
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content" key={location.pathname}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="brand brand-on-dark" to="/">
              <span className="brand-mark"><Icon name="shield" width={24} height={24} /></span>
              <span className="brand-copy">
                <strong>Emergency<span>112</span></strong>
              </span>
            </Link>
            <p>A student project for exploring incident reporting and status tracking.</p>
          </div>
          <div className="footer-links">
            <strong>Explore</strong>
            {navigationLinks.map((item) => <Link key={item.to} to={item.to}>{item.to === "/about" ? "About Emergency112" : item.label}</Link>)}
            {!user && <Link to="/sign-in">Sign in</Link>}
          </div>
          <div className="footer-links">
            <strong>Need assistance?</strong>
            <Link to="/assistance">Assistance options <Icon name="arrow" width={14} height={14} /></Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Emergency112 · Student project</span>
        </div>
      </footer>
    </div>
  );
}

export function DemoNotice({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "success" }) {
  return (
    <div className={"notice notice-" + tone} role={tone === "warning" ? "alert" : "note"}>
      <span className="notice-icon"><Icon name={tone === "success" ? "check" : "alert"} width={19} height={19} /></span>
      <div>{children}</div>
    </div>
  );
}

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
