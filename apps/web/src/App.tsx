import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppRoutes } from "./routes";
import { SessionRecovery } from "./auth/SessionRecovery";
import { WorkspaceAppearance } from "./components/layouts/WorkspaceAppearance";

const router = createBrowserRouter([{ path: "*", element: <WorkspaceAppearance><SessionRecovery><AppRoutes /></SessionRecovery></WorkspaceAppearance> }], { basename: "/app" });
function App() { return <RouterProvider router={router} />; }

export default App
