import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api, ApiError } from "../lib/api";
import { validateIncidentDraft } from "../lib/validation";
import { requestCurrentLocation } from "../lib/location";
import { EMERGENCY_CATEGORIES } from "../types";
import type { EmergencyCategory, IncidentDraft, Severity } from "../types";
import { DemoNotice, PageHeading } from "../components/SiteLayout";
import { Icon } from "../components/Icons";

const SEVERITIES: { value: Severity; title: string; helper: string }[] = [
  { value: "Low", title: "Low", helper: "Needs attention" },
  { value: "Moderate", title: "Moderate", helper: "Needs timely help" },
  { value: "High", title: "High", helper: "Urgent situation" },
  { value: "Critical", title: "Critical", helper: "Immediate danger" },
];

const validCategories = EMERGENCY_CATEGORIES as readonly string[];

type FormValues = {
  category: EmergencyCategory | "";
  description: string;
  severity: Severity;
  location: string;
};

export function ReportPage() {
  const [searchParams] = useSearchParams();
  const queryCategory = searchParams.get("category") ?? "";
  const initialCategory = validCategories.includes(queryCategory) ? queryCategory as EmergencyCategory : "";
  const [values, setValues] = useState<FormValues>({
    category: initialCategory,
    description: "",
    severity: "Moderate",
    location: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
  };

  const requestLocation = () => {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationState("error");
      setLocationMessage("Location sharing is not supported in this browser. You can enter a location manually.");
      return;
    }
    setLocationState("loading");
    requestCurrentLocation(navigator.geolocation).then(
      (location) => {
        setValues((current) => ({ ...current, location }));
        setLocationState("success");
        setLocationMessage("Location added. You can edit it before submitting.");
      },
    ).catch(() => {
        setLocationState("error");
        setLocationMessage("Location wasn't shared. You can still type a location below.");
      });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const draft: Partial<IncidentDraft> = {
      category: values.category || undefined,
      description: values.description,
      severity: values.severity,
      location: values.location.trim(),
    };
    const nextErrors = validateIncidentDraft(draft);
    if (!confirmed) nextErrors.confirmed = "Confirm that this report is simulated and will not alert responders.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.querySelector("[aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const incident = await api.createIncident({
        category: values.category as EmergencyCategory,
        description: values.description.trim(),
        severity: values.severity,
        location: values.location.trim(),
      });
      navigate("/confirmation/" + incident.id);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : "The report could not be saved. Check your connection and try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="page-shell">
      <div className="content-form">
        <PageHeading eyebrow="New incident" title="Describe what happened." description="Add the details you want in the record. Location is optional." />
        <DemoNotice tone="warning">
          <strong>Simulated report · not for real emergencies.</strong>
          <p>This report will not alert or dispatch emergency responders. For real emergencies, contact the official service for your location.</p>
        </DemoNotice>
        <form className="report-form" onSubmit={submit} noValidate>
          <section className="form-section">
            <div className="form-section-heading"><span className="form-step">01</span><div><h2>Choose a category</h2><p>Pick the closest match for the incident record.</p></div></div>
            <div className="category-select-grid">
              {EMERGENCY_CATEGORIES.map((category) => (
                <button
                  className={"category-select" + (values.category === category ? " selected" : "")}
                  type="button"
                  key={category}
                  aria-pressed={values.category === category}
                  onClick={() => update("category", category)}
                >
                  <span className="category-select-icon"><Icon name={category === "Police" ? "police" : category === "Fire" ? "fire" : category === "Medical" ? "medical" : "other"} width={21} height={21} /></span>
                  <span>{category}</span>
                  {values.category === category && <Icon name="check" width={17} height={17} />}
                </button>
              ))}
            </div>
            {errors.category && <p className="field-error" role="alert">{errors.category}</p>}
          </section>

          <section className="form-section">
            <div className="form-section-heading"><span className="form-step">02</span><div><h2>Describe what happened</h2><p>Keep it short and leave out names or private details.</p></div></div>
            <label className="field-label" htmlFor="description">Incident description <span className="required-mark">Required</span></label>
            <textarea
              id="description"
              className="text-input description-input"
              rows={4}
              maxLength={500}
              placeholder="For example: a fictional smoke alarm is sounding in the east campus building."
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "description-error" : "description-count"}
            />
            <div className="field-bottom-row">
              {errors.description ? <p className="field-error" id="description-error" role="alert">{errors.description}</p> : <span />}
              <span className="character-count" id="description-count">{values.description.length}/500</span>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-heading"><span className="form-step">03</span><div><h2>How urgent does it feel?</h2><p>Choose a level for the demonstration record.</p></div></div>
            <div className="severity-grid" role="radiogroup" aria-label="Severity">
              {SEVERITIES.map((severity) => (
                <label className={"severity-option" + (values.severity === severity.value ? " selected" : "")} key={severity.value}>
                  <input type="radio" name="severity" value={severity.value} checked={values.severity === severity.value} onChange={() => update("severity", severity.value)} />
                  <span className="radio-dot" />
                  <span><strong>{severity.title}</strong><small>{severity.helper}</small></span>
                </label>
              ))}
            </div>
            {errors.severity && <p className="field-error" role="alert">{errors.severity}</p>}
          </section>

          <section className="form-section location-form-section">
            <div className="form-section-heading"><span className="form-step">04</span><div><h2>Add a location <span className="optional-label">Optional</span></h2><p>Share a rough place to make the demo record more useful.</p></div></div>
            <button className="button button-outline location-button" type="button" onClick={requestLocation} disabled={locationState === "loading"}>
              <Icon name="pin" width={18} height={18} /> {locationState === "loading" ? "Finding your location…" : "Use my current location"}
            </button>
            <div className="location-permission-note"><Icon name="shield" width={15} height={15} /> Your browser will ask for permission only after you select this button.</div>
            {locationMessage && <p className={"location-feedback " + locationState} role="status">{locationMessage}</p>}
            <label className="field-label" htmlFor="location">Or enter a location manually</label>
            <div className="input-with-icon"><Icon name="map" width={18} height={18} /><input id="location" className="text-input" type="text" maxLength={160} placeholder="Building, area, landmark (optional)" value={values.location} onChange={(event) => update("location", event.target.value)} /></div>
          </section>

          <section className="submit-section">
            <label className={"confirmation-checkbox" + (errors.confirmed ? " checkbox-error" : "")}>
              <input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setErrors((current) => ({ ...current, confirmed: "" })); }} />
              <span className="custom-checkbox"><Icon name="check" width={14} height={14} /></span>
              <span>I understand this is a simulated report and will not notify real emergency responders.</span>
            </label>
            {errors.confirmed && <p className="field-error" role="alert">{errors.confirmed}</p>}
            {submitError && <p className="form-submit-error" role="alert"><Icon name="alert" width={17} height={17} /> {submitError}</p>}
              <button className="button button-primary button-submit" type="submit" disabled={submitting}>{submitting ? "Saving report…" : <>Submit report <Icon name="arrow" width={18} height={18} /></>}</button>
            <p className="submit-footnote">No names or contact details are collected.</p>
          </section>
        </form>
        <div className="back-link-wrap"><Link className="text-link" to="/"><Icon name="arrow" width={16} height={16} /> Return to home</Link></div>
      </div>
    </div>
  );
}
