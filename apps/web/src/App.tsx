import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppRoutes } from "./routes";
import { SessionRecovery } from "./auth/SessionRecovery";

const router = createBrowserRouter([{ path: "*", element: <SessionRecovery><AppRoutes /></SessionRecovery> }], { basename: "/app" });
function App() { return <RouterProvider router={router} />; }

export default App
