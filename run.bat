@echo off
echo Starting WhatsApp Scheduler Bot...
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
set PUPPETEER_EXECUTABLE_PATH=node_modules\whatsapp-web.js\node_modules\puppeteer-core\.local-chromium\win64-1045629\chrome-win\chrome.exe
set GOOGLE_SHEET_ID=1SsGMtuOuKw2GexadE9Qx9PT-bwNdsaB92TgtEulOj4w
set NODE_PATH=node_modules
whatsapp-scheduler-bot.exe
pause 