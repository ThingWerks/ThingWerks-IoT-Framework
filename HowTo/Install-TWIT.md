## TWIT Framerwork Core and Client Installation and Setup


### Prepare Application Permissions and Directories 

```
sudo mkdir /apps/twit  -p
sudo chown $USER /apps -R
cd /apps/twit
```

### Install Packages: 


#### Required
- ```npm i express```
- ```npm i websocket```
#### For Telegram Notification:
- ```npm i node-telegram-bot-api```
#### For Home Assistant Integration
- ```npm i homeassistant```
#### For ESPHome Integration
- ```npm i @2colors/esphome-native-api```
