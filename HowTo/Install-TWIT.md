## TWIT Framerwork Core and Client Installation and Setup


### Prepare Application Permissions and Directories 

```
sudo mkdir /apps/twit  -p
sudo chown $USER /apps -R
cd /apps/twit
```

### Install Packages: 
To install packages, you must have build-essential: ```sudo apt install build-essential```
- ```npm i express```
- ```npm i websocket```
- ```sudo npm i nodemon -g``` Used for service 
#### For Telegram Notification:
- ```npm i node-telegram-bot-api```
#### For Home Assistant Integration
- ```npm i homeassistant```
#### For ESPHome Integration
- ```npm i @2colors/esphome-native-api```

### Setup Core config.json File: 
- Get config.json template: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/confg.json
- Generate Home Assistant API token if using Home Assistant: https://community.home-assistant.io/t/how-to-get-long-lived-access-token/162159/2
- Add ESPHome Devices (IP and key)

### Run and Test Core
- Its suggested to use Termux for testing Core and Clients side by side
- dwonload TWIT core.js: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/core.js
- run the Core.js file using nodemon:  ```nodemon /apps/twit/core.js -w /apps/twit/core.js```
- install the Core as a service when its working to your liking: ```node /apps/twit/core.js -i```
- uninstall the service if needed ```node /apps/twit/core.js -u```

