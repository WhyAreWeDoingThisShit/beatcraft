import { create } from "zustand";

export interface WizardValues {
  title: string;
  logline: string;
  format: string;
  methodology: string;
  targetWordCount: string;
  targetPageCount: string;
  deadline: string;
}

const DEFAULTS: WizardValues = {
  title: "",
  logline: "",
  format: "",
  methodology: "",
  targetWordCount: "",
  targetPageCount: "",
  deadline: "",
};

interface NewProjectStore {
  step: 1 | 2 | 3;
  savedValues: WizardValues;
  setStep: (step: 1 | 2 | 3) => void;
  saveValues: (values: WizardValues) => void;
  reset: () => void;
}

export const useNewProjectStore = create<NewProjectStore>((set) => ({
  step: 1,
  savedValues: { ...DEFAULTS },
  setStep: (step) => set({ step }),
  saveValues: (savedValues) => set({ savedValues }),
  reset: () => set({ step: 1, savedValues: { ...DEFAULTS } }),
}));
