#!/usr/bin/node
let
    cfg = {
        moduleName: "Solar",           // give this NodeJS Client a name for notification
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
            "input_boolean.inverter_8kw",
            "input_boolean.inverter_10kw",
        ],
        esp: [                              // add all your ESP entities here
            "battery-voltage",
            "power1-relay1",        // 10kw inverter
            "power1-relay2",        // fan 
            "power1-relay3",        // inverter 8kw ATS
            "power1-relay4",        // inverter 10kw ATS
            "8kw-power-safe",       // 8kw watts
            "8kw-energy",           // 8kw energy
            "grid-voltage-safe",    // grid voltage
            "grid-power",           // grid watts
            "grid-energy",          // grid kwh
            "sunlight-pv",
            "temp-battery",
            "lth-relay1",           // compressor
            "uth-relay1",           // 1/2hp pump
            "10kw-power-safe",      // 10kw watts
            "10kw-energy",          // 10kw watts
            "power1-relay5",        // 10kw/8kw ATS
            "power1-relay6",        // 10kw charger 
            "power1-relay7",
            "power1-relay8",
            "8kw-current",
            "10kw-current",
            "8kw-pf",
            "10kw-pf",
            "grid-pf",
            "battery-current",
            "8kw-voltage-safe",
            "10kw-voltage-safe",

        ],
        grid: {
            espVoltage: 7,              // change to sensor number <-----------------------------------------
            espPower: 8,
            voltMin: 190,
            voltMax: 245,
            delayRecover: 60,
        },
        fan: {
            espPower: 2,            // esp relay id
            delayOn: 10,
            delayOff: 30,
            refaultMin: 30,         // minutes to resend error/warning
            sensor: {
                amp: 0,             // local amp sensor ID (cfg.sensor.amp)
                temp: 0,            // temp sensor number (in cfg.sensor.temp)
                watt: {
                    inverter: 2,    // local sensor for inverter or all inverter combined
                    battery: 0,
                }
            },
            temp: {
                on: 88.5,          // fan start temp
                off: 85.0,         // fan stop temp
                warn: 89.0,         // send warning at this temp
                error: 90.0,        // send error at the temp
            },
            watts: {
                on: 500,            // ether inverter output or battery input watts
                off: 300,           // both inverter output and battery input watts
                night: {
                    on: 1800,       // inverter output watts
                    off: 1500,      // inverter output watts
                },
                welder: 4000        // welder detection - and - used for inverter output fault reset
            },
            //   sun: {
            //       on: 2.0,            // optional - sun level to start fan 
            //      off: 1.7            // optional - sun level to stop fan 
            //  }
        },
        solar: {
            inverterAuto: 0,            // HA Toggle automation id
            inverterDelaySwitch: 15,    // time sensor must maintain reading before switching inverter state
            inverterRapidSwitch: 10,    // inverter minimum switch cycle time for before faulting
            espSunlight: 10,            // sunlight sensor esp ID
            sun: [
                { volts: .26, watts: 700 },

            ],
            watts: {
                inverterPower: 2    // local sensor - total inverter power - used for welder detection
            },
            priority: {
                sensorVolt: 0,      // which volt sensor to use for priority controller (in cfg.sensor.volt)
                battery: 0,
                delaySwitchOn: 60,    // time to observe changes in amps/sun before toggling priorities on
                delaySwitchOff: 30,  // time to observe changes in amps/sun before toggling priorities off
                queue: [
                    {
                        name: "pump fountain",
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
                        onSun: 1.5,     // sunlight level to activate this system - in addition to battery level if configured. Only has effect if "offAmpsFloat" is not configured or it is configured and battery is floating 
                        // offSun: 2.35,    // sunlight level to deactivate this system - independent of battery level
                        onAmps: 50.0,       // amp level to activate 
                        offAmps: 30.0,      // amp level to deactivate
                        offAmpsFloat: -10.0, // amp level while floating needed to deactivate
                        onVolts: 54.0,      // battery level to turn on system - in addition to sunlight if configured
                        offVolts: 53.7,     // battery level to turn off system - independent of battery level
                        haAuto: 3,          // optional - HA toggle helper - for syncing TW-IoT/HA state 
                        devices: ["input_boolean.auto_compressor"], // HA or ESP entities that will be toggled 
                        inverter: 0         // optional - which inverter carries the load - if not specified, inverter 0 is used
                        // gridSupport: true 
                        // gridSupportHours:
                        // pump-system name coredata, faulted? percentage? 
                    },
                    {
                        name: "pump transfer",
                        onSun: 1.5,
                        //   offSun: 2.48,
                        onAmps: 80.0,
                        offAmps: 40.0,
                        offAmpsFloat: -10.0,
                        onVolts: 54.2,
                        offVolts: 53.8,
                        haAuto: 4,
                        devices: ["input_boolean.auto_pump_transfer"]
                    },
                ],
            }
        },
        inverter: [
            {
                name: "8Kw",
                nightMode: {
                    enable: true,               // optional - this inverter runs at night
                    startHour: 16,              // hour to start night mode  
                    startMin: 0,                // minute to start night mode
                    startVoltageMin: 52.5,      // min voltage to start (or it also will switch off) the inverter at "nightMode" start if not at least this voltage       
                    endHour: 6,                 // the hour that nightMode will end
                    endMin: 0,
                    endAmps: 20,                // optional - amps needed to end night mode
                },
                power: {
                    id: undefined,              // optional - Power switch ESP ID
                    type: "esp",                // optional - output type esp/udp/ha
                    delayOff: undefined,        // optional - delay power off switch after shutdown
                    startAuto: true,            // optional - state the inverter on system start if voltage is good to go
                    ha: 7                       // Inverter Home Assistant Power Button ID number (in cfg.ha) 
                },
                transfer: {                     // required!!
                    type: "esp",                // Power switch output type esp/udp/ha
                    switchOn: [                 // transfer switch on sequence
                        { id: 3, state: true }, // transfer elements, state is to turn on (true), or off (false)
                    ],
                    switchOff: [                // transfer switch off sequence
                        { id: 3, state: false }, // transfer elements, state is to turn on (true), or off (false)
                        // { id: 16, state: true, delay: 5 },     // delays the action for x seconds
                    ],
                },
                espWattGrid: 8,                // optional - esp ID for grid watt sensor - needed to switch back fromm gid (comparing power)
                espWatt: 5,                     // optional - used for transfer switch 
                espVolt: 26,                    // optional - used to sense inverter output voltage fault
                blackout: true,                 // optional - switch to inverter on blackout if voltage is less than (voltsRun)
                blackoutVoltMin: 51.5,          // optional - minimum voltage needed to recover from blackout 
                voltsRun: 52.0,                 // volts to start inverter - in addition to sunlight/amps if configured
                voltsStop: 51.4,                // volts to start inverter - will stop Independent of sunlight level
                // sunRun: 1.95,                // optional - min sunlight needed in addition to battery voltage
                // sunStop: 1.70,               // optional - reduce battery wear, constant recharging
                floatRetrySun: true,            // optional - retry running inverter while floating based on sunlight index in solar.sun
                floatRetryInterval: undefined,
                // ampsRun: 20.0,               // optional - charger amp level to transfer load to inverter - (must use espWattGrid if not)
                ampsStop: -5.0,                 // optional - discharge amp level to transfer load to grid 
                ampsStopFloat: -10.0,           // optional - discharge amp level to transfer load to grid when floating
                ampsStopVoltsMin: 52.5,         // optional - minimum voltage needed to enable amp stop switching 
                ampsStartGridMultiplier: 1.1,   // multiple of charge power exceeding grid power needed to switch load to inverter
                delaySwitch: 20,                // seconds to observe volt, sun or amp reading before transferring load, should be longer than priority delay
                battery: 0,                     // optional - battery bank assigned to this inverter - required to use ampsStopFloat
                welderWatts: 4000,              // optional - high load detection
                welderTimeout: 240,             // optional - time in seconds to observe and reset
            },
            {
                name: "10Kw",
                power: {
                    id: 1,
                    type: "esp",
                    delayOff: 600,
                    ha: 8
                },
                transfer: {
                    type: "esp",
                    switchOn: [
                        { id: 4, state: true, delay: 10 },
                        { id: 16, state: true, delay: 5 },
                    ],
                    switchOff: [
                        { id: 16, state: false },
                        { id: 4, state: false, delay: 5 },
                    ],
                },
                espVolt: 27,
                voltsRun: 52.5,
                voltsStop: 52.0,
                // sunRun: 2.4,
                // sunStop: 2.0,
                ampsRun: 20.0,
                ampsStop: -5.0,
                // ampsRunFloat: 10.0,
                ampsStopFloat: -10.0,
                delaySwitch: 30,
                battery: 0,
            },
        ],
        sensor: {
            amp: [
                {
                    name: "battery_rs485_power2",
                    espID: 25,
                    multiplier: undefined,           // only devices with multiplier are sent to HA
                    zero: 5014,
                    rating: 500,
                    scale: 10000,
                    inverted: true
                },
            ],
            watt: [
                {
                    name: "battery_power",
                    sensorType: "esp",
                    sensor: undefined,
                    multiplier: undefined,      // only devices with multiplier, volt/amp, or combine options are sent to HA
                    sensorVoltType: "local",
                    sensorVolt: 0,              // for power computation based of V*A
                    sensorAmpType: "local",
                    sensorAmp: [0],             // for power computation based of V*A
                    combineESP: undefined,      // all combined ESP and Sensors will be added together
                    combineSensor: undefined,   // all combined ESP and Sensors will be added together
                    solarPower: false,          // special option to show negative power if battery reverse current is greater than inverter output current
                },
                {
                    name: "solar_power",
                    combineESP: [5, 14],        // the esp IDs for inverter amps
                    combineSensor: undefined,   // other inverter amp sensor types
                    solarPower: true,           // this is a solar power sensor
                    batteryWattType: "local",
                    batteryWatt: [0],           // must have battery watt sensor for Solar Power Calc
                    record: true
                },
                {
                    name: "inverter_power",     // all inverters
                    combineESP: [5, 14],        // the esp IDs for inverter amps
                    record: true
                },
            ],
            volt: [
                {
                    name: "battery_power1",
                    espID: 0,
                    multiplier: 20.33,          // only devices with multiplier are sent to HA
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
                charger: {
                    type: "esp",
                    switchOn: [
                        { id: 16, state: false },
                        { id: 4, state: false },
                        { id: 1, state: true },
                        { id: 17, state: true, delay: 20 },
                    ],
                    switchOff: [
                        { id: 17, state: false },
                        { id: 1, state: false, delay: 10 },
                    ],
                    ampExpected: 30,
                    ampGrid: undefined,
                    voltGrid: undefined,
                    voltStart: 51.3,
                    voltStop: 53.0,
                    topOffID: undefined,
                    sensorGrid: undefined,
                },
                sensorWattType: "local",
                sensorWatt: 0,                  // used for recorder
                sensorAmpType: "local",
                sensorAmp: [0],                 // must be an array
                sensorVoltType: "local",
                sensorVolt: 0,
                voltsFullCharge: 55.5,
                voltsFloatStop: 53.8,
                socTable: 0,
            },
        ],
        soc: [
            [
                { voltage: 55.6, percent: 100 },
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
            priority 2 - run pump from grid if at critical level
            runs pumps for 1hr every 24hours if at critical level 20%
     
            */
            function priorityAuto() {
                let volts = undefined, amps = undefined, sun = undefined;
                let config = cfg.solar.priority;
                if (time.epoch - st.priority.step >= 10) { pointers(); priorityCheck(); } else return;  // delay start of priority queue
                function priorityCheck() {
                    for (let x = config.queue.length - 1; x > -1; x--) {    // when priority is running
                        let queue = st.priority.queue[x], priority = config.queue[x];
                        if (queue.state == true || queue.state == null) {
                            //  console.log("checking x:" + x + " amps: " + amps);
                            if (priority.offVolts == undefined || priority.offVolts != undefined && volts > priority.offVolts) {
                                if (sun != undefined && priority.offSun != undefined) {
                                    if (sun <= priority.offSun) {
                                        if (queue.delayStep == false) {
                                            queue.delayTimer = time.epoch;
                                            queue.delayStep = true;
                                        } else if (time.epoch - queue.delayTimer >= config.delaySwitchOff) {
                                            log("sun is low (" + sun + "v) - stopping " + priority.name, index, 1);
                                            sendOutput(x, false);
                                            return;
                                        }
                                    } else queue.delayStep = false;
                                } else if (amps != undefined) {
                                    if (config.battery == undefined || priority.offAmpsFloat == undefined
                                        || nv.battery[config.battery].floating == false) {
                                        if (amps <= priority.offAmps) {
                                            if (queue.delayStep == false) {
                                                queue.delayTimer = time.epoch;
                                                queue.delayStep = true;
                                            } else if (time.epoch - queue.delayTimer >= config.delaySwitchOff) {
                                                log("charge amps is too low (" + amps + "a) - stopping " + priority.name, index, 1);
                                                sendOutput(x, false);
                                                return;
                                            }
                                        } else queue.delayStep = false;
                                    } else if (amps <= priority.offAmpsFloat) {
                                        if (queue.delayStep == false) {
                                            queue.delayTimer = time.epoch;
                                            queue.delayStep = true;
                                        } else if (time.epoch - queue.delayTimer >= config.delaySwitchOff) {
                                            log("(floating)discharge amps is high (" + amps + "a) - stopping " + priority.name, index, 1);
                                            sendOutput(x, false);
                                            return;
                                        }
                                    } else queue.delayStep = false;
                                } else queue.delayStep = false;
                            } else if (queue.delayStep == false) {
                                queue.delayTimer = time.epoch;
                                queue.delayStep = true;
                            } else if (time.epoch - queue.delayTimer >= config.delaySwitchOff) {
                                log("battery voltage is low (" + volts + "v) - stopping " + priority.name, index, 1);
                                sendOutput(x, false);
                                return;
                            }
                        }
                    }
                    for (let x = 0; x < config.queue.length; x++) {         // when priority is stopped
                        let queue = st.priority.queue[x], priority = config.queue[x];
                        if (priority.haAuto == undefined || state.ha[priority.haAuto] == true) {
                            if (queue.state == false || queue.state == null) {
                                if (priority.onVolts != undefined) {
                                    if (priority.inverter != undefined && st.inverter[priority.inverter].state == true
                                        || priority.inverter == undefined && st.inverter[0].state == true) {
                                        if (volts >= priority.onVolts) {
                                            if (sun != undefined && priority.onSun != undefined) {
                                                if (priority.offAmpsFloat == undefined || priority.offAmpsFloat != undefined
                                                    && nv.battery[config.battery].floating == true) {
                                                    //  console.log("checking sun: " + sun + " float:" + nv.battery[config.battery].floating)
                                                    if (sun >= priority.onSun) {
                                                        console.log("checking sun: " + sun + " float:" + nv.battery[config.battery].floating)
                                                        if (queue.delayStepSun == false) {
                                                            queue.delayTimerSun = time.epoch;
                                                            queue.delayStepSun = true;
                                                        } else if (time.epoch - queue.delayTimerSun >= config.delaySwitchOn) {
                                                            log("sun is high (" + sun + "v) - starting " + priority.name, index, 1);
                                                            sendOutput(x, true);
                                                            return;
                                                        }
                                                    } else queue.delayStepSun = false;
                                                }
                                            }
                                            if (amps != undefined) {
                                                if (amps >= priority.onAmps) {
                                                    if (queue.delayStep == false) {
                                                        queue.delayTimer = time.epoch;
                                                        queue.delayStep = true;
                                                    } else if (time.epoch - queue.delayTimer >= config.delaySwitchOn) {
                                                        log("charge amps is high (" + amps + "a) volts: " + volts + " on volts: "
                                                            + priority.onVolts + " - starting " + priority.name, index, 1);
                                                        sendOutput(x, true);
                                                        return;
                                                    }
                                                } else if (amps < priority.onAmps) queue.delayStep = false;
                                            } else {
                                                if (queue.delayStep == false) {
                                                    queue.delayTimer = time.epoch;
                                                    queue.delayStep = true;
                                                } else if (time.epoch - queue.delayTimer >= config.delaySwitchOn) {
                                                    log("battery volts is enough (" + volts + "v) - starting " + priority.name, index, 1);
                                                    sendOutput(x, true);
                                                    return;
                                                }
                                            }
                                        } else queue.delayStep = false;
                                        // } else if (volts >= priority.onVolts) queue.delayStep = false;
                                    }
                                }
                            }
                        }
                    }
                    function sendOutput(x, newState) {
                        let queue = st.priority.queue[x], priority = config.queue[x];
                        for (let y = 0; y < priority.devices.length; y++) {
                            if (priority.devices[y].includes("input_boolean"))
                                ha.send(priority.devices[y], newState);
                            else esp.send(priority.devices[y], newState);
                        }
                        cfg.inverter.forEach((_, y) => { st.inverter[y].delaySwitchStep = false });
                        config.queue.forEach((_, y) => { st.priority.queue[y].delayStep = false; queue.delayStepSun = false; });

                        queue.state = newState;
                        st.priority.step = time.epoch;
                    }
                }
                function pointers() {
                    volts = Math.round(st.sensor.volt[cfg.battery[config.battery].sensorVolt] * 100) / 100;
                    if (cfg.solar.espSunlight != undefined)
                        sun = Math.round(state.esp[cfg.solar.espSunlight] * 100) / 100;
                    if (config.battery != undefined) {
                        if (Array.isArray(cfg.battery[config.battery].sensorAmp)) {
                            let temp = 0;
                            for (let y = 0; y < cfg.battery[config.battery].sensorAmp.length; y++) {
                                temp += Math.round(st.sensor.amp[cfg.battery[config.battery].sensorAmp[y]] * 100) / 100;
                                amps = temp;
                            }
                        } else amps = Math.round(st.sensor.amp[cfg.battery[config.battery].sensorAmp] * 100) / 100;
                    }
                }
            }
            function inverterAuto() {
                for (let x = 0; x < cfg.inverter.length; x++) {         // initialize all inverter states
                    let { voltsBat, config, inverter } = pointers(x);
                    if (inverter.state == null || inverter.boot == false) {
                        if (cfg.inverter[x].power.ha != undefined) {
                            log("inverter: " + cfg.inverter[x].name + " - syncing HA power - state: " + state.ha[cfg.inverter[x].power.ha], index, 1);
                            if (state.ha[cfg.inverter[x].power.ha] == true) {
                                if (state.esp[config.transfer.switchOn[0].id] != config.transfer.switchOn[0].state) {
                                    log("inverter: " + cfg.inverter[x].name + " - state ATS OFF (" + state.esp[config.transfer.switchOn[0].id]
                                        + ") is not expected - HA says its ON", index, 2);
                                    inverterPower(x, true);
                                   // inverter.state = true;
                                } else inverter.state = true;
                            } else {
                                if (state.esp[config.transfer.switchOff[0].id] != config.transfer.switchOff[0].state) {
                                    log("inverter: " + cfg.inverter[x].name + " - state ATS ON (" + state.esp[config.transfer.switchOff[0].id]
                                        + ")is not expected - HA says its OFF", index, 2);
                                    inverter.state = false;
                                } else inverter.state = false;
                            }
                        }
                        inverter.delaySwitchStep = false;
                        inverter.delaySwitchVoltsStep = false;
                        inverter.delaySwitchFaultStep = false;
                        inverter.delaySwitchSunStep = false;
                        inverter.step = time.epoch - 20;
                        if (inverter.state == false) {
                            if (config.power.startAuto == true) {
                                if (voltsBat > config.voltsStop) {
                                    log("inverter: " + config.name + " - first start, volts is greater than stop volts, good to run", index, 1);
                                    inverterPower(x, true);
                                }
                            } else if (nv.battery[config.battery].floating == true) {
                                log("inverter: " + config.name + " - first start, battery is floating, good to run", index, 1);
                                inverterPower(x, true);
                            }
                        }
                        inverter.boot = true;
                    } else if (inverter.state == "faulted") {
                        if (voltsInverter <= config.voltsFloatStop) {
                            log("inverter: " + config.name + " - inverter was faulted but now resetting because charger is no longer floating", index, 2);
                            inverter.state = false;
                        }
                        if (cfg.solar.watts.inverterPower != undefined
                            && state.sensor.watt[cfg.solar.watts.inverterPower] >= config.watts.welder) {
                            log("inverter: " + config.name + " - inverter was faulted but now resetting because welding is detected", index, 2);
                            inverter.state = false;
                        }
                    }
                }
                for (let x = cfg.inverter.length - 1; x > -1; x--) {    // if inverter is running 
                    let { voltsBat, voltsInverter, ampsBat, sun, wattsInverter, config, inverter } = pointers(x);
                    if (inverter.state != "faulted" && inverter.state == true) {
                        if (inverterNightMode(x) == true) {
                            if (voltsBat < config.nightMode.startVoltageMin) {
                                log("inverter: " + config.name + " - Battery is too low to make it through the night: " + voltsBat + ", switching off", index, 1);
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
                                            log("inverter: " + config.name + " - Sun is low: " + sun + "  voltsBat: " + voltsBat + ", switching to grid ", index, 1);
                                            inverterPower(x, false);
                                            return;
                                        }
                                    } else inverter.delaySwitchStep = false;
                                } else if (config.ampsStop != undefined) {
                                    if (nv.battery[config.battery].floating == false) {
                                        if (ampsBat <= config.ampsStop) {
                                            if (config.ampsStopVoltsMin != undefined) {
                                                if (voltsBat < config.ampsStopVoltsMin) ampStop();
                                            } else ampStop();
                                        }
                                        else inverter.delaySwitchStep = false;
                                    } else {
                                        if (ampsBat <= inverter.ampsStopFloat) {
                                            if (config.ampsStopVoltsMin != undefined) {
                                                if (voltsBat < config.ampsStopVoltsMin) ampStop();
                                            } else ampStop();
                                        }
                                        else inverter.delaySwitchStep = false;
                                    }
                                }
                                function ampStop() {
                                    if (inverter.delaySwitchStep == false) {
                                        inverter.delaySwitchTimer = time.epoch;
                                        inverter.delaySwitchStep = true;
                                    } else if (time.epoch - inverter.delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                        log("inverter: " + config.name + " - solar power too low: " + ampsBat + "a  voltsBat: " + voltsBat
                                            + "v  Floating: " + nv.battery[config.battery].floating + " Sun: " + sun + "v  Watts: " + wattsInverter + ", switching to grid ", index, 1);
                                        inverterPower(x, false);
                                        inverter.switchWatts = wattsInverter;
                                        inverter.switchSun = sun;
                                        return;
                                    }
                                }
                            }
                        }
                        if (voltsBat <= config.voltsStop) {  // when battery is low
                            if (inverter.delaySwitchVoltsStep == false) {
                                inverter.delaySwitchVoltsTimer = time.epoch;
                                inverter.delaySwitchVoltsStep = true;
                            } else if (time.epoch - inverter.delaySwitchVoltsTimer >= cfg.solar.inverterDelaySwitch) {
                                log("inverter: " + config.name + " - Battery is low: " + voltsBat + ", is switching to grid ", index, 1);
                                inverterPower(x, false);
                                return;
                            }
                        } else inverter.delaySwitchVoltsStep = false;
                        if (inverter.nightMode == true && time.hour >= config.nightMode.endHour
                            && time.hour < config.nightMode.startHour) {
                            if (config.nightMode.endAmps != undefined) {
                                if (ampsBat >= config.nightMode.endAmps) {
                                    log("inverter: " + config.name + " - Battery is charging, current is high: " + ampsBat + "a  " + voltsBat + "v, exiting night mode", index, 1);
                                    inverter.nightMode = false;
                                }
                            } else checkCharging(x, false, voltsBat); // inverter only exits night mode only when there is sufficient charging
                        }
                        if (voltsInverter < 20) {
                            if (inverter.delaySwitchFaultStep == false) {
                                inverter.delaySwitchFaultTimer = time.epoch;
                                inverter.delaySwitchFaultStep = true;
                            } else if (time.epoch - inverter.delaySwitchFaultTimer >= 10) {
                                //   log("inverter: " + config.name + " has faulted - no output - Inverter Auto is shutting down ", index, 3);
                                //    if (cfg.solar.inverterAuto != undefined) ha.send(cfg.ha[cfg.solar.inverterAuto], false);
                                log("inverter: " + config.name + " - FAULT - no output - Inverter is going offline ", index, 3);
                                inverter.state = "faulted";
                                inverterPower(x, false);
                                return;
                            }
                        } else inverter.delaySwitchFaultStep = false;
                    }
                }
                for (let x = 0; x < cfg.inverter.length; x++) {         // when inverter is off
                    let { voltsBat, voltsInverter, config, inverter } = pointers(x);
                    if (cfg.battery[config.battery].sensorVolt != undefined) {
                        if (inverter.state != "faulted" && inverter.state === false) {
                            checkCharging(x, true);
                            if (inverterNightMode(x) == true) {
                                if (voltsBat >= config.nightMode.startVoltageMin) {
                                    log("Battery is enough to make it through the night: " + voltsBat + ", " + config.name + " switching on", index, 1);
                                    inverterPower(x, true);
                                } else log("Battery is too low to make it through the night: " + voltsBat + ", " + config.name + " staying off", index, 1);
                            }
                            if (config.blackout == true && st.grid.state == false && voltsBat >= config.blackoutVoltMin) {
                                log("Blackout detected, volts is enough to run: " + voltsBat + ", " + config.name + " switching on", index, 2);
                                inverterPower(x, true);
                            }
                            if (config.power.id != undefined && state.esp[config.power.id] == false && inverter.delayOffTimer == null
                                && time.epoch - inverter.timeShutdown > 10 && inverter.warn.manualPowerOn == false && voltsInverter > 20.0) {
                                log("inverter: " + config.name + " is still on but should be off - manual power on??", index, 2);
                                inverter.warn.manualPowerOn = true;
                            }
                        }
                    }
                }
                function checkCharging(x, power) {
                    let { voltsBat, ampsBat, wattsGrid, wattsSolar, sun, config, inverter } = pointers(x);
                    if (voltsBat >= config.voltsRun) {
                        if (nv.battery[config.battery].floating == true && config.floatRetrySun == true) {
                            let match = false;
                            for (let y = 0; y < cfg.solar.sun.length; y++)
                                if (sun >= cfg.solar.sun[y].volts && wattsGrid < cfg.solar.sun[y].watts) {
                                    if (inverter.delaySwitchSunStep == false) {
                                        inverter.delaySwitchSunTimer = time.epoch;
                                        inverter.delaySwitchSunStep = true;
                                    } else if (time.epoch - inverter.delaySwitchSunTimer >= cfg.solar.inverterDelaySwitch) {
                                        log("inverter: " + config.name + " - battery is floating, sun is enough: " + sun + "v  Power: " + wattsGrid + ", switching on", index, 1);
                                        finish();
                                        return;
                                    }
                                    match = true;
                                } else match = false;
                            if (match == false) inverter.delaySwitchSunStep = false;
                        }
                        if (config.sunRun != undefined) {
                            if (sun >= config.sunRun) {     // sunlight detection 
                                if (inverter.delaySwitchStep == false) {
                                    inverter.delaySwitchTimer = time.epoch;
                                    inverter.delaySwitchStep = true;
                                } else if (time.epoch - inverter.delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                    log("inverter: " + config.name + " - battery is charging, sun is high: " + voltsBat + ", switching on", index, 1);
                                    finish();
                                }
                            } else if (sun < config.sunRun) inverter.delaySwitchStep = false;
                        } else if (config.ampsRun != undefined) {
                            // console.log("checking amps for: " + x + "  ampsBat: " + ampsBat, " voltsBat: " + voltsBat)
                            if (ampsBat >= config.ampsRun) {   // current detection 
                                if (inverter.delaySwitchStep == false) {
                                    inverter.delaySwitchTimer = time.epoch;
                                    inverter.delaySwitchStep = true;
                                } else if (time.epoch - inverter.delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                    log("inverter: " + config.name + " - battery is charging, current is high: " + ampsBat + "a  " + voltsBat + "v, switching on", index, 1);
                                    finish();
                                }
                            } else if (ampsBat < config.ampsRun) inverter.delaySwitchStep = false;
                        } else if (config.espWattGrid != undefined) {
                            if (wattsSolar > ((wattsGrid * config.ampsStartGridMultiplier))) {
                                if (inverter.delaySwitchStep == false) {
                                    inverter.delaySwitchTimer = time.epoch;
                                    inverter.delaySwitchStep = true;
                                } else if (time.epoch - inverter.delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                    log("inverter: " + config.name + " - charge current is higher than grid power: " + wattsSolar + "w  " + voltsBat + "v, switching on", index, 1);
                                    finish();
                                }
                            }
                            if (wattsSolar <= (wattsGrid
                                + (wattsGrid * config.ampsStartGridMultiplier))) { inverter.delaySwitchStep = false; }
                        } else {
                            if (inverter.delaySwitchStep == false) {
                                inverter.delaySwitchTimer = time.epoch;
                                inverter.delaySwitchStep = true;
                            } else if (time.epoch - inverter.delaySwitchTimer >= cfg.solar.inverterDelaySwitch) {
                                log("inverter: " + config.name + " - battery is charging: " + voltsBat + ", switching on", index, 1);
                                finish();
                            }
                        }
                    } else if (voltsBat < config.voltsRun) inverter.delaySwitchStep = false;
                    function finish() {
                        if (inverter.nightMode == true) {
                            log("inverter: " + config.name + " - exiting night mode", index, 1);
                            inverter.nightMode = false;
                        }
                        if (power == true) inverterPower(x, true);
                    }
                }
                function pointers(x) {
                    let voltsBat, voltsInverter, ampsBat, sun, wattsInverter, wattsGrid, wattsSolar, config = cfg.inverter[x];
                    if (config.battery != undefined) {
                        if (cfg.battery[config.battery].sensorVolt != undefined)
                            voltsBat = Math.round(st.sensor.volt[cfg.battery[config.battery].sensorVolt] * 10) / 10;
                        if (cfg.battery[config.battery].sensorAmp != undefined) {
                            if (Array.isArray(cfg.battery[config.battery].sensorAmp)) {
                                let temp = 0;
                                for (let y = 0; y < cfg.battery[config.battery].sensorAmp.length; y++) {
                                    temp += parseFloat(st.sensor.amp[cfg.battery[config.battery].sensorAmp[y]]);
                                    ampsBat = Math.round(temp * 10) / 10;
                                }
                            } else ampsBat = Math.round(st.sensor.amp[cfg.battery[config.battery].sensorAmp] * 10) / 10;
                        }
                        if (cfg.battery[config.battery].sensorWatt != undefined)
                            wattsSolar = ~~parseFloat(st.sensor.watt[cfg.battery[config.battery].sensorWatt]);
                    }
                    if (config.espWattGrid != undefined)
                        wattsGrid = state.esp[config.espWattGrid];
                    if (config.espVolt != undefined)
                        voltsInverter = ~~parseFloat(state.esp[config.espVolt]);
                    if (config.espWatt != undefined)
                        wattsInverter = ~~parseFloat(state.esp[config.espWatt]);
                    if (cfg.solar.espSunlight != undefined)
                        sun = Math.round(state.esp[cfg.solar.espSunlight] * 100) / 100;
                    return { voltsBat, voltsInverter, ampsBat, sun, wattsInverter, wattsGrid, wattsSolar, config, inverter: st.inverter[x] };
                }
            }
            function inverterNightMode(x) {
                let nightMode = null, config = cfg.inverter[x];
                if (config.nightMode != undefined && config.nightMode.enable == true) {                     // undefined config returns false
                    if (time.hour == config.nightMode.startHour) {   // if nightMode match
                        if (config.nightMode.startMin != undefined) {
                            if (time.min >= config.nightMode.startMin) { nightMode = true; }
                        } else { nightMode = true; }
                    }
                    else if (time.hour > config.nightMode.startHour || time.hour < config.nightMode.endHour) { nightMode = true; }
                    else nightMode = false;
                } else nightMode = false;
                if (nightMode == true) {
                    if (st.inverter[x].nightMode == false) {
                        log("inverter: " + config.name + " - activating night mode", index, 1);
                        st.inverter[x].nightMode = true;
                        return true;
                    } else return false;
                } else return false;
            }
            function inverterPower(x, run, faulted) {
                let config = cfg.inverter[x];
                function toggle() {
                    let list;
                    if (run) list = config.transfer.switchOn; else list = config.transfer.switchOff;
                    for (let y = 0; y < list.length; y++) {
                        setTimeout(() => {
                            log("inverter: " + config.name + " - intention: " + run + ", transferring ATS switch "
                                + y + " - state: " + list[y].state, index, 1);
                            esp.send(cfg.esp[list[y].id], list[y].state);
                        }, ((list[y].delay == undefined) ? 0 : (list[y].delay * 1e3)));
                    }
                    if (cfg.inverter[x].power.ha != undefined) ha.send(cfg.ha[cfg.inverter[x].power.ha], run);
                }
                if (run == true) {
                    if (time.epoch - st.inverter[x].step >= cfg.solar.inverterRapidSwitch) {
                        if (config.power.id == undefined) {
                            log("inverter: " + config.name + " - transferring switches to inverter - wait", index, 1);
                            toggle(run);
                        } else {
                            if (state.esp[config.power.id] == false) {
                                esp.send(cfg.esp[config.power.id], run);
                                log("inverter: " + config.name + " - power on, delaying transfer switch 10 secs", index, 1);
                                toggle(run);
                            } else {
                                log("inverter: " + config.name + " - already on - clearing shutdown delay", index, 1);
                                clearTimeout(st.inverter[x].delayOffTimer);
                                st.inverter[x].delayOffTimer = null;
                                log("inverter: " + config.name + " - transferring switches to inverter - wait", index, 1);
                                toggle(run);
                            }
                        }
                        st.inverter[x].state = true;
                        st.inverter[x].delaySwitchFaultStep = false;
                        setTimeout(() => { st.inverter[x].delaySwitchFaultStep = false }, 5e3);
                    } else {
                        log("inverter: " + config.name + " - cycling too frequently, epoch: "
                            + time.epoch + " step:" + st.inverter[x].step + " - inverter auto shutting down", index, 3);
                        // st.inverter[x].state = false;
                        ha.send(cfg.solar.inverterAuto, false);
                        inverterPower(x, false);
                    }
                } else {
                    if (config.power.id == undefined) {
                        log("inverter: " + config.name + " - transferring switches to grid - wait", index, 1);
                        toggle(run);
                    } else {
                        log("inverter: " + config.name + " - transferring switches to grid - wait", index, 1);
                        toggle(run);
                        if (config.power.delayOff == undefined) {
                            log("inverter: " + config.name + ", power off", index, 1);
                            st.inverter[x].delayOffTimer = setTimeout(() => {
                                esp.send(cfg.esp[config.power.id], run);
                                st.inverter[x].delayOffTimer = null;
                            }, 10e3);
                        } else {
                            log("inverter: " + config.name + " - shutdown will delay by:" + config.power.delayOff + " seconds", index, 1);
                            st.inverter[x].delayOffTimer = setTimeout(() => {
                                log("inverter: " + config.name + " - shutdown was delayed, now powering off", index, 1);
                                esp.send(cfg.esp[config.power.id], run);
                                st.inverter[x].delayOffTimer = null;
                                st.inverter[x].timeShutdown = time.epoch;
                            }, config.power.delayOff * 1000);
                        }
                    }
                    if (!faulted) st.inverter[x].state = false;
                    st.inverter[x].step = time.epoch;
                }
                st.inverter[x].delaySwitchStep = false;
                st.inverter[x].delaySwitchVoltsStep = false;
                st.inverter[x].delaySwitchFaultStep = false;
                st.inverter[x].delaySwitchSunStep = false;
                cfg.inverter.forEach((_, y) => { st.inverter[y].delaySwitchStep = false });
                cfg.solar.priority.queue.forEach((_, y) => { st.priority.queue[y].delayStep = false });
            }
            function checkRoomTemp() {  // called by setTimeout every 1 sec 
                let config = cfg.fan, fan = st.fan, wattsBat,
                    wattsInv = Math.round(st.sensor.watt[config.sensor.watt.inverter]),
                    temp = Math.round(st.sensor.temp[config.sensor.temp] * 10) / 10,
                    tempUnit = cfg.sensor.temp[config.sensor.temp].unit;
                if (Math.sign(st.sensor.watt[config.sensor.watt.battery]) == -1)
                    wattsBat = (Math.round(st.sensor.watt[config.sensor.watt.battery]) * -1);
                else wattsBat = Math.round(st.sensor.watt[config.sensor.watt.battery]);
                switch (fan.run) {
                    case false:
                        if (temp >= config.temp.on) {
                            log("room temp is rising, fan turning on: " + temp + tempUnit, index, 1);
                            fanSwitchNow();
                            fan.warn = true;
                            return;
                        }
                        if (config.sun != undefined) {
                            if (state.esp[cfg.solar.espSunlight] >= config.sun.on) {
                                if (fanSwitch(true)) {
                                    log("sun is high: " + state.esp[cfg.solar.espSunlight] + ", fan turning on: " + temp + tempUnit, index, 1);
                                    return;
                                }
                            } else fan.delayStep = false;
                        } else if (config.watts != undefined) {
                            if (config.watts.night != undefined && st.inverter[0].nightMode == true) {
                                if (wattsBat >= config.watts.night.on) {
                                    if (fanSwitch(true)) {
                                        log("(nightmode) battery power is rising: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning on ", index, 1);
                                        return;
                                    }
                                }
                                if (wattsInv >= config.watts.night.on) {
                                    if (fanSwitch(true)) {
                                        log("(nightmode) inverter power is rising: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning on ", index, 1);
                                        return;
                                    }
                                }
                                if (wattsBat < config.watts.night.on && wattsInv < config.watts.night.on) fan.delayStep = false;
                            } else {
                                if (wattsBat >= config.watts.on) {
                                    if (fanSwitch(true)) {
                                        log("battery power is rising: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning on ", index, 1);
                                        return;
                                    }
                                }
                                if (wattsInv >= config.watts.on) {
                                    if (fanSwitch(true)) {
                                        log("inverter power is rising: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning on ", index, 1);
                                        return;
                                    }
                                }
                                if (wattsBat < config.watts.on && wattsInv < config.watts.on) fan.delayStep = false;
                            }
                        }
                        if (temp < config.temp.on) fan.delayStep = false;
                        break;
                    case true:
                        if (config.sun != undefined) {
                            if (state.esp[cfg.solar.espSunlight] <= config.sun.off) {
                                if (fanSwitch(false)) {
                                    log("room has cooled down and sun is low, fan turning off: " + temp + tempUnit, index, 1);
                                    return;
                                }
                            } else fan.delayStep = false;
                        } else if (config.watts != undefined && temp <= config.temp.off) {
                            if (config.watts.night != undefined && st.inverter[0].nightMode == true) {
                                if (wattsBat <= config.watts.night.off) {
                                    if (fanSwitch(false)) {
                                        log("(nightmode) battery power has lowered: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning off ", index, 1);
                                        return;
                                    }
                                }
                                if (wattsInv <= config.watts.night.off) {
                                    if (fanSwitch(false)) {
                                        log("(nightmode) inverter power has lowered: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning off ", index, 1);
                                        return;
                                    }
                                }
                                if (wattsBat > config.watts.night.off && wattsInv > config.watts.night.off) fan.delayStep = false;
                            } else {
                                if (wattsBat <= config.watts.off) {
                                    if (fanSwitch(false)) {
                                        log("battery power has lowered: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning off ", index, 1);
                                        return;
                                    }
                                }
                                if (wattsInv <= config.watts.off) {
                                    if (fanSwitch(false)) {
                                        log("inverter power has lowered: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning off ", index, 1);
                                        return;
                                    }
                                }
                                if (wattsBat > config.watts.off && wattsBat > config.watts.off) fan.delayStep = false;
                            }
                        } else {
                            if (temp <= config.temp.off) {
                                if (fanSwitch(false)) {
                                    log("room has cooled, fan turning off: " + temp + tempUnit, index, 1);
                                    return;
                                }
                            } else fan.delayStep = false;
                        }
                        break;
                    case null:
                        fan.run = state.esp[config.espPower];
                        log("syncing fan state: " + fan.run, index, 1);
                        break;
                }
                if (temp >= config.temp.warn && fan.warn == false) {
                    log("room is starting to overheat: " + temp
                        + tempUnit, index, 2);
                    fanSwitchNow();
                    fan.warn = true;
                    return;
                }
                if (temp >= config.temp.error && fan.error == false) {
                    log("room is overheating!!!: " + temp
                        + tempUnit, index, 3);
                    fanSwitchNow();
                    fan.warn = true;
                    return;
                }
                if (time.epochMin - fan.faultStep >= config.refaultMin) {
                    fan.error = false;
                    fan.warn = false;
                    fan.faultStep = time.epochMin;
                }
                function fanSwitchNow() {
                    esp.send(cfg.esp[config.espPower], true);
                    fan.run = true;
                    fan.faultStep = time.epochMin;
                }
                function fanSwitch(newState) {
                    if (fan.delayStep == false) {
                        fan.delayTimer = time.epoch;
                        fan.delayStep = true;
                    } else if (newState == true) {
                        if (time.epoch - fan.delayTimer >= config.delayOn) {
                            fan.run = newState;
                            esp.send(cfg.esp[config.espPower], newState);
                            fan.delayStep = false;
                            return true;
                        }
                    } else if (time.epoch - fan.delayTimer >= config.delayOff) {
                        fan.run = newState;
                        esp.send(cfg.esp[config.espPower], newState);
                        fan.delayStep = false;
                        return true;
                    }
                }
            }
            function checkGrid() {
                // global function to give h m s?
                // log grid blackout statistics
                // log sunlight daily index
                // grid statistics , save to nv
                let volts = ~~parseFloat(state.esp[cfg.grid.espVoltage]), config = cfg.grid, grid = st.grid;
                if (time.boot > 10) {
                    if (volts >= config.voltMax) {
                        if (grid.state != false) {
                            log("grid over-voltage: " + volts + "v", index, 2);
                            blackout();
                        } else grid.delayOn = time.epoch;
                    } else if (volts < config.voltMin && volts > 20.0) {
                        if (grid.state != false) {
                            log("grid under-voltage: " + volts + "v", index, 2);
                            blackout();
                        } else grid.delayOn = time.epoch;
                    } else if (volts < 20.0 || Number.isFinite(volts) == false) {
                        if (grid.state != false) {
                            log("grid blackout: " + volts + "  raw: " + state.esp[cfg.grid.espVoltage], index, 2);
                            blackout();
                        } else grid.delayOn = time.epoch;
                    } else if (grid.state == null) {
                        log("grid is online: " + volts + "v", index, 1);
                        grid.state = true;
                    } else if (grid.state == false) {
                        if (time.epoch - grid.delayOn >= config.delayRecover) {
                            let outage = (time.epoch - st.grid.timerBlackout);
                            log("grid back online: " + volts + "v,  offline for: " + outage + "s", index, 2);
                            grid.state = true;
                        }
                    }
                }
                function blackout() {
                    st.grid.timerBlackout = time.epoch;
                    grid.state = false;
                    grid.delayOn = time.epoch;
                }
            }
            function checkWelder() {    // needs to be rewritten for  cfg.inverter.sensorAmps or esp direct
                if (state.esp[cfg.inverter[0].espPower] >= cfg.inverter[0].welderWatts ||  // check inverter meter
                    state.esp[cfg.grid.espPower] >= cfg.inverter[0].welderWatts) {           // check grid meter
                    st.welderStep = time.epoch;                   // extend welter timeout if still heavy loads
                    if (st.welder == false) {
                        log("welder detected: " + state.esp[cfg.inverter[0].espPower] + "w - shutting down all pumps", index, 2);
                        st.welder = true;
                        st.priority[0] = false;
                        ha.send("input_boolean.auto_compressor", false);
                        ha.send("input_boolean.auto_pump_transfer", false);
                        //    esp.send("uth-relay1", false);
                        // turn on fan
                    }
                } else {
                    if (st.welder == true && time.epoch - st.welderStep >= cfg.inverter[0].welderTimeout) {
                        log("welder not detected: " + state.esp[cfg.inverter[0].espPower] + "w", index, 1);
                        st.welder = false;
                    }
                }
            }
            function checkBattery() {
                for (let x = 0; x < cfg.battery.length; x++) {
                    let config = cfg.battery[x], bat = st.battery[x];
                    volts = Math.round(st.sensor.volt[config.sensorVolt] * 100) / 100;
                    if (nv.battery[x].floating == null) {
                        if (volts <= config.voltsFullCharge && volts > config.voltsFloatStop) {
                            log("battery charger is floating: " + volts + "v", index, 1);
                            nv.battery[x].cycles++;
                            nv.battery[x].floating = true;
                        }
                        else nv.battery[x].floating = false
                    }
                    if (nv.battery[x].floating == false && volts >= config.voltsFullCharge) {
                        log("battery charger is floating: " + volts + "v", index, 1);
                        nv.battery[x].cycles++;
                        nv.battery[x].floating = true;
                    }
                    if (nv.battery[x].floating == true) {       // consider blocking this until nighttime or some other criteria 
                        if (volts <= config.voltsFloatStop) {
                            if (bat.floatStep == false) {
                                bat.floatTimer = time.epoch;
                                bat.floatStep = true;
                            } else if (time.epoch - bat.floatTimer >= 30) {
                                log("battery charger is no longer floating: " + volts + "v", index, 1);
                                nv.battery[x].floating = false;
                            }
                        } else bat.floatStep = false;
                    }
                    bat.percent = voltPercent(volts, config);
                    ha.send("battery_" + config.name, bat.percent, "%");
                    if (config.sensorWatt != undefined) {
                        if (Number.isFinite(st.sensor.watt[x])) {
                            if (Math.sign(st.sensor.watt[x]) == -1) bat.whNeg += st.sensor.watt[x];
                            else bat.whPos += st.sensor.watt[x];
                        }
                        if (bat.min == null) {
                            log("starting recorder for battery - " + config.name, index, 1);
                            bat.min = time.min;
                        }
                        if (time.min != bat.min) {
                            let charge = (bat.whPos / 60 / 60), discharge = (bat.whNeg / 60 / 60) * -1;
                            recorder(nv.battery[x].history.charge, charge, "battery_" + config.name + "_charge");
                            recorder(nv.battery[x].history.discharge, discharge, "battery_" + config.name + "_discharge");
                            nv.battery[x].today.charge += charge;
                            nv.battery[x].today.discharge += discharge;
                            nv.battery[x].total.charge += charge;
                            nv.battery[x].total.discharge += discharge;
                            ha.send("battery_" + config.name + "_charge_today", (Math.round((nv.battery[x].today.charge / 1000) * 10) / 10), "KWh");
                            ha.send("battery_" + config.name + "_discharge_today", (Math.round((nv.battery[x].today.discharge / 1000) * 10) / 10), "KWh");
                            ha.send("battery_" + config.name + "_charge_total", Math.round(nv.battery[x].total.charge / 1000), "KWh");
                            ha.send("battery_" + config.name + "_discharge_total", Math.round(nv.battery[x].total.discharge / 1000), "KWh");
                            ha.send("battery_" + config.name + "_cycles", nv.battery[x].cycles, "x");
                            bat.whPos = 0;
                            bat.whNeg = 0;
                            bat.min = time.min;
                            if (time.hour == 4 && time.min == 0) nv.battery[x].today.charge = 0;
                            if (time.hour == 16 && time.min == 0) nv.battery[x].today.discharge = 0;
                            let ceff = 0, deff = 0;
                            for (let y = 0; y < nv.battery[x].history.charge.day.length; y++)
                                ceff += nv.battery[x].history.charge.day[y];
                            for (let y = 0; y < nv.battery[x].history.discharge.day.length; y++)
                                deff += nv.battery[x].history.discharge.day[y];
                            ha.send("battery_" + config.name + "_efficiency", Math.round(((ceff / deff) * 100) * 10) / 10, "%");
                        }
                    }
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
                            return Math.round(percent * 10) / 10;
                        }
                    }
                }
            }
            function calcSensor() {     // calc watts based on amp/volt sensors 
                for (let x = 0; x < cfg.sensor.watt.length; x++) {
                    let sumESP = 0, sumSensor = 0, config = cfg.sensor.watt[x];
                    if (config.espID == undefined && config.sensorAmp != undefined && config.sensorVolt != undefined) {
                        let amps = 0, volts = 0;
                        if (config.sensorAmpType == "local")
                            for (let y = 0; y < config.sensorAmp.length; y++) amps += st.sensor.amp[config.sensorAmp[y]];
                        if (config.sensorVoltType == "local") volts = st.sensor.volt[config.sensorVolt];
                        if (Number.isFinite(volts * amps)) st.sensor.watt[x] = volts * amps;
                        else (st.sensor.watt[x] = 0.0);
                        ha.send("watt_" + config.name, ~~st.sensor.watt[x], "W");
                    } else {
                        if (config.combineESP != undefined)
                            for (let y = 0; y < config.combineESP.length; y++) {
                                if (Number.isFinite(state.esp[config.combineESP[y]]))
                                    sumESP += state.esp[config.combineESP[y]]
                            }
                        if (config.combineSensor != undefined)
                            for (let y = 0; y < config.combineSensor.length; y++)
                                sumSensor += st.sensor.watt[config.combineSensor[y]];
                        if (config.solarPower == true) {
                            let batWatts = 0;
                            if (config.batteryWattType == "local")
                                for (let y = 0; y < config.batteryWatt.length; y++) batWatts += st.sensor.watt[config.batteryWatt[y]];
                            if (Math.sign(batWatts) == -1 && batWatts <= ((sumESP + sumSensor) * -1)) {
                                ha.send("watt_" + config.name, 0, "W");
                            } else {
                                if (Number.isFinite(batWatts)) st.sensor.watt[x] = batWatts + sumSensor + sumESP;
                                ha.send("watt_" + config.name, ~~(batWatts + sumSensor + sumESP), "W");
                            }
                        } else {
                            st.sensor.watt[x] = sumSensor + sumESP;
                            ha.send("watt_" + config.name, ~~(sumSensor + sumESP), "W");
                        }
                    }
                    if (config.record == true) {
                        if (Number.isFinite(st.sensor.watt[x]) && Math.sign(st.sensor.watt[x]) != -1)
                            st.sensor.recorder.watt[x].wh += st.sensor.watt[x];
                        if (st.sensor.recorder.watt[x].min == null) {
                            log("starting recorder for watt sensor - " + config.name, index, 1);
                            st.sensor.recorder.watt[x].min = time.min;
                        } else if (time.min != st.sensor.recorder.watt[x].min) {
                            let whFinal = ((st.sensor.recorder.watt[x].wh / 60) / 60);
                            nv.sensor.watt[x].total += whFinal;
                            recorder(nv.sensor.watt[x], whFinal, config.name);
                            st.sensor.recorder.watt[x].wh = 0;
                            st.sensor.recorder.watt[x].min = time.min;
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
                                if (st.sensor.amp[x] != null && Number.isFinite(st.sensor.amp[x])) {
                                    ha.send("amp_" + cfg.sensor.amp[x].name, Math.round(st.sensor.amp[x] * 10) / 10, "A");
                                }

                        });
                    });
                    cfg.sensor.volt.forEach((_, x) => {
                        em.on(cfg.esp[cfg.sensor.volt[x].espID], (data) => {
                            clearTimeout(timerSensorTimeout.volt[x]);
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
                                if (st.sensor.volt[x] != null && Number.isFinite(st.sensor.volt[x]))
                                    ha.send("volt_" + cfg.sensor.volt[x].name, Math.round(final * 100) / 100, "V");
                            } else if (cfg.sensor.volt[x].multiplier != undefined) {    // standard multiplies
                                st.sensor.volt[x] = voltage * cfg.sensor.volt[x].multiplier;
                                if (st.sensor.volt[x] != null && Number.isFinite(st.sensor.volt[x]))
                                    ha.send("volt_" + cfg.sensor.volt[x].name, Math.round(st.sensor.volt[x] * 100) / 100, "V");
                            } else st.sensor.volt[x] = voltage;                         // no multiplier
                            timerSensorTimeout.volt[x] = setTimeout(() => {
                                log("volt sensor " + cfg.sensor.volt[x].name + " is offline", index, 2);
                                //    ha.send("volt_" + cfg.sensor.volt[x].name, null, "V");
                            }, 3e3);
                        });
                    });
                    cfg.sensor.watt.forEach((e, x) => {
                        if (e.sensor != undefined)
                            em.on(cfg.esp[e.espID], (data) => {
                                let newData;
                                if (e.multiplier != undefined) newData = parseFloat(data) * e.multiplier;
                                else newData = parseFloat(data);
                                if (Number.isFinite(st.sensor.watt[x])) {
                                    st.sensor.watt[x] = newData;
                                    ha.send("watt_" + e.name, ~~st.sensor.watt[x], "W");
                                } st.sensor.watt[x] = 0.0;
                            });
                    });
                    cfg.sensor.kwh.forEach((_, x) => {
                        em.on(cfg.esp[cfg.sensor.kwh[x].espID], (data) => {
                            let newData = parseInt(data);
                            if (Number.isFinite(newData)) {
                                if (Math.sign(newData) == -1) {
                                    //    log("Pzam KWh meter is negative - data: " + data + "  parsed data: " + newData, index, 2);
                                } else {
                                    let diff = 0;
                                    if (newData > 0 && newData <= 9999999) {
                                        if (nv.sensor.kwh[x].total == 0) {
                                            log("sensor: " + cfg.sensor.kwh[x].name + " first time recording", index, 1);
                                            nv.sensor.kwh[x].total = newData;
                                        }
                                        if (st.sensor.kwh[x].last == 0) st.sensor.kwh[x].last = newData;
                                        else {
                                            diff = newData - st.sensor.kwh[x].last;
                                            st.sensor.kwh[x].last = newData;
                                            if (Math.sign(diff) == -1) {
                                                //     log("Pzam KWh meter: " + x + " difference is negative - parsed data: " + newData
                                                //            + "  old NV reading: " + nv.sensor.kwh[x].total + "  diff: " + diff + "  raw: " + data, index, 0);
                                            } else {
                                                recorder(nv.sensor.kwh[x], diff, cfg.sensor.kwh[x].name);
                                                if (diff > 0) nv.sensor.kwh[x].total += diff;
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    });
                    cfg.sensor.temp.forEach((_, x) => {
                        em.on(cfg.esp[cfg.sensor.temp[x].espID], (data) => {
                            if (cfg.sensor.temp[x].multiplier != undefined) {
                                st.sensor.temp[x] = parseFloat(data) * cfg.sensor.temp[x].multiplier;
                                if (st.sensor.temp[x] != null && Number.isFinite(st.sensor.temp[x]))
                                    ha.send("temp_" + cfg.sensor.temp[x].name, Math.round(st.sensor.temp[x] * 10) / 10, cfg.sensor.temp[x].unit);
                            }
                            else st.sensor.temp[x] = parseFloat(data);
                        });
                    });
                }
                em.on(cfg.ha[cfg.solar.inverterAuto], (newState) => {
                    if (newState == true) log("inverter auto going online", index, 1);
                    else log("inverter auto going offline", index, 1);
                });
                for (let x = 0; x < cfg.inverter.length; x++) {
                    em.on(cfg.ha[cfg.inverter[x].power.ha], (newState) => {   // keep inverter state synced to automation state
                        if (st.inverter[x].state != "faulted" && st.inverter[x].state != newState) {
                            log("inverter: " + cfg.inverter[x].name + " - HA power state switching to " + newState, index, 1);
                            st.inverter[x].state = newState;
                            inverterNightMode(x);
                            inverterPower(x, newState);
                            st.inverter[x].warn.manualPowerOn = false;
                        }
                    });
                }
                for (let x = 0; x < cfg.solar.priority.queue.length; x++) {
                    let queue = cfg.solar.priority.queue[x];
                    em.on(cfg.ha[queue.haAuto], (newState) => {
                        if (newState == true) log("solar automation priority " + queue.name + " going online", index, 1);
                        else log("solar automation priority " + queue.name + " going offline", index, 1);
                    });
                    for (let y = 0; y < cfg.ha.length; y++) {
                        if (queue.devices[0] == cfg.ha[y]) {
                            em.on(cfg.ha[y], (newState) => {
                                log("syncing priority queue: " + queue.name + "  with new entity state: " + newState, index, 1);
                                st.priority.queue[x].state = newState;
                                st.priority.step = time.epoch;
                                // should add something to turn all queue devices off or remove device array and make single, hard to manage that
                            });
                            log("syncing priority queue: " + queue.name + "  with entity: " + cfg.ha[y] + " - and state: " + state.ha[y], index, 1);
                            st.priority.queue[x].state = state.ha[y];
                            st.priority.step = time.epoch;
                        }
                    }
                }
            }
            function init() {
                timerSensorTimeout = { amp: [], volt: [], watt: [] };
                state.auto.push({                                           // create object for this automation, 
                    name: "Solar",                                          // give this automation a name 
                    priority: { step: time.epoch, queue: [], },
                    inverter: [],
                    battery: [],
                    grid: { state: null, delayOn: time.epoch, timerBlackout: time.epoch, voltOver: false, },
                    fan: { run: null, delayStep: false, delayTimer: time.epoch, warn: false, error: false, faultStep: time.epochMin },
                    sensor: { amp: [], volt: [], watt: [], temp: [], kwh: [], recorder: { watt: [] } },
                    welder: { detect: false, step: null },
                });
                initNV();
                cfg.inverter.forEach(_ => {
                    state.auto[index].inverter.push({
                        state: null, boot: false, step: time.epoch - 20, nightMode: false, delayOffTimer: undefined, switchWatts: 0, switchSun: 0,
                        delaySwitchTimer: time.epoch, delaySwitchStep: false, delaySwitchVoltsTimer: time.epoch, delaySwitchVoltsStep: false,
                        delaySwitchSunTimer: time.epoch, delaySwitchSunStep: false, delaySwitchFaultStep: false, delaySwitchFaultTimer: time.epoch,
                        timeShutdown: null,
                        warn: {
                            manualPowerOn: false,
                        }
                    });
                });
                cfg.solar.priority.queue.forEach(_ => {
                    state.auto[index].priority.queue.push({ state: null, delayStep: false, delayStepSun: false, delayTimer: time.epoch, delayTimerSun: time.epoch })
                });
                cfg.battery.forEach(_ => {
                    state.auto[index].battery.push({ percent: null, min: null, whPos: 0, whNeg: 0, floatStep: false, floatTimer: null })
                });
                setTimeout(() => {
                    setInterval(() => {
                        calcSensor(); checkBattery(); checkGrid();
                        if (state.ha != undefined && state.ha[cfg.solar.inverterAuto] == true) {
                            inverterAuto();
                            if (st.welder.detect == false) priorityAuto();
                        }
                        if (cfg.fan != undefined) checkRoomTemp();
                    }, 1e3);      // set minimum rerun time, otherwise this automation function will only on ESP and HA events
                }, 3e3);
                setInterval(() => { timer(); file.write.nv(); }, 30e3);
                emitters();
                log("automation system started", index, 1);                 // log automation start with index number and severity 
                send("coreData", { register: true, name: ["tank_lth"] });      // register with core to receive sensor data
                function initNV() {
                    if (nv.sensor == undefined) nv.sensor = { watt: [], kwh: [] };
                    // if (nv.solar == undefined) nv.solar = {};
                    if (nv.grid == undefined) nv.grid = { power: false, blackout: [], sec: undefined };
                    if (nv.battery == undefined) nv.battery = [];
                    for (let x = 0; x < cfg.sensor.watt.length; x++) {
                        state.auto[index].sensor.recorder.watt.push({ min: null, wh: 0 });
                        if (nv.sensor == undefined) nv.sensor = {};
                        if (nv.sensor.watt == undefined) nv.sensor.watt = [];
                        if (nv.sensor.watt[x] == undefined || nv.sensor.watt[x].name != cfg.sensor.watt[x].name) {
                            log("initializing NV memory for - watt sensor: " + cfg.sensor.watt[x].name, index, 1);
                            nv.sensor.watt[x] = {
                                name: cfg.sensor.watt[x].name, total: 0, min: [], hour: [], day: [], month: [],
                            };
                        }
                    }
                    if (nv.sensor.kwh == undefined) nv.sensor.kwh = [];
                    for (let x = 0; x < cfg.sensor.kwh.length; x++) {
                        state.auto[index].sensor.kwh.push({ last: 0 });
                        if (nv.sensor.kwh[x] == undefined || nv.sensor.kwh[x].name != cfg.sensor.kwh[x].name) {
                            log("initializing NV memory for - kwh sensor: " + cfg.sensor.kwh[x].name, index, 1);
                            nv.sensor.kwh[x] = {
                                name: cfg.sensor.kwh[x].name, total: 0, min: [], hour: [], day: [], month: [],
                            };
                        }
                    }
                    if (nv.battery == undefined) nv.battery = [];
                    for (let x = 0; x < cfg.battery.length; x++)
                        if (nv.battery[x] == undefined || nv.battery[x].name != cfg.battery[x].name) {
                            log("initializing NV memory for - Battery: " + cfg.battery[x].name, index, 1);
                            nv.battery[x] = {
                                name: cfg.battery[x].name, cycles: 0, floating: null,
                                total: { charge: 0, discharge: 0 },
                                today: { charge: 0, discharge: 0 },
                                history: { charge: {}, discharge: {} },
                            };
                        }
                }
                if (state.ha[cfg.solar.inverterAuto] == true) log("inverter automation is on", index, 1);
                else log("inverter automation is off", index, 1);
                file.write.nv();
            }
            function timer() {
                if (time.hour == 8 && time.min == 0) {
                    //  esp.send("power1-relay2", true); // fan
                }
                if (time.hour == 17 && time.min == 0) {
                    //   esp.send("power1-relay2", false); // fan
                }
            }
            function recorder(obj, diff, name) {  // nv is written every 60 seconds
                let calcHour = 0, calcDay = 0, calcMonth = 0, lastHour = 0, lastDay = 0, last30Days = 0, lastMonth;
                if (!Array.isArray(obj.min) || obj.min.length != 60) obj.min = new Array(60).fill(0);
                if (!Array.isArray(obj.hour) || obj.hour.length != 24) obj.hour = new Array(24).fill(0);
                if (!Array.isArray(obj.day) || obj.day.length != 31) obj.day = new Array(31).fill(0);
                if (!Array.isArray(obj.month) || obj.month.length != 12) obj.month = new Array(12).fill(0);
                if (obj.total == undefined) obj.total = 0;
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

                ha.send("kwh_" + name + "_total", Math.round((obj.total / 1000) * 10) / 10, "kWh");
                ha.send("kwh_" + name + "_hour", Math.round((lastHour / 1000) * 100) / 100, "kWh");
                ha.send("kwh_" + name + "_day", Math.round((lastDay / 1000) * 100) / 100, "kWh");
                ha.send("kwh_" + name + "_30days", Math.round((last30Days / 1000) * 10) / 10, "kWh");
                ha.send("kwh_" + name + "_12months", Math.round((last30Days / 1000)), "kWh");
            }
        }
    ];
let
    user = {        // user configurable block - Telegram 
        telegram: { // enter a case matching your desirable input 
            agent: function (msg) {
                //  log("incoming telegram message: " + msg,  0);
                //  console.log("incoming telegram message: ", msg);
                if (telegram.auth(msg)) {
                    switch (msg.text) {
                        case "?": console.log("test help menu"); break;
                        case "/start": bot(msg.chat.id, "you are already registered"); break;
                        case "R":   // to include uppercase letter in case match, we put no break between upper and lower cases
                        case "r":
                            bot(msg.from.id, "Test Menu:");
                            setTimeout(() => {      // delay to ensure menu Title gets presented first in Bot channel
                                telegram.buttonToggle(msg, "TestToggle", "Test Button");
                                setTimeout(() => {      // delay to ensure menu Title gets presented first in Bot channel
                                    telegram.buttonMulti(msg, "TestMenu", "Test Choices", ["test1", "test2", "test3"]);
                                }, 200);
                            }, 200);
                            break;
                        default:
                            log("incoming telegram message - unknown command - " + JSON.stringify(msg.text), 0);
                            break;
                    }
                }
                else if (msg.text == cfg.telegram.password) telegram.sub(msg);
                else if (msg.text == "/start") bot(msg.chat.id, "give me the passcode");
                else bot(msg.chat.id, "i don't know you, go away");

            },
            callback: function (msg) {  // enter a two character code to identify your callback "case" 
                let code = msg.data.slice(0, 2);
                let data = msg.data.slice(2);
                switch (code) {
                    case "TestToggle":  // read button input and toggle corresponding function
                        if (data == "true") { myFunction(true); break; }
                        if (data == "false") { myFunction(false); break; }
                        break;
                    case "TestMenu":  // read button input and perform actions
                        switch (data) {
                            case "test1": bot(msg.from.id, "Telegram " + data); log("Telegram test1", 0); break;
                            case "test2": bot(msg.from.id, "Telegram " + data); log("Telegram test2", 0); break;
                            case "test3": bot(msg.from.id, "Telegram " + data); log("Telegram test3", 0); break;
                        }
                        break;
                }       // create a function for use with your callback
                function myFunction(newState) {    // function that reads the callback input and toggles corresponding boolean in Home Assistant
                    bot(msg.from.id, "Test State: " + newState);
                }
            },
        },
    },
    sys = {         // ______________________system area, don't need to touch anything below this line__________________________________
        com: function () {
            udp.on('message', function (data, info) {
                let buf = JSON.parse(data);
                //  console.log(buf);
                switch (buf.type) {
                    case "espState":      // incoming state change (from ESP)
                        // console.log("receiving esp data, ID: " + buf.obj.id + " state: " + buf.obj.state);
                        state.esp[buf.obj.id] = buf.obj.state;
                        if (state.online == true) {
                            em.emit(cfg.esp[buf.obj.id], buf.obj.state);
                            automation.forEach((func, index) => { if (state.auto[index]) func(index); });
                        }
                        break;
                    case "haStateUpdate":       // incoming state change (from HA websocket service)
                        log("receiving HA state data, entity: " + cfg.ha[buf.obj.id] + " value: " + buf.obj.state, 0);
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
                        if (state.onlineHA == false) sys.boot(3);
                        break;
                    case "haFetchAgain":        // Core is has reconnected to HA, so do a refetch
                        log("Core has reconnected to HA, fetching again");
                        send("espFetch");
                        break;
                    case "haQueryReply":        // HA device query
                        console.log("Available HA Devices: " + buf.obj);
                        break;
                    case "udpReRegister":       // reregister request from server
                        if (state.online == true) {
                            log("server lost sync, reregistering...");
                            setTimeout(() => {
                                sys.register();
                                if (cfg.ha != undefined) { send("haFetch"); }
                            }, 1e3);
                        }
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
                        send("diag", { state, nv });
                        break;
                    case "telegram":
                        // console.log("receiving telegram message: " + buf.obj);
                        switch (buf.obj.class) {
                            case "agent":
                                user.telegram.agent(buf.obj.data);
                                break;
                            case "callback":
                                user.telegram.callback(buf.obj.data);
                                break;
                        }
                        break;
                    case "proceed": if (state.online == false) setTimeout(() => { sys.boot(2); }, 1e3); break;
                    case "log": console.log(buf.obj); break;
                }
            });
        },
        register: function () {
            let obj = {};
            if (cfg.ha != undefined) obj.ha = cfg.ha;
            if (cfg.esp != undefined) obj.esp = cfg.esp;
            if (cfg.telegram != undefined) obj.telegram = true;
            send("register", obj, cfg.moduleName);
            if (cfg.telegram != undefined) {
                if (nv.telegram == undefined) nv.telegram = [];
                else for (let x = 0; x < nv.telegram.length; x++) {
                    send("telegram", { class: "sub", id: nv.telegram[x].id });
                }
            }
        },
        init: function () {
            nv = {};
            state = { auto: [], ha: [], esp: [], udp: [], coreData: [], onlineHA: false, online: false };
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
            workingDir = require('path').dirname(require.main.filename) + "/";
            path = require('path');
            scriptName = path.basename(__filename).slice(0, -3);
            udpClient = require('dgram');
            udp = udpClient.createSocket('udp4');
            if (process.argv[2] == "-i") {
                moduleName = cfg.moduleName.toLowerCase();
                log("installing TWIT-Client-" + cfg.moduleName + " service...");
                let service = [
                    "[Unit]",
                    "Description=",
                    "After=network-online.target",
                    "Wants=network-online.target\n",
                    "[Install]",
                    "WantedBy=multi-user.target\n",
                    "[Service]",
                    "ExecStartPre=/bin/bash -c 'uptime=$(awk \\'{print int($1)}\\' /proc/uptime); if [ $uptime -lt 300 ]; then sleep 70; fi'",
                    "ExecStart=nodemon " + workingDir + "client-" + moduleName + ".js -w " + workingDir + "client-" + moduleName + ".js --exitcrash",
                    "Type=simple",
                    "User=root",
                    "Group=root",
                    "WorkingDirectory=" + workingDir,
                    "Restart=on-failure",
                    "RestartSec=10\n",
                ];
                fs.writeFileSync("/etc/systemd/system/twit-client-" + moduleName + ".service", service.join("\n"));
                // execSync("mkdir /apps/ha -p");
                // execSync("cp " + process.argv[1] + " /apps/ha/");
                execSync("systemctl daemon-reload");
                execSync("systemctl enable twit-client-" + moduleName + ".service");
                execSync("systemctl start twit-client-" + moduleName);
                execSync("service twit-client-" + moduleName + " status");
                log("service installed and started");
                console.log("type: journalctl -fu twit-client-" + moduleName);
                process.exit();
            }
            if (process.argv[2] == "-u") {
                moduleName = cfg.moduleName.toLowerCase();
                log("uninstalling TWIT-Client-" + cfg.moduleName + " service...");
                execSync("systemctl stop twit-client-" + moduleName);
                execSync("systemctl disable twit-client-" + moduleName + ".service");
                fs.unlinkSync("/etc/systemd/system/twit-client-" + moduleName + ".service");
                console.log("TWIT-Client-" + cfg.moduleName + " service uninstalled");
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
                                + ", nv-" + scriptName + ".json file should be in same folder as client.js file (" + workingDir + ")");
                            nv = { telegram: [] };
                        }
                        else { nv = JSON.parse(data); }
                        sys.boot(1);
                    });
                    break;
                case 1:
                    sys.com();
                    log("trying to register with TWIT Core", 1);
                    sys.register();
                    bootWait = setInterval(() => { sys.register(); }, 10e3);
                    break;
                case 2:
                    clearInterval(bootWait);
                    log("registered with TWIT Core", 1);
                    if (cfg.ha != undefined && cfg.ha.length > 0) {
                        log("fetching Home Assistant entities", 1);
                        send("haFetch");
                        bootWait = setInterval(() => {
                            log("HA fetch is failing, retrying...", 2);
                            send("haFetch");
                        }, 10e3);
                    } else sys.boot(3);
                    break;
                case 3:
                    clearInterval(bootWait);
                    if (cfg.ha != undefined && cfg.ha.length > 0) {
                        log("Home Assistant fetch complete", 1);
                        state.onlineHA = true;
                    }
                    if (cfg.esp != undefined && cfg.esp.length > 0) {
                        log("fetching esp entities", 1);
                        send("espFetch");
                        setTimeout(() => { sys.boot(4); }, 1e3);
                    } else sys.boot(4);
                    break;
                case 4:
                    if (cfg.esp != undefined && cfg.esp.length > 0)
                        log("ESP fetch complete", 1);
                    state.online = true;
                    automation.forEach((func, index) => { func(index) });
                    setInterval(() => { send("heartBeat"); time.boot++; }, 1e3);
                    break;
            }
        },
    };
setTimeout(() => { sys.init(); }, 1e3);
function bot(id, data, obj) { send("telegram", { class: "send", id, data, obj }) }
function send(type, obj, name) { udp.send(JSON.stringify({ type, obj, name }), 65432, '127.0.0.1') }
function coreData(name) {
    for (let x = 0; x < state.coreData.length; x++) if (state.coreData[x].name == name) return state.coreData[x].data;
    return {};
}
function log(message, index, level) {
    if (level == undefined) send("log", { message: message, mod: cfg.moduleName, level: index });
    else send("log", { message: message, mod: state.auto[index].name, level: level });
}
