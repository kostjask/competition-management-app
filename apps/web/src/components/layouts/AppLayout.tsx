import type { ReactNode } from "react";
import { SiteChrome } from "./SiteChrome";
export function AppLayout({ children }: { children: ReactNode }) { return <SiteChrome>{children}</SiteChrome>; }
