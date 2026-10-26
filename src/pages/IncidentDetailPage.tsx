import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { PageHeading } from "../components/SiteLayout";
import { Icon } from "../components/Icons";
import { ApiError, api, type Incident } from "../lib/api";
import { formatIncidentStatus } from "../lib/incidentStatus";
import { formatTimestamp } from "./ConfirmationPage";

export function IncidentDetailPage() {
  const { incidentId = "" } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.incident(incidentId).then((item) => { if (active) setIncident(item); })
      .catch((failure) => { if (active) setError(failure instanceof ApiError ? failure.message : "The incident details could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [incidentId]);

  const removeIncident = async () => {
    if (!incident || !window.confirm(`Delete simulated record ${incident.reference}?`)) return;
    try { await api.deleteIncident(incident.id); navigate("/history"); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : "This record could not be deleted."); }
  };

  if (loading) return <div className="page-shell"><div className="content-narrow"><p role="status">Loading incident details…</p></div></div>;
  if (!incident) return <div className="page-shell"><div className="content-narrow"><PageHeading eyebrow="Incident history" title="Record unavailable." description={error || "This record may have been removed or belongs to another account."} /><Link className="button button-primary" to="/history">Back to incident history</Link></div></div>;

  return <div className="page-shell"><div className="content-narrow">
    <div className="detail-back"><Link className="text-link" to="/history"><Icon name="arrow" width={16} height={16} /> Back to history</Link></div>
    <PageHeading eyebrow="Incident record" title={incident.category + " incident"} description="Review the report details and status history." />
    {error && <div className="inline-error" role="alert">{error}</div>}
    <article className="confirmation-record detail-record"><div className="record-header"><span className="record-label">INCIDENT REFERENCE</span><span className={"status-pill status-" + incident.currentStatus.toLowerCase()}>{formatIncidentStatus(incident.currentStatus)}</span></div><strong className="record-reference">{incident.reference}</strong><div className="record-divider" /><div className="record-details">
      <div><span>Category</span><strong>{incident.category}</strong></div><div><span>Severity</span><strong>{incident.severity}</strong></div><div className="detail-wide"><span>Description</span><p>{incident.description}</p></div><div className="detail-wide"><span>Location</span><p>{incident.location || "No location shared"}</p></div><div><span>Created</span><strong>{formatTimestamp(incident.createdAtUtc)}</strong></div>
    </div></article>
    <section className="timeline-section"><h2>Status timeline</h2>{incident.statusHistory.map((entry) => <div className="timeline-item" key={entry.id}><span className="timeline-dot" /><div><strong>{formatIncidentStatus(entry.toStatus)}</strong><p>{entry.note}</p><small>{formatTimestamp(entry.changedAtUtc)} · {entry.fromStatus ? `Updated by ${entry.changedBy} · Administrator` : `Reported by ${entry.changedBy}`}</small></div></div>)}</section>
    {incident.currentStatus === "Received" && <div className="detail-actions"><button className="button button-danger-outline" type="button" onClick={removeIncident}><Icon name="trash" width={17} height={17} /> Delete record</button></div>}
  </div></div>;
}
