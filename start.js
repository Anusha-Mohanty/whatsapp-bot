const { spawn } = require('child_process');
const path = require('path');

// Function to keep the window open
function keepWindowOpen() {
  console.log('\nPress any key to exit...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, 0));
}

// Main error handler
process.on('uncaughtException', (error) => {
  console.error('\n❌ An error occurred:');
  console.error(error);
  keepWindowOpen();
});

process.on('unhandledRejection', (error) => {
  console.error('\n❌ An unhandled promise rejection occurred:');
  console.error(error);
  keepWindowOpen();
});

// Start the main application
try {
  require('./index.js');
} catch (error) {
  console.error('\n❌ Failed to start the application:');
  console.error(error);
  keepWindowOpen();
} 