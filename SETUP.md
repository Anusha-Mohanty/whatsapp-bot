# WhatsApp Scheduler Bot - Setup Guide

## Prerequisites

1. **Download the Application**
   - Go to the [Releases](https://github.com/your-username/whatsapp-scheduler-bot/releases) page
   - Download the latest release
   - Extract the ZIP file to a folder

2. **Google Sheets Setup**
   - You will receive a Google Sheet link from your administrator
   - The sheet will have two tabs for each team member:
     - `BulkMessages_[your_name]` - For bulk messages
     - `MessageQueue_[your_name]` - For scheduled messages
   - Make sure you have "Editor" access to the sheet
   - The sheet is already shared with the service account

3. **Required Files**
   - `whatsapp-scheduler-bot.exe` - The main application (from release)
   - `run.bat` - The launcher script
   - `config.json` - Your configuration (create from template)
   - `creds.json` - Google Sheets credentials (get from admin)
   - `README.md` - User guide

## Setup Steps

1. **Configuration**
   - Copy `config.template.json` to `config.json`
   - Replace `your_name` with your actual name
   - The sheet names will be automatically updated

2. **Google Sheets Credentials**
   - Get `creds.json` from your administrator
   - Place it in the same folder as the executable

3. **Running the Application**
   - Double-click `run.bat` to start
   - Scan the QR code with WhatsApp
   - The application will remember your session for future use

## Google Sheets Format

### BulkMessages Sheet
Required columns:
- Phone: Recipient's phone number (with country code)
- Message: The message to send
- Image: (Optional) Google Drive image link
- Status: Will be updated by the application

### MessageQueue Sheet
Required columns:
- Phone: Recipient's phone number (with country code)
- Message: The message to send
- Schedule: Time to send (format: HH:MM)
- Image: (Optional) Google Drive image link
- Status: Will be updated by the application

## Troubleshooting

1. **If the application doesn't start:**
   - Make sure all files are in the same folder
   - Check that `config.json` and `creds.json` are present
   - Verify your Google Sheet ID is correct

2. **If WhatsApp connection fails:**
   - Delete the `.wwebjs_auth` folder
   - Run `run.bat` again
   - Scan the QR code

3. **If Google Sheets access fails:**
   - Verify you have "Editor" access to the shared sheet
   - Check that your sheet tabs exist with correct names
   - Ensure all required columns are present
   - Contact admin if you need access to the sheet

## Support

For any issues:
1. Check the troubleshooting section
2. Verify your configuration
3. Contact the administrator 