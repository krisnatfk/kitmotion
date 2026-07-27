import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "activity"
  | "history"
  | "user"
  | "camera"
  | "target"
  | "bolt"
  | "shield"
  | "arrow"
  | "menu"
  | "close"
  | "play"
  | "check"
  | "eye";

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  activity: <><path d="M4 7h4l2-3 4 16 2-7h4"/><path d="M3 21h18"/></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  camera: <><path d="M5 7h3l1.5-2h5L16 7h3a2 2 0 0 1 2 2v9H3V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  bolt: <path d="m13 2-8 12h6l-1 8 9-13h-6V2Z"/>,
  shield: <><path d="M12 22s8-3.8 8-11V5l-8-3-8 3v6c0 7.2 8 11 8 11Z"/><path d="m9 12 2 2 4-5"/></>,
  arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  play: <path d="m9 6 9 6-9 6V6Z"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
};

export function Icon({ name, className, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-5 w-5"}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
