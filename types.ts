
export enum DealType {
  NEW_LOGO = 'New Logo',
  RENEWAL = 'Renewal',
}

export enum ChannelType {
  DIRECT = 'Direct',
  FULFILMENT = 'Fulfilment',
  PARTNER_SOURCED = 'Partner Sourced',
}

export enum PricingMethod {
  MYPP = 'MYPP (Price Protection)',
  MYFPI = 'MYFPI (Inflation)',
}

export interface ProductDefinition {
  id: string;
  name: string;
  shortName: string;
  hasVariants: boolean;
  countLabel?: string; // e.g. "HC", "BC"
  defaultBasePrice?: number;
}

export interface ProductInput {
  count: number; // HC or BC (Target Stats)
  existingCount?: number; // Existing Stats (Renewal only)
  variant: string; // Target Variant
  existingVariant?: string; // Existing Variant (Renewal only)
  baseDiscount: number; // %
  expiringAmount?: number; // USD, for Renewal only
  dph?: number; // Dollars Per Head (for UTD Renewal)
  forceHeadcountOverride?: boolean; // If true, prioritize HC calculation if higher
  changeInStats?: boolean; // For UTD EE Upsell (Switching/Changing stats)
}

export interface ProductYearlyData {
  id: string;
  gross: number; // USD
  grossSAR: number; // SAR
  net: number; // USD
}

export interface PricingResult {
  year: number;
  breakdown: ProductYearlyData[]; // Per product values
  grossUSD: number;
  grossSAR: number;
  vatSAR: number;       // New: 15% VAT
  grandTotalSAR: number; // New: Gross + VAT
  netUSD: number;
  netSAR: number;
  floorAdjusted: boolean;
  notes: string[];
}

export interface DealConfiguration {
  dealType: DealType;
  channel: ChannelType;
  selectedProducts: string[]; // IDs
  productInputs: Record<string, ProductInput>; // Map of product ID to inputs
  years: number;
  method: PricingMethod;
  rates: number[]; // Global fallback
  productRates: Record<string, number[]>; // Per product rates
  renewalUpliftRates: Record<string, number>; // New: Specific Uplift for Renewal Base
  applyWHT: boolean;
  flatPricing: boolean;
  rounding: boolean;
}

export interface CalculationOutput {
  yearlyResults: PricingResult[];
  totalGrossUSD: number; // TCV
  totalGrossSAR: number;
  totalVatSAR: number;
  totalGrandTotalSAR: number;
  totalNetUSD: number;
  totalNetSAR: number;
  
  // Per Product Total Net (for summary)
  productNetTotals: Record<string, number>;

  // ACV & Splits
  acvUSD: number;
  netACV: number; 
  renewalBaseACV: number;
  netRenewalBaseACV: number; // New: Net value of Renewal Base
  upsellACV: number;
  netUpsellACV: number; // New: Net value of Upsell
  
  currencyToDisplay: 'USD' | 'SAR';
}