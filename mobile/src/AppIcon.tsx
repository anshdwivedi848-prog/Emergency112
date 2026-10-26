import Svg, { Circle, Path, Rect } from "react-native-svg";

export type AppIconName = "phone" | "shield" | "fire" | "medical" | "disaster" | "person" | "child" | "elderly" | "railway" | "info" | "home" | "report" | "history" | "profile";

type Props = { name: AppIconName; size?: number; color?: string; strokeWidth?: number };

/** Small, consistent line icons used throughout the native app. */
export function AppIcon({ name, size = 22, color = "#172B43", strokeWidth = 1.8 }: Props) {
  const common = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" as const };
  let drawing;
  switch (name) {
    case "phone": drawing = <Path {...common} d="M7.4 3.8 4.8 5.1c-.8.4-1.2 1.3-1 2.2 1.1 5.1 5.9 9.9 11 11 .9.2 1.8-.2 2.2-1l1.3-2.6-4-2-1.7 1.7c-2.2-.9-3.9-2.6-4.8-4.8L9.5 8z" />; break;
    case "shield": drawing = <Path {...common} d="M12 3 19 6v5c0 4.7-3 7.8-7 10-4-2.2-7-5.3-7-10V6zM9 12l2 2 4-4" />; break;
    case "fire": drawing = <Path {...common} d="M13 3c1 4-2 4-1 7 1-1 2-2 2-3 3 2 5 5 4 8-1 3-3.5 5-6.5 5S5 18 5 15c0-3 2-5 4-7 0 2 .5 3 1.5 4C11 9 12 6 13 3z" />; break;
    case "medical": drawing = <><Rect {...common} x="4" y="4" width="16" height="16" rx="3" /><Path {...common} d="M12 8v8M8 12h8" /></>; break;
    case "disaster": drawing = <><Path {...common} d="m3 19 5.5-9 3.2 5 2.5-4L21 19z" /><Path {...common} d="M14 5v2m-1-1h2" /><Circle {...common} cx="7" cy="7" r="2" /></>; break;
    case "person": drawing = <><Circle {...common} cx="12" cy="7" r="3" /><Path {...common} d="M6 20v-2a6 6 0 0 1 12 0v2M4 12h2m12 0h2" /></>; break;
    case "child": drawing = <><Circle {...common} cx="12" cy="7" r="2.5" /><Path {...common} d="M8 20v-3l2-3h4l2 3v3M10 14l-2 2m6-2 2 2M9 4 7 3m8 1 2-1" /></>; break;
    case "elderly": drawing = <><Circle {...common} cx="10" cy="5" r="2" /><Path {...common} d="m10 8-2 5 3 2 1 5m-4-7 4 1 3-3m-8 9h5m3-8 2 8m-2-11 2 1" /></>; break;
    case "railway": drawing = <><Rect {...common} x="6" y="3" width="12" height="14" rx="3" /><Path {...common} d="M9 17 7 21m8-4 2 4M8 8h8m-7 4h.01M15 12h.01M9 17h6M4 21h16" /></>; break;
    case "info": drawing = <><Circle {...common} cx="12" cy="12" r="9" /><Path {...common} d="M12 11v5m0-9h.01" /></>; break;
    case "home": drawing = <Path {...common} d="m3 10 9-7 9 7v10h-6v-6H9v6H3z" />; break;
    case "report": drawing = <><Path {...common} d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7m-7 4h7" /></>; break;
    case "history": drawing = <><Circle {...common} cx="12" cy="12" r="9" /><Path {...common} d="M12 7v5l3 2M4 4v5h5" /></>; break;
    case "profile": drawing = <><Circle {...common} cx="12" cy="8" r="3.5" /><Path {...common} d="M4 21a8 8 0 0 1 16 0" /></>; break;
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{drawing}</Svg>;
}
