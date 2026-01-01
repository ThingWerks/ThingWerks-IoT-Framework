## TWIT Framework Core Installation and Setup

### Prepare Application Directories and Permissions 
```
sudo mkdir /apps/twit  -p
sudo chown $USER /apps -R
cd /apps/twit
```
- copy TWIT files into `/apps/twit`

### Prepare TWIT Core Environment: 
- `node /apps/twit/core.js --prep`

### Setup Core config.json File: 
- [Get config.json template](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/confg.json)
- [Generate Home Assistant API token if using Home Assistant](https://community.home-assistant.io/t/how-to-get-long-lived-access-token/162159/2)
- Add ESPHome Devices (IP and key)

### Run and Test Core
- Tmux is suggested for testing Core and Clients side by side
- [download TWIT core.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/core.js)
- test/run the core.js:  ```sudo nodemon /apps/twit/core.js -w /apps/twit/core.js -w /apps/twit/config.json```

### Install TWIT Core Service:
- `node /apps/twit/core.js --install`

### View TWIT Core Logging (live)
- `sudo journalctl -efu twit-core --output=cat`

### Other Commands
- Remove Service `node /apps/twit/core.js --uninstall`
