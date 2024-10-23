# ThingWerks IoT Framework (TWIT)

## Preamble

TWIT is Core-Client framework with template-based client-side extensible modules. This project was created after extensive testing with Home Assistant’s automation revealed serious inconsistency and reliability concerns. TWIT is a standalone industrial control and IoT automation framework and doesn't rely on Home Assistant for anything, though it integrates seamlessly with Home Assistant and ESPHome. 

Home Assistant has an excellent GUI for PC and mobile devices and is even acceptable for use as a control and monitoring interface for industrial systems however it cannot be relied on for automation and logic. Data processing and manipulation, state control and automation logic are far better suited in NodeJS and specialized frameworks such as TWIT.

## TWIT Principal of Operation

#### The Core
Acts as a communication hub between Home Assistant, ESPHome, other IoT devices and the TWIT Clients. It has centralized logging of all device and TWIT Client communication.   
#####How To install TWIT: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/Install-TWIT.md

#### The Client
The TWIT Clients consist of the TWIT boiler plate code. You insert your automation code into the designated automation area in JavaScript format. You Follow the programming structure as defined in the TWIT-Client Example and utilize the methods explained there for logging, processing telemetry data, toggling outputs, etc.
#####Client Exmaple:  https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/client-example.js


## IoT Device Integration

TWIT has mainly been developed to interact with IoT devices either by using the ESPHome API or by connecting to devices via Home Assistant as a gateway for devices like Zigbee, or other communication methods supported by Home Assistant like Zigbee2MQTT, etc. 

General purpose IoT devices such as Arduino, ST Micro Controllers, PIC etc, that cannot or should not be dependent on Home Assistant nor support the ESPHome API would connect to TWIT via a the UDP based TWIT API. PLC and other industrial control systems can connect via RS485 or UART IP gateway, UART interface or the UDP API. 
