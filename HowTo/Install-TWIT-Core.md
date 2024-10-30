## TWIT Framework Core Installation and Setup

### Prepare Application Directories and Permissions 
```
sudo mkdir /apps/twit  -p
sudo chown $USER /apps -R
cd /apps/twit
```

### Install Packages: 
To install packages, you must have build-essential: `sudo apt install build-essential`
- `npm i express` - needed only if `cfg.webDiag` is enabled
- `sudo npm i nodemon -g` used for service installer `node /apps/twit/core.js -i`
#### For Telegram Notification:
- `npm i node-telegram-bot-api`
#### For Home Assistant Integration
- `npm i homeassistant`
- `npm i websocket`
#### For ESPHome Integration
- `npm i @2colors/esphome-native-api`

### Setup Core config.json File: 
- [Get config.json template](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/confg.json)
- [Generate Home Assistant API token if using Home Assistant](https://community.home-assistant.io/t/how-to-get-long-lived-access-token/162159/2)
- Add ESPHome Devices (IP and key)

### Run and Test Core
- Its suggested to use Tmux for testing Core and Clients side by side
- [download TWIT core.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/core.js)
- run the Core.js file using nodemon:  ```sudo nodemon /apps/twit/core.js -w /apps/twit/core.js -w /apps/twit/config.json```
- install the Core as a service when its working to your liking: 
  -  Install using Journal Logging ```sudo node /apps/twit/core.js -i -j```
  -  Install using Logging File ```sudo node /apps/twit/core.js -i```
  -  View logging file live: ```tail -f /apps/log-twit-core.txt -n 500``` or ```journalctl -fu twit-core```
- uninstall the service if needed: ```sudo node /apps/twit/core.js -u```

