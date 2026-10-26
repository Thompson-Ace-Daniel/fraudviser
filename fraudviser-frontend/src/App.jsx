import { WorkspaceProvider } from "./state/WorkspaceContext.jsx";
import WorkspaceShell from "./components/layout/WorkspaceShell.jsx";

/**
 * Authenticated workspace root. Shared workspace state lives in
 * WorkspaceProvider; the shell renders navigation plus the active
 * nested route via <Outlet />.
 */
export default function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
