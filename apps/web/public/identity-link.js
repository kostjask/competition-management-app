// Blocking head script: keep link secrets only in memory, before loading app resources.
(() => {
  const url = new URL(location.href);
  const tokens = url.searchParams.getAll("token");
  if (/^\/app\/(verify-email|auth\/(reset-password|accept-invitation))$/.test(url.pathname) && tokens.length === 1 && /^[A-Za-z0-9_-]{1,2048}$/.test(tokens[0])) {
    window.__workspaceLink = { token: tokens[0], pathname: url.pathname };
  }
  if (url.searchParams.has("token") || url.hash) {
    url.searchParams.delete("token"); url.hash = "";
    history.replaceState(null, "", url.pathname + url.search);
  }
})();
