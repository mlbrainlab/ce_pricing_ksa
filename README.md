# CE Pricing KSA

A comprehensive web-based pricing calculator for Clinical Effectiveness (CE) products in the KSA region. This tool supports complex deal configurations including New Logo, Renewal, and Extension quotes, featuring advanced PDF and Excel export capabilities, automated credential capture, and real-time unit economics analysis.

## The Version History (From 6.0.0 to 6.5.0)

**v6.0.0: The Web Migration (Major Release)**
* The initial translation of the Excel pricing calculator into a React web application.
* Core pricing engine (MYFPI, MYPP, Renewals, New Logo).
* Product variants (UTD, LXD, Add-ons).

**v6.1.0: Export Capabilities (Minor Release)**
* Added the ability to generate and download professional PDF proposals.
* Added the ability to export raw data to Excel (.xlsx) files.
* Implemented dynamic tables and technical specification links in the exports.

**v6.2.0: Security & Analytics (Minor Release)**
* Implemented the Login screen with monthly passcodes and initials validation.
* Added PostHog analytics to track user logins and quote generation.
* Added Dark/Light mode toggling and responsive layout refinements.

**v6.3.0: Advanced Deal Configurations (Minor Release)**
* Added "Designated Sites" logic (Breakdown per site, showing sites only).
* Added Start Date selection and logic.
* Added WHT (Withholding Tax) toggles and Rounding options.

**v6.4.0: Extension Quotes - Phase 1 (Minor Release)**
* Introduced "Extension" as a brand new Deal Type alongside New Logo and Renewal.
* Added Option A (Pro-rated) and Option B (Flat Rate) calculation logic.

**v6.5.0: Automation & Refinements**
* Feature: "Use Full Extension" logic (calculating exact days, months, and suggesting percentages).
* Feature: Auto Credential Capture (mapping initials to full name, email, and phone automatically).
* Patch/Fix: Fixed the infinite "processing..." bug in the PDF export.
* Patch/Fix: Added the "Reset Form" button and removed the default UTD product selection.

**v6.5.5: Export & Validation Refinements**
* Feature: Added core product mix (UTD/LXD) to the exported PDF and Excel filenames.
* Patch/Fix: "Include Start Date" is now unselected by default for all deal types, and exporting is disabled until a start date is explicitly selected.

**v6.5.6: UI Touch Improvements & Renewal Architect Notes (Current Version)**
* UI: Updated Duration and Rate inputs (MYFPI/MYPP/Uplift) to feature touch-friendly `+` and `-` adjustment buttons. Replaced decimals with whole integers for rate fields.
* Feature: Added logic to compute percentage increases/decreases comparing Customer ACV and Year 1 Price against expiring amount for renewals.
* Feature: Injected the new Renewal Architect Notes directly into the web UI summary, with a checkbox to opt-in for printing these notes below the Operating Statistics in the PDF export.
