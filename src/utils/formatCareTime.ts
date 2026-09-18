export function formatCareDateTime(value?: string | number | Date) {
  if (value == null || value === '') {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const day = parsed.getDate();
  const month = parsed.toLocaleString('en-GB', {month: 'short'});
  const year = String(parsed.getFullYear()).slice(-2);
  const time = parsed
    .toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();
  return `${day} ${month}'${year} at ${time}`;
}
