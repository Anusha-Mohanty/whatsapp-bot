require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { processSheet } = require('./scheduler');
const { sendBulkMessages } = require('./bulkMessages');
const ConfigManager = require('./config');
const MenuSystem = require('./menu');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { sendMessage } = require('./sendMessage');
const { scheduleMessages } = require('./scheduler');
const { checkAndSendScheduledMessages } = require('./scheduler');
const { getConfig } = require('./config');
const path = require('path');

class WhatsAppAutomation {
  constructor() {
    this.config = new ConfigManager();
    this.menu = new MenuSystem();
    this.client = null;
    this.isReady = false;
    this.sheetsClient = null;
  }

  async initialize() {
    try {
      await this.menu.showWelcome(this.config.teamMember);
      
      // Check if team member is set up
      if (this.config.teamMember === 'default') {
        const teamMember = await this.menu.getTeamMemberName();
        if (teamMember) {
          this.config.updateTeamMember(teamMember);
          this.menu.showSuccess(`Configuration updated for ${teamMember}`);
        }
      }

      // Initialize WhatsApp client
      await this.initializeWhatsAppClient();
      
      // Start main menu loop
      await this.runMainLoop();
      
    } catch (error) {
      this.menu.showError(error.message);
      await this.menu.waitForUser();
    }
  }

  async initializeWhatsAppClient() {
    console.log('🔄 Initializing WhatsApp client...');
    
    try {
      // Create .wwebjs_auth directory if it doesn't exist
      const authDir = path.join(process.cwd(), '.wwebjs_auth');
      if (!require('fs').existsSync(authDir)) {
        require('fs').mkdirSync(authDir, { recursive: true });
      }

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.config.teamMember,
          dataPath: authDir
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });

      // Handle QR Code
      this.client.on('qr', (qr) => {
        console.log('');
        console.log('📲 Scan this QR code with your WhatsApp mobile app:');
        console.log('');
        try {
          qrcode.generate(qr, { small: true });
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
        console.log('');
        console.log('⏳ Waiting for QR code scan...');
      });

      // Handle ready event
      this.client.on('ready', () => {
        this.isReady = true;
        console.log('✅ WhatsApp client is ready!');
        console.log('Session saved successfully. You won\'t need to scan QR code again.');
      });

      // Handle disconnection
      this.client.on('disconnected', (reason) => {
        console.log('❌ Client disconnected:', reason);
        this.isReady = false;
      });

      // Handle authentication failure
      this.client.on('auth_failure', (error) => {
        console.error('❌ Authentication failed:', error);
        this.isReady = false;
      });

      // Handle loading screen
      this.client.on('loading_screen', (percent, message) => {
        console.log(`Loading: ${percent}% - ${message}`);
      });

      // Initialize the client
      console.log('Starting client initialization...');
      await this.client.initialize();
      console.log('Client initialization started');

      // Wait for client to be ready
      await this.waitForClientReady();
    } catch (error) {
      console.error('Error initializing WhatsApp client:', error);
      throw error;
    }
  }

  async waitForClientReady() {
    return new Promise((resolve) => {
      if (this.isReady) {
        resolve();
        return;
      }

      const checkReady = () => {
        if (this.isReady) {
          resolve();
        } else {
          setTimeout(checkReady, 1000);
        }
      };
      
      checkReady();
    });
  }

  async runMainLoop() {
    let running = true;
    
    while (running) {
      try {
        const choice = await this.menu.showMainMenu();
        
        switch (choice) {
          case '1':
            await this.handleBulkMessages();
            break;
          case '2':
            await this.handleMessageQueue();
            break;
          case '3':
            await this.handleBoth();
            break;
          case '4':
            await this.handleConnectionStatus();
            break;
          case '5':
            await this.handleChangeTeamMember();
            break;
          case '6':
            running = false;
            console.log('👋 Goodbye!');
            break;
          default:
            this.menu.showError('Invalid choice. Please select 1-6.');
            await this.menu.waitForUser();
        }
      } catch (error) {
        this.menu.showError(error.message);
        await this.menu.waitForUser();
      }
    }
  }

  async handleBulkMessages() {
    if (!this.isReady) {
      this.menu.showError('WhatsApp client is not ready. Please wait for connection.');
      await this.menu.waitForUser();
      return;
    }

    const confirmed = await this.menu.confirmAction('send bulk messages');
    if (!confirmed) return;

    await this.menu.showProcessingMessage('bulk');
    
    try {
      const result = await sendBulkMessages(this.client, this.config.bulkSheet, {
        statusColumn: 'Status',
        phoneColumn: 'Phone Numbers',
        messageColumn: 'Message Text',
        imageColumn: 'Image',
        runColumn: 'Run'
      });
      
      await this.menu.showResults({ bulk: result });
    } catch (error) {
      this.menu.showError(`Bulk messages failed: ${error.message}`);
    }
    
    await this.menu.waitForUser();
  }

  async handleMessageQueue() {
    if (!this.isReady) {
      this.menu.showError('WhatsApp client is not ready. Please wait for connection.');
      await this.menu.waitForUser();
      return;
    }

    const confirmed = await this.menu.confirmAction('send message queue');
    if (!confirmed) return;

    await this.menu.showProcessingMessage('queue');
    
    try {
      // Process immediate messages first
      await processSheet(this.config.queueSheet, false, this.client);
      // Then process scheduled messages
      await processSheet(this.config.queueSheet, true, this.client);
      
      this.menu.showSuccess('Message queue processed successfully');
    } catch (error) {
      this.menu.showError(`Message queue failed: ${error.message}`);
    }
    
    await this.menu.waitForUser();
  }

  async handleBoth() {
    if (!this.isReady) {
      this.menu.showError('WhatsApp client is not ready. Please wait for connection.');
      await this.menu.waitForUser();
      return;
    }

    const confirmed = await this.menu.confirmAction('send both bulk messages and message queue');
    if (!confirmed) return;

    await this.menu.showProcessingMessage('both');
    
    try {
      // Process bulk messages
      const bulkResult = await sendBulkMessages(this.client, this.config.bulkSheet, {
        statusColumn: 'Status',
        phoneColumn: 'Phone Numbers',
        messageColumn: 'Message Text',
        imageColumn: 'Image',
        runColumn: 'Run'
      });
      
      // Process message queue
      await processSheet(this.config.queueSheet, false, this.client);
      await processSheet(this.config.queueSheet, true, this.client);
      
      await this.menu.showResults({ 
        bulk: bulkResult,
        queue: { successCount: 'Processed', failureCount: 0, skippedCount: 0 }
      });
    } catch (error) {
      this.menu.showError(`Processing failed: ${error.message}`);
    }
    
    await this.menu.waitForUser();
  }

  async handleConnectionStatus() {
    await this.menu.showProcessingMessage('status');
    
    try {
      const info = this.client ? await this.client.getState() : null;
      const phone = this.isReady ? (await this.client.info?.wid?.user || 'Connected') : null;
      
      await this.menu.showResults({
        status: {
          connected: this.isReady,
          phone: phone,
          state: info
        }
      });
    } catch (error) {
      this.menu.showError(`Status check failed: ${error.message}`);
    }
    
    await this.menu.waitForUser();
  }

  async handleChangeTeamMember() {
    const newTeamMember = await this.menu.getTeamMemberName();
    if (newTeamMember && newTeamMember !== this.config.teamMember) {
      this.config.updateTeamMember(newTeamMember);
      this.menu.showSuccess(`Team member changed to: ${newTeamMember}`);
      this.menu.showSuccess('Please restart the application to use the new configuration.');
    }
    await this.menu.waitForUser();
  }

  cleanup() {
    if (this.client) {
      this.client.destroy();
    }
    this.menu.close();
  }
}

// Start the application
const app = new WhatsAppAutomation();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  app.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  app.cleanup();
  process.exit(0);
});

// Start the application and keep it running
(async () => {
  try {
    await app.initialize();
  } catch (error) {
    console.error('Application error:', error);
    app.cleanup();
    process.exit(1);
  }
})();