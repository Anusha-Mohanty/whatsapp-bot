const { MessageMedia } = require('whatsapp-web.js');

async function sendMessage(client, number, message, imageUrl) {
  try {
    // Format the phone number
    const formattedNumber = number.replace(/\D/g, '');
    const chatId = formattedNumber.includes('@c.us') ? formattedNumber : `${formattedNumber}@c.us`;

    // Send image if provided
    if (imageUrl) {
      try {
        const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
        await client.sendMessage(chatId, media, { caption: message });
        return 'Sent';
      } catch (error) {
        console.log(`Error sending image: ${error.message}`);
        // Fall back to text-only message if image fails
        console.log('Falling back to text-only message...');
      }
    }

    // Send text message
    await client.sendMessage(chatId, message);
    return 'Sent';
  } catch (error) {
    console.log(`Error sending message: ${error.message}`);
    throw error;
  }
}

module.exports = { sendMessage }; 