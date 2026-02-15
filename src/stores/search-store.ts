import { create } from "zustand";

interface SearchStore {
  open: boolean;
  setOpen: (v: boolean) => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));
