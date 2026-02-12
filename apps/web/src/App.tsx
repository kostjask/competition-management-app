import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/layouts/AppLayout";
import { AppRoutes } from "./routes";


function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <AppRoutes />
      </AppLayout>
    </BrowserRouter>
  );
}

export default App
