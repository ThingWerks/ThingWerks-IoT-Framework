## ESPHome Installation (Debian/Armbian)

### Install Prerequisite System Packages

```sudo apt-get install jq wget curl avahi-daemon udisks2 libglib2.0-bin dbus docker-compose ```

### Get/Run Docker Installer

```
curl -fsSL get.docker.com | sh
sudo service docker start
```

### Prepare Application Permissions and Directories 

```
sudo usermod -aG docker user
sudo service docker start
sudo mkdir /apps/esphome  -p
sudo chown $USER /apps -R
cd /apps/esphome
```
### Paste ESPHome into Docker Compose File

- Create Docker Compose file if you want ESPHome interface to boot with PC
- ```nano ./docker-compose.yml```

```
version: '3'
services:
  esphome:
    container_name: esphome
    image: ghcr.io/esphome/esphome
    volumes:
      - /apps/esphome/config:/config
      - /etc/localtime:/etc/localtime:ro
    restart: always
    privileged: true
#    network_mode: host
#    devices:
#      - /dev/ttyUSB0:/dev/ttyACM0
    ports:
      - 6052:6052
```
- uncomment the devices if you want to always boot with USB support
- if USB device is specified, ESPHome will fail on boot if USB device is not connected
### Docker Compose
```sudo docker compose up -d ```  or  ```sudo docker-compose up -d```

### Upgrade Home Assistant Core Docker Container in the future
```
docker-compose pull
```
### Manually Run ESPHome
#### With USB Enabled
- ```sudo docker run --device=/dev/ttyUSB0 --rm --net=host -v /apps/esphome/config:/config -it ghcr.io/esphome/esphome```
#### Without USB 
- ```sudo docker run --rm --net=host -v /apps/esphome/config:/config -it ghcr.io/esphome/esphome```




