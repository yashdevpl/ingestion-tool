// Define all expected keys for validation
export const CIR_EXPECTED_KEYS = [
  "uniqueCallId",
  "targetNumber",
  "targetName",
  "startTime",
  "endTime",
  "duration",
  "direction",
  "callType",
  "callingNumber",
  "calledNumber",
  "callPriority",
  "callCategory",
  "fwdToNumber",
  "imeiA",
  "imeiB",
  "imsiA",
  "imsiB",
  "cellIdA",
  "cellIdB",
  "cellAddressA",
  "cellAddressB",
  "latitudeA",
  "longitudeA",
  "latitudeB",
  "longitudeB",
  "fileName",
];
export const button_variants = {
  vox_primary:
    "bg-[#E2E8F0] text-muted-foreground shadow-xs hover:bg-[#E2E8F0]/90",
};
export const APP_NAME = "vox-app";
export const ENV = {
  KC_URL: import.meta.env.VITE_KC_URL,
  KC_CLIENT: import.meta.env.VITE_KC_CLIENT,
  KC_REALM: import.meta.env.VITE_KC_REALM,
  KC_REDIRECT_URL: import.meta.env.VITE_KC_REDIRECT_URL,
  WEB_APP_PROXY_URL: import.meta.env.VITE_WEB_APP_PROXY_URL,
};
