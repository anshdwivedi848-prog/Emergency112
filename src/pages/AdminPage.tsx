import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { DemoNotice, PageHeading } from "../components/SiteLayout";
import { ApiError, api, type AuditEvent, type DashboardStats, type IncidentStatus, type IncidentSummary } from "../lib/api";
import { formatIncidentStatus } from "../lib/incidentStatus";
import { formatTimestamp } from "./ConfirmationPage";

const statusOptions: IncidentStatus[] = ["Received", "UnderReview", "Assigned", "Resolved"];

export function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [activity, setActivity] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const filters = new URLSearchParams();
      if (search.trim()) filters.set("search", search.trim());
      if (category) filters.set("category", category);
      if (severity) filters.set("severity", severity);
      if (status) filters.set("status", status);
      if (from) filters.set("from", from);
      if (to) filters.set("to", to);
      const [nextStats, rows, recent] = await Promise.all([api.dashboard(), api.adminIncidents(filters), api.activity()]);
      setStats(nextStats); setIncidents(rows); setActivity(recent);
    } catch (failure) { setError(failure instanceof ApiError ? failure.message : "Dashboard data could not be loaded."); }
    finally { setLoading(false); }
  }, [search, category, severity, status, from, to]);
  useEffect(() => { void load(); }, [load]);

  return <div className="page-shell"><div className="content-wide admin-page">
    <PageHeading eyebrow="Administrator" title="Incident dashboard." description="Review reports and record status changes in the audit history." />
    <DemoNotice tone="warning"><strong>Simulated administration.</strong><p>Reports and unit assignments are fictional. Status changes are recorded for this project only; no emergency services are notified or dispatched.</p></DemoNotice>
    {error && <div className="inline-error" role="alert">{error} {error.includes("403") && <Link to="/">Return home</Link>}</div>}
    <div className="stats-grid">{[["Total incidents", stats?.total ?? "—"], ["Open", stats?.open ?? "—"], ["Assigned", stats?.assigned ?? "—"], ["Resolved", stats?.resolved ?? "—"]].map(([label, value]) => <article className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    <section className="admin-section"><div className="admin-section-heading"><div><span className="eyebrow">Incident queue</span><h2>Reports</h2></div><span className="subtle-count">{stats?.recent24Hours ?? 0} created in the last 24 hours</span></div>
      <div className="admin-filters"><label>Search<input className="text-input" placeholder="Reference, details, location" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Category<select className="text-input" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{["Police", "Fire", "Medical", "Other"].map((x) => <option key={x}>{x}</option>)}</select></label><label>Severity<select className="text-input" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="">All severities</option>{["Low", "Moderate", "High", "Critical"].map((x) => <option key={x}>{x}</option>)}</select></label><label>Status<select className="text-input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{statusOptions.map((value) => <option key={value} value={value}>{formatIncidentStatus(value)}</option>)}</select></label><label>From<input className="text-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input className="text-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
      {loading ? <div className="loading-state" role="status">Loading incidents…</div> : incidents.length === 0 ? <div className="admin-empty">No incidents match these filters.</div> : <div className="table-wrap"><table className="incident-table"><thead><tr><th>Reference</th><th>Category</th><th>Severity</th><th>Status</th><th>Reported</th><th>Reporter</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{incidents.map((item) => <tr key={item.id}><td><strong>{item.reference}</strong></td><td>{item.category}</td><td><span className={"severity-badge severity-" + item.severity.toLowerCase()}>{item.severity}</span></td><td><span className={"status-pill status-" + item.currentStatus.toLowerCase()}>{formatIncidentStatus(item.currentStatus)}</span></td><td>{formatTimestamp(item.createdAtUtc)}</td><td>{item.reporter || "Citizen reporter"}</td><td><Link className="history-view-link" to={`/admin/incidents/${item.id}`}>Open <span aria-hidden="true">→</span></Link></td></tr>)}</tbody></table></div>}
    </section>
    <section className="admin-section activity-section"><div className="admin-section-heading"><div><span className="eyebrow">Audit log</span><h2>Recent activity</h2></div></div>{activity.length === 0 ? <p className="admin-empty">Administrative actions will appear here.</p> : <div className="activity-list">{activity.map((event) => <article className="activity-item" key={event.id}><span className="activity-dot" /><div><strong>{event.action.replace(/([A-Z])/g, " $1").trim()}</strong><p>{event.details.replaceAll("UnderReview", "Under review")} · Administrator · {event.actorDisplayName}</p><small>{formatTimestamp(event.occurredAtUtc)}</small></div><Link to={`/admin/incidents/${event.entityId}`}>View</Link></article>)}</div>}</section>
  </div></div>;
}
