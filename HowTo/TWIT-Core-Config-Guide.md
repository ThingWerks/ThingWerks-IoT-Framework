## TWIT Core Configuration Guide

### Get TWIT Core config.json File: 
- [Get config.json template](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/confg.json)
- [Generate Home Assistant API token if using Home Assistant](https://community.home-assistant.io/t/how-to-get-long-lived-access-token/162159/2)

### Parameters:
- `webDiag` - enable diag website
- `webDiagPort` - set web diag port
- `debugging` - log debug messages to the console/system log
- `workingDir` - working directory for TWIT core, don't change this
- `homeAssistant` - create element for each Home Assistant server the Core will communicate with, delete this object if you don't use Home Assistant
  - `enable` - connect to HA server if enabled
  - `legacyAPI` - must be false, Websocket API is required now
  - `address` - IP of HA server
  - `port` - port of HA server
  - `token` - HA API token of HA server
- `telegram` - config area for Telegram notification. Delete this object if not using Telegram
  - `enable` -  enable Telegram connectivity
  - `logLevel` - minimum log level for telegram notifications
  - `logDebug` - send debug log events to Telegram devices
  - `logESPDisconnect` - send ESP device disconnect messages to Telegram devices
  - `token` - token for Telegram chat bot
  - `users` - ID of telegram users that will receive Core log notifications
- `esp` - ESP Home devices, delete this object if you don't use ESP Home
  - `enable` - enable ESP Home connectivity
  - `devices` - object array, create one object for each ESP Home device
    - `ip` - IP address of each ESP Home device
    - `key` - ESP Home API key for each device
