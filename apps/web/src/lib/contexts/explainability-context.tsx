"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ExplainabilityContextType {
  showDataSources: boolean;
  toggleDataSources: () => void;
}

const ExplainabilityContext = createContext<ExplainabilityContextType>({
  showDataSources: false,
  toggleDataSources: () => {},
});

export function ExplainabilityProvider({ children }: { children: ReactNode }) {
  const [showDataSources, setShowDataSources] = useState(false);
  const toggleDataSources = useCallback(() => setShowDataSources((prev) => !prev), []);

  return (
    <ExplainabilityContext.Provider value={{ showDataSources, toggleDataSources }}>
      {children}
    </ExplainabilityContext.Provider>
  );
}

export function useExplainability() {
  return useContext(ExplainabilityContext);
}
