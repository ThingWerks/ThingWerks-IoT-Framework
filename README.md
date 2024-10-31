# ThingWerks IoT Framework (TWIT)
The TWIT project was created with the sole purpose of making a highly reliable, standalone, general purpose industrial automation framework that integrates with PLCs, IoT devices and general purpose micro-controllers while having the ability to leverage Home Assistant for its Graphical Interface. 

The TWIT framework is a NodeJS Core-Client system with template-based client-side extensible modules. After years of industrial system development and having few options for a smartphone/web monitoring and control interface, Home Assistant is the perfect addition. Using TWIT with Home Assistant allows for rapid development of systems that look pleasing and are highly functional; this also significantly reduces development costs. 

TWIT is also perfect for those who want to use Home Assistant but don't want to rely on it for automation or those who prefer writing automations in pure JavaScript. Extensive testing with Home Assistant’s automation revealed serious inconsistency and reliability concerns that TWIT directly alleviates.

If you want to use Home Assistant with TWIT, do not use Home Assistant Supervised unless absolutely necessary. It is unstable and can seriously lag on low powered hardware and had noticeable issues with TWIT during development; also the response time is nearly 10 times faster with Home Assistant Core. We only recommend using TWIT with Home Assistant Core.  

## Target Use Cases
- Suitable for virtually all industrial automation and control applications requiring >=100ms response time.
- Infrastructure monitoring and disaster reduction systems 
- Automated industrial pump operations, water treatment and delivery systems
- Irrigation control systems with AI and weather integration
- Solar power and other electrical control applications such as battery systems, axillary power, generators, industrial inverters, transfer switches, power factor correction systems, etc
- Marine applications, fluid management, electrical systems and lighting control
- Home type automations, lighting control and HVAC 

This system has been tested and used in various commercial and municipal industrial control systems. It is simple, reliable and straightforward. 

## Principal of Operation

#### The Core
Acts as a communication hub between PLCs, IoT and ESPHome devices, Home Assistant, and the TWIT Automation Clients. It has centralized communication, logging and notification of all devices and TWIT Clients.   

- [How To install TWIT Core](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/Install-TWIT-Core.md)
- [Core Configuration Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Core-Config-Guide.md)

#### The Client
The TWIT Clients consist of the TWIT boiler plate code. You insert your automation code into the designated automation area in JavaScript format. You Follow the programming structure as defined in the TWIT-Client Example and utilize the methods explained there for logging, processing telemetry data, toggling outputs, etc.

- [Client Example](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/client-example.js)
- [Client Template](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/client-blank.js)
- [Client Installation Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/Install-TWIT-Client.md)
- [Client Programming Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Client-Programming-Guide.md)
- [Telegram Remote Control Guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Client-Telegram-Guide.md)

## Features
- Centralized logging, debugging and notification
- Remote control and notification with Telegram
- immune to network, power and connectivity interruptions 
- Extremely lightweight and easy to setupp; get your automations up and running within minutes
- Has been developed with high reliability and compartmentalization
- Supports multiple Home Assistant servers and can synchronize them
- Cross-integrate multiple systems, for example, solar system influencing pump operations 

## IoT Device Integration

PLC and other industrial control systems can connect via RS485 or UART IP gateway, UART interface or the UDP API. General purpose IoT devices such as ST Micro Controllers, PIC, Arduino etc, connect to TWIT via a the UDP based TWIT API.

TWIT has mainly been developed to interact with IoT devices either by using the ESPHome API or by connecting to devices via Home Assistant as a gateway for devices like Zigbee, or other communication methods supported by Home Assistant like Zigbee2MQTT, etc. 

## Fully Developed TWIT Clients

### SolarWerks
SolarWerks is a solar power management and automation control system.
- #### Features
  - Power monitoring, blackout detection
  - Electrical room temp monitoring and ventilation control
  - Inverter power control
  - Auto Transfer Switch control
  - Battery management and charge/discharge over-cycle prevention
  - Control other TWIT Automations based on solar power output

### PumpWerks

## Example Industrial Systems

### Production Systems Using TWIT

<img src="https://github.com/user-attachments/assets/264c2f16-12da-41d9-bb0f-9260f0d84ce4" width="300">
<img src="https://github.com/user-attachments/assets/0b80fde8-d1a7-4d58-98ca-a836f914912e" width="300">
<img src="https://github.com/user-attachments/assets/d5f32293-0004-486a-8dee-9622bf420f2a" width="300">
<img src="https://github.com/user-attachments/assets/6d3d4195-6c3c-49d4-a901-f01e1f75553c" width="1200">
<img src="https://github.com/user-attachments/assets/50aceccb-7a6b-4e8d-a04a-ec38846355c9" width="1200">

### Centralized System Logging
<img src="https://github.com/user-attachments/assets/d1d14d1a-de90-4f89-aa4b-c88380e8aadf" width="1200">
