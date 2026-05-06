// server.ts
import express2 from "express";
import path from "path";

// app.ts
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// constants.ts
var WHT_FACTOR = 0.95;
var EXCHANGE_RATE_SAR = 3.76;
var STANDARD_FLOOR_RAW = 6500;
var COMBO_FLOOR_LXD_RAW = 4e3;
var AVAILABLE_PRODUCTS = [
  { id: "utd", name: "UTD", shortName: "UTD", hasVariants: true, countLabel: "HC" },
  { id: "lxd", name: "LXD", shortName: "LXD", hasVariants: true, countLabel: "BC" }
];
var UTD_VARIANTS = {
  "ANYWHERE": 259,
  "UTDADV": 259 * 1.08,
  "UTDEE": 265,
  "SM": 0
  // Special bucket pricing
};
var UTD_SM_BUCKETS = [
  { min: 11, max: 49, price: 595 },
  { min: 50, max: 99, price: 545 },
  { min: 100, max: 199, price: 495 },
  { min: 200, max: 299, price: 465 },
  { min: 300, max: 499, price: 445 }
];
var LXD_VARIANTS = {
  "BASE PKG": 80,
  "BASE PKG+FLINK": 92,
  "BASE PKG+FLINK+IPE": 108,
  "EE-Combo": 66.25,
  // 0.25 * 265
  "EE-Combo+FLINK": 78.25,
  "EE-Combo+FLINK+IPE": 94.25,
  "Seats": 350,
  "Seats+FLINK": 385,
  // 300 + 10%
  "Seats+IPE": 420,
  // 300 + 20%
  "Seats+FLINK+IPE": 455,
  // 300 + 30%
  "Hospital Pharmacy Model": 0
};
var LXD_ADDONS = {
  FLINK: 12,
  IPE: 16,
  FLINK_IPE: 28
  // 12 + 16
};

// services/pricingEngine.ts
var getNetFactor = (dealType, channel, yearIndex) => {
  if (channel === "Direct" /* DIRECT */) {
    return 1;
  }
  if (channel === "Fulfilment" /* FULFILMENT */) {
    if (dealType === "Renewal" /* RENEWAL */) {
      return 0.95;
    } else {
      if (yearIndex === 0) return 0.925;
      return 0.95;
    }
  }
  if (channel === "Partner Sourced" /* PARTNER_SOURCED */) {
    if (dealType === "Renewal" /* RENEWAL */) {
      return 0.9;
    } else {
      if (yearIndex === 0) return 0.85;
      return 0.9;
    }
  }
  return 1;
};
var convertToSAR = (usdAmount) => {
  const rawSar = usdAmount * EXCHANGE_RATE_SAR;
  return Math.ceil(rawSar / 10) * 10;
};
var calculatePricing = (config) => {
  const { dealType, channel, selectedProducts, productInputs, years, method, productMethods, rates, productRates, renewalUpliftRates, applyWHT, flatPricing, rounding } = config;
  const activeStandardFloor = applyWHT ? STANDARD_FLOOR_RAW / WHT_FACTOR : STANDARD_FLOOR_RAW;
  const activeComboFloor = applyWHT ? COMBO_FLOOR_LXD_RAW / WHT_FACTOR : COMBO_FLOOR_LXD_RAW;
  const yearlyResults = [];
  const productNotes = [];
  const year1ProductNets = {};
  let totalRenewalBaseForACV = 0;
  selectedProducts.forEach((prodId) => {
    const inputs = productInputs[prodId] || { count: 0, variant: "", baseDiscount: 0, expiringAmount: 0 };
    const definition = AVAILABLE_PRODUCTS.find((p) => p.id === prodId);
    let listRate = 0;
    if (prodId === "utd") {
      if (inputs.variant === "SM") {
        const c = inputs.count;
        if (c > 499) {
          listRate = 0;
          productNotes.push("UTD SM: Count > 499 not applicable");
        } else {
          const bucket = UTD_SM_BUCKETS.find((b) => c >= b.min && c <= b.max);
          listRate = bucket ? bucket.price : 0;
          if (c > 0 && !bucket) productNotes.push("UTD SM: Count out of range");
        }
      } else {
        listRate = UTD_VARIANTS[inputs.variant] || 0;
      }
    } else if (prodId === "lxd") {
      listRate = LXD_VARIANTS[inputs.variant] || 0;
    } else {
      listRate = definition?.defaultBasePrice || 0;
    }
    const count = inputs.count;
    let baseGross = 0;
    if (prodId === "lxd" && inputs.variant === "Hospital Pharmacy Model") {
      const extraUsers = Math.max(0, count - 6);
      baseGross = 6500 + extraUsers * 1e3;
    } else {
      baseGross = definition?.hasVariants || prodId === "utd" || prodId === "lxd" ? count * listRate : definition?.defaultBasePrice || 0;
    }
    const effectiveDiscount = inputs.baseDiscount;
    let baseNet = baseGross * (1 - effectiveDiscount / 100);
    if (applyWHT) {
      baseNet = baseNet / WHT_FACTOR;
    }
    let finalYear1Net = baseNet;
    if (dealType === "Renewal" /* RENEWAL */) {
      const expiring = inputs.expiringAmount || 0;
      const upliftVal = renewalUpliftRates[prodId] || 0;
      let actualY1Price = expiring;
      let renewalBase = 0;
      const existing = inputs.existingVariant || inputs.variant;
      const target = inputs.variant;
      const standardBase = expiring * (1 + upliftVal / 100);
      if (prodId === "utd") {
        let pathBasedPrice = 0;
        let finalTarget = target;
        const effectiveStats = inputs.changeInStats && inputs.count > 0 ? inputs.count : inputs.existingCount || 1;
        const expiringRate = inputs.existingCount && inputs.existingCount > 0 ? expiring / inputs.existingCount : expiring;
        const calculatePriceForTarget = (currentTarget) => {
          if (inputs.changeInStats && inputs.count > (inputs.existingCount || 0)) {
            const gross = UTD_VARIANTS[currentTarget] * inputs.count;
            const net = gross * (1 - (inputs.baseDiscount || 0) / 100);
            return applyWHT ? net / WHT_FACTOR : net;
          } else if (existing === currentTarget) {
            if (existing === "UTDEE") return effectiveStats * expiringRate * 1.08;
            return effectiveStats * expiringRate * (1 + upliftVal / 100);
          } else {
            if (existing === "ANYWHERE" && currentTarget === "UTDADV") {
              return effectiveStats * expiringRate * (1 + upliftVal / 100 + 0.08);
            } else if (existing === "ANYWHERE" && currentTarget === "UTDEE") {
              return effectiveStats * expiringRate * 1.11;
            } else if (existing === "UTDADV" && currentTarget === "UTDEE") {
              return effectiveStats * expiringRate * 1.11;
            } else {
              return effectiveStats * expiringRate * (1 + upliftVal / 100);
            }
          }
        };
        pathBasedPrice = calculatePriceForTarget(target);
        let isEligibleForEE = false;
        if (existing === "UTDEE") {
          isEligibleForEE = true;
        } else if (pathBasedPrice > 3e4) {
          isEligibleForEE = true;
        }
        if (target === "UTDEE" && !isEligibleForEE) {
          productNotes.push(`UTD: Ineligible for EE (Renewal < $30k). Reverting to ${existing}.`);
          finalTarget = existing;
          pathBasedPrice = calculatePriceForTarget(finalTarget);
        } else if (finalTarget !== "UTDEE" && isEligibleForEE) {
          productNotes.push(`UTD: Renewal > $30k. Recommend upgrading to UTD EE.`);
        }
        if (inputs.changeInStats && inputs.count > (inputs.existingCount || 0)) {
          productNotes.push(`UTD: Stats Increased - Using list price ($${pathBasedPrice.toFixed(0)})`);
        } else if (existing !== finalTarget) {
          if (existing === "ANYWHERE" && finalTarget === "UTDADV") {
            productNotes.push(`UTD: Upsell Anywhere -> Adv (+8% applied)`);
          } else if (finalTarget === "UTDEE") {
            productNotes.push(`UTD: Upsell to EE (11% applied)`);
          }
        }
        actualY1Price = pathBasedPrice;
        const isHigherValueOverride = inputs.changeInStats && inputs.count > (inputs.existingCount || 0);
        if (existing === finalTarget && !isHigherValueOverride && !inputs.changeInStats) {
          renewalBase = actualY1Price;
        } else {
          renewalBase = standardBase;
        }
      } else if (prodId === "lxd") {
        let expiringRate = 0;
        if (inputs.existingCount && inputs.existingCount > 0) {
          expiringRate = expiring / inputs.existingCount;
        }
        let addOnRate = 0;
        const isSeats = existing.includes("Seats");
        if (isSeats) {
          const baseSeatPrice = 300;
          const existingHasFlink = existing.includes("FLINK");
          const existingHasIPE = existing.includes("IPE");
          const targetHasFlink = target.includes("FLINK");
          const targetHasIPE = target.includes("IPE");
          if (!existingHasFlink && targetHasFlink) {
            addOnRate += baseSeatPrice * 0.1;
            productNotes.push(`LXD: Upsell +Formulink (Seats)`);
          }
          if (!existingHasIPE && targetHasIPE) {
            addOnRate += baseSeatPrice * 0.2;
            productNotes.push(`LXD: Upsell +IPE (Seats)`);
          }
        } else {
          const existingHasFlink = existing.includes("FLINK");
          const existingHasIPE = existing.includes("IPE");
          const targetHasFlink = target.includes("FLINK");
          const targetHasIPE = target.includes("IPE");
          if (!existingHasFlink && targetHasFlink) {
            addOnRate += LXD_ADDONS.FLINK;
            productNotes.push(`LXD: Upsell +Formulink (Beds)`);
          }
          if (!existingHasIPE && targetHasIPE) {
            addOnRate += LXD_ADDONS.IPE;
            productNotes.push(`LXD: Upsell +IPE (Beds)`);
          }
        }
        const renewalAmount = expiring * (1 + upliftVal / 100);
        const existingCount = inputs.existingCount || 0;
        let upsellOnExisting = existingCount * addOnRate;
        if (applyWHT) upsellOnExisting = upsellOnExisting / WHT_FACTOR;
        const newSitesCount = Math.max(0, inputs.count - existingCount);
        let newSitesCost = 0;
        if (newSitesCount > 0) {
          const newSiteRate = expiringRate + addOnRate;
          newSitesCost = newSitesCount * newSiteRate;
          if (applyWHT) newSitesCost = newSitesCost / WHT_FACTOR;
          productNotes.push(`LXD: New Sites (${newSitesCount}) @ ${newSiteRate.toFixed(2)} (No Uplift)`);
        }
        actualY1Price = renewalAmount + upsellOnExisting + newSitesCost;
        renewalBase = renewalAmount;
        if (upsellOnExisting > 0) {
          productNotes.push(`LXD: Upsell on Existing ($${upsellOnExisting.toFixed(0)})`);
        }
      }
      finalYear1Net = actualY1Price;
      totalRenewalBaseForACV += renewalBase;
    }
    year1ProductNets[prodId] = finalYear1Net;
  });
  const hasUTD = selectedProducts.includes("utd");
  const hasLXD = selectedProducts.includes("lxd");
  let floorTriggered = false;
  const getLXDAddonNet = (inputs, count, applyWHT2) => {
    const variant = inputs.variant || "";
    let addOnRate = 0;
    const isSeats = variant.includes("Seats");
    if (isSeats) {
      const baseSeatPrice = 300;
      if (variant.includes("FLINK") && variant.includes("IPE")) {
        addOnRate = baseSeatPrice * 0.3;
      } else if (variant.includes("FLINK")) {
        addOnRate = baseSeatPrice * 0.1;
      } else if (variant.includes("IPE")) {
        addOnRate = baseSeatPrice * 0.2;
      }
    } else {
      const hasFlink = variant.includes("FLINK");
      const hasIPE = variant.includes("IPE");
      if (hasFlink && hasIPE) {
        addOnRate = LXD_ADDONS.FLINK_IPE;
      } else if (hasFlink) {
        addOnRate = LXD_ADDONS.FLINK;
      } else if (hasIPE) {
        addOnRate = LXD_ADDONS.IPE;
      }
    }
    let addonGross = addOnRate * count;
    let addonNet = addonGross * (1 - inputs.baseDiscount / 100);
    if (applyWHT2) {
      addonNet = addonNet / WHT_FACTOR;
    }
    return addonNet;
  };
  if (hasUTD && hasLXD) {
    const lxdInputs = productInputs["lxd"];
    const lxdCurrentNet = year1ProductNets["lxd"];
    const lxdAddonNet = getLXDAddonNet(lxdInputs, lxdInputs.count, applyWHT);
    const lxdBaseNet = lxdCurrentNet - lxdAddonNet;
    let currentLxdFloor = activeComboFloor;
    if (lxdInputs.variant === "Hospital Pharmacy Model") {
      const extraUsers = Math.max(0, lxdInputs.count - 6);
      let hpFloor = 6500 + extraUsers * 1e3;
      if (applyWHT) hpFloor = hpFloor / WHT_FACTOR;
      currentLxdFloor = hpFloor;
    }
    if (lxdBaseNet < currentLxdFloor) {
      year1ProductNets["lxd"] = currentLxdFloor + lxdAddonNet;
      productNotes.push(`LXD adjusted to Floor (Base: ${currentLxdFloor.toFixed(0)} + Addons)`);
      floorTriggered = true;
    }
    const utdInputs = productInputs["utd"];
    let utdFloor = activeStandardFloor;
    if (utdInputs.variant === "UTDADV") {
      utdFloor = utdFloor * 1.08;
    }
    if (year1ProductNets["utd"] < utdFloor) {
      year1ProductNets["utd"] = utdFloor;
      productNotes.push(`UTD adjusted to Floor (${utdInputs.variant === "UTDADV" ? "Standard + 8%" : "Standard"})`);
      floorTriggered = true;
    }
  } else if (hasUTD) {
    const utdInputs = productInputs["utd"];
    let utdFloor = activeStandardFloor;
    if (utdInputs.variant === "UTDADV") {
      utdFloor = utdFloor * 1.08;
    }
    if (year1ProductNets["utd"] < utdFloor) {
      year1ProductNets["utd"] = utdFloor;
      productNotes.push(`UTD adjusted to Minimum Floor (${utdInputs.variant === "UTDADV" ? "Standard + 8%" : "Standard"})`);
      floorTriggered = true;
    }
  } else if (hasLXD) {
    const lxdInputs = productInputs["lxd"];
    const lxdCurrentNet = year1ProductNets["lxd"];
    const lxdAddonNet = getLXDAddonNet(lxdInputs, lxdInputs.count, applyWHT);
    const lxdBaseNet = lxdCurrentNet - lxdAddonNet;
    let currentLxdFloor = activeStandardFloor;
    if (lxdInputs.variant === "Hospital Pharmacy Model") {
      const extraUsers = Math.max(0, lxdInputs.count - 6);
      let hpFloor = 6500 + extraUsers * 1e3;
      if (applyWHT) hpFloor = hpFloor / WHT_FACTOR;
      currentLxdFloor = hpFloor;
    }
    if (lxdBaseNet < currentLxdFloor) {
      year1ProductNets["lxd"] = currentLxdFloor + lxdAddonNet;
      productNotes.push(`LXD adjusted to Minimum Floor (Base: ${currentLxdFloor.toFixed(0)} + Addons)`);
      floorTriggered = true;
    }
  }
  const productSchedules = {};
  const safeYears = Math.max(0, Math.floor(Number(years) || 0));
  selectedProducts.forEach((prodId) => {
    const y1Value = year1ProductNets[prodId];
    const schedule = new Array(safeYears).fill(0);
    const specificRates = productRates[prodId] || rates;
    let specificMethod = productMethods?.[prodId] || method;
    if (specificMethod === "MYPP (Price Protection)" /* MYPP */ && y1Value < 1e4) {
      specificMethod = "MYFPI (Inflation)" /* MYFPI */;
      productNotes.push(`${prodId.toUpperCase()} MYPP requires $10,000 minimum Y1 value. Reverted to MYFPI.`);
    }
    if (specificMethod === "MYFPI (Inflation)" /* MYFPI */) {
      schedule[0] = y1Value;
      for (let i = 1; i < years; i++) {
        const rate = specificRates[i] || 0;
        schedule[i] = schedule[i - 1] * (1 + rate / 100);
      }
    } else {
      schedule[years - 1] = y1Value;
      for (let i = years - 2; i >= 0; i--) {
        const discountRate = specificRates[i + 1] || 0;
        schedule[i] = schedule[i + 1] / (1 + discountRate / 100);
      }
    }
    productSchedules[prodId] = schedule;
  });
  if (flatPricing && years > 1) {
    selectedProducts.forEach((prodId) => {
      const schedule = productSchedules[prodId];
      const totalPeriodCost = schedule.reduce((acc, val) => acc + val, 0);
      const averageAnnual = safeYears > 0 ? totalPeriodCost / safeYears : 0;
      productSchedules[prodId] = new Array(safeYears).fill(averageAnnual);
    });
  }
  if (rounding) {
    selectedProducts.forEach((prodId) => {
      const schedule = productSchedules[prodId];
      for (let i = 0; i < years; i++) {
        const val = schedule[i];
        if (channel === "Direct" /* DIRECT */) {
          schedule[i] = Math.ceil(val / 100) * 100;
        } else {
          const rawSAR = val * EXCHANGE_RATE_SAR;
          const roundedSAR = Math.ceil(rawSAR / 1e3) * 1e3;
          schedule[i] = roundedSAR / EXCHANGE_RATE_SAR;
        }
      }
      productSchedules[prodId] = schedule;
    });
  }
  let totalTCV = 0;
  let totalGrossUSD = 0;
  let totalGrossSAR = 0;
  let totalVatSAR = 0;
  let totalGrandTotalSAR = 0;
  let totalNetUSD = 0;
  let totalNetSAR = 0;
  const productNetTotals = {};
  selectedProducts.forEach((p) => productNetTotals[p] = 0);
  for (let i = 0; i < years; i++) {
    const breakdown = [];
    let yearSum = 0;
    const netFactor = getNetFactor(dealType, channel, i);
    selectedProducts.forEach((prodId) => {
      const val = productSchedules[prodId][i];
      yearSum += val;
      const netVal = val * netFactor;
      breakdown.push({
        id: prodId,
        gross: val,
        grossSAR: convertToSAR(val),
        net: netVal
      });
      productNetTotals[prodId] += netVal;
    });
    const yearGrossSAR = convertToSAR(yearSum);
    const yearVatSAR = yearGrossSAR * 0.15;
    const yearGrandTotalSAR = yearGrossSAR + yearVatSAR;
    const recognizedUSD = yearSum * netFactor;
    const recognizedSAR = recognizedUSD * EXCHANGE_RATE_SAR;
    yearlyResults.push({
      year: i + 1,
      breakdown,
      grossUSD: yearSum,
      grossSAR: yearGrossSAR,
      vatSAR: yearVatSAR,
      grandTotalSAR: yearGrandTotalSAR,
      netUSD: recognizedUSD,
      netSAR: recognizedSAR,
      floorAdjusted: i === 0 && floorTriggered,
      notes: i === 0 ? productNotes : []
    });
    totalTCV += yearSum;
    totalGrossUSD += yearSum;
    totalGrossSAR += yearGrossSAR;
    totalVatSAR += yearVatSAR;
    totalGrandTotalSAR += yearGrandTotalSAR;
    totalNetUSD += recognizedUSD;
    totalNetSAR += recognizedSAR;
  }
  const acvUSD = totalTCV / years;
  const netACV = totalNetUSD / years;
  let upsellACV = 0;
  if (dealType === "Renewal" /* RENEWAL */) {
    upsellACV = Math.max(0, acvUSD - totalRenewalBaseForACV);
  }
  const renewalNetFactor = getNetFactor(dealType, channel, 0);
  const netRenewalBaseACV = totalRenewalBaseForACV * renewalNetFactor;
  const netUpsellACV = upsellACV * renewalNetFactor;
  return {
    yearlyResults,
    totalGrossUSD,
    totalGrossSAR,
    totalVatSAR,
    totalGrandTotalSAR,
    totalNetUSD,
    totalNetSAR,
    productNetTotals,
    acvUSD,
    netACV,
    renewalBaseACV: totalRenewalBaseForACV,
    netRenewalBaseACV,
    upsellACV,
    netUpsellACV,
    currencyToDisplay: channel === "Direct" /* DIRECT */ ? "USD" : "SAR"
  };
};

// app.ts
var app = express();
app.set("trust proxy", 1);
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(cookieParser());
var JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev-only-do-not-use-in-prod";
var MONTHLY_HASHES = {
  "2026-04": "5433f0bcf3b7783c10e3d318ec310a9cdb2458762a7ddcbd42dbb925b476423a",
  "2026-05": "6c5f4d35c898ed832c1fb718fee0696efa56914a758f3a3a1a1d43b7ab60b6f4",
  "2026-06": "aeacf76e0047f395f680741ae73ea13382abf97fa2f4bceccf4166856c31f1e6",
  "2026-07": "57691dc4cd926dea5d550026764ca9d5d93cfe958269350d1dac611c688317fe",
  "2026-08": "e80d219edb1d229a6edd058d1bb30a316d66ad921f37eca6d7757ce730163859",
  "2026-09": "621e329fdfc17f98aa3143bc170c74d34c1b92931b85600c926cbd6d50616b77",
  "2026-10": "f51a7660f584b2f9d5243a449d6705d9c3d5b8a335b9679e0e911038bf7b3df8",
  "2026-11": "fda5e13af645d6783a6a84b6314c42d7fbc3916279ca33cbe0f3fd7f656a9320",
  "2026-12": "ef0ddba4c0d30c5fec550110f26d9a95fd688e7b49f60d8d7e8192fb95f286d0",
  "2027-01": "8b2f06979c82e7e84acdb460632d4ca8b2c749947a16500ef13af22e2e2e45b9",
  "2027-02": "89349352e0ede47079ef0dc615952527c5beba1e92bae9fe1c0a2dc1e12088df",
  "2027-03": "8895edca1938e77a50f280282a30295a77f821ebf1facc9fe132c715f81810db"
};
function hashPasscodeNode(passcode) {
  return crypto.createHash("sha256").update(passcode).digest("hex");
}
app.post("/api/login", (req, res) => {
  try {
    const { passcode } = req.body;
    const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const expectedHash = MONTHLY_HASHES[currentMonth];
    if (!expectedHash) {
      return res.status(401).json({ error: "No hash for current month" });
    }
    if (typeof passcode !== "string") {
      return res.status(400).json({ error: "Passcode must be a string", body: req.body });
    }
    const inputHash = hashPasscodeNode(passcode);
    if (inputHash === expectedHash) {
      const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: "12h" });
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 12 * 60 * 60 * 1e3
        // 12 hours
      });
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid passcode" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});
app.post("/api/logout", (_req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });
  res.json({ success: true });
});
var requireAuth = (req, res, next) => {
  const token = req.cookies?.auth_token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
app.get("/api/verify", requireAuth, (_req, res) => {
  res.json({ success: true });
});
app.post("/api/calculate", requireAuth, (req, res) => {
  try {
    const config = req.body;
    const results = calculatePricing(config);
    res.json(results);
  } catch (error) {
    console.error("Calculation error:", error);
    res.status(500).json({ error: "Calculation failed" });
  }
});
var app_default = app;

// server.ts
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const viteModule = "vite";
    const { createServer: createViteServer } = await import(
      /* @vite-ignore */
      viteModule
    );
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app_default.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app_default.use(express2.static(distPath));
    app_default.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL) {
    const PORT = 3e3;
    app_default.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app_default;
export {
  server_default as default
};
