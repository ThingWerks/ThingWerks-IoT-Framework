## TWIT Framework Client Installation and Setup

### Prepare Application Directories and Permissions 
```
sudo mkdir /apps/twit  -p
sudo chown $USER /apps -R
cd /apps/twit
```
### Setup Client Configs and Write automation: 
- download TWIT client-example.js: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/client-example.js
- Review the TWIT Client Programming Guide: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Client-Programming-Guide
- Edit the client-example.js and remove the automation example.
- Enter in all of the ESPHome or Home Assistant entity names into your new TWIT client.js file (ie, client-myCleitnName.js) and save into ```/apps/twit/```

```
let
    cfg = {
        moduleName: "NewClientModule",      // give this NodeJS Client a name for notification
        telegram: {                         // delete this object if you don't use Telegram
            password: "password",           // password for telegram registration
        },
        ha: [                               // add all your home assistant entities here
            "myHaEntity",                   // this index order is used for incoming state events and output calls as well (ie state.ha[0] etc...)
        ],
        esp: [                              // add all your ESP entities here
            "myEspEntity",                  // this index order is used for incoming state events and output calls as well (ie state.esp[0] etc...)
        ],
    },
```

### Run and Test Client
- Its suggested to use Tmux for testing Core and Clients side by side
- Run the client-myCleitnName.js file using nodemon:  ```sudo nodemon /apps/twit/client-myCleitnName.js -w /apps/twit/client-myCleitnName.js```
- Install the Client as a service when its working to your liking: 
  -  Install using Journal Logging ```sudo node /apps/twit/client-myCleitnName.js -i```
  -  View client log live: ```journalctl -fu twit-client-myCleitnName```
- Uninstall the service if needed: ```sudo node /apps/twit/client-myCleitnName.js -u```

