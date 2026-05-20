
import { ProductDefinition } from './types.js';

export const APP_VERSION = '6.6.4';

export const CHANGELOG = [
  {
    version: '6.6.4',
    date: new Date().toISOString().split('T')[0],
    changes: [
      'Extension Option B Expansion: Added customizable Uplift FPI% input applying specified rate to current spend for exact fractional and integer month calculation within 100K SAR limits.',
      'UI Refinement: Redesigned the Uplift FPI% fields with interactive "+" and "-" step buttons (incrementing/decrementing whole values) while supporting manual decimal inputs (up to one decimal place).',
      'Rules Update: Simplified the Extension Finance approval threshold to apply selectively on any Uplift FPI% below 5% across both Option A and Option B.',
      'UI Cleanup: Renamed "Difference to Extension (FPI %)" labels to "Uplift FPI%" for consistency with renewal uplift fields.'
    ]
  },
  {
    version: '6.6.3',
    date: '2026-05-20',
    changes: [
      'Feature: Added UTDEE-EAI Pricing.',
      'Pricing: Enable FPI less than standard with warning.'
    ]
  },
  {
    version: '6.6.2',
    date: new Date().toISOString().split('T')[0],
    changes: [
      'UI: Redesigned and streamlined Export Options section.',
      'Feature: Restored and improved "Multiple Sites" list functionality allowing precise price breakdowns per site.',
      'Feature: Restored "Technical Specifications" section in PDF exports.',
      'UX: Improved Seller Information inputs alignment.',
      'UX: Cleaned up unnecessary backend scripts.',
    ]
  },
  {
    version: '6.6.1',
    date: '2026-05-05',
    changes: [
      'Pricing logic update: In a renewal scenario, if the customer is renewing the same variant and changing only the statistics (bed or head), the rate used for the additional stats (aka upsell value) is now the expiring rate * FPI / existing stat.',
      'Security: Full-stack migration of export and pricing logic.',
      'Security: Proprietary constants removed from frontend bundle.',
      'Feature: Default "Show Stats" for proposals.',
      'Feature: Automated rounding for CP deals.',
      'UI: Polish and modern icons for Export section.'
    ]
  },
  {
    version: '6.6.0',
    date: '2026-04-21',
    changes: [
      'Feature: Added specific "Channel Partner" (CP) export flow for Fulfillment and Partner-Sourced queries.',
      'Feature: Intercepts PDF generation for CP deals to ask if the proposal is "Direct" or "CP".',
      'Feature: Applies automated overriding data for Samir Group (Rep Name, Email, Phone) upon CP PDF selection.',
      'Feature: Integrates exact Session-based CP quote counter tracking (AH/DDMMYY/XX) referencing logic in CP generated PDFs.',
      'Feature: Injects Noto Sans Arabic fonts strictly via the PDF exporter to faithfully render localized CP footer phrasing.',
      'Feature: Enhances dynamic PDF layout to offset CP-centric footer headers/border margins without occluding standard content like footnotes (EMR/Opt-out logic).',
      'System: Updated PostHog analytical tracking SDK engine version for Doctor compliance (v1.369.5).'
    ]
  },
  {
    version: '6.5.6',
    date: '2026-04-16',
    changes: [
      'UI: Replaced MYFPI/MYPP radio buttons with touch-friendly segmented pills.',
      'UI: Color-coded product backgrounds (Green for UTD, Blue for LXD) to improve visual hierarchy in configuration and commercial schedules.',
      'UI: Standardized Duration and Rate step-inputs to identical squared sizes with centered text.',
      'UI: Replaced standard number inputs for Base Discount and Combo Discount with touch-friendly step buttons.',
      'Feature: Fixed Android PWA top bar to dynamically inherit the application theme color (Dark/Light).',
      'Feature: Changed the Architectural Note to use Customer ACV rather than TCV for comparing against Expiring Amount.',
      'Feature: Appended Architectural Note directly into the PDF Export.',
      'Export Update: Added exact product mix IDs into exported filenames.'
    ]
  },
  {
    version: '6.5.5',
    date: '2026-04-07',
    changes: [
      'Security: Migrated pricing engine to backend to protect proprietary algorithms.',
      'Security: Implemented secure backend authentication and session management.',
      'Feature: Rep details are now securely stored in local storage for convenience.',
      'UI Update: Removed initials requirement from login screen.'
    ]
  },
  {
    version: '6.5.4',
    date: '2026-04-05',
    changes: [
      'Feature: Added 10-minute idle auto log-out for security.',
      'Feature: Support for split pricing methods (e.g., UTD on MYPP, LXD on MYFPI).',
      'Feature: Enforced $10,000 minimum Y1 value for MYPP (automatically reverts to MYFPI if not met).',
      'Feature: Auto-switch annual increase percentages when toggling between MYPP and MYFPI.',
      'Feature: Added Exception Form alert for out-of-bounds MYPP and MYFPI rates.',
      'Feature: MYPP default rate automatically sets to 8%.',
      'UI Fix: MYPP and FPI fields now accept 0 as a valid override.',
      'UI Fix: Fixed RangeError when the number of years is left blank.',
      'Bug Fix: Resolved PostHog client rate limiting errors by optimizing event capture.',
      'Product Update (UTD SM): Changed product name to "UpToDate® Subscriber Manager".',
      'Product Update (UTD SM): Added specific terms to PDF and disabled irrelevant export checkboxes.'
    ]
  },
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
  },
  {
    version: '6.4.0',
    date: '2026-02-15',
    changes: [
      'Feature: Introduced "Extension" as a brand new Deal Type alongside New Logo and Renewal.',
      'Feature: Added Option A (Pro-rated) and Option B (Flat Rate) calculation logic.'
    ]
  },
  {
    version: '6.3.0',
    date: '2026-01-10',
    changes: [
      'Feature: Added "Designated Sites" logic (Breakdown per site, showing sites only).',
      'Feature: Added Start Date selection and logic.',
      'Feature: Added WHT (Withholding Tax) toggles and Rounding options.'
    ]
  },
  {
    version: '6.2.0',
    date: '2025-11-20',
    changes: [
      'Feature: Implemented the Login screen with monthly passcodes and initials validation.',
      'Feature: Added PostHog analytics to track user logins and quote generation.',
      'Feature: Added Dark/Light mode toggling and responsive layout refinements.'
    ]
  },
  {
    version: '6.1.0',
    date: '2025-10-05',
    changes: [
      'Feature: Added the ability to generate and download professional PDF proposals.',
      'Feature: Added the ability to export raw data to Excel (.xlsx) files.',
      'Feature: Implemented dynamic tables and technical specification links in the exports.'
    ]
  },
  {
    version: '6.0.0',
    date: '2025-08-15',
    changes: [
      'Feature: The initial translation of the Excel pricing calculator into a React web application.',
      'Feature: Core pricing engine (MYFPI, MYPP, Renewals, New Logo).',
      'Feature: Product variants (UTD, LXD, Add-ons).'
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
  "UTDEE-EAI": 278.25,
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
  "Seats": 350,
  "Seats+FLINK": 385, // 300 + 10%
  "Seats+IPE": 420,   // 300 + 20%
  "Seats+FLINK+IPE": 455, // 300 + 30%
  "Hospital Pharmacy Model": 0,
};

// Add-on Costs per Bed (Net Additive)
export const LXD_ADDONS = {
  FLINK: 12,
  IPE: 16,
  FLINK_IPE: 28, // 12 + 16
};
