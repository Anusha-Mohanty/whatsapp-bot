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
    const index = i + 2;

    if (!row || !row['Phone']) continue;
    if ((row['Run'] || '').toLowerCase() !== 'yes') continue;
    if (row['Status']?.includes('✅ Sent')) continue;

    const name = row['Name'] || '';
    const number = row['Phone'].replace(/\s+/g, '');
    const originalMessage = row['Message'] || '';
    const message = originalMessage.replace(/{name}/g, name).replace(/<name>/g, name);
    const imageUrl = row['Image'] || '';
    const handledBy = (row['Handled By'] || '').trim().toLowerCase();
    const handler = process.env.HANDLED_BY?.toLowerCase() || '';
    const retryCount = parseInt((row['Status']?.match(/Retry (\d+)/) || [])[1] || 0);
    const scheduledTimeStr = (row['Time'] || '').trim().toLowerCase();

    if (!number || number.length < 10) {
      await updateCell(sheetName, index, 'I', '❌ Invalid phone number');
      continue;
    }

    if (handledBy && handler && handledBy !== handler) continue;
    if (retryCount >= MAX_RETRIES) continue;

    // Parse time (handles 'now' or future time)
    const parsedTime = parseTime(scheduledTimeStr);
    const now = new Date();

    if (!parsedTime || isNaN(parsedTime)) {
      console.log(`   ⚠️ Invalid scheduled time: '${scheduledTimeStr}'`);
      continue;
    }

    console.log(`\n➡️ Row ${index}: ${name} | ${number}`);
    console.log(`   ⏳ Scheduled For: ${parsedTime.toLocaleString()} | Now: ${now.toLocaleString()}`);

    // Only send if the time is due
    if (now < parsedTime) {
      console.log(`   ⏱️ Not yet due`);
      continue;
    }

    await sendAndUpdateStatus(sheetName, index, client, number, message, imageUrl, retryCount);
  }
}

async function sendAndUpdateStatus(sheetName, index, client, number, message, imageUrl, retryCount) {
  try {
    await sendMessage(client, number, message, imageUrl);
    await updateCell(sheetName, index, 'I', '✅ Sent');
    console.log(`   ✅ Message sent successfully!`);
  } catch (error) {
    const newRetry = retryCount + 1;
    if (newRetry < MAX_RETRIES) {
      await updateCell(sheetName, index, 'I', `Retry ${newRetry}`);
      console.log(`   ❌ Error sending message. Will retry (${newRetry})`);
    } else {
      await updateCell(sheetName, index, 'I', `Error: ${error.message}`);
      console.log(`   ❌ Max retries reached.`);
    }
  }
}

module.exports = { processSheet };
