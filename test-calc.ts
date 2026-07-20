import { calculatePricing } from './services/pricingEngine.js';
try {
  calculatePricing({ dealType: "NEW", selectedProducts: ["utd"], productInputs: {} } as any);
  console.log("Success");
} catch(e: any) {
  console.log("Crash:", e.stack);
}
