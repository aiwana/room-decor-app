import { create } from "zustand";
import type { FloorPlan, FurniturePlacement, Furniture } from "@/types";

interface DesignState {
  // Current floor plan being edited
  floorPlan: FloorPlan | null;
  // Furniture placements on the 2D canvas (coordinates in meters)
  placements: FurniturePlacement[];
  // Currently selected furniture for placement (from catalog)
  selectedFurniture: Furniture | null;
  // Selected placement (for editing)
  selectedPlacementId: string | null;
  // View mode: 2D or 3D
  viewMode: "2d" | "3d";

  setFloorPlan: (fp: FloorPlan | null) => void;
  setPlacements: (p: FurniturePlacement[]) => void;
  addPlacement: (p: FurniturePlacement) => void;
  updatePlacement: (id: string, patch: Partial<FurniturePlacement>) => void;
  removePlacement: (id: string) => void;
  setSelectedFurniture: (f: Furniture | null) => void;
  setSelectedPlacementId: (id: string | null) => void;
  setViewMode: (mode: "2d" | "3d") => void;
  reset: () => void;
}

export const useDesignStore = create<DesignState>((set) => ({
  floorPlan: null,
  placements: [],
  selectedFurniture: null,
  selectedPlacementId: null,
  viewMode: "2d",

  setFloorPlan: (fp) => set({ floorPlan: fp }),
  setPlacements: (p) => set({ placements: p }),
  addPlacement: (p) => set((s) => ({ placements: [...s.placements, p] })),
  updatePlacement: (id, patch) =>
    set((s) => ({
      placements: s.placements.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  removePlacement: (id) =>
    set((s) => ({
      placements: s.placements.filter((p) => p.id !== id),
      selectedPlacementId: s.selectedPlacementId === id ? null : s.selectedPlacementId,
    })),
  setSelectedFurniture: (f) => set({ selectedFurniture: f }),
  setSelectedPlacementId: (id) => set({ selectedPlacementId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  reset: () =>
    set({
      floorPlan: null,
      placements: [],
      selectedFurniture: null,
      selectedPlacementId: null,
      viewMode: "2d",
    }),
}));
