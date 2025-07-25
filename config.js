const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, 'config.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        console.log(`✅ Config loaded for: ${config.teamMember}`);
        return config;
      } else {
        console.log('⚠️ Config file not found. Creating default config...');
        const defaultConfig = this.createDefaultConfig();
        this.saveConfig(defaultConfig);
        return defaultConfig;
      }
    } catch (error) {
      console.error('❌ Error loading config:', error.message);
      return this.createDefaultConfig();
    }
  }

  createDefaultConfig() {
    return {
      teamMember: "default",
      bulkSheet: "BulkMessages_default",
      queueSheet: "MessageQueue_default",
      createdAt: new Date().toISOString()
    };
  }

  saveConfig(config) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log('✅ Config saved successfully');
    } catch (error) {
      console.error('❌ Error saving config:', error.message);
    }
  }

  updateTeamMember(teamMember) {
    this.config.teamMember = teamMember;
    this.config.bulkSheet = `BulkMessages_${teamMember}`;
    this.config.queueSheet = `MessageQueue_${teamMember}`;
    this.saveConfig(this.config);
  }

  get teamMember() {
    return this.config.teamMember;
  }

  get bulkSheet() {
    return this.config.bulkSheet;
  }

  get queueSheet() {
    return this.config.queueSheet;
  }
}

module.exports = ConfigManager;