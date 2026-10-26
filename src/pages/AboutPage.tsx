import { Link } from "react-router";
import { DemoNotice, PageHeading } from "../components/SiteLayout";
import { Icon } from "../components/Icons";

export function AboutPage() {
  return <div className="page-shell"><div className="content-narrow about-page">
    <PageHeading eyebrow="Project information" title="About Emergency112" description="A college project for incident reporting and status tracking." />
    <DemoNotice tone="warning"><strong>Emergency112 is an academic prototype and is not for real emergencies.</strong><p>It is not connected to emergency services and does not notify or dispatch police, fire, ambulance, or other responders. Use the official emergency service for your location in a real emergency.</p></DemoNotice>
    <section className="about-panel"><h2>What the project demonstrates</h2><ul className="about-list">
      <li><span><Icon name="file" width={19} height={19} /></span><div><strong>Incident reporting</strong><p>A citizen can create a record with a category, description, severity, and optional location.</p></div></li>
      <li><span><Icon name="clock" width={19} height={19} /></span><div><strong>Status tracking</strong><p>Citizens can review the record and its status history after signing in.</p></div></li>
      <li><span><Icon name="shield" width={19} height={19} /></span><div><strong>Simulated administration</strong><p>Admin status changes and fictional unit assignments are saved for the demonstration workflow only.</p></div></li>
    </ul></section>
    <div className="about-actions"><Link className="button button-outline" to="/assistance">View assistance options <Icon name="arrow" width={17} height={17} /></Link><Link className="text-link" to="/">Return home</Link></div>
  </div></div>;
}
