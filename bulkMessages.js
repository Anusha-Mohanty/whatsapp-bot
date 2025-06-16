const { sendMessage } = require('./sendMessage');
const { getRows, updateCell } = require('./sheets');

// Sophisticated rate limiting configuration
const RATE_LIMIT = {
  // Different delays for different times
  delays: {
    normal: 2000,    // 2 seconds during normal hours (9 AM - 6 PM)
    peak: 5000,      // 5 seconds during peak hours (6 PM - 9 PM)
    night: 1000      // 1 second during night (9 PM - 9 AM)
  },
  // Maximum messages per time period
  limits: {
    perMinute: 30,
    perHour: 500,
    perDay: 5000
  },
  // Retry settings
  retry: {
    maxAttempts: 3,
    delayBetweenRetries: 5000
  }
};

// Function to get appropriate delay based on time
function getDelayForTime() {
  const hour = new Date().getHours();
  
  if (hour >= 18 && hour < 21) { // 6 PM - 9 PM
    return RATE_LIMIT.delays.peak;
  } else if (hour >= 21 || hour < 9) { // 9 PM - 9 AM
    return RATE_LIMIT.delays.night;
  } else { // 9 AM - 6 PM
    return RATE_LIMIT.delays.normal;
  }
}

// Function to format status message
function formatStatusMessage(type, data) {
  const timestamp = new Date().toLocaleString();
  
  switch (type) {
    case 'success':
      return `✅ Sent to ${data.count} numbers at ${timestamp}`;
      
    case 'partial':
      const successCount = data.total - data.failed.length;
      const failedDetails = data.failed
        .map(f => `${f.number}: ${f.error}`)
        .join('; ');
      return `⚠️ ${successCount}/${data.total} Sent at ${timestamp} (Failed: ${failedDetails})`;
      
    case 'error':
      return `❌ Error at ${timestamp}: ${data.error}`;
      
    default:
      return data.message;
  }
}

// Function to clean and validate phone numbers
function processPhoneNumbers(phoneString) {
  if (!phoneString) return [];
  
  // Split by comma or space, then clean each number
  return phoneString
    .split(/[,\s]+/)  // Split by comma or space
    .map(num => num.trim())  // Remove extra spaces
    .filter(num => {
      // Remove any non-digit characters
      const cleanNum = num.replace(/\D/g, '');
      
      // Basic validation
      if (cleanNum.length < 10) {
        console.log(`⚠️ Invalid number (too short): ${num}`);
        return false;
      }
      if (cleanNum.length > 15) {
        console.log(`⚠️ Invalid number (too long): ${num}`);
        return false;
      }
      
      // Check if it's a valid Indian number
      if (cleanNum.startsWith('91')) {
        if (cleanNum.length !== 12) {
          console.log(`⚠️ Invalid Indian number length: ${num}`);
          return false;
        }
        // Check if the number after 91 is valid
        const withoutCountry = cleanNum.slice(2);
        if (!/^[6-9]\d{9}$/.test(withoutCountry)) {
          console.log(`⚠️ Invalid Indian mobile number format: ${num}`);
          return false;
        }
      } else {
        // If no country code, should be 10 digits
        if (cleanNum.length !== 10) {
          console.log(`⚠️ Invalid number length (should be 10 digits): ${num}`);
          return false;
        }
        // Should start with 6-9 for Indian numbers
        if (!/^[6-9]\d{9}$/.test(cleanNum)) {
          console.log(`⚠️ Invalid Indian mobile number format: ${num}`);
          return false;
        }
      }
      
      return true;
    })
    .map(num => {
      // Add 91 if not present
      const cleanNum = num.replace(/\D/g, '');
      if (cleanNum.startsWith('91')) return cleanNum;
      return `91${cleanNum}`;
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
    console.log('⚙️ Configuration:', {
      statusColumn,
      phoneColumn,
      messageColumn,
      imageColumn,
      runColumn
    });
    
    // Get all rows from the sheet
    const rows = await getRows(sheetName);
    if (!rows || rows.length === 0) {
      throw new Error('No data found in the sheet');
    }

    console.log(`📊 Found ${rows.length} rows to process`);
    
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because of 0-based index and header row
      
      try {
        // Skip if already processed
        if (row[statusColumn]?.includes('✅ Sent')) {
          console.log(`⏭️ Skipping row ${rowNumber} - already sent`);
          skippedCount++;
         
          continue;
        }

        // Skip if Run is not 'yes'
        if (row[runColumn]?.toLowerCase() !== 'yes') {
          console.log(`⏭️ Skipping row ${rowNumber} - Run is not set to 'yes'`);
          skippedCount++;
          continue;
        }

        // Validate required fields
        if (!row[phoneColumn] || !row[messageColumn]) {
          const status = formatStatusMessage('error', { error: 'Missing required fields' });
          console.log(`⚠️ Skipping row ${rowNumber} - ${status}`);
          await updateCell(sheetName, rowNumber, statusColumn, status);
          failureCount++;
          continue;
        }

        // Process phone numbers
        const phoneNumbers = processPhoneNumbers(row[phoneColumn]);
        if (phoneNumbers.length === 0) {
          const status = formatStatusMessage('error', { error: 'No valid phone numbers' });
          console.log(`⚠️ Skipping row ${rowNumber} - ${status}`);
          await updateCell(sheetName, rowNumber, statusColumn, status);
          failureCount++;
          continue;
        }

        console.log(`\n📤 Processing row ${rowNumber}:`);
        console.log(`📱 Phone Numbers: ${phoneNumbers.join(', ')}`);
        console.log(`📝 Message: ${row[messageColumn]}`);
        if (row[imageColumn]) console.log(`🖼️ Image: ${row[imageColumn]}`);

        // Send to each phone number
        let failedNumbers = [];
        let attempts = 0;

        for (const phone of phoneNumbers) {
          let success = false;
          attempts = 0;

          while (!success && attempts < RATE_LIMIT.retry.maxAttempts) {
            try {
              await sendMessage(client, phone, row[messageColumn], row[imageColumn]);
              success = true;
              successCount++;
            } catch (error) {
              attempts++;
              if (attempts === RATE_LIMIT.retry.maxAttempts) {
                failedNumbers.push({ number: phone, error: error.message });
                failureCount++;
              } else {
                console.log(`⚠️ Retry ${attempts} for ${phone}...`);
                await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retry.delayBetweenRetries));
              }
            }
          }
          
          // Rate limiting between numbers
          if (phone !== phoneNumbers[phoneNumbers.length - 1]) {
            const delay = getDelayForTime();
            console.log(`⏳ Waiting ${delay}ms before next number...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        // Update status
        if (failedNumbers.length === 0) {
          const status = formatStatusMessage('success', { count: phoneNumbers.length });
          await updateCell(sheetName, rowNumber, statusColumn, status);
        } else {
          const status = formatStatusMessage('partial', {
            total: phoneNumbers.length,
            failed: failedNumbers
          });
          await updateCell(sheetName, rowNumber, statusColumn, status);
        }
        
        // Rate limiting between rows
        if (i < rows.length - 1) {
          const delay = getDelayForTime();
          console.log(`⏳ Waiting ${delay}ms before next row...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`❌ Error processing row ${rowNumber}:`, error.message);
        const status = formatStatusMessage('error', { error: error.message });
        await updateCell(sheetName, rowNumber, statusColumn, status);
        failureCount++;
      }
    }

    // Print summary
    console.log('\n📊 Bulk Message Summary:');
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log(`📝 Total processed: ${rows.length}`);

    return {
      successCount,
      failureCount,
      skippedCount,
      totalProcessed: rows.length
    };

  } catch (error) {
    console.error('❌ Error in bulk message sending:', error.message);
    throw error;
  }
}

module.exports = { sendBulkMessages }; 