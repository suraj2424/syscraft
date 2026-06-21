import { create } from "zustand";
import { type SysCraftStore } from "./types";
import { createCanvasSlice } from "./canvasSlice";
import { createSimulationSlice } from "./simulationSlice";

export const useSimulationStore = create<SysCraftStore>((set, get, store) => ({
  ...createCanvasSlice(set, get, store),
  ...createSimulationSlice(set, get, store),
}));