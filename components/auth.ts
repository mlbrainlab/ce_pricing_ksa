export const MONTHLY_HASHES: Record<string, string> = {
  "2026-03": "32367d62aad10ed5070df8145cad57263fd95a4331c24ef973ae1f57765080ce",
  "2026-04": "9737dad69cec6e394d6906369bcb4674d0dd454b9e4a70a4629ec9099628e9e8",
  "2026-05": "5d9325a9fd417564ce908a70028f14c4b75bbbe8f032810842bfb628018d6d36",
  "2026-06": "783dc30ce14ec770abdda9207aa2d99dedcd5beefee9aee1ad70367a481c7f22",
  "2026-07": "24ae063a9e3feeca9c0ccf53bdf82a1572c67702b22a29136ff537fe0b0d7466",
  "2026-08": "093e73e9cb75cf2ada4264899332b63017e5d4ceabc96c976ad1df8b980d193b",
  "2026-09": "41b9a1bc0c38d378bb23f58942fcda48121fdd23de58daf887c3afd19eb93b99",
  "2026-10": "4d51be597f1eb99adc55d3abfc563b6b2fd5e2ab172dc5e1e71455b75ac9ab50",
  "2026-11": "63858ec0e7c52ea13d3959e632e9b405af03f575a8a1509e4a71e950b31432f9",
  "2026-12": "9062801f703de2393445e36f6187776f95b5bf7f9e8284250c1d72eecad6db09",
  "2027-01": "fef20121aac0150ee0b73edb56bbaf89002114dc5f7152256a952275e1c736b1",
  "2027-02": "c5e373eaac4872d702c3db82b10efff4d7c83a9bf205f2a5edbb46cbc69cac96"
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
