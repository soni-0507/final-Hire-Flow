/** CSV cell with quoting, plus protection against spreadsheet formula injection. */
export function csvCell(value) {
  if (typeof value === 'number') return String(value);
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
