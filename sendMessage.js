const { MessageMedia } = require('whatsapp-web.js');

async function sendMessage(client, number, message, imageUrl) {
  try {
    const formattedNumber = number.replace(/\D/g, '');
    const chatId = formattedNumber.includes('@c.us')
      ? formattedNumber
      : `${formattedNumber}@c.us`;

    if (imageUrl?.trim()) {
      try {
        const media = await MessageMedia.fromUrl(imageUrl.trim(), { unsafeMime: true });
        await client.sendMessage(chatId, media, { caption: message });
        console.log(`✅ Image message sent to ${chatId}`);
        return 'Sent with image';
      } catch (error) {
        console.warn(`⚠️ Image send failed to ${chatId}: ${error.message}`);
        console.log('⏳ Falling back to text-only message...');
      }
    }

    await client.sendMessage(chatId, message);
    console.log(`✅ Text message sent to ${chatId}`);
    return 'Sent text-only';
  } catch (error) {
    console.error(`❌ Failed to send to ${number}: ${error.message}`);
    throw error;
  }
}

module.exports = { sendMessage };
