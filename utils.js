// utils.js

function formatTime(date) {
  return date.toLocaleString('en-IN', {
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function isDue(scheduledTimeStr) {
  const now = new Date();
  const scheduled = new Date(scheduledTimeStr);
  return scheduled <= now;
}

function getRetryCount(status) {
  const match = status?.match(/Retry (\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function shouldRetry(status, maxRetries = 3) {
  return getRetryCount(status) < maxRetries;
}

function nextRetryStatus(status) {
  const count = getRetryCount(status);
  return `Retry ${count + 1}`;
}


function parseTime(timeString) {
  if (!timeString) return null;

  // Try to handle both date strings and time-only strings
  const parsed = new Date(timeString);

  if (isNaN(parsed)) {
    console.warn(`⚠️ Invalid time format: ${timeString}`);
    return null;
  }

  return parsed;
}

module.exports = { parseTime };


module.exports = {
  formatTime,
  isDue,
  getRetryCount,
  shouldRetry,
  nextRetryStatus,
  parseTime,
};
