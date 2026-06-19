"use client";

import { useCallback } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";

export function useSelection() {
  const { selectNode, setSelectedNodeIds } = useSimulationStore();

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: { id: string; selected: boolean }[] }) => {
      const ids = selectedNodes.filter((n) => n.selected).map((n) => n.id);
      useSimulationStore.setState({
        selectedNodeIds: ids,
        selectedNodeId: ids.length === 1 ? ids[0] : ids.length > 1 ? ids[0] : null,
      });
    },
    [],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
      useSimulationStore.setState({
        selectedNodeIds: [node.id],
      });
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    useSimulationStore.setState({
      selectedNodeIds: [],
      selectedNodeId: null,
    });
  }, []);

  return { onSelectionChange, onNodeClick, onPaneClick };
}
