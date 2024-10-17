#!/usr/bin/node
let
    cfg = {
        moduleName: "Solar",           // give this NodeJS Client a name for notification
        workingDir: "/apps/tw/",
        telegram: {                         // delete this object if you don't use Tekegram
            password: "password",           // password for telegram registration
        },
        ha: [                               // add all your home assistant entities here
            "input_boolean.auto_inverter",
            "input_boolean.auto_compressor",
            "input_boolean.auto_pump_transfer",
            "input_boolean.auto_solar_compressor",
            "input_boolean.auto_solar_transfer",
            "input_boolean.auto_pump_pressure_turbo",
            "input_boolean.auto_fountain",
        ],
        esp: [                              // add all your ESP entities here
            "battery-voltage",
            "power1-relay1",        // 10kw inverter
            "power1-relay2",        // fan 
            "power1-relay3",        // inverter 8kw ATS
            "power1-relay4",        // inverter 10kw ATS
            "8kw-power",            // 8kw watts
            "8kw-energy",           // 8kw energy
            "grid-voltage",         // grid voltage
            "grid-power",           // grid watts
            "grid-energy",          // grid kwh
            "sun-level",
            "temp-battery",
            "lth-relay1",           // compressor
            "uth-relay1",           // 1/2hp pump
            "10kw-power",           // 10kw watts
            "10kw-energy",          // 10kw watts
            "battery-power",        // battery amps
            "battery-energy",       // battery amps
            "battery-voltage2",     // power2 Pzam-017 voltage
            "battery-current",
            "8kw-current",
            "10kw-current",
            "8kw-pf",
            "10kw-pf",
            "grid-pf",
            "battery-current-ads1115",
            "battery-current3",
        ],
        grid: {
            espVoltage: 7,              // change to sensor number <-----------------------------------------
            espPower: 8,
        },
        solar: {
            inverterAuto: 0,            // HA Toggle automation id
            inverterDelaySwitch: 15,    // time to wait for sensor based transfer 
            inverterRapidSwitch: 10,    // inverter minimum switch time for fault
            batteryReserve: 40,         // charging amps to reserve for battery charging - not implemented
            espSunlight: 10,            // sunlight sensor esp ID
            fan: {
                espPower: 2,            // relay id
                sensorTemp: 0,          // temp sensor number (in cfg.sensor.temp)
                disableNight: true,     // disable auto can at night
                tempRun: 88.2,          // fan start temp
                tempStop: 85.0,         // fan stop temp
                tempWarn: 89.0,         // send warning at this temp
                tempError: 90.0,        // send error at the temp
                refaultMin: 30,         // minutes to resend error/warning
                // onSun: 2.0,          // optional - sun level to start fan 
                // offSun: 1.7,         // optional - sun level to stop fan 
                onAmps: 10,             // optional - amp level to start fan
                offAmps: 2,             // optional - amp level to stop fan
                onAmpsDischarge: -40,   // optional - amp discharge level to start fan
                offAmpsDischarge: -35,  // optional - amp discharge level to stop fan
            },
            priority: {
                sensorVolt: 0,      // which volt sensor to use for priority controller (in cfg.sensor.volt)
                // sensorSun : 2,   // directly using esp sun, no need for sensor sun because no recorder yet?
                sensorAmp: 4,
                delaySwitch: 10,
                queue: [
                    {
                        name: "pump transfer",
                        //    onSun: 2.55,
                        //   offSun: 2.48,
                        onAmps: 20.0,
                        offAmps: 5.0,
                        offAmpsFloat: -5.0,
                        onVolts: 52.5,
                        offVolts: 52.0,
                        devices: ["input_boolean.auto_fountain"]
                    },
                    {
                        name: "Compressor", // name of system or entity being controlled 
                        // onSun: 2.50,     // sunlight level to activate this system - in addition to battery level if configured
                        // offSun: 2.35,    // sunlight level to deactivate this system - independent of battery level
                        onAmps: 45.0,       // amp level to activate 
                        offAmps: 20.0,      // amp level to deactivate
                        offAmpsFloat: -5.0, // amp level while floating needed to deactivate
                        onVolts: 53.0,      // battery level to turn on system - in addition to sunlight if configured
                        offVolts: 52.8,     // battery level to turn off system - independent of battery level
                        haAuto: 3,          // optional - HA toggle helper - for syncing TW-IoT/HA state 
                        devices: ["input_boolean.auto_compressor"], // HA or ESP entities that will be toggled 
                        inverter: 0         // optional - which inverter carries the load - if not specified, inverter 0 is used
                        // gridSupport: true 
                        // gridSupportHours:
                        // pump-system name coredata, faulted? percentage? 
                    },
                    {
                        name: "pump transfer",
                        //    onSun: 2.55,
                        //   offSun: 2.48,
                        onAmps: 50.0,
                        offAmps: 20.0,
                        offAmpsFloat: 0.0,
                        onVolts: 53.2,
                        offVolts: 53.0,
                        haAuto: 4,
                        devices: ["input_boolean.auto_pump_transfer"]
                    },
                    /*
                    {
                        name: "pump pressure turbo",
                        onSun: 2.55,
                        offSun: 2.5,
                        timeOnHour: 9,
                        timeOnMin: 30,
                        devices: ["input_boolean.auto_pump_pressure_turbo"]
                    },
                    */
                ],
            }
        },
        inverter: [
            {
                name: "8Kw",
                sunSupportAmp: true,            // sunlight sensor will help during battery floating to know when to switch back
                nightMode: true,                // optional - this inverter runs at night
                nightModeStartHour: 16,         // hour to start night mode  
                nightModeStartMin: 0,           // minute to start night mode
                nightModeEndHour: 6,            // the hour that nightMode will end
                nightModeEndAmps: 20,           // optional - amps needed to end night mode
                nightModeVoltageMin: 52.5,      // min voltage to start (or it also will switch off) the inverter at "nightMode" start if not at least this voltage
                espSwitchPower: undefined,      // inverter remote power switch
                espSwitchPowerDelay: undefined, // inverter remote power delay off in seconds
                espSwitchTransfer: 3,           // inverter transfer switch relay
                espPower: 5,                    // unused - inverter current sensor (unused, for welder?)
                espPowerGrid: 8,                // esp sensor ID for grid power
                sensorVolt: 0,                  // volt sensor number (in cfg.sensor.volt)
                sensorAmp: 4,                   // amp sensor ID number
                sensorWattBattery: 2,           // optional - used for grid load / charge amp watt based transfer switching 
                blackoutRecover: true,          // optional - switch to inverter on blackout if voltage is less than (voltsRun)
                voltsRun: 52.0,                 // volts to start inverter - in addition to sunlight/amps if configured
                voltsStop: 51.4,                // volts to start inverter - will stop Independent of sunlight level
                // sunRun: 1.95,                // optional - min sunlight needed in addition to battery voltage
                // sunStop: 1.70,               // optional - reduce battery wear, constant recharging
                // ampsRun: 20.0,               // optional - charger amp level to transfer load to inverter - (must use espPowerGrid if not)
                ampsStop: -5.0,                 // optional - discharge amp level to transfer load to grid 
                ampsStopFloat: -10.0,           // optional - discharge amp level to transfer load to grid when floating
                delaySwitch: 20,                // seconds to observe volt, sun or amp reading before transferring load, should be longer than priority delay
                battery: 0,                     // optional - battery bank assigned to this inverter - requires to use ampsStopFloat
                welderWatts: 4000,              // optional - high load detection
                welderTimeout: 240,             // optional - time in seconds to observe and reset
            },
            {
                name: "10Kw",
                espSwitchPower: 1,
                espSwitchTransfer: 4,
                espSwitchPowerDelay: 600,
                espPower: 5,
                sensorVolt: 0,
                sensorAmp: 4,
                voltsRun: 52.5,
                voltsStop: 52,
                // sunRun: 2.4,
                // sunStop: 2.0,
                ampsRun: 10.0,
                ampsStop: -5.0,
                //     ampsRunFloat: 10.0,
                // ampsStopFloat: -10.0,
                delaySwitch: 20,
                battery: 0,                     // optional - battery bank assigned to this inverter
            },
        ],
        sensor: {
            amp: [
                {
                    name: "8kw_power1",
                    espID: 20,
                },
                {
                    name: "10kw_power2",
                    espID: 21,
                },
                {
                    name: "battery_power2",
                    espID: 19,
                    multiplier: 3.17,           // only devices with multiplier are sent to HA
                    zero: undefined,
                },
                {
                    name: "battery_analog_power2",
                    espID: 25,
                    multiplier: 70.0,           // only devices with multiplier are sent to HA
                    zero: undefined,
                },
                {
                    name: "battery_rs485_power2",
                    espID: 26,
                    multiplier: undefined,           // only devices with multiplier are sent to HA
                    zero: 5014,
                    rating: 500,
                    scale: 10000,
                    inverted: true
                },
            ],
            watt: [     // add grid power for recorder<---------------------------
                {
                    name: "8kw_power1",
                    espID: 5,                   // if undefined, use sensor amp*volt 
                    multiplier: undefined,      // only devices with multiplier, volt/amp, or combine options are sent to HA
                    sensorVolt: undefined,      // for power computation based of V*A
                    sensorAmp: undefined,       // for power computation based of V*A
                    combineESP: undefined,      // all combined ESP and Sensors will be added together
                    combineSensor: undefined,   // all combined ESP and Sensors will be added together
                    solarPower: true,           // special option to show negative power if battery reverse current is greater than inverter output current
                    readingCap: undefined,      // sometimes inverter power-up send excessively high bogus reading, throw out the reading if above this number
                },
                {
                    name: "10kw_power2",
                    espID: 14,
                    readingCap: 10000,
                },
                {
                    name: "battery_power2",
                    sensorVolt: 0,
                    sensorAmp: 4,
                },
                {
                    name: "solar_power",
                    combineESP: [5, 14],
                    combineSensor: [2],
                    solarPower: true,
                    readingCap: 10000,
                },
            ],
            volt: [     // add grid volts for grid detection <--------------------------------------
                {
                    name: "battery_power1",
                    espID: 0,
                    multiplier: 20.33,          // only devices with multiplier are sent to HA
                    calibrateZero: undefined,
                    table: [
                        { voltage: 56.50, adc: 2.779 },
                        { voltage: 51.17, adc: 2.525 },
                        { voltage: 50.99, adc: 2.516 },
                        { voltage: 50.83, adc: 2.503 },
                    ]
                },
                {
                    name: "battery_power2",
                    espID: 18,
                    multiplier: undefined,
                    calibrateZero: undefined,
                },
            ],
            pf: [
                {
                    name: "8kw_power1",
                    espID: 5,
                },
            ],
            kwh: [
                {
                    name: "8kw_power1",
                    espID: 6,
                },
                {
                    name: "10kw_power2",
                    espID: 15,
                },
                {
                    name: "grid_power1",
                    espID: 9,
                },
            ],
            sun: [
                {
                    name: "photo_resistor_power1",
                    espID: 10,
                },
                {
                    name: "3v_solar_power1",
                    espID: 10,
                },
            ],
            temp: [
                {
                    name: "battery_room_power1",
                    espID: 11,
                    multiplier: 45.4,
                    unit: "F",
                }
            ]
        },
        battery: [
            {
                name: "main",
                installed: "2024-6-1",
                sensorVolt: 0,
                nominalVolts: 53,
                voltsFullCharge: 55.5,
                voltsFloatStop: 53.8,
                socTable: 0,
            },
        ],
        soc: [
            [
                { voltage: 56.0, percent: 100 },
                { voltage: 55.1, percent: 99.5 },
                { voltage: 54.0, percent: 99 },
                { voltage: 53.8, percent: 96 },
                { voltage: 53.6, percent: 90 },
                { voltage: 53.2, percent: 80 },
                { voltage: 52.8, percent: 70 },
                { voltage: 52.3, percent: 60 },
                { voltage: 52.2, percent: 50 },
                { voltage: 52.0, percent: 40 },
                { voltage: 51.6, percent: 30 },
                { voltage: 51.2, percent: 20 },
                { voltage: 50.4, percent: 14 },
                { voltage: 48.0, percent: 9.5 },
                { voltage: 44.8, percent: 5 },
                { voltage: 40.0, percent: 0 }
            ],
            [
                { voltage: 28.0, percent: 100 },
                { voltage: 27.6, percent: 99.5 },
                { voltage: 27.0, percent: 99 },
                { voltage: 26.9, percent: 96 },
                { voltage: 26.8, percent: 90 },
                { voltage: 26.6, percent: 80 },
                { voltage: 26.4, percent: 70 },
                { voltage: 26.2, percent: 60 },
                { voltage: 26.1, percent: 50 },
                { voltage: 26.0, percent: 40 },
                { voltage: 25.8, percent: 30 },
                { voltage: 25.6, percent: 20 },
                { voltage: 24.0, percent: 10 },
                { voltage: 20.0, percent: 0 }
            ],
        ],
    },
    automation = [      // create an (index, clock) => {},  array member function for each automation 
        (index) => {    // clock is declared every min.  time.sec time.min are local time, time.epoch and time.epochMin vars containing epoch time  
            if (state.auto[index] == undefined) init();
            let st = state.auto[index];     // set automation state object's shorthand name to "st" (state) 
            //   checkWelder();
            /*

            test  sensor.voltage_grid for reading (is NaN? or null) with grid switched off
     
            if on grid during blackout, switch to inverter if under certain voltage
     
            priority 2 - run pump from grid if at critical level
            runs pumps for 1hr every 24hours if at critical level 20%
     
            */
            function solarAutomation() {
                let volts = undefined, amps = undefined, sun = undefined;
                let config = cfg.solar.priority;
                if (time.epoch - st.priority.step >= 10) { pointers(); priorityCheck(); } else return;
                function priorityCheck() {
                    for (let x = config.queue.length - 1; x > -1; x--) {
                        let queue = st.priority.queue[x], priority = config.queue[x];
                        if (queue.state == true || queue.state == null) {
                            //  console.log("checking x:" + x + " amps")
                            if (sun != undefined && priority.offSun != undefined) {
                                if (sun <= priority.offSun) {
                                    if (queue.delayStep == false) {
                                        queue.delayTimer = time.epoch;
                                        queue.delayStep = true;
                                    } else if (time.epoch - queue.delayTimer >= cfg.solar.inverterDelaySwitch) {
                                        log("sun is low (" + sun + "v) - stopping " + priority.name, index, 1);
                                        send(x, false);
                                        return;
                                    }
                                } else queue.delayStep = false;
                            } else if (amps != undefined) {
                                if (st.battery[0] == undefined || priority.offAmpsFloat == undefined || st.battery[0].floating == false) {
                                    if (amps <= priority.offAmps) {
                                        if (queue.delayStep == false) {
                                            queue.delayTimer = time.epoch;
                                            queue.delayStep = true;
                                        } else if (time.epoch - queue.delayTimer >= cfg.solar.inverterDelaySwitch) {
                                            log("charge amps is too low (" + amps + "a) - stopping " + priority.name, index, 1);
                                            send(x, false);
                                            return;
                                        }
                                    } else queue.delayStep = false;
                                } else if (amps <= priority.offAmpsFloat) {
                                    if (queue.delayStep == false) {
                                        queue.delayTimer = time.epoch;
                                        queue.delayStep = true;
                                    } else if (time.epoch - queue.delayTimer >= cfg.solar.inverterDelaySwitch) {
                                        log("(floating)discharge amps is high (" + amps + "a) - stopping " + priority.name, index, 1);
                                        send(x, false);
                                        return;
                                    }
                                } else queue.delayStep = false;
                            } else if (volts <= priority.offVolts) {
                                if (queue.delayStep == false) {
                                    queue.delayTimer = time.epoch;
                                    queue.delayStep = true;
                                } else if (time.epoch - queue.delayTimer >= cfg.solar.inverterDelaySwitch) {
                                    log("battery is low (" + volts + "v) - stopping " + priority.name, index, 1);
                                    send(x, false);
                                    return;
                                }
                            } else queue.delayStep = false;
                        }
                    }
                    for (let x = 0; x < config.queue.length; x++) {
                        let queue = st.priority.queue[x], priority = config.queue[x];
                        if (priority.haAuto == undefined || state.ha[priority.haAuto] == true) {
                            if (queue.state == false || queue.state == null) {
                                if (priority.onVolts != undefined) {
                                    if (priority.inverter != undefined && st.inverter[priority.inverter].state == true
                                        || priority.inverter == undefined && st.inverter[0].state == true) {
                                        if (volts >= priority.onVolts) {
                                            if (sun != undefined && priority.onSun != undefined) {
                                                if (sun >= priority.onSun) {
                                                    if (queue.delayStep == false) {
                                                        queue.delayTimer = time.epoch;
                                                        queue.delayStep = true;
                                                    } else if (time.epoch - queue.delayTimer >= cfg.solar.inverterDelaySwitch) {
                                                        log("sun is high (" + sun + "v) - starting " + priority.name, index, 1);
                                                        send(x, true);
                                                        return;
                                                    }
                                                } else if (sun >= priority.onSun) queue.delayStep = false;
                                            } else if (amps != undefined) {
                                                if (amps >= priority.onAmps) {
                                                    if (queue.delayStep == false) {
                                                        queue.delayTimer = time.epoch;
                                                        queue.delayStep = true;
                                                    } else if (time.epoch - queue.delayTimer >= cfg.solar.inverterDelaySwitch) {
                                                        log("charge amps is high (" + amps + "a) - starting " + priority.name, index, 1);
                                                        send(x, true);
                                                        return;
                                                    }
                                                } else if (amps < priority.onAmps) queue.delayStep = false;
                                            } else {
                                                if (queue.delayStep == false) {
                                                    queue.delayTimer = time.epoch;
                                                    queue.delayStep = true;
                                                } else if (time.epoch - queue.delayTimer >= cfg.solar.inverterDelaySwitch) {
                                                    log("battery volts is enough (" + volts + "v) - starting " + priority.name, index, 1);
                                                    send(x, true);
                                                    return;
                                                }
                                            }
                                        } else if (volts >= priority.onVolts) queue.delayStep = false;
                                    }
                                }
                            }
                        }
                    }
                    function send(x, newState) {
                        let queue = st.priority.queue[x], priority = config.queue[x];
                        for (let y = 0; y < priority.devices.length; y++) {
                            if (priority.devices[y].includes("input_boolean"))
                                ha.send(priority.devices[y], newState);
                            else esp.send(priority.devices[y], newState);
                        }
                        cfg.inverter.forEach((_, y) => { st.inverter[y].delaySwitchStep = false });
                        config.queue.forEach((_, y) => { st.priority.queue[y].delayStep = false });
                        queue.delayStep = false
                        queue.state = newState;
                        st.priority.step = time.epoch;
                    }
                }
                function pointers() {
                    volts = st.sensor.volt[config.sensorVolt].toFixed(2);
                    if (cfg.solar.espSunlight != undefined)
                        sun = parseFloat(state.esp[cfg.solar.espSunlight]).toFixed(2);
                    if (config.sensorAmp != undefined)
                        amps = parseFloat(st.sensor.amp[config.sensorAmp]).toFixed(1);
                }
            }
            function inverterAuto() {
                for (let x = 0; x < cfg.inverter.length; x++) {         // initialize all inverter states
                    if (st.inverter[x].state == null) {
                        //  console.log("x is: " + x + " sensor is: " + cfg.inverter[x].sensorVolt + " object is: ", st.sensor)
                        if (st.sensor.volt[cfg.inverter[x].sensorVolt] != undefined)
                            log("initializing " + cfg.inverter[x].name + " inverter state - current state: " + state.esp[cfg.inverter[x].espSwitchTransfer], index, 1);
                        st.inverter[x].state = state.esp[cfg.inverter[x].espSwitchTransfer];
                        st.inverter[x].step = time.epoch - 20;
                        if (state.ha[cfg.solar.inverterAuto] == true) log("inverter: " + cfg.inverter[x].name + " - automation is on", index, 1);
                        else log("inverter: " + cfg.inverter[x].name + " - automation is off", index, 1);
                    }
                }
                for (let x = cfg.inverter.length - 1; x > -1; x--) {    // if inverter is running 
                    let volts, amps, sun, config = cfg.inverter[x], inverter = st.inverter[x];
                    if (st.sensor.volt[config.sensorVolt] != undefined) {
                        volts = st.sensor.volt[config.sensorVolt].toFixed(2);
                        // checkBattery(x, volts);
                        if (cfg.solar.espSunlight != undefined)
                            sun = parseFloat(state.esp[cfg.solar.espSunlight]).toFixed(2);
                        if (config.sensorAmp != undefined)
                            amps = parseFloat(st.sensor.amp[config.sensorAmp]).toFixed(1);
                        if (inverter.state == true) {
                            if (inverterNightMode(x) == true) {
                                if (volts < config.nightModeVoltageMin) {
                                    log("Battery is too low to make it through the night: " + volts + ", " + config.name + " switching off", index, 1);
                                    inverterPower(x, false);
                                    return;
                                }
                            } else if (st.grid.state != false) {
                                if (inverter.nightMode != true) {
                                    if (config.sunStop != undefined) {
                                        if (sun <= config.sunStop) {
                                            if (inverter.delaySwitchStep == false) {
                                                inverter.delaySwitchTimer = time.epoch;
                                                inverter.delaySwitchStep = true;
                                            } else if (time.epoch - inverter.delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                                log("Sun is low: " + sun + "  Volts: " + volts
                                                    + ", " + config.name + " is switching to grid ", index, 1);
                                                inverterPower(x, false);
                                                return;
                                            }
                                        } else inverter.delaySwitchStep = false;
                                    } else if (config.ampsStop != undefined) {
                                        if (amps <= config.ampsStop || config.battery != undefined && st.battery[config.battery].floating == true
                                            && amps <= inverter.ampsStopFloat) {
                                            if (st.battery[config.battery].floating == true && amps <= inverter.ampsStopFloat) {
                                                if (amps < inverter.switchAmps) inverter.switchAmps = amps;
                                                if (config.sunSupportAmp == true && sun > inverter.switchSun) inverter.switchSun = sun;
                                            }
                                            if (inverter.delaySwitchStep == false) {
                                                inverter.switchAmpsSample = [];
                                                inverter.switchAmpsSample.push(amps)
                                                inverter.delaySwitchTimer = time.epoch;
                                                inverter.delaySwitchStep = true;
                                            } else if (time.epoch - inverter.delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                                if (st.battery[config.battery].floating == true && amps <= inverter.ampsStopFloat) {
                                                    log("charge current too low, lowest power point: " + inverter.switchAmps + "a  Volts: " + volts
                                                        + ", " + config.name + " is switching to grid ", index, 1);
                                                } else log("charge current is too low: " + amps + "a  Volts: " + volts
                                                    + ", " + config.name + " is switching to grid ", index, 1);
                                                inverterPower(x, false);
                                                return;
                                            }
                                        } else inverter.delaySwitchStep = false;
                                    }
                                }
                            }
                            if (volts <= config.voltsStop) {  // when battery is low
                                if (inverter.delaySwitchVoltsStep == false) {
                                    inverter.delaySwitchVoltsTimer = time.epoch;
                                    inverter.delaySwitchVoltsStep = true;
                                } else if (time.epoch - inverter.delaySwitchVoltsTimer >= cfg.solar.inverterDelaySwitch) {
                                    log("Battery is low: " + volts + ", " + config.name + " is switching to grid ", index, 1);
                                    inverterPower(x, false);
                                    return;
                                }
                            } else inverter.delaySwitchVoltsStep = false;
                            if (inverter.nightMode == true && time.hour >= config.nightModeEndHour
                                && time.hour < config.nightModeStartHour) {
                                if (config.nightModeEndAmps != undefined) {
                                    if (amps >= config.nightModeEndAmps) {
                                        log("Battery is charging, current is high: " + amps + "a  " + volts + "v, " + config.name + " exiting night mode", index, 1);
                                        st.inverter[x].nightMode = false;
                                    }
                                } else checkCharging(x, false, volts); // inverter only exits night mode only when there is sufficient charging
                            }
                        }
                    }
                }
                for (let x = 0; x < cfg.inverter.length; x++) {         // when inverter is off
                    let volts, config = cfg.inverter[x];
                    if (st.sensor.volt[config.sensorVolt] != undefined) {
                        volts = st.sensor.volt[config.sensorVolt].toFixed(2);
                        // checkBattery(x, volts);
                        if (st.inverter[x].state == false) {
                            checkCharging(x, true, volts);
                            if (inverterNightMode(x) == true) {
                                if (volts >= config.nightModeVoltageMin) {
                                    log("Battery is enough to make it through the night: " + volts + ", " + config.name + " switching on", index, 1);
                                    inverterPower(x, true);
                                } else log("Battery is too low to make it through the night: " + volts + ", " + config.name + " staying off", index, 1);
                            }
                            if (config.blackoutRecover == true && st.grid.state == false && volts >= config.voltsRun && st.inverter[x].nightMode == false) {
                                log("Blackout detected, volts is enough to run: " + volts + ", " + config.name + " switching on", index, 1);
                                inverterPower(x, true);
                            }
                        }
                    }
                }
                function checkCharging(x, power, volts) {
                    let amps, sun, config = cfg.inverter[x];
                    if (cfg.solar.espSunlight != undefined)
                        sun = parseFloat(state.esp[cfg.solar.espSunlight]).toFixed(2);
                    if (config.sensorAmp != undefined)
                        amps = parseFloat(st.sensor.amp[config.sensorAmp]).toFixed(1);
                    if (volts >= config.voltsRun) {
                        if (config.sunRun != undefined) {
                            if (sun >= config.sunRun) {  // when battery begins to charge
                                if (st.inverter[x].delaySwitchStep == false) {
                                    st.inverter[x].delaySwitchTimer = time.epoch;
                                    st.inverter[x].delaySwitchStep = true;
                                } else if (time.epoch - st.inverter[x].delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                    log("Battery is charging, sun is high: " + volts + ", " + config.name + " switching on", index, 1);
                                    finish();
                                }
                            } else if (sun < config.sunRun) st.inverter[x].delaySwitchStep = false;
                        } else if (config.ampsRun != undefined) {
                            if (amps >= config.ampsRun) {
                                if (st.inverter[x].delaySwitchStep == false) {
                                    st.inverter[x].delaySwitchTimer = time.epoch;
                                    st.inverter[x].delaySwitchStep = true;
                                } else if (time.epoch - st.inverter[x].delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                    log("Battery is charging, current is high: " + amps + "a  " + volts + "v, " + config.name + " switching on", index, 1);
                                    finish();
                                }
                            } else if (amps < config.ampsRun) st.inverter[x].delaySwitchStep = false;
                        } else if (config.espPowerGrid != undefined && config.sensorWattBattery != undefined) {
                            if (st.battery[config.battery].floating == true) {
                                if (state.esp[config.espPowerGrid] < inverter.switchAmps) {
                                    if (st.inverter[x].delaySwitchStep == false) {
                                        st.inverter[x].delaySwitchTimer = time.epoch;
                                        st.inverter[x].delaySwitchStep = true;
                                    } else if (time.epoch - st.inverter[x].delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                        log("circuit current is less than before switch, Before: " + inverter.switchAmps.toFixed(0) + "  Now: " + amps.toFixed(0) + "w  " + volts + "v, " + config.name + " switching on", index, 1);
                                        inverter.switchAmps = 100000;
                                        finish();
                                    }
                                } else if (sun > inverter.switchSun) {
                                    if (st.inverter[x].delaySwitchStep == false) {
                                        st.inverter[x].delaySwitchTimer = time.epoch;
                                        st.inverter[x].delaySwitchStep = true;
                                    } else if (time.epoch - st.inverter[x].delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                        log("Sun is higher now than before switch, Before: " + inverter.switchSun + "  Now: " + sun + "w  " + volts + "v, " + config.name + " switching on", index, 1);
                                        inverter.switchSun = 0;
                                        finish();
                                    }
                                }
                            }
                            if (st.sensor.watt[config.sensorWattBattery] > state.esp[config.espPowerGrid]) {
                                if (st.inverter[x].delaySwitchStep == false) {
                                    st.inverter[x].delaySwitchTimer = time.epoch;
                                    st.inverter[x].delaySwitchStep = true;
                                } else if (time.epoch - st.inverter[x].delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                    log("charge current is higher than grid power: " + (amps * volts).toFixed(0) + "w  " + volts + "v, " + config.name + " switching on", index, 1);
                                    finish();
                                }
                            }
                            if (st.sensor.watt[config.sensorWattBattery] <= state.esp[config.espPowerGrid]) st.inverter[x].delaySwitchStep = false;
                        } else {
                            if (st.inverter[x].delaySwitchStep == false) {
                                st.inverter[x].delaySwitchTimer = time.epoch;
                                st.inverter[x].delaySwitchStep = true;
                            } else if (time.epoch - st.inverter[x].delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                log("Battery is charging: " + volts + ", " + config.name + " switching on", index, 1);
                                finish();
                            }
                        }
                    } else if (volts < config.voltsRun) st.inverter[x].delaySwitchStep = false;
                    function finish() {
                        if (st.inverter[x].nightMode == true) {
                            log(config.name + " exiting night mode", index, 1);
                            st.inverter[x].nightMode = false;
                        }
                        if (power == true) inverterPower(x, true);
                    }
                }
            }
            function inverterNightMode(x) {
                let nightMode = null, config = cfg.inverter[x];
                if (config.nightMode == true) {    // undefined config returns false
                    if (time.hour == config.nightModeStartHour) {                   // if nightMode match
                        if (config.nightModeStartMin != undefined) {
                            if (time.min >= config.nightModeStartMin) { nightMode = true; }
                        } else { nightMode = true; }
                    }
                    else if (time.hour > config.nightModeStartHour || time.hour < config.nightModeEndHour) { nightMode = true; }
                    else nightMode = false;
                } else nightMode = false;       // if sun is low and not nightMode - switch the inverter off  -- save battery wear
                if (nightMode == true) {
                    if (st.inverter[x].nightMode == false) {
                        log("night mode is activated for inverter: " + config.name, index, 1);
                        st.inverter[x].nightMode = true;
                        return true;
                    } else return false;
                } else return false;
            }
            function inverterPower(x, run) {
                let config = cfg.inverter[x];
                if (run == true) {
                    if (time.epoch - st.inverter[x].step >= cfg.solar.inverterRapidSwitch) {
                        if (config.espSwitchPower == undefined) {
                            log("inverter: " + config.name + ", transfer switch to inverter", index, 1);
                            esp.send(cfg.esp[config.espSwitchTransfer], run);
                        }
                        else {
                            if (st.inverter[x].delayOffTimer == undefined || st.inverter[x].delayOffTimer == null) {
                                esp.send(cfg.esp[config.espSwitchPower], run);
                                log("inverter: " + config.name + ", power on, delaying transfer switch 10 secs", index, 1);
                                setTimeout(() => {
                                    log("inverter: " + config.name + ", transfer switch to inverter", index, 1);
                                    esp.send(cfg.esp[config.espSwitchTransfer], run);
                                }, 10e3);
                            } else {
                                log("inverter: " + config.name + ", already on - clearing shutdown delay", index, 1);
                                clearTimeout(st.inverter[x].delayOffTimer);
                                log("inverter: " + config.name + ", transfer switch to inverter", index, 1);
                                esp.send(cfg.esp[config.espSwitchTransfer], run);
                                st.inverter[x].delayOffTimer = null;
                            }
                        }
                        st.inverter[x].state = run;
                    } else {
                        log("inverter: " + config.name + ", cycling too frequently, epoch: "
                            + time.epoch + " step:" + st.inverter[x].step + " - inverter auto shutting down", index, 3);
                        // st.inverter[x].state = false;
                        ha.send(cfg.solar.inverterAuto, false);
                        inverterPower(x, false);
                    }
                } else {
                    if (config.espSwitchPower == undefined) {
                        log("inverter: " + config.name + ", transfer switch to grid", index, 1);
                        esp.send(cfg.esp[config.espSwitchTransfer], run);
                    } else {
                        log("inverter: " + config.name + ", transfer switch to grid", index, 1);
                        esp.send(cfg.esp[config.espSwitchTransfer], run);
                        if (config.espSwitchPowerDelay == undefined) {
                            log("inverter: " + config.name + ", power off", index, 1);
                            st.inverter[x].delayOffTimer = setTimeout(() => { esp.send(cfg.esp[config.espSwitchPower], run); }, 3e3);
                        } else {
                            log("inverter: " + config.name + ", shutdown will delay by:" + config.espSwitchPowerDelay + " seconds", index, 1);
                            st.inverter[x].delayOffTimer = setTimeout(() => {
                                log("inverter: " + config.name + " shutdown was delayed, now powering off", index, 1);
                                esp.send(cfg.esp[config.espSwitchPower], run);
                                st.inverter[x].delayOffTimer = null
                            }, config.espSwitchPowerDelay * 1000);
                        }
                    }
                    st.inverter[x].state = false;
                    st.inverter[x].step = time.epoch;
                }
                st.inverter[x].delaySwitchStep = false;
                cfg.inverter.forEach((_, y) => { st.inverter[y].delaySwitchStep = false });
                cfg.solar.priority.queue.forEach((_, y) => { st.priority.queue[y].delayStep = false });
            }
            function checkRoomTemp() {      // called by setTimeout every 1 sec 
                if (cfg.solar.fan.espPower != undefined) {
                    if (cfg.solar.fan.sensorTemp != undefined) {
                        let fan = cfg.solar.fan, timeWait = 5;
                        let amps, temp = st.sensor.temp[fan.sensorTemp];
                        if (cfg.inverter[0].sensorAmp != undefined)
                            amps = parseFloat(st.sensor.amp[cfg.inverter[0].sensorAmp]).toFixed(1);
                        switch (st.fan.run) {
                            case false:
                                if (temp >= fan.tempRun) {
                                    if (st.fan.delayStep == false) {
                                        st.fan.delayTimer = time.epoch;
                                        st.fan.delayStep = true;
                                    } else if (time.epoch - st.fan.delayTimer >= timeWait) {
                                        log("room is too warm, fan turning on: " + temp.toFixed(1)
                                            + cfg.sensor.temp[fan.sensorTemp].unit, index, 1);
                                        fanSwitch(true);
                                    }
                                } else if (fan.onSun != undefined) {
                                    if (state.esp[cfg.solar.espSunlight] >= fan.onSun) {
                                        if (st.fan.delayStep == false) {
                                            st.fan.delayTimer = time.epoch;
                                            st.fan.delayStep = true;
                                        } else if (time.epoch - st.fan.delayTimer >= timeWait) {
                                            log("sun is high, fan turning on: " + temp.toFixed(1)
                                                + cfg.sensor.temp[fan.sensorTemp].unit, index, 1);
                                            fanSwitch(true);
                                        }
                                        return;
                                    } else st.fan.delayStep = false;
                                } else if (fan.onAmps != undefined || fan.onAmpsDischarge != undefined) {
                                    if (amps >= fan.onAmps || amps <= fan.onAmpsDischarge) {
                                        if (st.fan.delayStep == false) {
                                            st.fan.delayTimer = time.epoch;
                                            st.fan.delayStep = true;
                                        } else if (time.epoch - st.fan.delayTimer >= timeWait) {
                                            if (amps <= fan.onAmpsDischarge) log("discharge amps is high: " + amps + "A, fan turning on: " + temp.toFixed(1)
                                                + cfg.sensor.temp[fan.sensorTemp].unit, index, 1);
                                            if (amps >= fan.onAmps) log("charge amps is high: " + amps + "A, fan turning on: " + temp.toFixed(1)
                                                + cfg.sensor.temp[fan.sensorTemp].unit, index, 1);
                                            fanSwitch(true);
                                        }
                                        return;
                                    } else st.fan.delayStep = false;
                                }
                                if (temp < fan.tempRun) st.fan.delayStep = false;
                                break;
                            case true:
                                if (fan.offSun != undefined) {
                                    if (state.esp[cfg.solar.espSunlight] <= fan.offSun) {
                                        if (st.fan.delayStep == false) {
                                            st.fan.delayTimer = time.epoch;
                                            st.fan.delayStep = true;
                                        } else if (time.epoch - st.fan.delayTimer >= timeWait) {
                                            log("room has cooled down and sun is low, fan turning off: " + temp.toFixed(1)
                                                + cfg.sensor.temp[fan.sensorTemp].unit, index, 1);
                                            fanSwitch(false);
                                        }
                                    } else st.fan.delayStep = false;
                                } else if (fan.offAmps != undefined) {
                                    if (amps <= fan.offAmps && amps >= fan.offAmpsDischarge && temp <= (fan.tempStop)) {
                                        if (st.fan.delayStep == false) {
                                            st.fan.delayTimer = time.epoch;
                                            st.fan.delayStep = true;
                                        } else if (time.epoch - st.fan.delayTimer >= timeWait) {
                                            if (amps > 2) log("charger current has reduced, fan turning off: " + temp.toFixed(1)
                                                + cfg.sensor.temp[fan.sensorTemp].unit, index, 1)
                                            if (amps < 2) log("inverter current has reduced, fan turning off: " + temp.toFixed(1)
                                                + cfg.sensor.temp[fan.sensorTemp].unit, index, 1)
                                            fanSwitch(false);
                                        }
                                    } else st.fan.delayStep = false;
                                } else {
                                    if (temp <= fan.tempStop) {
                                        if (st.fan.delayStep == false) {
                                            st.fan.delayTimer = time.epoch;
                                            st.fan.delayStep = true;
                                        } else if (time.epoch - st.fan.delayTimer >= timeWait) {
                                            log("room has cooled down, fan turning off: " + temp.toFixed(1)
                                                + cfg.sensor.temp[fan.sensorTemp].unit, index, 1);
                                            fanSwitch(false);
                                        }
                                    } else st.fan.delayStep = false;
                                }
                                break;
                            case null:
                                st.fan.run = state.esp[fan.espPower];
                                log("syncing fan state: " + st.fan.run, index, 1);
                                break;
                        }
                        if (temp >= fan.tempWarn && st.fan.warn == false) {
                            log("room is starting to overheat: " + temp.toFixed(2)
                                + cfg.sensor.temp[fan.sensorTemp].unit, index, 2);
                            st.fan.warn = true;
                            st.fan.faultStep = time.epochMin;
                        }
                        if (temp >= fan.tempError && st.fan.error == false) {
                            log("room is overheating!!!: " + temp.toFixed(2)
                                + cfg.sensor.temp[fan.sensorTemp].unit, index, 3);
                            st.fan.error = true;
                            st.fan.faultStep = time.epochMin;
                        }
                        if (time.epochMin - st.fan.faultStep >= fan.refaultMin) {
                            st.fan.error = false;
                            st.fan.warn = false;
                            st.fan.faultStep = time.epochMin;
                        }
                        function fanSwitch(newState) {
                            if (newState == true) {
                                st.fan.run = newState;
                                esp.send(cfg.esp[fan.espPower], newState);
                            } else {
                                st.fan.run = newState;
                                esp.send(cfg.esp[fan.espPower], newState);
                            }
                            st.fan.delayStep = false;
                        }
                    }
                }
            }
            function checkGrid() {   // if grid is only offline for a few secs, dont count as blackout
                if (st.grid.state == null && time.boot > 10) {
                    if (time.epoch - st.grid.step >= 4) {
                        st.grid.state = true;
                        blackout();
                    } else {
                        log("grid is online: " + parseFloat(state.esp[cfg.grid.espVoltage]).toFixed(0) + "V", index, 1);
                        ha.send("voltage_grid", parseFloat(state.esp[cfg.grid.espVoltage]).toFixed(0), "V");
                        st.grid.state = true;
                    }
                }
                else if (state.esp[cfg.grid.espVoltage] == null) blackout();
                else if (time.epoch - st.grid.step >= 3) blackout();
                else if (st.grid.state == false) {
                    // global function to give h m s?
                    // log grid blackout statistics
                    // log sunlight daily index
                    // grid statistics , save to nv
                    log("grid back online, offline for: " + (time.epoch - st.grid.timerBlackout) + "s", index, 2);
                    st.grid.state = true;
                    ha.send("voltage_grid", parseFloat(state.esp[cfg.grid.espVoltage]).toFixed(0), "V");
                }
                function blackout() {
                    if (st.grid.state == true) {
                        log("grid blackout", index, 2);
                        st.grid.state = false;
                        st.grid.timerBlackout = time.epoch;
                        ha.send("voltage_grid", 0, "V");
                    }
                }
            }
            function checkWelder() {    // needs to be rewritten for  cfg.inverter.sensorAmps or esp direct
                if (state.esp[cfg.inverter[0].espPower] >= cfg.inverter[0].welderWatts ||  // check inverter meter
                    state.esp[cfg.grid.espPower] >= cfg.inverter[0].welderWatts) {           // check grid meter
                    st.welderStep = time.epoch;                   // extend welter timeout if still heavy loads
                    if (st.welder == false) {
                        log("welder detected: " + state.esp[cfg.inverter[0].espPower].toFixed() + "w - shutting down all pumps", index, 2);
                        st.welder = true;
                        st.priority[0] = false;
                        ha.send("input_boolean.auto_compressor", false);
                        ha.send("input_boolean.auto_pump_transfer", false);
                        //    esp.send("uth-relay1", false);
                        // turn on fan
                    }
                } else {
                    if (st.welder == true && time.epoch - st.welderStep >= cfg.inverter[0].welderTimeout) {
                        log("welder not detected: " + state.esp[cfg.inverter[0].espPower].toFixed() + "w", index, 1);
                        st.welder = false;
                    }
                }
            }
            function checkBattery() {
                for (let x = 0; x < cfg.battery.length; x++) {
                    batState = st.battery[x];
                    let config = cfg.battery[x];
                    let volts = st.sensor.volt[config.sensorVolt].toFixed(2);
                    if (volts >= config.voltsFullCharge && batState.floating == false) {
                        log("Battery is charger is floating: " + volts + "v", index, 1);
                        batState.floating = true;
                    }
                    if (volts <= config.voltsFloatStop && batState.floating == true) {
                        log("Battery charger is no longer floating: " + volts + "v", index, 1);
                        batState.floating = false;
                    }
                    batState.percent = voltPercent(volts, config);
                    ha.send("battery_" + config.name, batState.percent, "%");
                }
                function voltPercent(voltage, config) {
                    let percent = null;
                    if (voltage >= cfg.soc[config.socTable][0]) return 100;
                    if (voltage <= cfg.soc[config.socTable].length - 1) return 0;
                    for (let i = 0; i < cfg.soc[config.socTable].length - 1; i++) {
                        const current = cfg.soc[config.socTable][i];
                        const next = cfg.soc[config.socTable][i + 1];
                        if (voltage <= current.voltage && voltage > next.voltage) {
                            percent = next.percent + (voltage - next.voltage) * (current.percent - next.percent) / (current.voltage - next.voltage);
                            return percent.toFixed(1);
                        }
                    }
                }
            }
            function calcSensor() {
                for (let x = 0; x < cfg.sensor.watt.length; x++) {
                    let sumESP = 0, sumSensor = 0, config = cfg.sensor.watt[x];
                    if (config.espID == undefined && config.sensorAmp != undefined && config.sensorVolt != undefined) {
                        st.sensor.watt[x] = st.sensor.volt[config.sensorVolt] * st.sensor.amp[config.sensorAmp];
                        ha.send("watt_" + config.name, st.sensor.watt[x].toFixed(0), "W");
                    } else {
                        if (config.combineESP != undefined)
                            for (let y = 0; y < config.combineESP.length; y++)
                                sumESP += state.esp[config.combineESP[y]];
                        if (config.combineSensor != undefined)
                            for (let y = 0; y < config.combineSensor.length; y++)
                                sumSensor += st.sensor.watt[config.combineSensor[y]];
                        if (config.combineESP != undefined || config.combineSensor != undefined) {
                            if (config.solarPower == true && Math.sign(sumSensor) == -1 && sumSensor <= (sumESP * -1))
                                ha.send("watt_" + config.name, 0, "W");
                            else ha.send("watt_" + config.name, Math.round(sumSensor + sumESP), "W");
                        }
                    }
                }
            }
            function calcSolarPower() {
                if (st.sunlight[sunConverted] == undefined) {
                    //   log("creating new solar power index: " + sunConverted, index, 1);
                    st.sunlight[sunConverted] = { low: solarPower, high: solarPower, average: null };
                } else {
                    if (solarPower < st.sunlight[sunConverted].low) {
                        st.sunlight[sunConverted].low = solarPower;
                        st.sunlight[sunConverted].average = Math.round(st.sunlight[sunConverted].low + st.sunlight[sunConverted].high / 2);
                        //     log("solar power index: " + sunConverted + "  low is being updated: " + solarPower + "  new average: " + st.sunlight[sunConverted].average, index, 1);
                    }
                    if (solarPower > st.sunlight[sunConverted].high) {
                        st.sunlight[sunConverted].high = solarPower;
                        st.sunlight[sunConverted].average = Math.round(st.sunlight[sunConverted].low + st.sunlight[sunConverted].high / 2);
                        //    log("solar power index: " + sunConverted + "  high is being updated: " + solarPower + "  new average: " + st.sunlight[sunConverted].average, index, 1);
                    }
                }
            }
            function init() {
                state.auto.push({                                           // create object for this automation, 
                    name: "Solar",                                          // give this automation a name 
                    priority: { step: time.epoch, queue: [], },
                    inverter: [],
                    battery: [],
                    grid: { state: null, step: time.epoch, timerBlackout: time.epoch },
                    fan: { run: null, delayStep: false, delayTimer: time.epoch, warn: false, error: false, faultStep: time.epochMin },
                    sensor: { amp: [], volt: [], watt: [], temp: [] },
                    welder: { detect: false, step: null },
                });
                initNV();
                cfg.inverter.forEach(_ => {
                    state.auto[index].inverter.push({
                        state: null, step: time.epoch - 20, nightMode: false, delayOffTimer: undefined, switchAmps: 100000, switchSun: 0,
                        delaySwitchTimer: time.epoch, delaySwitchStep: false, delaySwitchVoltsTimer: time.epoch, delaySwitchVoltsStep: false
                    });
                });
                cfg.solar.priority.queue.forEach(_ => {
                    state.auto[index].priority.queue.push({ state: null, delayStep: false, delayTimer: time.epoch, })
                });
                cfg.battery.forEach(_ => {
                    state.auto[index].battery.push({ floating: false, percent: null })
                });
                setInterval(() => {
                    calcSensor(); checkBattery(); checkGrid();
                    if (state.ha != undefined && state.ha[cfg.solar.inverterAuto] == true) {
                        inverterAuto();
                        if (st.welder.detect == false) solarAutomation();
                    }
                }, 1e3);      // set minimum rerun time, otherwise this automation function will only on ESP and HA events
                setInterval(() => { timer(); file.write.nv(); }, 60e3);
                if (cfg.solar.fan != undefined) setInterval(() => { checkRoomTemp(); }, 1e3);
                emitters();
                log("automation system started", index, 1);                 // log automation start with index number and severity 
                send("coreData", { register: true, name: ["tank_lth"] });      // register with core to receive sensor data
                function initNV() {
                    if (nv.sensor == undefined) nv.sensor = { watt: [], kwh: [] };
                    // if (nv.solar == undefined) nv.solar = {};
                    if (nv.grid == undefined) nv.grid = { power: false, blackout: [], sec: undefined };
                    if (nv.battery == undefined) nv.battery = [];
                    for (let x = 0; x < cfg.sensor.watt.length; x++)
                        if (nv.sensor.watt[x] == undefined) {
                            log("initializing Amp sensor: " + cfg.sensor.watt[x].name + " NV memory...", index, 1);
                            nv.sensor.watt.push({
                                name: cfg.sensor.watt[x].name, kwh: 0, min: [], hour: [], day: [], month: [],
                            });
                        }
                    for (let x = 0; x < cfg.sensor.kwh.length; x++) {
                        if (nv.sensor.kwh[x] == undefined) {
                            log("initializing kwh sensor: " + cfg.sensor.kwh[x].name + " NV memory...", index, 1);
                            nv.sensor.kwh.push({
                                name: cfg.sensor.kwh[x].name, total: 0, min: [], hour: [], day: [], month: [],
                                lastMin: null, lastHour: null,
                            });
                        }
                    }
                    for (let x = 0; x < cfg.battery.length; x++)
                        if (nv.battery[x] == undefined) {
                            log("initializing Battery: " + cfg.battery[x].name + " NV memory...", index, 1);
                            nv.battery.push({
                                name: cfg.battery[x].name, cycles: 0, kwh: 0,
                            });
                        }
                }
                file.write.nv();
            }
            function emitters() {
                let st = state.auto[index];
                sensors();
                function sensors() {
                    cfg.sensor.amp.forEach((_, x) => {
                        let factor = 0, corrected = 0, final = 0;
                        em.on(cfg.esp[cfg.sensor.amp[x].espID], (data) => {
                            if (cfg.sensor.amp[x].multiplier != undefined) {
                                st.sensor.amp[x] = parseFloat(data) * cfg.sensor.amp[x].multiplier;
                            } else if (cfg.sensor.amp[x].scale != undefined) {
                                factor = cfg.sensor.amp[x].rating / (cfg.sensor.amp[x].scale / 2);
                                corrected = parseFloat(data) - cfg.sensor.amp[x].zero;
                                final = corrected * factor;
                                if (cfg.sensor.amp[x].inverted == true) st.sensor.amp[x] = (final * -1);
                                else st.sensor.amp[x] = final;
                            } else st.sensor.amp[x] = parseFloat(data);
                            if (st.sensor.amp[x] != null)
                                ha.send("amp_" + cfg.sensor.amp[x].name, st.sensor.amp[x].toFixed(1), "A");
                        });
                    });
                    cfg.sensor.volt.forEach((_, x) => {
                        em.on(cfg.esp[cfg.sensor.volt[x].espID], (data) => {
                            let final = null, voltage = parseFloat(data); // Initialize the final interpolated or extrapolated value
                            const table = cfg.sensor.volt[x].table;
                            if (table !== undefined) {  // Piecewise Linear Interpolation:
                                const firstPoint = table[0];
                                const lastPoint = table[table.length - 1];
                                if (voltage > firstPoint.adc) {
                                    const secondPoint = table[1];
                                    final = firstPoint.voltage + ((voltage - firstPoint.adc) * (secondPoint.voltage - firstPoint.voltage) / (secondPoint.adc - firstPoint.adc));
                                } else if (voltage < lastPoint.adc) {
                                    const secondLastPoint = table[table.length - 2];
                                    final = lastPoint.voltage + ((voltage - lastPoint.adc) * (secondLastPoint.voltage - lastPoint.voltage) / (secondLastPoint.adc - lastPoint.adc));
                                } else {
                                    for (let i = 0; i < table.length - 1; i++) {
                                        const point1 = table[i];
                                        const point2 = table[i + 1];
                                        if (voltage >= point2.adc && voltage <= point1.adc) {
                                            final = point2.voltage + ((voltage - point2.adc) * (point1.voltage - point2.voltage) / (point1.adc - point2.adc));
                                            break; // Exit loop once interpolation is done
                                        }
                                    }
                                }
                                st.sensor.volt[x] = final;
                                ha.send("volt_" + cfg.sensor.volt[x].name, final.toFixed(2), "V");
                            } else if (cfg.sensor.volt[x].multiplier != undefined) {
                                st.sensor.volt[x] = voltage * cfg.sensor.volt[x].multiplier;
                                if (st.sensor.volt[x] != null)
                                    ha.send("volt_" + cfg.sensor.volt[x].name, st.sensor.volt[x].toFixed(2), "V");
                            } else st.sensor.volt[x] = voltage;
                        });
                    });
                    /*
                  cfg.sensor.volt.forEach((_, x) => {
                        em.on(cfg.esp[cfg.sensor.volt[x].espID], (data) => {
                            let voltage = parseFloat(data);
                            if (cfg.sensor.volt[x].table != undefined) {
                                let final = null;
                                for (let i = 0; i < cfg.sensor.volt[x].table.length - 1; i++) {
                                    const table = cfg.sensor.volt[x].table[i];
                                    const next = cfg.sensor.volt[x].table[i + 1];
                                    if (voltage <= table.adc && voltage > next.adc) {
                                        final = next.voltage + (voltage - next.adc) * (table.voltage - next.voltage) / (table.adc - next.adc);
                                        console.log(final)
                                      //  ha.send("volt_" + cfg.sensor.volt[x].name, final.toFixed(2), "V");
                                    }
                                }
                            } else if (cfg.sensor.volt[x].multiplier != undefined) {
                                st.sensor.volt[x] = voltage * cfg.sensor.volt[x].multiplier;
                                if (st.sensor.volt[x] != null)
                                    ha.send("volt_" + cfg.sensor.volt[x].name, st.sensor.volt[x].toFixed(2), "V");
                            }
                            else st.sensor.volt[x] = voltage;
                        });
                    });

                    cfg.sensor.volt.forEach((_, x) => {
                        em.on(cfg.esp[cfg.sensor.volt[x].espID], (data) => {
                            if (cfg.sensor.volt[x].multiplier != undefined) {
                                st.sensor.volt[x] = parseFloat(data) * cfg.sensor.volt[x].multiplier;
                                if (st.sensor.volt[x] != null)
                                    ha.send("volt_" + cfg.sensor.volt[x].name, st.sensor.volt[x].toFixed(2), "V");
                            }
                            else st.sensor.volt[x] = parseFloat(data);
                        });
                    });
                    */
                    cfg.sensor.watt.forEach((e, x) => {
                        if (e.espID != undefined)
                            em.on(cfg.esp[e.espID], (data) => {
                                let reading;
                                if (e.multiplier != undefined) reading = parseFloat(data) * e.multiplier;
                                else reading = parseFloat(data);
                                if (reading != null) {
                                    if (e.readingCap != undefined) {
                                        if (reading < e.readingCap) st.sensor.watt[x] = reading;
                                    } else st.sensor.watt[x] = reading;
                                    ha.send("watt_" + e.name, st.sensor.watt[x].toFixed(0), "W");
                                }
                            });
                    });
                    cfg.sensor.kwh.forEach((_, x) => {
                        em.on(cfg.esp[cfg.sensor.kwh[x].espID], (data) => {
                            if (!isNaN(state.esp[cfg.sensor.kwh[x].espID])) {
                                let diff = state.esp[cfg.sensor.kwh[x].espID] - nv.sensor.kwh[x].total;
                                if (state.esp[cfg.sensor.kwh[x].espID] != nv.sensor.kwh[x].total) {
                                    if (nv.sensor.kwh[x].total == 0) log("sensor: " + cfg.sensor.kwh[x].name + " first time recording", index, 1);
                                    else recorder(nv.sensor.kwh[x], diff, cfg.sensor.kwh[x]);
                                    nv.sensor.kwh[x].total = state.esp[cfg.sensor.kwh[x].espID];
                                }
                            }
                        });
                    });
                    cfg.sensor.temp.forEach((_, x) => {
                        em.on(cfg.esp[cfg.sensor.temp[x].espID], (data) => {
                            if (cfg.sensor.temp[x].multiplier != undefined) {
                                st.sensor.temp[x] = parseFloat(data) * cfg.sensor.temp[x].multiplier;
                                if (st.sensor.temp[x] != null)
                                    ha.send("temp_" + cfg.sensor.temp[x].name, st.sensor.temp[x].toFixed(1), cfg.sensor.temp[x].unit);
                            }
                            else st.sensor.temp[x] = parseFloat(data);
                        });
                    });
                }
                em.on("input_boolean.auto_inverter", (newState) => {
                    if (newState == true) log("inverter auto going online", index, 1);
                    else log("inverter auto going offline", index, 1);
                });
                for (let x = 0; x < cfg.inverter.length; x++) {
                    em.on(cfg.esp[cfg.inverter[x].espSwitchTransfer], (newState) => {   // keep inverter state synced to automation state
                        log("inverter " + cfg.inverter[x].name + " ESP state changed - new state: " + newState, index, 1);
                        st.inverter[x].state = newState;
                        inverterNightMode(x);
                        // inverterPower(x, newState);
                        if (newState == true) {
                            if (cfg.inverter[x].espSwitchPower != undefined) {
                                log("inverter " + cfg.inverter[x].name + " powering on", index, 1);
                                esp.send(cfg.esp[cfg.inverter[x].espSwitchPower], newState);
                            }
                        } else {
                            if (cfg.inverter[x].espSwitchPower != undefined) {
                                setTimeout(() => {
                                    log("inverter " + cfg.inverter[x].name + " powering off", index, 1);
                                    esp.send(cfg.esp[cfg.inverter[x].espSwitchPower], newState);
                                }, 10e3);
                            }
                        }
                    });
                }
                cfg.solar.priority.queue.forEach((ePriority, x) => { // sync priority device state with auto state
                    em.on(cfg.ha[ePriority.haAuto], (newState) => {
                        if (newState == true) log("solar automation priority " + x + " going online", index, 1);
                        else log("solar automation priority " + x + " going offline", index, 1);
                    });
                    ePriority.devices.forEach(eDevice => {
                        cfg.ha.forEach((eHA, xHA) => {
                            if (eHA == eDevice) {
                                log("matching priority queue: " + ePriority.name + "  to HA entity: " + eHA, index, 1);
                                st.priority.queue[x].state = state.ha[xHA];
                                em.on(eHA, (newState) => {
                                    log("syncing priority queue: " + x + "  with new entity state: " + newState, index, 1);
                                    st.priority.queue[x].state = newState;
                                    st.priority.step = time.epoch;
                                });
                            }
                        });
                    });
                });
                em.on("grid-voltage", (newState) => { st.grid.step = time.epoch; });
                /*
                em.on(cfg.esp[cfg.solar.current.espID], (newState) => {
                    let currentTemp = 0;
                    st.current.reading[st.current.step] = newState;
                    if (st.current.step < cfg.solar.current.samples - 1)
                        st.current.step++
                    else {
     
                        st.current.step = 0;
                    }
     
     
                    for (let x = 0; x < cfg.solar.current.samples; x++) currentTemp += st.current.reading[x];
                    st.current.median = currentTemp / cfg.solar.current.samples;
     
                    if (st.current.median > cfg.solar.current.offset) {
                        let calc1, calc2, calc3;
                        calc1 = st.current.median - cfg.solar.current.offset;
                        calc2 = calc1 / 0.005;
                        //  log("POSITIVE - reading: " + st.current.median + "calc 1: " + calc1 + "  calc2: " + calc2, index, 0)
     
     
                        st.current.final = calc2
                    } else if (st.current.median < cfg.solar.current.offset) {
                        let calc1, calc2, calc3;
                        calc1 = st.current.median - cfg.solar.current.offset;
                        calc2 = calc1 / 0.005;
                        //  log("NEGATIVE - reading: " + st.current.median + "calc 1: " + calc1 + "  calc2: " + calc2, index, 0)
     
     
                        st.current.final = calc2
                    }
     
                    //    log("current reading: " + ((st.current.final != null) ? (st.current.final).toFixed(1) : "0") + "  step: " + st.current.step, index, 0);
                });
     
                */
            }
            function timer() {
                if (time.hour == 8 && time.min == 0) {
                    //  esp.send("power1-relay2", true); // fan
                }
                if (time.hour == 17 && time.min == 0) {
                    //   esp.send("power1-relay2", false); // fan
                }
            }
            function recorder(obj, diff, cfg) {
                let calcHour = 0, calcDay = 0, calcMonth = 0, lastHour = 0, lastDay = 0, last30Days = 0, lastMonth;
                if (!Array.isArray(obj.min) || obj.min.length != 60) obj.min = new Array(60).fill(0);
                if (!Array.isArray(obj.hour) || obj.hour.length != 24) obj.hour = new Array(24).fill(0);
                if (!Array.isArray(obj.day) || obj.day.length != 31) obj.day = new Array(31).fill(0);
                if (!Array.isArray(obj.month) || obj.month.length != 12) obj.month = new Array(12).fill(0);
                if (obj.lastMin != time.min) { obj.min[time.min] = 0; obj.lastMin = time.min; }
                obj.min[time.min] += diff;
                for (let x = 0; x <= time.min; x++) calcHour += obj.min[x];
                obj.hour[time.hour] = calcHour;
                for (let x = 0; x <= time.hour; x++) calcDay += obj.hour[x];
                obj.day[time.day] = calcDay;
                for (let x = 0; x <= time.day; x++) calcMonth += obj.day[x];
                obj.month[time.month] = calcMonth;

                for (let x = 0; x < obj.min.length; x++) lastHour += obj.min[x];
                for (let x = 0; x < obj.hour.length; x++) lastDay += obj.hour[x];
                for (let x = 0; x < obj.day.length; x++) last30Days += obj.day[x];
                for (let x = 0; x < obj.month.length; x++) lastMonth += obj.month[x];

                ha.send("kwh_" + cfg.name + "_hour", (lastHour / 1000).toFixed(2), "kWh");
                ha.send("kwh_" + cfg.name + "_day", (lastDay / 1000).toFixed(2), "kWh");
                ha.send("kwh_" + cfg.name + "_30days", (last30Days / 1000).toFixed(2), "kWh");
                ha.send("kwh_" + cfg.name + "_12months", (last30Days / 1000).toFixed(2), "kWh");
            }
        }
    ];
let
    user = {        // user configurable block - Telegram 
        telegram: { // enter a case matching your desireable input
            agent: function (msg) {
                //  log("incoming telegram message: " + msg, 0, 0);
                //  console.log("incoming telegram message: ", msg);
                if (telegram.auth(msg)) {
                    switch (msg.text) {
                        case "?": console.log("test help menu"); break;
                        case "/start": bot(msg.chat.id, "you are already registered"); break;
                        case "R":   // to include uppercase letter in case match, we put no break between upper and lower cases
                        case "r":
                            bot(msg.from.id, "Test Menu:");
                            setTimeout(() => {      // delay to ensure menu Title gets presented first in Bot channel
                                telegram.buttonToggle(msg, "t1", "Test Button");
                                setTimeout(() => {      // delay to ensure menu Title gets presented first in Bot channel
                                    telegram.buttonMulti(msg, "t2", "Test Choices", ["test1", "test2", "test3"]);
                                }, 200);
                            }, 200);
                            break;
                        default:
                            log("incoming telegram message - unknown command - " + JSON.stringify(msg.text), 0, 0);
                            break;
                    }
                }
                else if (msg.text == cfg.telegram.password) telegram.sub(msg);
                else if (msg.text == "/start") bot(msg.chat.id, "give me the passcode");
                else bot(msg.chat.id, "i don't know you, go away");

            },
            response: function (msg) {  // enter a two character code to identify your callback "case" 
                let code = msg.data.slice(0, 2);
                let data = msg.data.slice(2);
                switch (code) {
                    case "t1":  // read button input and toggle corresponding function
                        if (data == "true") { myFunction(true); break; }
                        if (data == "false") { myFunction(false); break; }
                        break;
                    case "t2":  // read button input and perform actions
                        switch (data) {
                            case "test1": bot.sendMessage(msg.from.id, log("test1", "Telegram", 0)); break;
                            case "test2": bot.sendMessage(msg.from.id, log("test2", "Telegram", 0)); break;
                            case "test3": bot.sendMessage(msg.from.id, log("test3", "Telegram", 0)); break;
                        }
                        break;
                }       // create a function for use with your callback
                function myFunction(newState) {    // function that reads the callback input and toggles corresponding boolean in Home Assistant
                    bot.sendMessage(msg.from.id, "Test State: " + newState);
                }
            },
        },
    },
    sys = {         // ______________________system area, don't need to touch anything below this line__________________________________
        com: function () {
            udp.on('message', function (data, info) {
                let buf = JSON.parse(data);
                if (buf.type != "async") {
                    //  console.log(buf);
                    switch (buf.type) {
                        case "espState":      // incoming state change (from ESP)
                            // console.log("receiving esp data, ID: " + buf.obj.id + " state: " + buf.obj.state);
                            state.onlineESP = true;
                            // if (buf.obj.id == 0) { state.esp[buf.obj.id] = 1.0; }
                            state.esp[buf.obj.id] = buf.obj.state;
                            if (state.online == true) {
                                em.emit(cfg.esp[buf.obj.id], buf.obj.state);
                                automation.forEach((func, index) => { if (state.auto[index]) func(index) });
                            }
                            break;
                        case "haStateUpdate":       // incoming state change (from HA websocket service)
                            log("receiving state data, entity: " + cfg.ha[buf.obj.id] + " value: " + buf.obj.state, 0);
                            //         console.log(buf);
                            try { state.ha[buf.obj.id] = buf.obj.state; } catch { }
                            if (state.online == true) {
                                em.emit(cfg.ha[buf.obj.id], buf.obj.state);
                                automation.forEach((func, index) => { if (state.auto[index]) func(index) });
                            }
                            break;
                        case "haFetchReply":        // Incoming HA Fetch result
                            state.ha = (buf.obj);
                            log("receiving fetch data: " + state.ha);
                            state.onlineHA = true;
                            automation.forEach((func, index) => { func(index) });
                            break;
                        case "haFetchAgain":        // Core is has reconnected to HA, so do a refetch
                            state.ha = (buf.obj);
                            log("Core has reconnected to HA, fetching again");
                            send("espFetch");
                            break;
                        case "haQueryReply":        // HA device query
                            console.log("Available HA Devices: " + buf.obj);
                            break;
                        case "udpReRegister":       // reregister request from server
                            log("server lost sync, reregistering...");
                            setTimeout(() => {
                                sys.register();
                                if (cfg.ha != undefined) { send("haFetch"); }
                            }, 1e3);
                            break;
                        case "coreData":
                            exist = false;
                            coreDataNum = null;
                            for (let x = 0; x < state.coreData.length; x++) {
                                if (state.coreData[x].name == buf.obj.name) {
                                    state.coreData[x].data = JSON.parse(data);
                                    exist = true;
                                    break;
                                }
                            }
                            if (exist == false) {
                                coreDataNum = state.coreData.push({ name: buf.obj.name, data: JSON.parse(data).data }) - 1;
                                log("coreData:" + coreDataNum + " - is registering: " + buf.obj.name + " - " + buf.obj.data);
                            }
                            break;
                        case "diag":                // incoming diag refresh request, then reply object
                            send("diag", { state: state, nv: nv });
                            break;
                        case "telegram":
                            switch (buf.obj.class) {
                                case "agent":
                                    user.telegram.agent(buf.obj.data);
                                    break;
                            }
                            break;
                        case "log": console.log(buf.obj); break;
                    }
                }
            });
        },
        register: function () {
            log("registering with TW-Core");
            let obj = {};
            if (cfg.ha != undefined) obj.ha = cfg.ha;
            if (cfg.esp != undefined) obj.esp = cfg.esp;
            if (cfg.telegram != undefined) obj.telegram = true;
            send("register", obj, cfg.moduleName);
            if (nv.telegram != undefined) {
                log("registering telegram users with TW-Core");
                for (let x = 0; x < nv.telegram.length; x++) {
                    send("telegram", { class: "sub", id: nv.telegram[x].id });
                }
            }
        },
        init: function () {
            nv = {};
            state = { auto: [], ha: [], esp: [], coreData: [], onlineHA: false, onlineESP: false, online: false };
            time = {
                boot: null,
                get epochMil() { return Date.now(); },
                get mil() { return new Date().getMilliseconds(); },
                get stamp() {
                    return ("0" + this.month).slice(-2) + "-" + ("0" + this.day).slice(-2) + " "
                        + ("0" + this.hour).slice(-2) + ":" + ("0" + this.min).slice(-2) + ":"
                        + ("0" + this.sec).slice(-2) + "." + ("00" + this.mil).slice(-3);
                },
                sync: function () {
                    let date = new Date();
                    this.epoch = Math.floor(Date.now() / 1000);
                    this.epochMin = Math.floor(Date.now() / 1000 / 60);
                    this.month = date.getMonth() + 1;   // 0 based
                    this.day = date.getDate();          // not 0 based
                    this.dow = date.getDay() + 1;       // 0 based
                    this.hour = date.getHours();
                    this.min = date.getMinutes();
                    this.sec = date.getSeconds();
                },
                startTime: function () {
                    function syncAndSchedule() {
                        time.sync();
                        if (time.boot === null) time.boot = 0;
                        let now = Date.now(), nextInterval = 1000 - (now % 1000);
                        setTimeout(() => { syncAndSchedule(); time.boot++; }, nextInterval);
                    }
                    syncAndSchedule();
                },
            };
            time.startTime();
            esp = { send: function (name, state) { send("espState", { name: name, state: state }) } };
            ha = {
                getEntities: function () { send("haQuery") },
                send: function (name, state, unit, id) {  // if ID is not expressed for sensor, then sensor data will be send to HA system 0
                    if (isFinite(Number(name)) == true) send("haState", { name: cfg.ha[name], state: state, unit: unit, haID: id });
                    else send("haState", { name: name, state: state, unit: unit, haID: id });
                }
            };
            fs = require('fs');
            events = require('events');
            em = new events.EventEmitter();
            exec = require('child_process').exec;
            execSync = require('child_process').execSync;
            workingDir = require('path').dirname(require.main.filename);
            path = require('path');
            scriptName = path.basename(__filename).slice(0, -3);
            udpClient = require('dgram');
            udp = udpClient.createSocket('udp4');
            if (process.argv[2] == "-i") {
                moduleName = cfg.moduleName.toLowerCase();
                log("installing TW-Client-" + cfg.moduleName + " service...");
                let service = [
                    "[Unit]",
                    "Description=",
                    "After=network-online.target",
                    "Wants=network-online.target\n",
                    "[Install]",
                    "WantedBy=multi-user.target\n",
                    "[Service]",
                    "ExecStartPre=/bin/bash -c 'uptime=$(awk \\'{print int($1)}\\' /proc/uptime); if [ $uptime -lt 300 ]; then sleep 70; fi'",
                    "ExecStart=nodemon " + cfg.workingDir + "client-" + moduleName + ".js -w " + cfg.workingDir + "client-" + moduleName + ".js --exitcrash",
                    "Type=simple",
                    "User=root",
                    "Group=root",
                    "WorkingDirectory=" + cfg.workingDir,
                    "Restart=on-failure",
                    "RestartSec=10\n",
                ];
                fs.writeFileSync("/etc/systemd/system/tw-client-" + moduleName + ".service", service.join("\n"));
                // execSync("mkdir /apps/ha -p");
                // execSync("cp " + process.argv[1] + " /apps/ha/");
                execSync("systemctl daemon-reload");
                execSync("systemctl enable tw-client-" + moduleName + ".service");
                execSync("systemctl start tw-client-" + moduleName);
                execSync("service tw-client-" + moduleName + " status");
                log("service installed and started");
                console.log("type: journalctl -fu tw-client-" + moduleName);
                process.exit();
            }
            if (process.argv[2] == "-u") {
                moduleName = cfg.moduleName.toLowerCase();
                log("uninstalling TW-Client-" + cfg.moduleName + " service...");
                execSync("systemctl stop tw-client-" + moduleName);
                execSync("systemctl disable tw-client-" + moduleName + ".service");
                fs.unlinkSync("/etc/systemd/system/tw-client-" + moduleName + ".service");
                console.log("TW-Client-" + cfg.moduleName + " service uninstalled");
                process.exit();
            }
            file = {
                write: {
                    nv: function () {  // write non-volatile memory to the disk
                        // log("writing NV data...")
                        fs.writeFile(workingDir + "/nv-" + scriptName + "-bak.json", JSON.stringify(nv), function () {
                            fs.copyFile(workingDir + "/nv-" + scriptName + "-bak.json", workingDir + "/nv-" + scriptName + ".json", (err) => {
                                if (err) throw err;
                            });
                        });
                    }
                },
            };
            telegram = {
                sub: function (msg) {
                    let buf = { user: msg.from.first_name + " " + msg.from.last_name, id: msg.from.id }
                    if (!telegram.auth(msg)) {
                        log("telegram - user just joined the group - " + msg.from.first_name + " " + msg.from.last_name + " ID: " + msg.from.id, 0, 2);
                        nv.telegram.push(buf);
                        bot(msg.chat.id, 'registered');
                        send("telegram", { class: "sub", id: msg.from.id });
                        file.write.nv();
                    } else bot(msg.chat.id, 'already registered');
                },
                auth: function (msg) {
                    let exist = false;
                    for (let x = 0; x < nv.telegram.length; x++)
                        if (nv.telegram[x].id == msg.from.id) { exist = true; break; };
                    if (exist) return true; else return false;
                },
                buttonToggle: function (msg, auto, name) {
                    bot(msg.from.id,
                        name, {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "on", callback_data: (auto + "true") },
                                    { text: "off", callback_data: (auto + "false") }
                                ]
                            ]
                        }
                    }
                    );
                },
                buttonMulti: function (msg, auto, name, array) {
                    buf = { reply_markup: { inline_keyboard: [[]] } };
                    array.forEach(element => {
                        buf.reply_markup.inline_keyboard[0].push({ text: element, callback_data: (auto + element) })
                    });
                    bot(msg.from.id, name, buf);
                },
            };
            sys.boot(0);
        },
        boot: function (step) {
            switch (step) {
                case 0:
                    setTimeout(() => { time.sync(); time.boot++ }, 1e3);
                    moduleName = cfg.moduleName.toLowerCase();
                    console.log("Loading non-volatile data...");
                    fs.readFile(workingDir + "/nv-" + scriptName + ".json", function (err, data) {
                        if (err) {
                            log("\x1b[33;1mNon-Volatile Storage does not exist\x1b[37;m"
                                + ", nv-clientName.json file should be in same folder as client.js file");
                            nv = { telegram: [] };
                        }
                        else { nv = JSON.parse(data); }
                        sys.boot(1);
                    });
                    break;
                case 1:
                    sys.com();
                    sys.register();
                    setTimeout(() => { sys.boot(2); }, 3e3);
                    break;
                case 2:
                    state.online = true;
                    setInterval(() => { send("heartBeat"); time.boot++; }, 1e3);
                    if (cfg.ha) { send("haFetch"); confirmHA(); }
                    else setTimeout(() => { automation.forEach((func, index) => { func(index) }); }, 1e3);
                    if (cfg.esp) {
                        if (!cfg.ha) confirmESP();
                        send("espFetch");
                    }
                    function confirmHA() {
                        setTimeout(() => {
                            if (state.onlineHA == false) {
                                log("TW-Core isn't online yet or fetch is failing, retrying...", 2);
                                sys.register();
                                send("haFetch");
                                confirmHA();
                            }
                        }, 10e3);
                    }
                    function confirmESP() {
                        setTimeout(() => {
                            if (state.onlineESP == false) {
                                log("TW-Core isn't online yet or fetch is failing, retrying...", 2);
                                send("espFetch");
                                confirmESP();
                            }
                        }, 10e3);
                    }
                    break;
            }
        },
    };
setTimeout(() => { sys.init(); }, 1e3);
function bot(id, data, obj) { send("telegram", { class: "send", id: id, data: data, obj: obj }) }
function send(type, obj, name) { udp.send(JSON.stringify({ type: type, obj: obj, name: name }), 65432, '127.0.0.1') }
function coreData(name) {
    for (let x = 0; x < state.coreData.length; x++) if (state.coreData[x].name == name) return state.coreData[x].data;
    return {};
}
function log(message, index, level) {
    if (level == undefined) send("log", { message: message, mod: cfg.moduleName, level: index });
    else send("log", { message: message, mod: state.auto[index].name, level: level });
}
