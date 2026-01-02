

# ThingWerks IoT Framework (TWIT)

## Fastest way to get started


- if you have a question or documentation is incomplete, just ask us. Open a new [Issue](https://github.com/ThingWerks/ThingWerks-IoT-Framework/issues)
- download [core.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/core.js) and [config.jsson](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/confg.json) template. 
  - delete the rocket and/or telegram blocks unless you want notification using ether of them. 
  - remove ESP and Home Assistant examples and add your own if needed.
- configure the config.json file using the [Configuration Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Core-Config-Guide.md).
- run `sudo node core.js --prep` to install and prep your PC for TWIT Core
  - this installs the required system and npm packages 
  - this software is intended to run on Debian/Armbian/Ubuntu or similar linux only
  - for more info: TWIT Core [Setup Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/Install-TWIT-Core.md)
- download [client.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/client.js) and [auto.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/auto.js).
  - for more info: TWOT Client [Setup Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/Install-TWIT-Client.md)
- have a brief look are the extremely simple [Programming Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Programming-Guide.md) and [Automation Example](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/auto-example.js).
- create your automation scrip and test run it:
  - `sudo node /apps/twit/client-myCleitnName.js -n "testClient" -a /apps/twit/auto-test.js`
  - or with [external config file](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/config-example.js) `sudo node /apps/twit/client-myCleitnName.js -n "testClient" -a /apps/twit/auto-test.js -c /apps/twit/config-auto-test.js`
  - or NodeMon `sudo nodemon /apps/twit/client-myCleitnName.js -w /apps/twit/client-myCleitnName.js -n "testClient" -a /apps/twit/auto-test.js -c /apps/
  twit/config-auto-test.js`

## Want to use TWIT only to sync two Home Assistant Servers? 

Follow these steps but no need to create an automation. 
- download [core.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/core.js), [config.jsson](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/confg.json)
  - add your Home Assistant servers configurations 
- download [client.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/client.js) and [auto.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/auto.js)
  - no need to create a custom automation script, just name the example automation like "sync" 
  - create a named array for each sync group under the entities.sync object:
  - like `"myFirstSyncGroup": ["input_boolean.test_switch", "input_boolean.test", "test-led", "test-local-sensor"],`
  - not only two different toggles on different server but even ESP or any other entities can be synced together
- start all the files
  - first prep for TWIT Core: `sudo node core.js --prep`
  - then start the TWIT Core: `sudo node core.js`
  - then start the TWIT Client: `sudo node /apps/twit/client-myCleitnName.js -n "testClient" -a /apps/twit/auto-test.js`

## What you gain from TWIT
TWIT is an extremely simple automation framework. It is very reliable, sets up in a few minutes and has virtually no learning curve provided you already know JavaScript or NodeJS. 

Quickly put together an event based automation system with powerful GUI.

TWIT removes all of the foundational and background effort normally required for a complete automation system. 

Logging, system and device communication, notifications, state initialization and management, non-volatile memory and many other fundamental capabilities are ready to go allowing you to just focus on automation logic. 

## Further explanation 
The TWIT project was created with the sole purpose of making a highly reliable, lightweight, low latency, standalone, general purpose industrial automation framework that integrates with PLCs, IoT devices and general purpose micro-controllers while using JavaScript for its automation logic. 

TWIT from inception was designed so that two completely independent control systems could easily interact and influence each other. For example an isolated solar power system could initiate or throttle certain operations on another control system like PumperPro as based on available energy levels. For making tiered based or smart energy delivery and interactive control systems. TWIT does this easily because TWIT Clients can seamlessly interact with each other through the TWIT Core via a shared IoT device subscription or Local TWIT Entities and or both redundantly via a sync group. 

Sync Groups also assist in making possible redundant multi-point realtime control interfaces tieing together physical control panels, smartphones, webapps, Home Assistant interface, MQTT, ZHA and other custom solutions. It is extremely easy to integrate with other software APis and control interfaces like ProfiNet, MODBUS, anything you want. 

Using TWIT allow you to easily develop complex config file based automations that can be easily adapted to other environments via simple config file changes. For example our own PowerWerks and PumperPro industrial control systems are designed like this.

TWIT has the ability to leverage Home Assistant only for its awesome Graphical Interface, though, all logic is performed by TWIT and there is no dependency whatsoever, just solid integration. There are few options for a smartphone/web monitoring and control interface when it comes to automation and Home Assistant is the perfect addition. 

Using TWIT with Home Assistant allows for rapid development of automation systems that look pleasing and are highly functional; this also significantly reduces development costs. TWIT is also perfect for those who want to use Home Assistant but don't want to rely on it for automation or those who prefer writing automations in pure JavaScript. Extensive testing with Home Assistant’s automation revealed serious inconsistency and reliability concerns that TWIT directly alleviates.

If you want to use Home Assistant with TWIT, do not use Home Assistant Supervised unless absolutely necessary. It is unstable and can seriously lag on low powered hardware and had noticeable issues with TWIT during development; also the response time can be nearly 10 times faster with Home Assistant Core. We only recommend using TWIT with Home Assistant Core.  

## Target Use Cases
- Suitable for virtually all industrial automation and control applications requiring >100ms latency.
- Infrastructure monitoring and disaster reduction systems 
- Automated industrial pump operations, water treatment and delivery systems
- Irrigation control systems with AI and weather integration
- Solar power and other electrical control applications such as battery systems, axillary power, generators, industrial inverters, transfer switches, power factor correction systems, etc
- Marine applications, fluid management, electrical systems and lighting control
- Home type automations, lighting control and HVAC 

This system has been tested and used in various commercial and municipal industrial control systems. It is simple, reliable and straightforward. 

## Principal of Operation

#### The Core
Acts as a communication hub between PLCs, IoT and ESPHome devices, Home Assistant and TWIT Clients. It has centralized communication, logging and notification of all devices and TWIT Clients.   

- all device and system connectivity is specified in the Core configuration file
- the Core configuration file supports Hot Reloading - zero downtime.
- Telegram can be used for notifications
- client errors or crashes can trigger notifications

Related:
- [TWIT Core File](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/core.js)
- [TWIT Core Config Example File](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Core/confg.json)
- [TWIT Core Installation](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/Install-TWIT-Core.md)
- [Configuration Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Core-Config-Guide.md)

#### The Client
The TWIT Clients load and manage your automations. They create a safety zone between the TWIT Core, other TWIT clients and automations preventing crashes or errors from affecting other systems.  

- Used to load end-user automation files
- Automatically detects changes to automation files and config and performs Hot-Reloading, zero downtime
- Each client supports only 1 automation file but multiple scripts can be in each file

Related:
- [TWIT Client File](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/client.js)
- [TWIT Client Installation](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/Install-TWIT-Client.md)

#### The Automation Scripts
The Automation files contain the TWIT framework template. Your automation code goes inside clearly designated areas.

Use as defined in the [Automation Example File](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/auto-example.js) and utilize the methods explained there for logging, processing telemetry data, toggling outputs, etc.

- framework makes state management, non-volatile memory, config/logic modification, multiple system integration an absolute breeze
- automations run on push events or on a timed interval or both  
- one automation file can contain multiple isolated automation scripts 
- automation script or config changes instantly trigger a Hot-Reload, zero downtime
- external automation config file can be ether .json or .js ether format is allowed
- 1 config file is used for all the scripts within a automation file (auto object names must match) see [Automation Example File](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/auto-example.js)

Related:
- [Automation Template File](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/auto.js)
- [Automation Example File](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/auto-example.js)
- [External Config File Example](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/config-example.js)
- [Programming Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Programming-Guide.md)

## Features
- Centralized logging, debugging and notification
- Remote control and notification with Telegram
- Immune to network, power and connectivity interruptions 
- Extremely lightweight and easy to setup; get your automations up and running within minutes
- Has been developed with high reliability and compartmentalization
- Supports multiple Home Assistant servers and can synchronize them
- Cross-integrate multiple systems, for example, solar system influencing pump operations 

## IoT Device Integration

PLC and other industrial control systems can connect via RS485 or UART IP gateway, UART interface or the UDP API. General purpose IoT devices such as ST Micro Controllers, PIC, Arduino etc, connect to TWIT via a the UDP based TWIT API.

TWIT has mainly been developed to interact with IoT devices either by using the ESPHome API or by connecting to devices via Home Assistant as a gateway for devices like Zigbee, or other communication methods supported by Home Assistant like Zigbee2MQTT, etc. 

## Fully Developed TWIT Clients

### SolarWerks
SolarWerks is a solar power management and automation control system.
#### Features
 - Power monitoring, blackout detection
 - Electrical room temp monitoring and ventilation control
 - Inverter power control
 - Auto Transfer Switch control
 - Battery management and charge/discharge over-cycle prevention
 - Control other TWIT Automations based on solar power output

### PumperPro

## Example Industrial Systems

### Production Systems Using TWIT
 - compact button layout uses "card-mod" plugin
 - multi dimensional graphing uses "apexcharts-card" plugin
 - GUI examples in [here](https://github.com/ThingWerks/ThingWerks-IoT-Framework/tree/main/GUI)
<img width="300" height="2460" alt="Screenshot_20260102-145512" src="https://github.com/user-attachments/assets/8e4706fd-ce2b-4295-90dd-3d66c7e3b965" />
<img width="300" height="2460" alt="Screenshot_20260102-145518" src="https://github.com/user-attachments/assets/01647f03-3c58-45e3-89a8-115cfaa60d42" />
<img width="300" height="2460" alt="Screenshot_20260102-150250" src="https://github.com/user-attachments/assets/6ff3251c-9f30-453d-b3de-a710b1911ce0" />
<img width="300" height="2460" alt="Screenshot_20260102-150256" src="https://github.com/user-attachments/assets/58a5cd4c-ee2c-40a2-a67b-91095e85023d" />
<img src="https://github.com/user-attachments/assets/264c2f16-12da-41d9-bb0f-9260f0d84ce4" width="300">
<img src="https://github.com/user-attachments/assets/0b80fde8-d1a7-4d58-98ca-a836f914912e" width="300">
<img src="https://github.com/user-attachments/assets/d5f32293-0004-486a-8dee-9622bf420f2a" width="300">
<img src="https://github.com/user-attachments/assets/6d3d4195-6c3c-49d4-a901-f01e1f75553c" width="1200">
<img src="https://github.com/user-attachments/assets/50aceccb-7a6b-4e8d-a04a-ec38846355c9" width="1200">

### Centralized System Logging
<img src="https://github.com/user-attachments/assets/d1d14d1a-de90-4f89-aa4b-c88380e8aadf" width="1200">
