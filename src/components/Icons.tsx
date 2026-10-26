import type { SVGProps } from "react";

export type IconName = "shield" | "phone" | "police" | "fire" | "medical" | "other" | "pin" | "clock" | "arrow" | "chevron" | "app" | "menu" | "close" | "trash" | "check" | "alert" | "ambulance" | "file" | "heart" | "map" | "cross" | "spark" | "external" | "eye" | "eye-off";

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const shared = {
    width: props.width ?? 22,
    height: props.height ?? 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    ...props,
  };

  switch (name) {
    case "shield":
      return <svg {...shared}><path d="M12 3 20 6v5c0 5.2-3.4 8.8-8 10-4.6-1.2-8-4.8-8-10V6l8-3Z" /><path d="M12 8v8M8 12h8" /></svg>;
    case "phone":
      return <svg {...shared}><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M10 18h4" /></svg>;
    case "police":
      return <svg {...shared}><path d="M12 3 20 6v5c0 5.2-3.4 8.8-8 10-4.6-1.2-8-4.8-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "fire":
      return <svg {...shared}><path d="M13.5 3c.8 3.3-1.4 4.6-1.4 7.1 0 1.1.7 1.8 1.6 1.8 1.3 0 2.1-1.4 2.1-3.1 2.3 1.8 3.6 4.1 3.6 6.5a7.4 7.4 0 0 1-14.8 0c0-3.2 1.7-6.1 4.7-8.5-.2 2.5.3 3.7 1.3 4.1C9.8 7.5 12 6.4 13.5 3Z" /><path d="M12 14.5c-1.4 1-2.1 2-2.1 3.1a2.1 2.1 0 0 0 4.2 0c0-1-.7-2.1-2.1-3.1Z" /></svg>;
    case "medical":
      return <svg {...shared}><path d="M4 7h16v13H4z" /><path d="M9 7V5a3 3 0 0 1 6 0v2M12 10v7M8.5 13.5h7" /></svg>;
    case "other":
      return <svg {...shared}><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.9 1.6c-1.2 1-1.7 1.3-1.7 2.9M12 17.2h.01" /></svg>;
    case "pin":
      return <svg {...shared}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "clock":
      return <svg {...shared}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "arrow":
      return <svg {...shared}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "chevron":
      return <svg {...shared}><path d="m9 18 6-6-6-6" /></svg>;
    case "app":
      return <svg {...shared}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M10 17h4" /></svg>;
    case "menu":
      return <svg {...shared}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "close":
      return <svg {...shared}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "trash":
      return <svg {...shared}><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>;
    case "check":
      return <svg {...shared}><path d="m5 12 4 4L19 6" /></svg>;
    case "alert":
      return <svg {...shared}><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5M12 17h.01" /></svg>;
    case "ambulance":
      return <svg {...shared}><path d="M3 7h11v11H3zM14 11h4l3 3v4h-7" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /><path d="M8.5 10v5M6 12.5h5" /></svg>;
    case "file":
      return <svg {...shared}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v6h5M9 13h6M9 17h6" /></svg>;
    case "heart":
      return <svg {...shared}><path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.4Z" /><path d="M8.5 12h2l1.2-2.2 1.5 4.4 1.1-2.2h1.3" /></svg>;
    case "map":
      return <svg {...shared}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></svg>;
    case "cross":
      return <svg {...shared}><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" /></svg>;
    case "spark":
      return <svg {...shared}><path d="m12 3 1.5 6.5L20 11l-6.5 1.5L12 19l-1.5-6.5L4 11l6.5-1.5L12 3Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></svg>;
    case "external":
      return <svg {...shared}><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></svg>;
    case "eye":
      return <svg {...shared}><path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
    case "eye-off":
      return <svg {...shared}><path d="m3 3 18 18M10.6 6.2A10.6 10.6 0 0 1 12 6c6.3 0 9.5 6 9.5 6a15 15 0 0 1-3 3.8M6.2 6.2C3.7 7.8 2.5 12 2.5 12s3.2 6 9.5 6c1.2 0 2.3-.2 3.3-.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
  }
}
