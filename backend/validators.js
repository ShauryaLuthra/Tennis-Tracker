// validators.js

function isValidISODate(dateStr) {
  if (typeof dateStr !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [y, m, d] = dateStr.split("-").map(Number);

  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const dt = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return false;

  const yy = dt.getUTCFullYear();
  const mm = dt.getUTCMonth() + 1;
  const dd = dt.getUTCDate();

  return yy === y && mm === m && dd === d;
}

function cleanTrimmedString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

module.exports = { isValidISODate, cleanTrimmedString };
