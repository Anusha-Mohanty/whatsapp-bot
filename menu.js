const readline = require('readline');

class MenuSystem {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async showWelcome(teamMember) {
    console.clear();
    console.log('═══════════════════════════════════════════');
    console.log('🤖 WhatsApp Automation Tool');
    console.log('═══════════════════════════════════════════');
    console.log(`👋 Welcome, ${teamMember}!`);
    console.log('');
  }

  async showMainMenu() {
    console.log('Choose an option:');
    console.log('1. 📤 Send Bulk Messages');
    console.log('2. 📨 Send Message Queue');
    console.log('3. 🚀 Send Both (Bulk + Queue)');
    console.log('4. 📊 Check Connection Status');
    console.log('5. ⚙️  Change Team Member');
    console.log('6. ❌ Exit');
    console.log('');
    
    return await this.getInput('Enter your choice (1-6): ');
  }

  async getInput(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async getTeamMemberName() {
    console.log('');
    console.log('⚙️  Setup Team Member Configuration');
    console.log('─────────────────────────────────────');
    const name = await this.getInput('Enter your name (e.g., anusha, raj, priya): ');
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  async showProcessingMessage(type) {
    console.log('');
    console.log('═══════════════════════════════════════════');
    switch (type) {
      case 'bulk':
        console.log('📤 Processing Bulk Messages...');
        break;
      case 'queue':
        console.log('📨 Processing Message Queue...');
        break;
      case 'both':
        console.log('🚀 Processing Both Bulk and Queue Messages...');
        break;
      case 'status':
        console.log('📊 Checking Connection Status...');
        break;
    }
    console.log('═══════════════════════════════════════════');
    console.log('');
  }

  async showResults(results) {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('📊 RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════');
    
    if (results.bulk) {
      console.log('📤 BULK MESSAGES:');
      console.log(`   ✅ Success: ${results.bulk.successCount}`);
      console.log(`   ❌ Failed: ${results.bulk.failureCount}`);
      console.log(`   ⏭️  Skipped: ${results.bulk.skippedCount}`);
      console.log('');
    }
    
    if (results.queue) {
      console.log('📨 MESSAGE QUEUE:');
      console.log(`   ✅ Success: ${results.queue.successCount}`);
      console.log(`   ❌ Failed: ${results.queue.failureCount}`);
      console.log(`   ⏭️  Skipped: ${results.queue.skippedCount}`);
      console.log('');
    }
    
    if (results.status) {
      console.log('📊 CONNECTION STATUS:');
      console.log(`   ${results.status.connected ? '✅ Connected' : '❌ Disconnected'}`);
      console.log(`   📱 Phone: ${results.status.phone || 'Unknown'}`);
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════');
  }

  async waitForUser() {
    console.log('');
    await this.getInput('Press Enter to continue...');
  }

  async confirmAction(action) {
    console.log('');
    const response = await this.getInput(`Are you sure you want to ${action}? (y/n): `);
    return response.toLowerCase() === 'y' || response.toLowerCase() === 'yes';
  }

  showError(message) {
    console.log('');
    console.log('❌ ERROR:', message);
    console.log('');
  }

  showSuccess(message) {
    console.log('');
    console.log('✅ SUCCESS:', message);
    console.log('');
  }

  close() {
    this.rl.close();
  }
}

module.exports = MenuSystem;