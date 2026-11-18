declare global { interface Window { __workspaceLink?: { token: string; pathname: string } } }
// Read once per document, without persisting tokens or consuming them on StrictMode renders.
const link = typeof window === "undefined" ? undefined : window.__workspaceLink;
if (typeof window !== "undefined") delete window.__workspaceLink;
export function identityLinkToken(): string | null {
  return link?.pathname === window.location.pathname ? link.token : null;
}
