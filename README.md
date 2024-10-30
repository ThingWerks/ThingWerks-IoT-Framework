# ThingWerks IoT Framework (TWIT)

## Uses

- Suitable for virtually all industrial automation and control applications needing 100ms or greater response time.
- Infrastructure monitoring and disaster reduction systems 
- Automated industrial pump operations, water treatment and delivery systems
- Irrigation control systems with weather AI integration
- Solar power and other electrical control applications such as batteries, industrial inverters, transfer switches, power factor correction systems, etc
- Good for marine applications, fluid management and electrical systems
- Control lighting and other Home type automations

This system has been tested and used in various commercial and municipal industrial control systems. It is simple and reliable and straightforward. 

## Preamble

TWIT is Core-Client framework with template-based client-side extensible modules. This project was created after extensive testing with Home Assistant’s automation revealed serious inconsistency and reliability concerns. TWIT is a standalone industrial control and IoT automation framework and has no reliance on Home Assistant, though it integrates seamlessly with Home Assistant and ESPHome. 

Home Assistant has an excellent GUI for PC and mobile devices and is a completely acceptable monitoring and supplemental control interface for industrial systems however it cannot be relied on for automation and logic. Data processing and manipulation, state control and automation logic are far better suited in NodeJS and specialized frameworks such as TWIT.

If you are going to use TWIT with Home Assistant for industrial automation, DO NOT use Home Assistant Supervised. It is unstable and seriously lags and had noticeable issues with TWIT during development. We only recommend using Home Assistant Core with TWIT.  

## TWIT Principal of Operation

#### The Core
Acts as a communication hub between Home Assistant, ESPHome, other IoT devices and the TWIT Clients. It has centralized logging of all device and TWIT Clients.   

##### How To install TWIT Core: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/Install-TWIT-Core.md
##### Configuration Guide: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Core-Config-Guide.md

#### The Client
The TWIT Clients consist of the TWIT boiler plate code. You insert your automation code into the designated automation area in JavaScript format. You Follow the programming structure as defined in the TWIT-Client Example and utilize the methods explained there for logging, processing telemetry data, toggling outputs, etc.

##### Client Installation Guide: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/Install-TWIT-Client.md
##### Client Example:  https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/client-example.js
##### Client Programming Guide: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Client-Programming-Guide.md 
##### Telegram Remote Access Guide: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Client-Telegram-Guide.md

## Features
- Supports multiple Home Assistant servers and can synchronize them
- Powerful logging, debugging and notification
- immune to network, power and connectivity interruptions 
- Extremely lightweight an easy to start, setup your own automation in a few minutes
- Has been developed with high reliability and compartmentalization

## IoT Device Integration

TWIT has mainly been developed to interact with IoT devices either by using the ESPHome API or by connecting to devices via Home Assistant as a gateway for devices like Zigbee, or other communication methods supported by Home Assistant like Zigbee2MQTT, etc. 

General purpose IoT devices such as Arduino, ST Micro Controllers, PIC etc, that cannot or should not be dependent on Home Assistant nor support the ESPHome API would connect to TWIT via a the UDP based TWIT API. PLC and other industrial control systems can connect via RS485 or UART IP gateway, UART interface or the UDP API. 
