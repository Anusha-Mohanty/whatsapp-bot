// Add this helper function at the top
function convertGoogleDriveLink(url) {
  const match = url.match(/\/file\/d\/(.*?)\//);
  return match ? `https://drive.google.com/uc?id=${match[1]}` : url;
}

const { sendMessage } = require('./sendMessage');
const { getRows, updateCell } = require('./sheets');

// Sophisticated rate limiting configuration
const RATE_LIMIT = {
  delays: {
    normal: 2000,    // 2s (9 AM - 6 PM)
    peak: 5000,      // 5s (6 PM - 9 PM)
    night: 1000      // 1s (9 PM - 9 AM)
  },
  limits: {
    perMinute: 30,
    perHour: 500,
    perDay: 5000
  },
  retry: {
    maxAttempts: 3,
    delayBetweenRetries: 5000
  }
};

// Time-based delay selector
function getDelayForTime() {
  const hour = new Date().getHours();
  if (hour >= 18 && hour < 21) return RATE_LIMIT.delays.peak;
  if (hour >= 21 || hour < 9) return RATE_LIMIT.delays.night;
  return RATE_LIMIT.delays.normal;
}

// Status formatter
function formatStatusMessage(type, data) {
  const timestamp = new Date().toLocaleString();
  switch (type) {
    case 'success':
      return `✅ Sent to ${data.count} numbers at ${timestamp}`;
    case 'partial':
      const failed = data.failed.map(f => `${f.number}: ${f.error}`).join('; ');
      return `⚠️ ${data.total - data.failed.length}/${data.total} Sent at ${timestamp} (Failed: ${failed})`;
    case 'error':
      return `❌ Error at ${timestamp}: ${data.error}`;
    default:
      return data.message;
  }
}

// Improved international number processor
function processPhoneNumbers(phoneString) {
  if (!phoneString) return [];

  return phoneString
    .split(/[,\s]+/)
    .map(num => num.trim().replace(/[^\d]/g, '')) // remove non-digits
    .filter(num => {
      if (num.length < 10 || num.length > 15) {
        console.log(`⚠️ Skipping invalid number length: ${num}`);
        return false;
      }
      return true;
    })
    .map(num => {
      if (num.length === 10 && /^[6-9]/.test(num)) return `91${num}`;
      return num;
    });
}

async function sendBulkMessages(client, sheetName, options = {}) {
  const {
    statusColumn = 'Status',
    phoneColumn = 'Phone Numbers',
    messageColumn = 'Message Text',
    imageColumn = 'Image URL',
    runColumn = 'Run'
  } = options;

  try {
    console.log(`\n📤 Starting bulk message sending from sheet: ${sheetName}`);
    
    const rows = await getRows(sheetName);
    if (!rows || rows.length === 0) throw new Error('No data found in sheet');

    let successCount = 0, failureCount = 0, skippedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      try {
        if (row[statusColumn]?.includes('✅ Sent')) {
          console.log(`⏭️ Row ${rowNumber} already sent`);
          skippedCount++;
          continue;
        }

        if ((row[runColumn] || '').toLowerCase() !== 'yes') {
          console.log(`⏭️ Row ${rowNumber} skipped (Run not set to yes)`);
          skippedCount++;
          continue;
        }

        if (!row[phoneColumn] || !row[messageColumn]) {
          const status = formatStatusMessage('error', { error: 'Missing required fields' });
          console.log(`⚠️ Row ${rowNumber} - ${status}`);
          await updateCell(sheetName, rowNumber, statusColumn, status);
          failureCount++;
          continue;
        }

        const phoneNumbers = processPhoneNumbers(row[phoneColumn]);
        if (phoneNumbers.length === 0) {
          const status = formatStatusMessage('error', { error: 'No valid phone numbers' });
          console.log(`⚠️ Row ${rowNumber} - ${status}`);
          await updateCell(sheetName, rowNumber, statusColumn, status);
          failureCount++;
          continue;
        }

        console.log(`\n📤 Row ${rowNumber} | Phones: ${phoneNumbers.join(', ')}`);
        if (row[imageColumn]) console.log(`🖼️ Image: ${row[imageColumn]}`);

        const failedNumbers = [];

        for (const phone of phoneNumbers) {
          let success = false, attempts = 0;

          while (!success && attempts < RATE_LIMIT.retry.maxAttempts) {
            try {
              const finalImageUrl = row[imageColumn] ? convertGoogleDriveLink(row[imageColumn]) : null;
              const result = await sendMessage(client, phone, row[messageColumn], finalImageUrl);
              console.log(`📤 Message status for ${phone}: ${result}`);
              success = true;
              successCount++;
            } catch (error) {
              attempts++;
              if (attempts === RATE_LIMIT.retry.maxAttempts) {
                failedNumbers.push({ number: phone, error: error.message });
                failureCount++;
              } else {
                console.log(`🔁 Retry ${attempts} for ${phone}`);
                await new Promise(r => setTimeout(r, RATE_LIMIT.retry.delayBetweenRetries));
              }
            }
          }

          if (phone !== phoneNumbers[phoneNumbers.length - 1]) {
            const delay = getDelayForTime();
            console.log(`⏳ Waiting ${delay}ms before next number...`);
            await new Promise(r => setTimeout(r, delay));
          }
        }

        // Update sheet with status
        const status = failedNumbers.length === 0
          ? formatStatusMessage('success', { count: phoneNumbers.length })
          : formatStatusMessage('partial', { total: phoneNumbers.length, failed: failedNumbers });

        await updateCell(sheetName, rowNumber, statusColumn, status);

        // Delay between rows
        if (i < rows.length - 1) {
          const delay = getDelayForTime();
          console.log(`⏳ Waiting ${delay}ms before next row...`);
          await new Promise(r => setTimeout(r, delay));
        }

      } catch (error) {
        const status = formatStatusMessage('error', { error: error.message });
        console.error(`❌ Row ${rowNumber} failed: ${error.message}`);
        await updateCell(sheetName, rowNumber, statusColumn, status);
        failureCount++;
      }
    }

    // Summary
    console.log('\n📊 Bulk Message Summary:');
    console.log(`✅ Sent: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log(`📝 Total: ${rows.length}`);

    return { successCount, failureCount, skippedCount, totalProcessed: rows.length };

  } catch (error) {
    console.error('❌ Bulk sending error:', error.message);
    throw error;
  }
}

module.exports = { sendBulkMessages };
