const { DateTime } = require('luxon');

// Format date into readable string (used for logging)
function formatTime(date, timezone = 'Asia/Kolkata') {
  return DateTime.fromJSDate(date).setZone(timezone).toFormat('dd/MM/yyyy, hh:mm:ss a');
}

// Check if message is due based on scheduled time and timezone
function isDue(scheduledTimeStr, timezone = 'Asia/Kolkata') {
  const now = DateTime.now().setZone(timezone);
  const scheduled = parseTime(scheduledTimeStr, timezone);
  if (!scheduled) return false;
  return scheduled <= now;
}

// Extract retry count from status
function getRetryCount(status) {
  const match = status?.match(/Retry (\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// Decide if the message should be retried
function shouldRetry(status, maxRetries = 3) {
  return getRetryCount(status) < maxRetries;
}

// Create next retry status string
function nextRetryStatus(status) {
  const count = getRetryCount(status);
  return `Retry ${count + 1}`;
}

// Parse scheduled time string into Luxon DateTime (fallback to null if invalid)
function parseTime(timeString, timezone = 'Asia/Kolkata') {
  if (timeString.trim() === 'now') return DateTime.now().setZone(timezone);
  if (!timeString) return null;

  let dt;

  // Try ISO format first (YYYY-MM-DD HH:mm or HH:mm:ss)
  dt = DateTime.fromFormat(timeString.trim(), 'yyyy-MM-dd HH:mm:ss', { zone: timezone });
  if (!dt.isValid) {
    dt = DateTime.fromFormat(timeString.trim(), 'yyyy-MM-dd HH:mm', { zone: timezone });
  }

  // Try alternate format (e.g., 17/06/2025 12:30)
  if (!dt.isValid) {
    dt = DateTime.fromFormat(timeString.trim(), 'dd/MM/yyyy HH:mm:ss', { zone: timezone });
    if (!dt.isValid) {
      dt = DateTime.fromFormat(timeString.trim(), 'dd/MM/yyyy HH:mm', { zone: timezone });
    }
  }

  // Fallback to Date parser if still invalid
  if (!dt.isValid) {
    const fallback = new Date(timeString);
    if (isNaN(fallback)) {
      console.warn(`⚠️ Invalid time format: ${timeString}`);
      return null;
    }
    return DateTime.fromJSDate(fallback).setZone(timezone);
  }

  return dt;
}

module.exports = {
  formatTime,
  isDue,
  getRetryCount,
  shouldRetry,
  nextRetryStatus,
  parseTime,
};
