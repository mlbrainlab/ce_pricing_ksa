export const MONTHLY_HASHES: Record<string, string> = {
  "2026-03": "REDACTED_HASH",
  "2026-04": "REDACTED_HASH",
  "2026-05": "REDACTED_HASH",
  "2026-06": "REDACTED_HASH",
  "2026-07": "REDACTED_HASH",
  "2026-08": "REDACTED_HASH",
  "2026-09": "REDACTED_HASH",
  "2026-10": "REDACTED_HASH",
  "2026-11": "REDACTED_HASH",
  "2026-12": "REDACTED_HASH",
  "2027-01": "REDACTED_HASH",
  "2027-02": "REDACTED_HASH"
};

export async function hashPasscode(passcode: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const expectedHash = MONTHLY_HASHES[currentMonth];
  
  if (!expectedHash) {
    // If we run out of hashes, we can either fail closed or allow a fallback.
    // For now, fail closed.
    return false;
  }

  const inputHash = await hashPasscode(passcode);
  return inputHash === expectedHash;
}
