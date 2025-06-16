// scheduler.js
const { sendMessage } = require('./sendMessage');
const { getRows, updateCell } = require('./sheets');
const { parseTime } = require('./utils');
const MAX_RETRIES = 3;

async function processSheet(sheetName, isScheduled, client) {
  console.log(`✅ Fetching rows from ${sheetName}...`);

  let rows;
  try {
    rows = await getRows(sheetName);
  } catch (e) {
    throw new Error(`Unable to parse range: ${sheetName}!A1:I`);
  }

  if (!rows || rows.length === 0) {
    console.log('No rows found in the sheet');
    return;
  }

  console.log(`📋 Processing ${rows.length} rows from ${sheetName}...`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const index = i + 2; // Header row offset

    // Skip if row is empty or doesn't have required fields
    if (!row || !row['Phone']) {
      console.log(`\n➡️ Row ${index}: Skipping empty row`);
      continue;
    }

    // Skip if Run is not 'yes'
    if ((row['Run'] || '').toLowerCase() !== 'yes') {
      console.log(`\n➡️ Row ${index}: Skipping - Run is not set to 'yes'`);
      continue;
    }

    // Skip if already sent
    if (row['Status']?.includes('✅ Sent')) {
      console.log(`\n➡️ Row ${index}: Skipping - Message already sent`);
      continue;
    }

    const name = row['Name'] || '';
    const number = row['Phone'].replace(/\s+/g, '');
    const originalMessage = row['Message'] || '';
    const message = originalMessage.replace(/{name}/g, name).replace(/<name>/g, name);
    console.log(`   📝 Message before replacement: "${originalMessage}"`);
    console.log(`   📝 Message after replacement: "${message}"`);
    const imageUrl = row['Image'] || '';
    const handledBy = (row['Handled By'] || '').trim().toLowerCase();
    const status = row['Status'] || '';
    const retryCount = parseInt((status.match(/Retry (\d+)/) || [])[1] || 0);
    const scheduledTime = (row['Time'] || '').trim().toLowerCase();

    const handler = process.env.HANDLED_BY?.toLowerCase() || '';

    console.log(`\n➡️ Row ${index}: ${name} | ${number}`);

    // Validate phone number
    if (!number || number.length < 10) {
      console.log(`   ❌ Invalid phone number: ${number}`);
      try {
        await updateCell(sheetName, index, 'I', '❌ Invalid phone number');
      } catch (error) {
        console.log(`   ⚠️ Could not update status: ${error.message}`);
      }
      continue;
    }

    if (handledBy && handler && handledBy !== handler) {
      console.log(`   🚫 Skipped: Not assigned to ${handler}`);
      continue;
    }

    if (retryCount >= MAX_RETRIES) {
      console.log(`   🔁 Skipped: Retry limit (${MAX_RETRIES}) reached`);
      continue;
    }

    // Handle immediate messages
    if (scheduledTime === 'now') {
      console.log(`   ⚡ Processing immediate message`);
      await sendAndUpdateStatus(sheetName, index, client, number, message, imageUrl, retryCount, row);
      continue;
    }

    // Handle scheduled messages
    if (isScheduled) {
      const parsedTime = parseTime(scheduledTime);
      const now = new Date();

      if (!parsedTime || isNaN(parsedTime)) {
        console.log(`   ⚠️ Invalid scheduled time format: ${scheduledTime}`);
        console.log(`   ℹ️ Use 'now' for immediate messages or 'YYYY-MM-DD HH:mm:ss' for scheduled messages`);
        continue;
      }

      console.log(`⏳ Checking if message is due:`);
      console.log(`   📆 Scheduled Time: ${parsedTime.toLocaleString()}`);
      console.log(`   🕒 Current Time: ${now.toLocaleString()}`);

      if (now < parsedTime) {
        console.log(`   ⏱️ Not yet due`);
        continue;
      }
    }

    await sendAndUpdateStatus(sheetName, index, client, number, message, imageUrl, retryCount, row);
  }
}

async function sendAndUpdateStatus(sheetName, index, client, number, message, imageUrl, retryCount, row) {
  try {
    // Send the message directly using sendMessage
    await sendMessage(client, number, message, imageUrl);
    
    // Update status to success in the Status column (column I)
    await updateCell(sheetName, index, 'I', '✅ Sent');
    console.log(`   ✅ Message sent successfully!`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    try {
      const newRetry = retryCount + 1;
      if (newRetry < MAX_RETRIES) {
        await updateCell(sheetName, index, 'I', `Retry ${newRetry}`);
        console.log(`   ❌ Error sending message. Will retry (${newRetry})`);
      } else {
        await updateCell(sheetName, index, 'I', `Error: ${error.message}`);
        console.log(`   ❌ Error sending message. Max retries reached.`);
      }
    } catch (updateError) {
      console.log(`   ⚠️ Could not update status: ${updateError.message}`);
    }
  }
}

module.exports = { processSheet };
