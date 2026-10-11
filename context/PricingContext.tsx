// @ts-nocheck
import React, { createContext, useContext, ReactNode } from 'react';
import { usePricingLogic } from './usePricingLogic';

type PricingContextType = ReturnType<typeof usePricingLogic>;

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export const PricingProvider = ({ children }: { children: ReactNode }) => {
  const logic = usePricingLogic();

  return (
    <PricingContext.Provider value={logic}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
};
