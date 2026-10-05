import type { SVGProps } from "react";
const paths = {
  home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
  story: "M21 11a8 8 0 0 1-8 8H7l-4 3v-6a8 8 0 1 1 18-5Z",
  mood: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  journal: "M4 3h14a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V3Zm0 14h16M8 7h8M8 11h6",
  education: "m2 9 10-5 10 5-10 5-10-5Zm4 2v6q6 5 12 0v-6m4-2v9",
  premium: "m12 3 9 9-9 9-9-9 9-9Zm-9 9h18M12 3l4 9-4 9-4-9 4-9Z",
  review: "m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z",
  profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  contact: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  logout: "M10 3H4v18h6m4-15 6 6-6 6m-6-6h12",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6",
  more: "M5 11v2m7-2v2m7-2v2",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  check: "m5 12 4 4L19 6",
  flame: "M12 3c3 5 6 7 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 4 2 4 3-5Z",
};
export type DashboardIconName = keyof typeof paths;
export default function DashboardIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: DashboardIconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
