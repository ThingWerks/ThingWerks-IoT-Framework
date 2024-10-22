
## Home Assistant Core Installation (Debian/Armbian)

### Install Prerequisite System Packages

```sudo apt-get install jq wget curl avahi-daemon udisks2 libglib2.0-bin dbus docker-compose ```

### Get/Run Docker Installer

```
curl -fsSL get.docker.com | sh
sudo service docker start
```

### Prepare Applicaiton Permissions and Directories 

```
sudo usermod -aG docker user
sudo service docker start
sudo mkdir /apps/ha  -p
sudo chown $USER /apps -R
cd /apps/ha
nano ./docker-compose.yml
```
### Paste Home Assistant Core into Docker Compose File

```
version: '3'
services:
  homeassistant:
    container_name: homeassistant
    image: "ghcr.io/home-assistant/home-assistant:stable"
    volumes:
      - /apps/ha/config:/config
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    privileged: true
    network_mode: host
```
### Docker Compose
```sudo docker compose up -d ```  or  ```sudo docker-compose up -d```

### Upgrade Home Assistant Core Docker Container in the future
```
docker-compose pull
docker stop homeassistant
docker remove homeassistant
cd /apps/ha
docker compose up -d
```






