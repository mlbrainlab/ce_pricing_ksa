
import { ProductDefinition } from './types';

export const WHT_FACTOR = 0.95;
export const EXCHANGE_RATE_SAR = 3.76;

// Floor Prices (Pre-WHT Division)
// Logic: $6,500 / 0.95 = $6,842.11
export const STANDARD_FLOOR_RAW = 6500;
export const COMBO_FLOOR_LD_RAW = 4000;

export const RECOGNITION_FACTORS = {
  NEW_LOGO: {
    DIRECT: 1.0,
    FULFILMENT: 0.925,
    PARTNER_SOURCED: 0.85,
  },
  RENEWAL: {
    DIRECT: 1.0,
    FULFILMENT: 0.95,
    PARTNER_SOURCED: 0.90,
  }
};

export const AVAILABLE_PRODUCTS: ProductDefinition[] = [
  { id: 'utd', name: 'UTD', shortName: 'UTD', hasVariants: true, countLabel: 'HC' },
  { id: 'ld', name: 'LXD', shortName: 'LXD', hasVariants: true, countLabel: 'BC' },
];

export const UTD_VARIANTS: Record<string, number> = {
  "ANYWHERE": 259,
  "UTDADV": 270,
  "UTDEE": 265,
};

export const LD_VARIANTS: Record<string, number> = {
  "BASE PKG": 80,
  "BASE PKG+FLINK": 92,
  "BASE PKG+FLINK+IPE": 108,
  "EE-Combo": 66.25, // 0.25 * 265
  "EE-Combo+FLINK": 78.25,
  "EE-Combo+FLINK+IPE": 94.25,
};

// Add-on Costs per Bed (Net Additive)
export const LXD_ADDONS = {
  FLINK: 12,
  IPE: 16,
  FLINK_IPE: 28, // 12 + 16
};
