# WhatsApp Scheduler Bot - Setup Guide

## Quick Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/your-username/whatsapp-scheduler-bot.git
   cd whatsapp-scheduler-bot
   npm install
   ```

2. **Configuration**
   - Copy `config.template.json` and make it to `config.json`
   - Update `your_name` in `config.json` with your actual name
   - Place `creds.json` (from admin) in the project root
   - ADD THE .env file from the env_template

3. **Run**
   ```bash
   npm start
   ```
   or run/double-click `run.bat`
   
➤ Scheduling works with CRON if set to run every 1 minute — the internal logic checks timestamps and handles pending messages automatically.

## Google Sheets Format

### Required Columns
- Phone: Recipient's phone number (with country code) change the number accordingly(rightnow it has mine)
- Message: The message to send
- Schedule: now or YY/MM/DD HH:MM (use "now" for immediate send)
- Image: (Optional) Google Drive image link
- Run: Set to "yes" to process
- Handled By: Your name (must match config.json)
- Status: Auto-updated by bot

## Troubleshooting

1. **Connection Issues**
   - Delete `.wwebjs_auth` folder and restart
   - Verify Google Sheet access permissions
   - Check config.json and creds.json are present

2. **Message Not Sending**
   - Ensure "Run" is set to "yes"
   - Verify "Handled By" matches your config.json name
   - Check phone number format (include country code)

## Support

For any issues:
1. Check the troubleshooting section
2. Verify your configuration
3. Contact the administrator 
