import type { ReactNode } from "react";
import { SiteChrome } from "./SiteChrome";
export function AuthLayout({ children }: { children: ReactNode }) { return <SiteChrome auth>{children}</SiteChrome>; }
