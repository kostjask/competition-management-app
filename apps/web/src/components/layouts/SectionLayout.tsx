import { Outlet } from "react-router-dom";

export function SectionLayout() {
  return (
    <div className="p-6">
      <Outlet />
    </div>
  );
}