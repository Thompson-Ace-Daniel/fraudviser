import { useContext } from "react";
import WorkspaceContext from "../state/workspace-context.js";

export default function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return value;
}
