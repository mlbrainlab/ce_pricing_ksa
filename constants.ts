
import { ProductDefinition } from './types';

export const APP_VERSION = '6.5.3';

export const CHANGELOG = [
  {
    version: '6.5.3',
    date: '2026-04-03',
    changes: [
      'Logic Update: UTD Renewal calculations now strictly follow the new rules for Anywhere, Advanced, and EE.',
      'Logic Update: Added EE eligibility check. Clients are ineligible for EE if their Anywhere/Advanced renewal is under $30k.',
      'Logic Update: Added recommendation to upgrade to EE if renewal exceeds $30k.'
    ]
  },
  {
    version: '6.5.2',
    date: '2026-04-03',
    changes: [
      'Bug Fix: Duration field accepts clearing without RangeError.',
      'Bug Fix: Reset Form now clears designated sites.',
      'Bug Fix: "Include Start Date" auto-selects only for Renewal/Extension.',
      'Feature: Customer Name is now mandatory for exports.',
      'Feature: Added release notes alert for new version updates.'
    ]
  },
  {
    version: '6.5.1',
    date: '2026-04-01',
    changes: [
      'UI Refinements: Extension months navigation arrows.',
      'UI Refinements: Numeric inputs format with comma separators.',
      'PDF Fix: Product full names mapped correctly.',
      'PDF Fix: Designated sites render for Extension Quotes.',
      'PDF Fix: Font loading state clears on error.',
      'PDF Fix: Footer alignment and table bolding adjusted.'
    ]
  },
  {
    version: '6.5.0',
    date: '2026-03-31',
    changes: [
      'Feature: "Use Full Extension" logic.',
      'Feature: Auto Credential Capture.',
      'Patch/Fix: Fixed infinite "processing..." bug in PDF export.',
      'Patch/Fix: Added "Reset Form" button.'
    ]
  }
];

export const WHT_FACTOR = 0.95;
export const EXCHANGE_RATE_SAR = 3.76;

// Floor Prices (Pre-WHT Division)
// Logic: $6,500 / 0.95 = $6,842.11
export const STANDARD_FLOOR_RAW = 6500;
export const COMBO_FLOOR_LXD_RAW = 4000;

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
  { id: 'lxd', name: 'LXD', shortName: 'LXD', hasVariants: true, countLabel: 'BC' },
];

export const UTD_VARIANTS: Record<string, number> = {
  "ANYWHERE": 259,
  "UTDADV": 259 * 1.08,
  "UTDEE": 265,
  "SM": 0, // Special bucket pricing
};

export const UTD_SM_BUCKETS = [
  { min: 11, max: 49, price: 595 },
  { min: 50, max: 99, price: 545 },
  { min: 100, max: 199, price: 495 },
  { min: 200, max: 299, price: 465 },
  { min: 300, max: 499, price: 445 },
];

export const LXD_VARIANTS: Record<string, number> = {
  "BASE PKG": 80,
  "BASE PKG+FLINK": 92,
  "BASE PKG+FLINK+IPE": 108,
  "EE-Combo": 66.25, // 0.25 * 265
  "EE-Combo+FLINK": 78.25,
  "EE-Combo+FLINK+IPE": 94.25,
  // "Seats": 300,
  // "Seats+FLINK": 330, // 300 + 10%
  // "Seats+IPE": 360,   // 300 + 20%
  // "Seats+FLINK+IPE": 390, // 300 + 30%
  "Hospital Pharmacy Model": 0,
};

// Add-on Costs per Bed (Net Additive)
export const LXD_ADDONS = {
  FLINK: 12,
  IPE: 16,
  FLINK_IPE: 28, // 12 + 16
};
