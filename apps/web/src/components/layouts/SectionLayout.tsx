import { Outlet } from "react-router-dom";

export function SectionLayout() {
  return (
    <div className="workspace-section p-6">
      <Outlet />
    </div>
  );
}
