import { useSimulationStore } from "@/store/useSimulationStore";

export function useHistoryState() {
  const canUndo = useSimulationStore((s) => s.canUndo);
  const canRedo = useSimulationStore((s) => s.canRedo);
  const pushSnapshot = useSimulationStore((s) => s.pushSnapshot);
  const undo = useSimulationStore((s) => s.undo);
  const redo = useSimulationStore((s) => s.redo);

  return {
    canUndo,
    canRedo,
    pushSnapshot,
    undo,
    redo,
  };
}

