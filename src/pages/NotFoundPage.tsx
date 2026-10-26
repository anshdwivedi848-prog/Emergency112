import { Link } from "react-router";
import { Icon } from "../components/Icons";

export function NotFoundPage() {
  return (
    <div className="page-shell">
      <div className="content-narrow not-found">
        <div className="empty-icon"><Icon name="other" width={31} height={31} /></div>
        <span className="eyebrow">404 · Page not found</span>
        <h1>This page isn't in the demo.</h1>
        <p>The address may have changed. Head back to the Emergency112 home page to choose another step.</p>
        <Link className="button button-primary" to="/">Go to home <Icon name="arrow" width={17} height={17} /></Link>
      </div>
    </div>
  );
}
