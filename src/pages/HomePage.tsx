import { Link, Navigate } from "react-router";
import { Icon, type IconName } from "../components/Icons";
import { EMERGENCY_CATEGORIES } from "../types";
import type { EmergencyCategory } from "../types";
import { useAuth } from "../lib/AuthContext";
import { getHomePrimaryAction, getHomeRedirect } from "../lib/roleNavigation";

const categoryIcons: Record<EmergencyCategory, IconName> = {
  Police: "police",
  Fire: "fire",
  Medical: "medical",
  Other: "other",
};

const categoryText: Record<EmergencyCategory, string> = {
  Police: "Safety and security concerns",
  Fire: "Fire, smoke, or hazardous situations",
  Medical: "Urgent health and wellbeing needs",
  Other: "Anything that needs immediate attention",
};

export function HomePage() {
  const { user, loading } = useAuth();
  const roles = user?.roles ?? null;
  const redirect = getHomeRedirect(roles);
  const primaryAction = getHomePrimaryAction(roles);

  if (loading) return <div className="page-shell"><p role="status">Checking your account…</p></div>;
  if (redirect) return <Navigate to={redirect} replace />;

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="hero-kicker-mark"><Icon name="shield" width={16} height={16} /></span> Incident reporting</div>
          <h1>A clear next step for <em>incident reporting.</em></h1>
          <p className="hero-description">
            Describe an incident, keep its reference, and follow status updates from the project administrator.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" to="/assistance">
              <span className="sos-symbol"><Icon name="phone" width={19} height={19} /></span>
              View assistance options
            </Link>
            <Link className="text-link" to={primaryAction.to}>{primaryAction.label} <Icon name="arrow" width={17} height={17} /></Link>
          </div>
        </div>
        <div className="hero-process" aria-label="How reports are tracked">
          <div className="hero-process-heading"><h2>From description to a trackable record</h2></div>
          <ol className="hero-process-list">
            <li><span>01</span><div><strong>Describe the incident</strong><small>Choose a category and add a short summary.</small></div></li>
            <li><span>02</span><div><strong>Keep the reference</strong><small>Your report is stored in the project database.</small></div></li>
            <li><span>03</span><div><strong>Follow its status</strong><small>Review updates made in the admin dashboard.</small></div></li>
          </ol>
        </div>
      </section>

      <section className="content-section category-section">
        <div className="section-heading section-heading-row">
          <div><h2>Choose what best describes it.</h2></div>
          <p>Select a category to start an incident report.</p>
        </div>
        <div className="category-grid">
          {EMERGENCY_CATEGORIES.map((category) => (
            <Link className={"category-card category-" + category.toLowerCase()} to={"/report?category=" + category} key={category}>
              <span className="category-icon"><Icon name={categoryIcons[category]} width={24} height={24} /></span>
              <span className="category-card-copy"><strong>{category}</strong><small>{categoryText[category]}</small></span>
              <span className="category-arrow"><Icon name="arrow" width={17} height={17} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="how-section">
        <div className="how-intro">
          <h2>Clear steps. <em>Visible status.</em></h2>
          <p>Create a report, then return to history to review status updates.</p>
          <Link className="text-link" to={primaryAction.to}>{primaryAction.label} <Icon name="arrow" width={17} height={17} /></Link>
        </div>
        <div className="steps-list">
          <div className="step-card"><span className="step-number">01</span><span className="step-icon"><Icon name="cross" /></span><div><h3>Choose a category</h3><p>Add a short description and select a severity for the record.</p></div></div>
          <div className="step-card"><span className="step-number">02</span><span className="step-icon"><Icon name="map" /></span><div><h3>Add a location if useful</h3><p>Location is optional. Share it only when you choose to.</p></div></div>
          <div className="step-card"><span className="step-number">03</span><span className="step-icon"><Icon name="file" /></span><div><h3>Track the record</h3><p>Use its reference to review status changes in incident history.</p></div></div>
        </div>
      </section>

      <section className="contact-band">
        <div className="contact-band-icon"><Icon name="heart" width={25} height={25} /></div>
        <div><h2>Learn how Emergency112 works.</h2><p>Review the reporting workflow, assistance information, and project limitations.</p></div>
        <Link className="button button-outline" to="/about">About Emergency112 <Icon name="arrow" width={17} height={17} /></Link>
      </section>
    </>
  );
}
