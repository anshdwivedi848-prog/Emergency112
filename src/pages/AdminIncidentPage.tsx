import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { DemoNotice, PageHeading } from "../components/SiteLayout";
import { ApiError, api, type Incident, type IncidentStatus, type ResponseUnit } from "../lib/api";
import { formatIncidentStatus } from "../lib/incidentStatus";
import { formatTimestamp } from "./ConfirmationPage";

const statusOptions: IncidentStatus[] = ["Received", "UnderReview", "Assigned", "Resolved"];

export function AdminIncidentPage() {
  const { incidentId = "" } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [units, setUnits] = useState<ResponseUnit[]>([]);
  const [status, setStatus] = useState<IncidentStatus>("Received");
  const [unitId, setUnitId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = async () => {
    const [record, available] = await Promise.all([api.adminIncident(incidentId), api.responseUnits()]);
    setIncident(record); setStatus(record.currentStatus); setUnits(available);
    const matching = available.find((unit) => unit.isActive && (unit.category === "Other" || unit.category === record.category));
    setUnitId(matching?.id ?? "");
  };
  useEffect(() => { let active = true; Promise.all([api.adminIncident(incidentId), api.responseUnits()])
    .then(([record, available]) => { if (active) { setIncident(record); setStatus(record.currentStatus); setUnits(available); const match = available.find((unit) => unit.isActive && (unit.category === "Other" || unit.category === record.category)); setUnitId(match?.id ?? ""); } })
    .catch((failure) => { if (active) setError(failure instanceof ApiError ? failure.message : "Incident details could not be loaded."); })
    .finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [incidentId]);

  const updateStatus = async (event: FormEvent) => {
    event.preventDefault(); if (!incident) return; setBusy(true); setError(""); setSuccess("");
    try { await api.updateStatus(incident.id, status, note); await refresh(); setNote(""); setSuccess("Status updated and added to the audit history."); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : "Status could not be updated."); }
    finally { setBusy(false); }
  };
  const assign = async (event: FormEvent) => {
    event.preventDefault(); if (!incident || !unitId) return; setBusy(true); setError(""); setSuccess("");
    try { await api.assignUnit(incident.id, unitId, note); await refresh(); setNote(""); setSuccess("Fictional response unit assigned and recorded."); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : "Unit assignment could not be saved."); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="page-shell"><div className="content-narrow"><p role="status">Loading incident…</p></div></div>;
  if (!incident) return <div className="page-shell"><div className="content-narrow"><PageHeading eyebrow="Admin dashboard" title="Incident unavailable." description={error || "The incident could not be found."} /><Link className="button button-primary" to="/admin">Back to dashboard</Link></div></div>;

  const currentAssignment = incident.assignments.find((assignment) => !assignment.releasedAtUtc);
  return <div className="page-shell"><div className="content-narrow admin-detail-page"><div className="detail-back"><Link className="text-link" to="/admin">← Back to dashboard</Link></div>
    <PageHeading eyebrow="Administrator · incident details" title={incident.reference} description={`${incident.category} · ${incident.severity} · ${formatTimestamp(incident.createdAtUtc)}`} />
    <DemoNotice tone="warning"><strong>Simulated operations.</strong><p>Status and unit changes are project records only. No emergency services are notified or dispatched.</p></DemoNotice>
    {error && <div className="inline-error" role="alert">{error}</div>}{success && <div className="inline-success" role="status">{success}</div>}
    <article className="confirmation-record detail-record"><div className="record-header"><span className="record-label">INCIDENT DETAILS</span><span className={"status-pill status-" + incident.currentStatus.toLowerCase()}>{formatIncidentStatus(incident.currentStatus)}</span></div><div className="record-details"><div><span>Reporter</span><strong>{incident.reporter || "Citizen reporter"}</strong></div><div><span>Location</span><strong>{incident.location || "Not provided"}</strong></div><div className="detail-wide"><span>Description</span><p>{incident.description}</p></div>{currentAssignment && <div className="detail-wide"><span>Active simulated unit</span><strong>{currentAssignment.unitCode} · {currentAssignment.unitName}</strong></div>}</div></article>
    <div className="admin-action-grid"><form className="admin-action-card" onSubmit={updateStatus}><span className="eyebrow">Manage status</span><h2>Update incident status</h2><label className="field-label">New status<select className="text-input" value={status} onChange={(event) => setStatus(event.target.value as IncidentStatus)}>{statusOptions.map((value) => <option key={value} value={value}>{formatIncidentStatus(value)}</option>)}</select></label><label className="field-label">Administrator note<input className="text-input" maxLength={240} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for the timeline" /></label><button className="button button-primary" disabled={busy || status === incident.currentStatus}>{busy ? "Saving…" : "Save status"}</button></form>
      <form className="admin-action-card" onSubmit={assign}><span className="eyebrow">Fictional units only</span><h2>Assign response unit</h2><label className="field-label">Available unit<select className="text-input" value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">Choose a unit</option>{units.filter((unit) => unit.isActive && (unit.category === "Other" || unit.category === incident.category)).map((unit) => <option value={unit.id} key={unit.id}>{unit.code} · {unit.name}</option>)}</select></label><label className="field-label">Assignment note<input className="text-input" maxLength={240} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional assignment note" /></label><button className="button button-outline" disabled={busy || !unitId || incident.currentStatus === "Resolved"}>{busy ? "Saving…" : "Assign simulated unit"}</button></form></div>
    <section className="timeline-section"><h2>Status timeline</h2>{incident.statusHistory.map((entry) => <div className="timeline-item" key={entry.id}><span className="timeline-dot" /><div><strong>{formatIncidentStatus(entry.toStatus)}</strong><p>{entry.note}</p><small>{formatTimestamp(entry.changedAtUtc)} · {entry.fromStatus ? `Updated by ${entry.changedBy} · Administrator` : `Reported by ${entry.changedBy}`}</small></div></div>)}</section>
    <section className="timeline-section"><h2>Assignment history</h2>{incident.assignments.length === 0 ? <p>No simulated response units have been assigned.</p> : incident.assignments.map((assignment) => <div className="timeline-item" key={assignment.id}><span className="timeline-dot" /><div><strong>{assignment.unitCode} · {assignment.unitName}</strong><p>{assignment.notes || "No assignment note"}</p><small>{formatTimestamp(assignment.assignedAtUtc)}{assignment.releasedAtUtc ? ` · released ${formatTimestamp(assignment.releasedAtUtc)}` : " · active"}</small></div></div>)}</section>
  </div></div>;
}
