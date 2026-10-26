import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PageHeading } from "../components/SiteLayout";
import { Icon } from "../components/Icons";
import { ApiError, api, type IncidentSummary } from "../lib/api";
import { formatIncidentStatus } from "../lib/incidentStatus";
import { formatTimestamp } from "./ConfirmationPage";

export function HistoryPage() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.myIncidents().then((rows) => { if (active) setIncidents(rows); })
      .catch((failure) => { if (active) setError(failure instanceof ApiError ? failure.message : "Incident history could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const removeIncident = async (incident: IncidentSummary) => {
    if (!window.confirm(`Delete simulated record ${incident.reference}?`)) return;
    try {
      await api.deleteIncident(incident.id);
      setIncidents((current) => current.filter((item) => item.id !== incident.id));
      setError("");
    } catch (failure) { setError(failure instanceof ApiError ? failure.message : "This record could not be deleted."); }
  };

  return <div className="page-shell"><div className="content-wide">
    <div className="history-heading-row"><PageHeading eyebrow="Your records" title="Incident history" description="Review your reports, references, and the latest status updates." /><Link className="button button-primary" to="/report"><Icon name="cross" width={18} height={18} /> New report</Link></div>
    {error && <div className="inline-error" role="alert"><Icon name="alert" width={17} height={17} /> {error}{error.toLowerCase().includes("sign in") && <> <Link to="/sign-in">Sign in again</Link></>}</div>}
    {loading ? <div className="loading-state" role="status">Loading your incident history…</div> : incidents.length === 0 ? <section className="empty-state">
      <div className="empty-illustration"><span><Icon name="file" width={32} height={32} /></span><i /><i /></div><span className="eyebrow">Your records</span><h2>No reports yet</h2><p>Reports you submit will appear here with their reference and current status.</p><Link className="button button-primary" to="/report">Create a report <Icon name="arrow" width={17} height={17} /></Link>
    </section> : <div className="history-list" aria-label="Incident records">{incidents.map((incident) => <article className="history-card" key={incident.id}>
      <div className={"history-category-icon history-" + incident.category.toLowerCase()}><Icon name={incident.category === "Police" ? "police" : incident.category === "Fire" ? "fire" : incident.category === "Medical" ? "medical" : "other"} width={22} height={22} /></div>
      <div className="history-main"><div className="history-title-row"><h2>{incident.category} incident</h2><span className={"status-pill status-" + incident.currentStatus.toLowerCase()}>{formatIncidentStatus(incident.currentStatus)}</span></div><span className="history-reference">{incident.reference}</span><p>{incident.description}</p><div className="history-meta"><span><Icon name="clock" width={15} height={15} /> {formatTimestamp(incident.createdAtUtc)}</span><span className="severity-text">Severity: {incident.severity}</span></div></div>
      <div className="history-actions"><Link className="history-view-link" to={"/history/" + incident.id}>View details <Icon name="arrow" width={16} height={16} /></Link>{incident.currentStatus === "Received" && <button className="icon-button delete-button" type="button" aria-label={"Delete " + incident.reference} onClick={() => removeIncident(incident)}><Icon name="trash" width={18} height={18} /></button>}</div>
    </article>)}</div>}
  </div></div>;
}
