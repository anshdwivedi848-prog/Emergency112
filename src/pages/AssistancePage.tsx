import { Link } from "react-router";
import { APP_SETTINGS } from "../config";
import { PageHeading } from "../components/SiteLayout";
import { Icon } from "../components/Icons";
import { getConfiguredContactNumber } from "../lib/contactNumber";
import { useAuth } from "../lib/AuthContext";
import { getHomePrimaryAction } from "../lib/roleNavigation";

function telHref(number: string) {
  return "tel:" + number.replace(/[^\d+]/g, "");
}

export function AssistancePage() {
  const { user } = useAuth();
  const contactNumber = getConfiguredContactNumber(APP_SETTINGS.emergencyContactNumber);
  const nextAction = getHomePrimaryAction(user?.roles ?? null);

  return (
    <div className="page-shell">
      <div className="content-narrow">
        <PageHeading eyebrow="Assistance" title="Choose your next step." description="Review the available options. No call or download starts automatically." />

        <div className="assistance-grid">
          <section className="assistance-card assistance-call">
            <div className="assistance-card-top"><span className="assistance-icon"><Icon name="phone" width={25} height={25} /></span></div>
            <span className="eyebrow">Emergency contact</span>
            <h2>{contactNumber ? "Call the configured contact." : "Use your local emergency service."}</h2>
            {contactNumber ? <>
              <p>This opens your device’s dialer with the configured number. You decide whether to place the call.</p>
              <div className="configured-number">
                <small>Configured contact</small>
                <strong>{contactNumber}</strong>
              </div>
              <a className="button button-primary full-button" href={telHref(contactNumber)}>
                <Icon name="phone" width={19} height={19} /> Open phone app
              </a>
              <div className="small-safe-note"><Icon name="shield" width={16} height={16} /> This opens the dialer only. No call is placed automatically.</div>
            </> : <>
              <p>No verified phone number is configured in Emergency112. For a real emergency, contact the official emergency service for your location directly.</p>
              <div className="small-safe-note"><Icon name="shield" width={16} height={16} /> Emergency112 does not contact or dispatch responders.</div>
            </>}
          </section>

          <section className="assistance-card assistance-app">
            <div className="assistance-card-top"><span className="assistance-icon app-icon"><Icon name="app" width={25} height={25} /></span></div>
            <span className="eyebrow">Android app</span>
            <h2>Use your citizen account.</h2>
            <p>The Android app uses the same project API and incident records as this website.</p>
            <ul className="app-feature-list"><li>Sign in with your existing citizen account</li><li>Create reports and view incident history</li><li>Refresh status updates made by an administrator</li></ul>
            {APP_SETTINGS.appDownloadUrl ? (
              <a className="button button-outline full-button" href={APP_SETTINGS.appDownloadUrl}>
                Download the Android app <Icon name="external" width={17} height={17} />
              </a>
            ) : (
              <div className="installation-info" aria-live="polite">
                <strong>Installation information</strong>
                <p>Ask the project maintainer for the current APK download. A direct download link will appear here when one is available.</p>
              </div>
            )}
          </section>
        </div>

        <div className="assistance-bottom">
          <div><span className="eyebrow">Incident reporting</span><strong>Create a project record.</strong></div>
          <Link className="button button-dark" to={nextAction.to}>{nextAction.label} <Icon name="arrow" width={17} height={17} /></Link>
        </div>
      </div>
    </div>
  );
}
