// Blocking head script so a venue route has its appearance before React mounts.
(() => {
  const root = document.documentElement;
  const storageKey = "workspace-appearance";
  const media = matchMedia("(prefers-color-scheme: dark)");
  const venuePath = /^(?:\/app)?\/(?:judge(?:\/events\/[A-Za-z0-9_-]+\/score)?|moderator(?:\/events\/[A-Za-z0-9_-]+\/live)?|admin\/events\/[A-Za-z0-9_-]+\/live)\/?$/;
  const readPreference = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "day" || saved === "night" || saved === "system") return saved;
    } catch { /* Appearance still works in memory. */ }
    return "auto";
  };
  let preference = readPreference();

  const sync = () => {
    const { pathname, search } = location;
    const returnTo = /^\/app\/(?:auth\/(?:login|forgot-password|resend-verification)|login)\/?$/.test(pathname)
      ? new URLSearchParams(search).get("returnTo")?.split("?")[0] ?? ""
      : "";
    const venue = venuePath.test(pathname) || venuePath.test(returnTo);
    const mode = preference === "day" || preference === "night"
      ? preference
      : (media.matches || (preference === "auto" && venue) ? "night" : "day");
    root.dataset.workspaceMode = mode;
    root.style.colorScheme = mode === "night" ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "night" ? "#171513" : "#f7f6f2");
  };
  window.workspaceAppearance = {
    sync,
    getPreference: () => preference,
    setPreference(next) {
      if (!["auto", "day", "night", "system"].includes(next)) return;
      preference = next;
      try {
        if (next === "auto") localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, next);
      } catch { /* The in-memory choice remains active. */ }
      sync();
      window.dispatchEvent(new Event("workspace-appearance"));
    },
  };
  media.addEventListener("change", sync);
  window.addEventListener("storage", event => {
    if (event.key !== null && event.key !== storageKey) return;
    preference = readPreference();
    sync();
    window.dispatchEvent(new Event("workspace-appearance"));
  });
  sync();
})();
