// The backend can legitimately return null for many analysis
// fields ("could not be determined from this pcap"). These helpers
// are the single place that turns null/undefined into copy a user
// can read, so no component ever prints a literal "null".

export function displayText(value, fallback = "Not detected") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

export function displayBoolean(value, { yes = "Yes", no = "No" } = {}) {
  if (value === null || value === undefined) return "Unknown";
  return value ? yes : no;
}

export function displayList(values, fallback = "None detected") {
  if (!Array.isArray(values) || values.length === 0) return [fallback];
  return values;
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) {
    return "Unknown";
  }
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;

  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unknown";
  }
  return `${Math.round(value * 100)}%`;
}

export function formatSpi(spi) {
  // ESP SPIs are unsigned 32-bit values; hex is the conventional
  // way they're shown in packet-analysis tooling.
  const hex = Number(spi).toString(16).padStart(8, "0");
  return `0x${hex} (${spi})`;
}

const TRAFFIC_LABELS = {
  email: "Email",
  icmp: "ICMP",
  video: "Video",
  voip: "VoIP",
  web: "Web",
  whatsapp: "WhatsApp",
};

export function displayTrafficType(type) {
  if (!type) return "Unknown";
  return TRAFFIC_LABELS[type] || type;
}
