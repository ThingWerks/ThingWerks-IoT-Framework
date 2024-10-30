# ThingWerks IoT Framework (TWIT)

The TWIT project was created with the sole purpose of making a highly reliable, standalone, general purpose industrial automation framework that integrates with PLCs, IoT devices and general purpose micro-controllers while having the ability to leverage Home Assistants for its Graphcal Interface. 

The TWIT framework is a NodeJS Core-Client system with template-based client-side extensible modules. After years of industrial system development and having few options for a smartphone/web monitoring and control interface, Home Assistant is the perfect addition. Using TWIT with Home Assistant allows for rapid development of systems that look pleasing and are highly functional; this also significantly reduces development costs. 

TWIT is also perfect for those who want to use Home Assistant but doesn't want to rely on it for automation or those who prefer writing automations in pure JavaScript. Extensive testing with Home Assistant’s automation revealed serious inconsistency and reliability concerns and TWIT directly alleviates.

If you want to use Home Assistant with TWIT, DO NOT use Home Assistant Supervised. It is unstable and seriously lags and had noticeable issues with TWIT during development. We only recommend using Home Assistant Core with TWIT.  

## Target Use Cases
- Suitable for virtually all industrial automation and control applications requiring >=100ms response time.
- Infrastructure monitoring and disaster reduction systems 
- Automated industrial pump operations, water treatment and delivery systems
- Irrigation control systems with AI and weather integration
- Solar power and other electrical control applications such as batteries, industrial inverters, transfer switches, power factor correction systems, etc
- Marine applications, fluid management, electrical systems and lighting control
- Home type automations, lighting control and HVAC 

This system has been tested and used in various commercial and municipal industrial control systems. It is simple, reliable and straightforward. 

## TWIT Principal of Operation

#### The Core
Acts as a communication hub between PLCs, IoT and ESPHome devices, Home Assistant, and the TWIT Automation Clients. It has centralized communication, logging and notification of all devices and TWIT Clients.   

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
