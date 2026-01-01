## TWIT Framework Client Installation and Setup

### Prepare Application Directories and Permissions 
```
sudo mkdir /apps/twit  -p
sudo chown $USER /apps -R
cd /apps/twit
```
### Setup Client: 
- [download TWIT client.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/client.js)
- Copy `client.js` file to `/apps/twit`
- [Review the TWIT Client Programming Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Client-Programming-Guide)
- you must create an automation file before starting the TWIT Client   
### Run and Test Client
- Tmux is suggested for testing Core and Clients side by side
- Command must include:
  - `-n` nane of this TWIT Client
  - `-a` path of automation file
  - `-c` optional, path of automation config file
  - `--install` optional, appending entire command with this creates service with command "as is"
  - `--uninstall` optional, stop and remove service  
- Example run command: ```sudo nodemon /apps/twit/client-myCleitnName.js -w /apps/twit/client-myCleitnName.js -n "testClient" -a /apps/twit/auto-test.js -c /apps/twit/config-auto-test.js```

### View TWIT Core Logging (live)
- `sudo journalctl -efu yourClientsName --output=cat`
