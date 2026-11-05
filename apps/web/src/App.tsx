import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { SessionRecovery } from "./auth/SessionRecovery";

function App() {
  return (
    <BrowserRouter>
      <SessionRecovery><AppRoutes /></SessionRecovery>
    </BrowserRouter>
  );
}

export default App
