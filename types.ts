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
  count: number; // HC or BC
  variant: string;
  baseDiscount: number; // %
  expiringAmount?: number; // USD, for Renewal only
}

export interface ProductYearlyData {
  id: string;
  gross: number;
}

export interface PricingResult {
  year: number;
  breakdown: ProductYearlyData[]; // Per product gross values
  grossUSD: number;
  grossSAR: number;
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
  applyWHT: boolean;
}

export interface CalculationOutput {
  yearlyResults: PricingResult[];
  totalGrossUSD: number; // TCV
  totalGrossSAR: number;
  totalNetUSD: number;
  totalNetSAR: number;
  
  // ACV & Splits
  acvUSD: number;
  netACV: number; // New field
  renewalBaseACV: number;
  upsellACV: number;
  
  currencyToDisplay: 'USD' | 'SAR';
}
