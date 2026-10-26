import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { PageHeading } from "../components/SiteLayout";
import { Icon } from "../components/Icons";
import { ApiError, api, type Incident } from "../lib/api";
import { formatIncidentStatus } from "../lib/incidentStatus";

export function ConfirmationPage() {
  const { incidentId = "" } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.incident(incidentId).then((item) => { if (active) setIncident(item); })
      .catch((failure) => { if (active) setError(failure instanceof ApiError ? failure.message : "The saved report could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [incidentId]);

  if (loading) return <div className="page-shell"><div className="content-narrow"><p role="status">Loading your confirmation…</p></div></div>;
  if (!incident) return <div className="page-shell"><div className="content-narrow"><PageHeading eyebrow="Incident confirmation" title="This report is unavailable." description={error || "It may have been removed or belong to another account."} /><Link className="button button-primary" to="/history">View incident history</Link></div></div>;

  return <div className="page-shell"><div className="content-narrow confirmation-page">
    <div className="confirmation-check"><Icon name="check" width={33} height={33} /></div><span className="eyebrow">Report recorded</span><h1>Your report is saved.</h1><p className="confirmation-lead">Saved to the project database. No emergency services or responders were contacted.</p>
    <article className="confirmation-record"><div className="record-header"><span className="record-label">INCIDENT REFERENCE</span><span className={"status-pill status-" + incident.currentStatus.toLowerCase()}>Simulated · {formatIncidentStatus(incident.currentStatus)}</span></div><strong className="record-reference">{incident.reference}</strong><div className="record-divider" /><div className="record-details">
      <div><span>Category</span><strong>{incident.category}</strong></div><div><span>Severity</span><strong>{incident.severity}</strong></div><div className="detail-wide"><span>Description</span><p>{incident.description}</p></div><div className="detail-wide"><span>Submitted location</span><p>{incident.location || "No location shared"}</p></div><div><span>Timestamp</span><strong>{formatTimestamp(incident.createdAtUtc)}</strong></div>
    </div></article>
    <div className="confirmation-actions"><Link className="button button-primary" to="/history">View incident history <Icon name="arrow" width={17} height={17} /></Link><Link className="button button-outline" to="/">Return to home</Link></div>
  </div></div>;
}

export function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
