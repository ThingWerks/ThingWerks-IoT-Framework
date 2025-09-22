#!/usr/bin/node
module.exports = {
    ha: {                              // add all your home assistant entities here
        subscribe: [
            "input_boolean.auto_priority",
            "input_boolean.auto_inverter",
            "input_boolean.inverter_1",
        ]
    },
    esp: {                              // add all your ESP entities here
        subscribe: [
            "pzem-daren_watts",
            "pzem-daren_meter",
            "pzem-alvarez_watts",
            "pzem-alvarez_meter",
            "pzem-sofia_meter",
            "pzem-sofia_watts",
            "pzem-carwash_meter",
            "pzem-carwash_watts",
            "pzem-butsoy_meter",
            "pzem-butsoy_watts",
            "pzem-groogies_meter",
            "pzem-groogies_watts",
            "pzem-mamigo_meter",
            "battery-current",
            "battery-voltage",
            "battery-voltage-raw",
            "solar-relay1-alvarez",
            "solar-relay2-daren",
            "solar-relay5-inverter-10kw",
            "solar-relay8-sofing",
            "solar-ram-relay1-water",
            "solar-ram-relay2-house",
            "pzem-ram-water_watts",
            "pzem-ram-water_meter",
            "pzem-ram-house_watts",
            "pzem-ram-house_meter",
            "sunlight"

        ],
        heartbeat: [
        ],
    },
    automation: {
        Solar: function (_name, _push, _reload) {
            try {
                let st, cfg, nv, log; pointers();
                if (_reload) {
                    log("hot reload initiated");
                    clearInterval(st.timer.hour);
                    clearInterval(st.timer.minute);
                    clearInterval(st.timer.second);
                    return;
                }
                if (_push === "init") {
                    config[_name] ||= {
                        grid: { // for blackout detection, needed for inverter ATS switching 
                            //    espVoltage: 7,              // change to sensor number <-----------------------------------------
                            //   espPower: 8,
                            voltMin: 190,
                            voltMax: 245,
                            delayRecover: 60,
                        },
                        fan: {
                            //  espPower: 2,            // esp relay id
                            delayOn: 10,
                            delayOff: 30,
                            refaultMin: 30,         // minutes to resend error/warning
                            sensor: {
                                // amp: 0,             // local amp sensor ID (cfg.sensor.amp)
                                //   temp: 0,            // temp sensor number (in cfg.sensor.temp)
                                watt: {
                                    inverter: 0,    // local sensor for inverter or all inverter combined
                                    battery: 2,
                                }
                            },
                            temp: {
                                //   on: 88.5,          // fan start temp
                                //   off: 85.0,         // fan stop temp
                                warn: 115.0,         // send warning at this temp
                                error: 120.0,        // send error at the temp
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
                            inverterAuto: "input_boolean.auto_inverter",            // HA Toggle automation id
                            cycleError: 10,    // inverter minimum switch cycle time for before faulting
                            sunlight: "sunlight",            // sunlight sensor esp ID
                            watts: {
                                inverterPower: "inverter_1"    // local sensor - total inverter power - used for welder detection only (as of now)
                            },
                            priority: {
                                entityAuto: "input_boolean.auto_priority",
                                battery: "main",
                                delaySwitchOn: 10,    // 60s time to observe changes in amps/sun before toggling priorities on
                                delaySwitchOff: 10,  // 30s time to observe changes in amps/sun before toggling priorities off
                                queue: [
                                    {
                                        name: "Inverter 10kw",
                                        enable: true,
                                        onAmps: 10.0,
                                        onSun: 0.5,
                                        offAmps: -15.0,
                                        offAmpsFloat: -30.0,
                                        entities: ["solar-relay5-inverter-10kw"]
                                    },
                                    {
                                        name: "Ram-Water ATS",
                                        enable: true,
                                        onSun: 0.6,
                                        onAmps: 60.0,
                                        offAmps: -10.0,
                                        offAmpsFloat: -10.0,
                                        entities: ["solar-ram-relay1-water"]
                                    },

                                    /*
                                                        {
                                        name: "Daren ATS",
                                        enable: true,
                                        onAmps: 10.0,
                                        offVolts: 53.0,
                                        entities: ["solar-relay2-daren"]
                                    },
                                    {
                                        name: "Alvarez ATS",
                                        enable: true,
                                        onAmps: 10.0,
                                        offVolts: 53.5,
                                        entities: ["solar-relay1-alvarez"]
                                    },
                                    {
                                        name: "Sofing ATS",
                                        enable: true,
                                        onAmps: 10.0,
                                        offVolts: 54.0,
                                        entities: ["solar-relay8-sofing"]
                                    },
                                    {
                                      name: "Compressor", // name of system or entity being controlled 
                                      onSun: 1.5,     // sunlight level to activate this system - in addition to battery level if configured. Only has effect if "offAmpsFloat" is not configured or it is configured and battery is floating 
                                      // offSun: 2.35,    // sunlight level to deactivate this system - independent of battery level
                                      onAmps: 40.0,       // amp level to activate 
                                      offAmps: 30.0,      // amp level to deactivate
                                      offAmpsFloat: -10.0, // amp level while floating needed to deactivate
                                      onVolts: 54.0,      // battery level to turn on system - in addition to sunlight if configured
                                      offVolts: 53.7,     // battery level to turn off system - independent of battery level
                                      entityAuto: 3,          // optional - HA toggle helper - for syncing TW-IoT/HA state 
                                      entities: ["input_boolean.auto_compressor"], // HA or ESP entities that will be toggled 
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
                                      entityAuto: 4,
                                      entities: ["input_boolean.auto_pump_transfer"]
                                    },
                                        */
                                ],
                            }
                        },
                        inverter: [
                            {
                                enable: true,
                                name: "11kw",
                                entity: "input_boolean.inverter_1", // required - entity for indicating operational status
                                nightMode: {
                                    enable: true,               // optional - this inverter runs at night
                                    startHour: 16,              // hour to start night mode  
                                    startMin: 0,                // minute to start night mode
                                    startVoltageMin: 55.5,      // min voltage to start (or it also will switch off) the inverter at "nightMode" start if not at least this voltage       
                                    endHour: 6,                 // the hour that nightMode will end
                                    endMin: 0,
                                    endAmps: 20,                // optional - amps needed to end night mode
                                },
                                power: {
                                    entity: undefined,          // optional - Power relay/switch entity
                                    delayOff: undefined,        // optional - delay power off switch after shutdown
                                    startAuto: false,            // optional - state the inverter on system boot if voltage is good to go
                                },
                                transfer: {                     // required!!
                                    switchOn: [                 // transfer switch on sequence
                                        { entity: "solar-relay2-daren", state: true }, // transfer elements, state is to turn on (true), or off (false)
                                        { entity: "solar-relay1-alvarez", state: true },
                                        { entity: "solar-relay8-sofing", state: true },
                                    ],
                                    switchOff: [                // transfer switch off sequence
                                        { entity: "solar-relay2-daren", state: false }, // transfer elements, state is to turn on (true), or off (false)
                                        { entity: "solar-relay1-alvarez", state: false },
                                        { entity: "solar-relay8-sofing", state: false },
                                        // { id: 16, state: true, delay: 5 },     // delays the action for x seconds
                                    ],
                                },
                                delaySwitchOn: 20,
                                delaySwitchOff: 30,
                                wattGrid: "grid_power",         // optional - esp ID for grid watt sensor - needed to switch back fromm gid (comparing power)
                                wattGridMultiplier: 1.1,        // multiple of charge power exceeding grid power needed to switch load to inverter
                                // watts: 5,                    // optional - used for transfer switch 
                                // volts: 26,                   // optional - used to sense inverter output voltage fault
                                // blackout: true,              // optional - switch to inverter on blackout if voltage is less than (voltsRun)
                                // blackoutVoltMin: 54.0,       // optional - minimum voltage needed to recover from blackout 
                                // voltsRun: 54.0,              // volts to start inverter - in addition to sunlight/amps if configured
                                voltsStop: 53.5,                // volts to stop inverter - will stop Independent of sunlight level
                                ampsRun: 45.0,                  // optional - charger amp level to transfer load to inverter - (must use espWattGrid if not)
                                ampsStop: -5.0,                 // optional - discharge amp level to transfer load to grid 
                                ampsStopFloat: -10.0,           // optional - discharge amp level to transfer load to grid when floating
                                // ampsStopVoltsMin: 52.5,      // optional - minimum voltage needed to enable amp stop switching 
                                battery: "main",                // optional - battery bank assigned to this inverter - required to use ampsStopFloat
                                floatRetryInterval: undefined,
                                welderWatts: 4000,              // optional - high load detection
                                welderTimeout: 240,             // optional - time in seconds to observe and reset
                                priorityWait: true,             // wait for all priority members to turn off before inverter switches off
                            },
                        ],
                        sensor: {
                            amp: [
                                {
                                    name: "battery_current_rs485",
                                    entity: ["battery-current"],    // must be array
                                    multiplier: undefined,           // only devices with multiplier are sent to HA
                                    // zero: 4995,
                                    //zero: 5013,
                                    zero: 5002,
                                    rating: 380,
                                    scale: 10000,
                                    inverted: true,
                                },
                            ],
                            watt: [
                                {
                                    name: "battery_power",
                                    sensorVolt: "battery_volts_twit",   // for power computation based of V*A
                                    sensorAmp: "battery_current_rs485", // for power computation based of V*A  - must be combined in other sensor
                                    solarPower: false,          // special option to show negative power if battery reverse current is greater than inverter output current
                                    combineNegative: false,     // combine negative values
                                    record: false
                                },
                                {
                                    name: "inverter_11kw",         // all inverters
                                    entity: ["pzem-alvarez_watts", "pzem-daren_watts", "pzem-sofia_watts"],
                                    solarPower: false,
                                    record: true
                                },
                                {
                                    name: "inverter_10kw",         // all inverters
                                    entity: ["pzem-ram-water_watts", "pzem-ram-house_watts"],
                                    solarPower: false,
                                    record: true
                                },
                                {
                                    name: "inverter_all",         // all inverters
                                    entity: ["inverter_11kw", "inverter_10kw"],
                                    solarPower: false,
                                    record: true
                                },
                                {
                                    name: "solar_power",
                                    solarPower: true,               // this is a solar power sensor
                                    entity: ["inverter_all"],         // the esp IDs for inverter amps
                                    batteryWatt: ["battery_power"], // must have battery watt sensor for Solar Power Calc
                                    record: true
                                },
                                {
                                    name: "grid_power",         // all inverters
                                    entity: ["pzem-daren_watts", "pzem-groogies_watts", "pzem-butsoy_watts"],
                                    solarPower: false,
                                    record: true
                                },
                            ],
                            volt: [
                                {
                                    name: "battery_volts_twit",
                                    entity: "battery-voltage-raw",  // must NOT be array
                                    multiplier: 22.262914418,
                                },
                                /*
                                {
                                    name: "battery_power1",
                                    espID: 0,
                                    multiplier: 20.33,          // only devices with multiplier are sent to HA
                                    calibrateZero: undefined,
                                },
                                */
                            ],
                            pf: [],
                            kwh: [
                                {
                                    name: "pzem_daren",
                                    entity: "pzem-daren_meter",
                                },
                                {
                                    name: "pzem_alvarez",
                                    entity: "pzem-alvarez_meter",
                                },
                                {
                                    name: "pzem_sofia",
                                    entity: "pzem-sofia_meter",
                                },
                                {
                                    name: "pzem_carwash",
                                    entity: "pzem-carwash_meter",
                                },
                                {
                                    name: "pzem_butsoy",
                                    entity: "pzem-butsoy_meter",
                                },
                                {
                                    name: "pzem_groogies",
                                    entity: "pzem-groogies_meter",
                                },
                                {
                                    name: "pzem_mamigo",
                                    entity: "pzem-mamigo_meter",
                                },
                            ],
                            temp: [
                                {
                                    name: "6kw_1",
                                    // entity: 8,
                                    // multiplier: 45.4,
                                    FtoC: false,
                                    CtoF: true,
                                    unit: "F",
                                }
                                /*
                                {
                                    name: "battery_room_power1",
                                    espID: 11,
                                    multiplier: 45.4,
                                    unit: "F",
                                }
                                */
                            ]
                        },
                        battery: [
                            {
                                name: "main",
                                installed: "2025-4-25",
                                charger: {
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
                                    voltStart: 57.4,
                                    voltStop: 58.2,
                                    topOffID: undefined,
                                    sensorGrid: undefined,
                                },
                                sensorWatt: "battery_power",    // used for recorder
                                sensorAmp: "battery_current_rs485",
                                sensorVolt: "battery_volts_twit",
                                voltsFullCharge: 58,
                                voltsFloatStop: 56.0,
                                socTable: 1,
                            },
                        ],
                        soc: [
                            /*
                                62.0V to 62.1V	100%	Full Charge	Maximum charge voltage (under load)
                                57.8V	~100%	Resting full charge voltage	Resting after full charge
                                61.2V	~95%		Resting voltage after charging
                                60.0V	~90%		
                                58.5V	~80%		
                                57.0V	~70%		
                                55.5V	~60%		
                                54.4V	~50%	Nominal Voltage	
                                53.0V	~40%		
                                51.5V	~30%		
                                50.0V	~20%		
                                48.5V	~10%		
                                46.0V	0%	Discharged	Minimum voltage to avoid damage
                            */
                            [
                                { voltage: 54.0, percent: 100 },
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
                                { voltage: 58.5, percent: 105 },
                                { voltage: 57.8, percent: 100 },
                                { voltage: 56.9, percent: 90 },
                                { voltage: 56.4, percent: 80 },
                                { voltage: 56.1, percent: 70 },
                                { voltage: 55.6, percent: 60 },
                                { voltage: 55.4, percent: 50 },
                                { voltage: 55.2, percent: 40 },
                                { voltage: 54.7, percent: 30 },
                                { voltage: 54.4, percent: 20 },
                                { voltage: 51.0, percent: 10 },
                                { voltage: 42.5, percent: 0 }
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
                    };
                    state[_name] = {               // initialize automation volatile memory
                        priority: { step: time.epoch, queue: [], },
                        inverter: [],
                        battery: [],
                        grid: { state: null, delayOn: time.epoch, timerBlackout: time.epoch, voltOver: false, },
                        fan: { run: null, delayStep: false, delayTimer: time.epoch, warn: false, error: false, faultStep: time.epochMin },
                        recorder: { watt: {}, kwh: {} },
                        welder: { detect: false, step: null },
                        timer: {},
                    };
                    pointers();
                    cfg.inverter.forEach(_ => {
                        st.inverter.push({
                            state: null, boot: false, step: time.epoch - 20, nightMode: false, delayOffTimer: undefined, switchWatts: 0, switchSun: 0,
                            delayStartTimer: time.epoch, delayStep: false, delayVoltsTimer: time.epoch, delayVoltsStep: false,
                            delaySunTimer: time.epoch, delaySunStep: false, delayFaultStep: false, delayFaultTimer: time.epoch,
                            timeShutdown: null,
                            warn: {
                                manualPowerOn: false,
                            }
                        });
                    });
                    cfg.solar.priority.queue.forEach(_ => {
                        st.priority.queue.push({
                            state: null, delayStep: false, delayStepSun: false, delayTimer: time.epoch, delayTimerSun: time.epoch,
                            boot: false,
                        })
                    });
                    cfg.battery.forEach(_ => {
                        st.battery.push({ percent: null, min: null, whPos: 0, whNeg: 0, floatStep: false, floatTimer: null })
                    });
                    log("initializing NV data");
                    (function () {
                        nv.sensor ||= { watt: {}, kwh: {} };
                        // if (nv.solar == undefined) nv.solar = {};
                        nv.grid ||= { power: false, blackout: [], sec: 0 };
                        nv.battery ||= {};
                        nv.sensor.watt ||= {};
                        cfg.sensor.watt.forEach(config => {
                            if (nv.sensor.watt[config.name] == undefined) {
                                log("initializing NV memory for - watt sensor: " + config.name);
                                nv.sensor.watt[config.name] = { total: 0, min: [], hour: [], day: [], month: [] };
                            }
                            st.recorder.watt[config.name] = { min: null, wh: 0 };
                        });
                        nv.sensor.kwh ||= {};
                        cfg.sensor.kwh.forEach(config => {
                            if (nv.sensor.kwh[config.name] == undefined) {
                                log("initializing NV memory for - kwh meter: " + config.name);
                                nv.sensor.kwh[config.name] = { total: 0, min: [], hour: [], day: [], month: [], };
                            }
                            st.recorder.kwh[config.name] = { last: 0 };
                        });
                        nv.battery ||= {};
                        for (let x = 0; x < cfg.battery.length; x++) {
                            let name = cfg.battery[x].name
                            if (nv.battery[name] == undefined) {
                                log("initializing NV memory for - Battery: " + name);
                                nv.battery[name] = {
                                    cycles: 0, floating: null, dischargeReset: false,
                                    charge: { total: 0, today: 0 }, discharge: { total: 0, today: 0 }
                                };
                            }
                        }
                    })();
                    log("solar automation system starting");
                    state[_name].boot = true;
                    setTimeout(() => {
                        st.timer.second = setInterval(() => {
                            calcSensor(); checkBattery(); checkGrid();
                            if (cfg.solar.inverterAuto != undefined && entity[cfg.solar.inverterAuto]?.state == true) {
                                inverterAuto();
                                // if  (st.welder.detect == false) 
                            }
                            if (entity[cfg.solar.priority.entityAuto]?.state == true) priorityAuto();
                            if (cfg.fan != undefined && cfg.fan.sensor.temp != undefined) checkRoomTemp();
                        }, 1e3);      // set minimum rerun time, otherwise this automation function will only on ESP and HA events
                    }, 3e3);
                    st.timer.writeNV = setInterval(() => { file.write.nv(); }, 30e3);
                    if (cfg.solar.inverterAuto != undefined
                        && entity[cfg.solar.inverterAuto].state == true) log("inverter automation is on");
                    else log("inverter automation is off");
                    file.write.nv();
                    return;
                } else {
                    pointers();
                    for (let x = 0; x < cfg.sensor.amp.length; x++) {
                        const config = cfg.sensor.amp[x];
                        if (config.entity && config.entity[0] === _push.name) {
                            let amps = entity[config.name] ||= {};
                            let data = _push.newState;
                            let factor = 0, corrected = 0, final = 0;
                            if (config.multiplier != undefined) {
                                amps.state = parseFloat(data) * config.multiplier;
                            } else if (config.scale != undefined) {
                                factor = config.rating / (config.scale / 2);
                                corrected = parseFloat(data) - config.zero;
                                final = corrected * factor;
                                if (config.inverted == true) amps.state = (final * -1);
                                else amps.state = final;
                            } else amps.state = parseFloat(data);
                            if (amps.state != null && Number.isFinite(amps.state)) {
                                send("amp_" + config.name, Math.round(amps.state * 10) / 10, "A");
                            }
                            amps.update = time.epoch;
                            return;
                        }
                    }
                    for (let x = 0; x < cfg.sensor.volt.length; x++) {
                        const config = cfg.sensor.volt[x];
                        if (config.entity === _push.name) {
                            let volts = entity[config.name] ||= {};
                            let data = _push.newState;
                            let final = null, voltage = parseFloat(data);
                            const table = config.table;
                            if (table !== undefined) {
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
                                            break;
                                        }
                                    }
                                }
                                volts.state = final;
                                if (volts.state != null && Number.isFinite(volts.state))
                                    send("volt_" + config.name, Math.round(final * 10) / 10, "V");
                            } else if (config.multiplier != undefined) {
                                volts.state = voltage * config.multiplier;
                                if (volts.state != null && Number.isFinite(volts.state))
                                    send("volt_" + config.name, Math.round(volts.state * 10) / 10, "V");
                            } else volts.state = voltage;
                            volts.update = time.epoch;
                            return;
                        }
                    }
                    for (let x = 0; x < cfg.sensor.watt.length; x++) {
                        const config = cfg.sensor.watt[x];
                        if (config.entity && config.entity.length == 1 && !config.solarPower && config.entity[0] === _push.name) {
                            let watts = entity[config.name] ||= {};
                            let data = _push.newState;
                            let newData;
                            if (config.multiplier != undefined) newData = parseFloat(data) * config.multiplier;
                            else newData = parseFloat(data);
                            if (Number.isFinite(watts.state)) {
                                watts.state = newData;
                                send("watt_" + config.name, ~~watts.state, "W");
                            } else {
                                watts.state = 0.0;
                            }
                            watts.update = time.epoch;
                            return;
                        }
                    }
                    for (let x = 0; x < cfg.sensor.kwh.length; x++) {
                        const config = cfg.sensor.kwh[x];
                        if (!Array.isArray(config.entity) && config.entity === _push.name) {
                            let kwh = nv.sensor.kwh[config.name] ||= {};
                            let data = _push.newState;
                            let newData = parseInt(data);
                            if (Number.isFinite(newData)) {
                                if (newData < 0) return;
                                if (newData > 0) {
                                    if (kwh.total == 0) {
                                        log("sensor: " + config.name + " first time recording");
                                        kwh.total = newData;
                                    }
                                    if (kwh.last == 0) {
                                        log("starting recorder for PZEM Meter - " + config.name);
                                        recorder(kwh, 0, config.name);
                                        kwh.last = newData;
                                    } else {
                                        let diff = newData - kwh.last;
                                        if (diff < 0) {
                                            diff = (10000000 - kwh.last) + newData;
                                            log("PZEM rollover detected: " + config.name + " last=" + kwh.last + " new=" + newData + " diff=" + diff);
                                        }
                                        kwh.last = newData;
                                        if (diff > 0) {
                                            recorder(kwh, diff, config.name);
                                            kwh.total += diff;
                                        }
                                    }
                                }
                            }
                            return;
                        }
                    }
                    for (let x = 0; x < cfg.sensor.temp.length; x++) {
                        const config = cfg.sensor.temp[x];
                        if (config.entity === _push.name) {
                            let temp = entity[config.name] ||= {};
                            let data = _push.newState;
                            if (config.multiplier != undefined) {
                                temp.state = parseFloat(data) * config.multiplier;
                                if (temp.state != null && Number.isFinite(temp.state))
                                    send("temp_" + config.name, Math.round(temp.state * 10) / 10, config.unit);
                            } else {
                                temp.state = parseFloat(data);
                            }
                            return;
                        }
                    }
                    if (cfg.solar.inverterAuto != undefined && cfg.solar.inverterAuto == _push.name) {
                        let newState = _push.newState;
                        if (newState == true) log("inverter auto going online");
                        else log("inverter auto going offline");
                        for (let x = 0; x < cfg.inverter.length; x++) {
                            if (entity[cfg.inverter[x].entity].state) {
                                log("inverter: " + cfg.inverter[x].name + " - inverter ON - syncing ATS with inverter state");
                                syncInverter(x, true, init);
                            } else {
                                log("inverter: " + cfg.inverter[x].name + " - inverter OFF - syncing ATS with inverter state");
                                syncInverter(x, false);
                            }
                        }

                        return;
                    }
                    for (let x = 0; x < cfg.inverter.length; x++) {
                        if (cfg.inverter[x].entity && cfg.inverter[x].entity == _push.name) {
                            let newState = _push.newState;
                            if (cfg.inverter[x].enable) {
                                if (st.inverter[x].state != "faulted" && st.inverter[x].state != newState) {
                                    log("inverter: " + cfg.inverter[x].name + " - operational state entity switching to - syncing power/switches" + newState);
                                    syncInverter(x, newState);
                                }
                            }
                            return;
                        }
                    }
                    if (cfg.solar.priority.entityAuto != undefined && cfg.solar.priority.entityAuto == _push.name) {
                        let newState = _push.newState;
                        if (newState == true) log("priority auto going online");
                        else log("priority auto going offline");
                        st.priority.step = time.epoch;
                        return;
                    }
                    for (let x = 0; x < cfg.solar.priority.queue.length; x++) {
                        let queue = cfg.solar.priority.queue[x];
                        if (queue.entityAuto != undefined && queue.entityAuto == _push.name) {
                            let newState = _push.newState;
                            if (newState == true) log("priority queue member" + queue.name + " going online");
                            else log("priority queue member " + queue.name + " going offline");
                            return;
                        }

                        for (let y = 0; y < queue.entities.length; y++) {
                            const element = queue.entities[y];
                            if (element == _push.name) {
                                console.log(queue.entities)
                                let newState = _push.newState;
                                log("syncing priority queue: " + queue.name + "  with entity: " + element + " - new state: " + newState);
                                st.priority.queue[x].state = newState;
                                st.priority.step = time.epoch;
                                return;
                            }
                        }
                    }
                    function syncInverter(x, newState, init) {
                        st.inverter[x].state = newState;
                        inverterNightMode(x);
                        inverterPower(x, newState, undefined, init);
                        st.inverter[x].warn.manualPowerOn = false;
                    }
                }
                function priorityAuto() {
                    let volts, amps, sun, battery;
                    let config = cfg.solar.priority;
                    if (!state.priority.boot) {
                        log("priority - system is going ONLINE");
                        st.priority.boot = true;
                    }
                    if (time.epoch - st.priority.step >= 3) { localPointers(); priorityCheck(); } else return;  // delay start of priority queue
                    function priorityCheck() {
                        for (let x = config.queue.length - 1; x > -1; x--) {    // when member is running
                            let member = st.priority.queue[x]; member.cfg = config.queue[x];
                            if (member.state == true || member.state == null) {
                                //  console.log("checking x:" + x + " amps: " + amps);
                                if (member.cfg.enable == true) {
                                    if (member.cfg.offVolts != undefined) {
                                        if (volts <= member.cfg.offVolts) {
                                            trigger(x, "battery voltage is low (" + volts + "v) - stopping ", false);
                                            return;
                                        }
                                    } else checkConditions();
                                }
                                function checkConditions() {
                                    if (sun != undefined && member.cfg.offSun != undefined) {
                                        if (sun <= member.cfg.offSun) {
                                            trigger(x, "sun is low (" + sun + "v) - stopping ", false);
                                            return;
                                        } else member.delayStep = false;
                                    } else if (member.cfg.offAmps != undefined) {
                                        if (config.battery == undefined || member.cfg.offAmpsFloat == undefined
                                            || nv.battery[config.battery].floating == false) {
                                            if (amps <= member.cfg.offAmps) {
                                                trigger(x, "charge amps is too low (" + amps + "a) - stopping ", false);
                                                return;
                                            } else member.delayStep = false;
                                        } else if (amps <= member.cfg.offAmpsFloat) {
                                            trigger(x, "(floating) discharge amps is high (" + amps + "a) - stopping ", false);
                                            return;
                                        } else member.delayStep = false;
                                    } else member.delayStep = false;
                                }
                            }
                        }
                        for (let x = 0; x < config.queue.length; x++) {         // when member is stopped
                            let member = st.priority.queue[x]; member.cfg = config.queue[x];
                            if (member.cfg.entityAuto == undefined
                                || member.cfg.entityAuto != undefined && entity[member.cfg.entityAuto].state == true) {
                                if (member.state == false || member.state == null) {
                                    if (member.cfg.enable == true) {
                                        if (member.cfg.inverter == undefined) {
                                            if (cfg.inverter[0]?.enable == true) {
                                                if (st.inverter[0].state == true) checkVolts();
                                            } else checkVolts();
                                        } else if (st.inverter[member.cfg.inverter].state == true) checkVolts();
                                    }
                                }
                            }
                            function checkVolts() {
                                if (member.cfg.onVolts != undefined) {
                                    if (volts >= member.cfg.onVolts) {
                                        checkConditions();
                                    } else member.delayStep = false;
                                } else checkConditions()
                            }
                            function checkConditions() {
                                if (sun != undefined && member.cfg.onSun != undefined) {
                                    if (member.cfg.offAmpsFloat == undefined || member.cfg.offAmpsFloat != undefined
                                        && nv.battery[config.battery].floating == true) {
                                        if (sun >= member.cfg.onSun) {
                                            // console.log("checking sun: " + sun + " floating:" + nv.battery[config.battery].floating)
                                            if (member.delayStepSun == false) {
                                                member.delayTimerSun = time.epoch;
                                                member.delayStepSun = true;
                                                return;
                                            } else if (time.epoch - member.delayTimerSun >= config.delaySwitchOn) {
                                                log("sun is high (" + sun + "v) - starting " + member.cfg.name);
                                                sendOutput(x, true);
                                                return;
                                            }
                                        } else member.delayStepSun = false;
                                    }
                                }
                                if (member.cfg.onAmps != undefined) {
                                    if (amps >= member.cfg.onAmps) {
                                        trigger(x, "charge amps is high (" + amps + "a) volts: " + volts + " on-volts: "
                                            + member.cfg.onVolts + " - starting ", true);
                                        return;
                                    } else if (amps < member.cfg.onAmps) member.delayStep = false;
                                } else if (member.cfg.onVolts != undefined) {
                                    trigger(x, "battery volts is enough (" + volts + "v) - starting ", true);
                                    return;
                                }
                            }
                        }
                        function trigger(x, message, newState, isSun) {
                            let member = st.priority.queue[x];
                            if (cfg.inverter.length > 0) {
                                if (checkInverter()) proceed();
                            } else proceed();
                            function checkInverter() {
                                for (let y = 0; y < cfg.inverter.length; y++) {
                                    if (cfg.inverter[y].enable) {
                                        if (newState == false) {
                                            if (member.inverter != undefined) {
                                                if (member.inverter === y) st.inverter[y].delayStep = false;
                                            } else st.inverter[y].delayStep = false;
                                        }
                                        if (entity[cfg.inverter[y].entity]?.state == false) return false;
                                    }
                                }
                                return true;
                            }
                            function proceed() {
                                let member = st.priority.queue[x]; member.cfg = config.queue[x];
                                if (member.delayStep == false) {
                                    member.delayTimer = time.epoch;
                                    member.delayStep = true;
                                    return;
                                } else if (time.epoch - member.delayTimer >= (newState ? config.delaySwitchOn : config.delaySwitchOff)) {
                                    log(message + member.cfg.name);
                                    sendOutput(x, newState);
                                    return;
                                }
                            }
                        }
                        function sendOutput(x, newState) {
                            let member = st.priority.queue[x]; member.cfg = config.queue[x];
                            for (let y = 0; y < member.cfg.entities.length; y++)
                                send(member.cfg.entities[y], newState);
                            cfg.inverter.forEach((_, y) => { st.inverter[y].delayStep = false });
                            config.queue.forEach((_, y) => { st.priority.queue[y].delayStep = false; member.delayStepSun = false; });
                            member.state = newState;
                            st.priority.step = time.epoch;
                        }
                    }
                    function localPointers() {
                        battery = cfg.battery[cfg.battery.findIndex(battery => battery.name === config.battery)];
                        volts = Math.round(entity[battery.sensorVolt].state * 100) / 100;
                        sun = Math.round(entity[cfg.solar.sunlight]?.state * 100) / 100;
                        if (config.battery != undefined) {
                            if (Array.isArray(battery.sensorAmp)) {
                                let temp = 0;
                                for (let y = 0; y < battery.sensorAmp.length; y++) {
                                    temp += Math.round(entity[battery.sensorAmp[y]].state * 100) / 100;
                                    amps = temp;
                                }
                            } else amps = Math.round(entity[battery.sensorAmp].state * 100) / 100;
                        }
                    }
                }
                function inverterAuto() {
                    for (let x = 0; x < cfg.inverter.length; x++) {         // initialize all inverter states
                        if (cfg.inverter[x].enable == true) {
                            let { voltsBat, config, inverter } = pointers(x);
                            if (inverter.state == null || inverter.boot == false) {
                                if (cfg.inverter[x].entity != undefined) {
                                    log("inverter: " + cfg.inverter[x].name + " - syncing operation entity - state: " + entity[cfg.inverter[x].entity]?.state);
                                    if (entity[cfg.inverter[x].entity].state == true) {
                                        if (entity[config.transfer.switchOn[0].entity]?.state != config.transfer.switchOn[0].state) {
                                            log("inverter: " + cfg.inverter[x].name + " - primary ATS state OFF (" + entity[config.transfer.switchOn[0].entity]?.state
                                                + ") is not expected - HA says its ON", 2);
                                            inverterPower(x, true);
                                            // inverter.state = true;
                                        } else inverter.state = true;
                                    } else {
                                        if (entity[config.transfer.switchOff[0].entity]?.state != config.transfer.switchOff[0].state) {
                                            log("inverter: " + cfg.inverter[x].name + " - primary ATS state ON (" + entity[config.transfer.switchOff[0].entity]?.state
                                                + ") is not expected - HA says its OFF", 2);
                                            inverter.state = false;
                                        } else inverter.state = false;
                                    }
                                }
                                inverter.delayStep = false;
                                inverter.delayVoltsStep = false;
                                inverter.delayFaultStep = false;
                                inverter.delaySunStep = false;
                                inverter.step = time.epoch - 20;
                                if (inverter.state == false) {
                                    if (config.power.startAuto == true) {
                                        if (voltsBat > config.voltsStop) {
                                            log("inverter: " + config.name + " - first start, volts (" + voltsBat + ") is greater than stop volts (" + config.voltsStop + "), good to run");
                                            inverterPower(x, true);
                                        }
                                    } else if (nv.battery[config.battery].floating == true) {
                                        log("inverter: " + config.name + " - first start, battery is floating, good to run");
                                        inverterPower(x, true);
                                    }
                                }
                                inverter.boot = true;
                            } else if (inverter.state == "faulted") {
                                if (voltsInverter <= config.voltsFloatStop) {
                                    log("inverter: " + config.name + " - inverter was faulted but now resetting because charger is no longer floating", 2);
                                    inverter.state = false;
                                }
                                if (cfg.solar.watts.inverterPower != undefined
                                    && entity[cfg.solar.watts.inverterPower].state >= config.watts.welder) {
                                    log("inverter: " + config.name + " - inverter was faulted but now resetting because welding is detected", 2);
                                    inverter.state = false;
                                }
                            }
                        }
                    }
                    for (let x = cfg.inverter.length - 1; x > -1; x--) {    // when inverter is on
                        if (cfg.inverter[x].enable == true) {
                            let { voltsBat, voltsInverter, ampsBat, sun, wattsInverter, config, inverter } = pointers(x);
                            if (inverter.state != "faulted" && inverter.state == true) {
                                if (inverterNightMode(x) == true) {
                                    if (voltsBat < config.nightMode.startVoltageMin) {
                                        log("inverter: " + config.name + " - Battery is too low to make it through the night: "
                                            + voltsBat + ", switching off");
                                        inverterPower(x, false);
                                        return;
                                    }
                                } else if (st.grid.state != false) {
                                    if (inverter.nightMode != true) {
                                        if (config.sunStop != undefined) {
                                            if (sun <= config.sunStop) {
                                                trigger(false, "Sun is low: " + sun + "  voltsBat: " + voltsBat + ", switching to grid ");
                                            } else inverter.delayStep = false;
                                        } else if (config.ampsStop != undefined) {
                                            if (nv.battery[config.battery].floating == false) {
                                                if (ampsBat <= config.ampsStop) {
                                                    if (config.ampsStopVoltsMin != undefined) {
                                                        if (voltsBat < config.ampsStopVoltsMin) ampStop();
                                                    } else ampStop();
                                                } else inverter.delayStep = false;
                                            } else {
                                                if (ampsBat <= inverter.ampsStopFloat) {
                                                    if (config.ampsStopVoltsMin != undefined) {
                                                        if (voltsBat < config.ampsStopVoltsMin) ampStop();
                                                    } else ampStop();
                                                }
                                                else inverter.delayStep = false;
                                            }
                                        }
                                        function ampStop() {
                                            trigger(false, "solar power too low: " + ampsBat + "a  voltsBat: " + voltsBat
                                                + "v  Floating: " + nv.battery[config.battery].floating + " Sun: "
                                                + sun + "v  Watts: " + wattsInverter + ", switching to grid ");
                                            inverter.switchWatts = wattsInverter;
                                            inverter.switchSun = sun;
                                        }
                                    }
                                }
                                if (voltsBat <= config.voltsStop) {
                                    if (inverter.delayVoltsStep == false && !checkPriority()) {
                                        inverter.delayVoltsTimer = time.epoch;
                                        inverter.delayVoltsStep = true;
                                    } else if (time.epoch - inverter.delayVoltsTimer >= config.delaySwitchOff) {
                                        log("inverter: " + config.name + " - Battery is low: " + voltsBat + ", is switching to grid ");
                                        inverterPower(x, newState, (level == 3 ? true : undefined));
                                    }
                                } else inverter.delayVoltsStep = false;
                                if (inverter.nightMode == true && time.hour >= config.nightMode.endHour
                                    && time.hour < config.nightMode.startHour) {
                                    if (config.nightMode.endAmps != undefined) {
                                        if (ampsBat >= config.nightMode.endAmps) {
                                            log("inverter: " + config.name + " - Battery is charging, current is high: " + ampsBat
                                                + "a  " + voltsBat + "v, exiting night mode");
                                            inverter.nightMode = false;
                                        }
                                    } else checkCharging(x, false, voltsBat); // inverter only exits night mode only when there is sufficient charging
                                }
                                if (voltsInverter < 20) trigger(false, "FAULT - no output - Inverter is going offline", 3)
                                else inverter.delayFaultStep = false;
                            }
                            function checkPriority() {
                                if (config.priorityWait && entity[cfg.solar.priority.entityAuto]?.state == true) {
                                    for (let y = 0; y < cfg.solar.priority.queue.length; y++)
                                        if (st.priority.queue[y].state) return true;
                                } else return false;
                            }
                            function trigger(newState, message, level = 1) {
                                if (!checkPriority()) {
                                    if (level == 3) {
                                        if (inverter.delayFaultStep == false) {
                                            inverter.delayFaultTimer = time.epoch;
                                            inverter.delayFaultStep = true;
                                        } else if (time.epoch - inverter.delayFaultTimer >= 10) toggle();
                                    } else {
                                        if (inverter.delayStep == false) {
                                            // console.log("amps stop : " + ampsBat)
                                            inverter.delayTimer = time.epoch;
                                            inverter.delayStep = true;
                                        } else if (time.epoch - inverter.delayTimer >= config.delaySwitchOff) toggle();
                                    }
                                    function toggle() {
                                        log("inverter: " + config.name + " - " + message, level);
                                        inverterPower(x, newState, (level == 3 ? true : undefined));
                                        return;
                                    }
                                }
                            }
                        }
                    }
                    for (let x = 0; x < cfg.inverter.length; x++) {         // when inverter is off
                        if (cfg.inverter[x].enable == true) {
                            let { voltsBat, voltsInverter, battery, config, inverter } = pointers(x);
                            if (battery.sensorVolt != undefined) {
                                if (inverter.state != "faulted" && inverter.state === false) {
                                    checkCharging(x, true);
                                    if (inverterNightMode(x) == true) {
                                        if (voltsBat >= config.nightMode.startVoltageMin) {
                                            log("Battery is enough to make it through the night: " + voltsBat + ", " + config.name + " switching on");
                                            inverterPower(x, true);
                                        } else log("Battery is too low to make it through the night: " + voltsBat + ", " + config.name + " staying off");
                                    }
                                    if (config.blackout == true && st.grid.state == false && voltsBat >= config.blackoutVoltMin) {
                                        log("Blackout detected, volts is enough to run: " + voltsBat + ", " + config.name + " switching on", 2);
                                        inverterPower(x, true);
                                    }
                                    if (config.power.entity != undefined && entity[config.power.entity].state == false && inverter.delayOffTimer == null
                                        && time.epoch - inverter.timeShutdown > 10 && inverter.warn.manualPowerOn == false && voltsInverter > 20.0) {
                                        log("inverter: " + config.name + " is still on but should be off - manual power on??", 2);
                                        inverter.warn.manualPowerOn = true;
                                    }
                                }
                            }
                        }
                    }
                    function checkCharging(x, power) {
                        let { voltsBat, ampsBat, wattsGrid, wattsSolar, sun, config, inverter } = pointers(x);
                        if (config.voltsRun != undefined) {
                            if (voltsBat >= config.voltsRun) checkConditions();
                            else inverter.delayStep = false;
                        } else checkConditions();
                        function checkConditions() {
                            if (config.sunRun != undefined) {
                                if (sun >= config.sunRun) {     // sunlight detection 
                                    trigger(power, "battery is charging, sun is high: " + voltsBat + ", switching on");
                                } else if (sun < config.sunRun) inverter.delayStep = false;
                            }
                            if (config.wattGrid != undefined) {
                                // console.log("checking watts for: " + x + "  wattsGrid: " + wattsGrid, " wattsSolar: " + wattsSolar)
                                if (wattsSolar > ((wattsGrid * config.wattGridMultiplier))) {
                                    trigger(power, "charge current is higher than grid power: " + wattsSolar + "w  " + voltsBat + "v, switching on");
                                }
                                if (wattsSolar <= (wattsGrid + (wattsGrid * config.wattGridMultiplier))) { inverter.delayStep = false; }
                            } else if (config.ampsRun != undefined) {
                                //  console.log("checking amps for: " + x + "  ampsBat: " + ampsBat, " voltsBat: " + voltsBat)
                                if (ampsBat >= config.ampsRun) {   // current detection 
                                    trigger(power, "battery is charging, current is high: " + ampsBat + "a  " + voltsBat + "v, switching on");
                                } else if (ampsBat < config.ampsRun) inverter.delayStep = false;
                            }
                            if (config.sunRun == undefined && config.ampsRun == undefined && config.wattGrid == undefined)
                                trigger(power, "battery is charging (volts trigger): " + voltsBat + ", switching on");
                        }
                        function trigger(power, message) {
                            cfg.solar.priority.queue.forEach((_, y) => {
                                st.priority.queue[y].delayStep = false;
                                st.priority.queue[y].delayStepSun = false;
                            });
                            if (inverter.delayStep == false) {
                                inverter.delayTimer = time.epoch;
                                inverter.delayStep = true;
                                return;
                            } else if (time.epoch - inverter.delayTimer >= config.delaySwitchOn) {
                                if (inverter.nightMode == true) {
                                    log("inverter: " + config.name + " - exiting night mode");
                                    inverter.nightMode = false;
                                }
                                log("inverter: " + config.name + " - " + message);
                                if (power == true) inverterPower(x, true);
                                return;
                            }
                        }
                    }
                    function pointers(x) {
                        let voltsBat, voltsInverter, ampsBat, sun, wattsInverter, wattsGrid, wattsSolar, battery, config = cfg.inverter[x];
                        if (config.battery != undefined) {
                            battery = cfg.battery[cfg.battery.findIndex(battery => battery.name === config.battery)];
                            if (battery.sensorVolt != undefined)
                                voltsBat = Math.round(entity[battery.sensorVolt].state * 10) / 10;
                            if (battery.sensorAmp != undefined) {
                                if (Array.isArray(battery.sensorAmp)) {
                                    let temp = 0;
                                    for (let y = 0; y < battery.sensorAmp.length; y++) {
                                        temp += parseFloat(entity[battery.sensorAmp[y]].state);
                                        ampsBat = Math.round(temp * 10) / 10;
                                    }
                                } else ampsBat = Math.round(entity[battery.sensorAmp].state * 10) / 10;
                            }
                            if (battery.sensorWatt != undefined)
                                wattsSolar = ~~parseFloat(entity[battery.sensorWatt].state);
                        }
                        if (config.wattGrid != undefined)
                            wattsGrid = entity[config.wattGrid].state;
                        if (config.espVolt != undefined)
                            voltsInverter = ~~parseFloat(entity[config.espVolt].state);
                        if (config.espWatt != undefined)
                            wattsInverter = ~~parseFloat(entity[config.espWatt].state);
                        if (cfg.solar.espSunlight != undefined)
                            sun = Math.round(entity[cfg.solar.espSunlight] * 100) / 100;
                        return { voltsBat, voltsInverter, ampsBat, sun, wattsInverter, wattsGrid, wattsSolar, battery, config, inverter: st.inverter[x] };
                    }
                }
                function inverterNightMode(x) {
                    let nightMode = null, config = cfg.inverter[x];
                    if (config.nightMode != undefined && config.nightMode.enable == true) {                     // undefined config returns false
                        if (time.hour == config.nightMode.startHour) {   // if nightMode match
                            if (config.nightMode.startMin != undefined) {
                                if (time.min >= config.nightMode.startMin) { nightMode = true; }
                            } else { nightMode = true; }
                        } else if (time.hour > config.nightMode.startHour
                            || time.hour < config.nightMode.endHour) { nightMode = true; }
                        else nightMode = false;
                    } else nightMode = false;
                    if (nightMode == true) {
                        if (st.inverter[x].nightMode == false) {
                            log("inverter: " + config.name + " - activating night mode");
                            st.inverter[x].nightMode = true;
                            return true;
                        } else return false;
                    } else return false;
                }
                function inverterPower(x, run, faulted, init) {
                    let config = cfg.inverter[x];
                    function toggle() {
                        let list, delay = 0;
                        if (run) list = config.transfer.switchOn; else list = config.transfer.switchOff;
                        for (let y = 0; y < list.length; y++) {
                            setTimeout(() => {
                                // log("inverter: " + config.name + " - intention: " + run + ", transferring ATS switch "
                                //      + y + " - state: " + list[y].state);
                                send(list[y].entity, list[y].state);
                            }, delay);
                            delay += ((list[y].delay == undefined) ? 500 : (list[y].delay * 1e3));
                        }
                        if (cfg.inverter[x].entity != undefined) send(cfg.inverter[x].entity, run);
                    }
                    if (run == true) {
                        if (time.epoch - st.inverter[x].step >= cfg.solar.cycleError) {
                            if (config.power.entity == undefined) {
                                //  log("inverter: " + config.name + " - transferring switches to inverter - wait");
                                toggle(run);
                            } else {
                                if (entity[config.power.entity].state == false) {
                                    send(config.power.entity, run);
                                    log("inverter: " + config.name + " - power on, delaying transfer switch 10 secs");
                                    toggle(run);
                                } else {
                                    log("inverter: " + config.name + " - already on - clearing shutdown delay");
                                    clearTimeout(st.inverter[x].delayOffTimer);
                                    st.inverter[x].delayOffTimer = null;
                                    //  log("inverter: " + config.name + " - transferring switches to inverter - wait");
                                    toggle(run);
                                }
                            }
                            st.inverter[x].state = true;
                            st.inverter[x].delayFaultStep = false;
                            setTimeout(() => { st.inverter[x].delayFaultStep = false }, 5e3);
                        } else {
                            log("inverter: " + config.name + " - cycling too frequently, epoch: "
                                + time.epoch + " step:" + st.inverter[x].step + " - inverter auto shutting down", 3);
                            // st.inverter[x].state = false;
                            send(cfg.solar.inverterAuto, false);
                            inverterPower(x, false);
                        }
                    } else {
                        if (config.power.entity == undefined) {
                            //  log("inverter: " + config.name + " - transferring switches to grid - wait");
                            toggle(run);
                        } else {
                            // log("inverter: " + config.name + " - transferring switches to grid - wait");
                            toggle(run);
                            if (config.power.delayOff == undefined) {
                                log("inverter: " + config.name + ", power off");
                                st.inverter[x].delayOffTimer = setTimeout(() => {
                                    send(config.power.entity, run);
                                    st.inverter[x].delayOffTimer = null;
                                }, 10e3);
                            } else {
                                log("inverter: " + config.name + " - shutdown will delay by:" + config.power.delayOff + " seconds");
                                st.inverter[x].delayOffTimer = setTimeout(() => {
                                    log("inverter: " + config.name + " - shutdown was delayed, now powering off");
                                    send(config.power.entity, run);
                                    st.inverter[x].delayOffTimer = null;
                                    st.inverter[x].timeShutdown = time.epoch;
                                }, config.power.delayOff * 1000);
                            }
                        }
                        if (!faulted) st.inverter[x].state = false;
                        else st.inverter[x].state = "faultedl";
                        if (!init) st.inverter[x].step = time.epoch;
                    }
                    st.inverter[x].delayStep = false;
                    st.inverter[x].delayVoltsStep = false;
                    st.inverter[x].delayFaultStep = false;
                    st.inverter[x].delaySunStep = false;
                    cfg.inverter.forEach((_, y) => { st.inverter[y].delayStep = false });
                    cfg.solar.priority.queue.forEach((_, y) => { st.priority.queue[y].delayStep = false });
                }
                function checkRoomTemp() {  // called by setTimeout every 1 sec 
                    let config = cfg.fan, fan = st.fan, wattsBat,
                        wattsInv = Math.round(st.sensor.watt[config.sensor.watt.inverter]), temp = 0,
                        tempUnit = cfg.sensor.temp[config.sensor.temp].unit;
                    if (Math.sign(st.sensor.watt[config.sensor.watt.battery]) == -1)
                        wattsBat = (Math.round(st.sensor.watt[config.sensor.watt.battery]) * -1);
                    else wattsBat = Math.round(st.sensor.watt[config.sensor.watt.battery]);
                    if (cfg.sensor.temp[config.sensor.temp].CtoF) {
                        temp = (Math.round((9 / 5 * st.sensor.temp[config.sensor.temp] + 32) * 10) / 10)
                    }
                    else temp = Math.round(st.sensor.temp[config.sensor.temp] * 10) / 10
                    switch (fan.run) {
                        case false:
                            if (temp >= config.temp.on) {
                                log("room temp is rising, fan turning on: " + temp + tempUnit);
                                fanSwitchNow();
                                fan.warn = true;
                                return;
                            }
                            if (config.sun != undefined) {
                                if (entity[cfg.solar.espSunlight].state >= config.sun.on) {
                                    if (fanSwitch(true)) {
                                        log("sun is high: " + entity[cfg.solar.espSunlight].state + ", fan turning on: " + temp + tempUnit);
                                        return;
                                    }
                                } else fan.delayStep = false;
                            } else if (config.watts != undefined) {
                                if (config.watts.night != undefined && st.inverter[0].nightMode == true) {
                                    if (wattsBat >= config.watts.night.on) {
                                        if (fanSwitch(true)) {
                                            log("(nightmode) battery power is rising: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                            return;
                                        }
                                    }
                                    if (wattsInv >= config.watts.night.on) {
                                        if (fanSwitch(true)) {
                                            log("(nightmode) inverter power is rising: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                            return;
                                        }
                                    }
                                    if (wattsBat < config.watts.night.on && wattsInv < config.watts.night.on) fan.delayStep = false;
                                } else {
                                    if (wattsBat >= config.watts.on) {
                                        if (fanSwitch(true)) {
                                            log("battery power is rising: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                            return;
                                        }
                                    }
                                    if (wattsInv >= config.watts.on) {
                                        if (fanSwitch(true)) {
                                            log("inverter power is rising: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning on ");
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
                                if (entity[cfg.solar.espSunlight].state <= config.sun.off) {
                                    if (fanSwitch(false)) {
                                        log("room has cooled down and sun is low, fan turning off: " + temp + tempUnit);
                                        return;
                                    }
                                } else fan.delayStep = false;
                            } else if (config.watts != undefined && temp <= config.temp.off) {
                                if (config.watts.night != undefined && st.inverter[0].nightMode == true) {
                                    if (wattsBat <= config.watts.night.off) {
                                        if (fanSwitch(false)) {
                                            log("(nightmode) battery power has lowered: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                            return;
                                        }
                                    }
                                    if (wattsInv <= config.watts.night.off) {
                                        if (fanSwitch(false)) {
                                            log("(nightmode) inverter power has lowered: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                            return;
                                        }
                                    }
                                    if (wattsBat > config.watts.night.off && wattsInv > config.watts.night.off) fan.delayStep = false;
                                } else {
                                    if (wattsBat <= config.watts.off) {
                                        if (fanSwitch(false)) {
                                            log("battery power has lowered: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                            return;
                                        }
                                    }
                                    if (wattsInv <= config.watts.off) {
                                        if (fanSwitch(false)) {
                                            log("inverter power has lowered: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                            return;
                                        }
                                    }
                                    if (wattsBat > config.watts.off && wattsBat > config.watts.off) fan.delayStep = false;
                                }
                            } else {
                                if (temp <= config.temp.off) {
                                    if (fanSwitch(false)) {
                                        log("room has cooled, fan turning off: " + temp + tempUnit);
                                        return;
                                    }
                                } else fan.delayStep = false;
                            }
                            break;
                        case null:
                            fan.run = entity[config.espPower].state;
                            log("syncing fan state: " + fan.run);
                            break;
                    }
                    if (temp >= config.temp.warn && fan.warn == false) {
                        if (temp >= config.temp.error && fan.error == false) {
                            log("room is overheating!!!: " + temp
                                + tempUnit, 3);
                            fanSwitchNow();
                            fan.error = true;
                            fan.warn = true;
                            return;
                        }
                        log("room is starting to overheat: " + temp
                            + tempUnit, 2);
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
                        send(config.espPower, true);
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
                                send(config.espPower, newState);
                                fan.delayStep = false;
                                return true;
                            }
                        } else if (time.epoch - fan.delayTimer >= config.delayOff) {
                            fan.run = newState;
                            send(config.espPower, newState);
                            fan.delayStep = false;
                            return true;
                        }
                    }
                }
                function checkGrid() {
                    // global function to give h m s?
                    // log grid blackout statistics
                    // log sunlight daily name
                    // grid statistics , save to nv
                    if (cfg.grid.espVoltage) {
                        let volts = ~~parseFloat(entity[cfg.grid.espVoltage].state), config = cfg.grid, grid = st.grid;
                        if (time.boot > 10) {
                            if (volts >= config.voltMax) {
                                if (grid.state != false) {
                                    log("grid over-voltage: " + volts + "v", 2);
                                    blackout();
                                } else grid.delayOn = time.epoch;
                            } else if (volts < config.voltMin && volts > 20.0) {
                                if (grid.state != false) {
                                    log("grid under-voltage: " + volts + "v", 2);
                                    blackout();
                                } else grid.delayOn = time.epoch;
                            } else if (volts < 20.0 || Number.isFinite(volts) == false) {
                                if (grid.state != false) {
                                    log("grid blackout: " + volts + "  raw: " + entity[cfg.grid.espVoltage].state, 2);
                                    blackout();
                                } else grid.delayOn = time.epoch;
                            } else if (grid.state == null) {
                                log("grid is online: " + volts + "v");
                                grid.state = true;
                            } else if (grid.state == false) {
                                if (time.epoch - grid.delayOn >= config.delayRecover) {
                                    let outage = (time.epoch - st.grid.timerBlackout);
                                    log("grid back online: " + volts + "v,  offline for: " + outage + "s", 2);
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
                }
                function checkWelder() {    // needs to be rewritten for  cfg.inverter.sensorAmps or esp direct
                    if (entity[cfg.inverter[0].espPower].state >= cfg.inverter[0].welderWatts ||  // check inverter meter
                        entity[cfg.grid.espPower].state >= cfg.inverter[0].welderWatts) {           // check grid meter
                        st.welderStep = time.epoch;                   // extend welter timeout if still heavy loads
                        if (st.welder == false) {
                            log("welder detected: " + entity[cfg.inverter[0].espPower].state + "w - shutting down all pumps", 2);
                            st.welder = true;
                            st.priority[0] = false;
                            send("input_boolean.auto_compressor", false);
                            send("input_boolean.auto_pump_transfer", false);
                            //    send("uth-relay1", false);
                            // turn on fan
                        }
                    } else {
                        if (st.welder == true && time.epoch - st.welderStep >= cfg.inverter[0].welderTimeout) {
                            log("welder not detected: " + entity[cfg.inverter[0].espPower].state + "w");
                            st.welder = false;
                        }
                    }
                }
                function checkBattery() {
                    for (let x = 0; x < cfg.battery.length; x++) {
                        let config = cfg.battery[x], bat = st.battery[x], name = cfg.battery[x].name;
                        if (entity[config.sensorVolt]) {
                            volts = Math.round(entity[config.sensorVolt].state * 100) / 100;
                            if (nv.battery[name].floating == null) {
                                if (volts <= config.voltsFullCharge && volts > config.voltsFloatStop) {
                                    log("battery charger is floating: " + volts + "v");
                                    nv.battery[name].dischargeReset = true;
                                    nv.battery[name].charge.today = 0;
                                    nv.battery[name].cycles++;
                                    nv.battery[name].floating = true;
                                }
                                else nv.battery[name].floating = false
                            }
                            if (nv.battery[name].floating == false && volts >= config.voltsFullCharge) {
                                log("battery charger is floating: " + volts + "v");
                                nv.battery[name].cycles++;
                                nv.battery[name].floating = true;
                            }
                            if (nv.battery[name].floating == true) {       // consider blocking this until nighttime or some other criteria 
                                if (volts <= config.voltsFloatStop) {
                                    if (bat.floatStep == false) {
                                        bat.floatTimer = time.epoch;
                                        bat.floatStep = true;
                                    } else if (time.epoch - bat.floatTimer >= 30) {
                                        log("battery charger is no longer floating: " + volts + "v");
                                        nv.battery[name].floating = false;
                                    }
                                } else bat.floatStep = false;
                            }
                            bat.percent = Math.round(voltPercent(volts, config));
                            // console.log("bat percent: " + bat.percent)
                            send("battery_" + config.name, bat.percent, "%");
                            if (config.sensorWatt != undefined) {
                                let watts = entity[config.sensorWatt].state;
                                if (Number.isFinite(watts)) {
                                    if (Math.sign(watts) == -1) bat.whNeg += watts;
                                    else bat.whPos += watts;
                                }
                                if (bat.min == null) {
                                    log("starting recorder for battery - " + config.name);
                                    bat.min = time.min;
                                }
                                if (time.min != bat.min) {
                                    let charge = (bat.whPos / 60 / 60), discharge = (bat.whNeg / 60 / 60) * -1;
                                    if (time.hour == 3 && time.min == 0) {
                                        nv.battery[name].dischargeReset = false;
                                        nv.battery[name].charge.today = 0;
                                    }
                                    if (time.hour == 12 && time.min == 0) {
                                        if (nv.battery[name].dischargeReset == false) {
                                            nv.battery[name].dischargeReset = true;
                                            nv.battery[name].discharge.today = 0;
                                        }
                                    }
                                    recorder(nv.battery[name].charge, charge, "battery_" + config.name + "_charge");
                                    recorder(nv.battery[name].discharge, discharge, "battery_" + config.name + "_discharge");
                                    nv.battery[name].charge.today += charge;
                                    nv.battery[name].discharge.today += discharge;
                                    nv.battery[name].charge.total += charge;
                                    nv.battery[name].discharge.total += discharge;
                                    send("kwh_battery_" + config.name + "_charge_today", (Math.round((nv.battery[name].charge.today / 1000) * 10) / 10), "KWh");
                                    send("kwh_battery_" + config.name + "_discharge_today", (Math.round((nv.battery[name].discharge.today / 1000) * 10) / 10), "KWh");
                                    //send("battery_" + config.name + "_charge_total", Math.round(nv.battery[name].charge.total / 1000), "KWh");
                                    //send("battery_" + config.name + "_discharge_total", Math.round(nv.battery[name].discharge.total / 1000), "KWh");
                                    send("battery_" + config.name + "_cycles", nv.battery[name].cycles, "x");
                                    bat.whPos = 0;
                                    bat.whNeg = 0;
                                    bat.min = time.min;

                                    let ceff = 0, deff = 0;
                                    for (let y = 0; y < nv.battery[name].charge.day.length; y++)
                                        ceff += nv.battery[name].charge.day[y];
                                    for (let y = 0; y < nv.battery[name].discharge.day.length; y++)
                                        deff += nv.battery[name].discharge.day[y];
                                    send("battery_" + config.name + "_efficiency", Math.round(((deff / ceff) * 100) * 10) / 10, "%");
                                }
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
                    for (let x = 0; x < cfg.sensor.amp.length; x++) {
                        let config = cfg.sensor.amp[x], sum = 0;
                        entity[config.name] ||= {};
                        let amps = entity[config.name];
                        if (config.entity > 1) {
                            for (let y = 0; y < config.entity.length; y++) {
                                let value = parseFloat(entity[config.entity[y]].state)
                                if (Number.isFinite(value)) {
                                    if (config.combineNegative === true) { sum += entity[config.entity[y]].state }
                                    else if (Math.sign(value) != -1) { sum += entity[config.entity[y]].state }
                                    //   else sum += (entity[config.entity[y]].state * -1)
                                }
                            }
                            amps.state = (Math.round(sum * 10) / 10);
                            amps.update = time.epoch;
                            // console.log("entity: " + config.name + " -  state: " + amps.state)
                            send("amp_" + config.name, amps.state, "A");
                        }
                    }
                    for (let x = 0; x < cfg.sensor.watt.length; x++) {
                        let sum = 0, config = cfg.sensor.watt[x];
                        entity[config.name] ||= {};
                        let watts = entity[config.name];
                        if (config.entity != undefined) {
                            if (config.entity.length > 1 || config.solarPower == true) {
                                for (let y = 0; y < config.entity.length; y++) {
                                    let value = parseFloat(entity[config.entity[y]]?.state)
                                    if (Number.isFinite(value)) {
                                        if (config.combineNegative === true) { sum += entity[config.entity[y]].state }
                                        else if (Math.sign(value) != -1) { sum += entity[config.entity[y]].state }
                                        //   else sum += (entity[config.entity[y]].state * -1)
                                    }
                                }
                                //  console.log("testing entity: "+ config.name + " - sum: " + sum)
                                if (config.solarPower == true) {
                                    let batWatts = entity[config.batteryWatt].state;
                                    if (Math.sign(batWatts) == -1 && batWatts <= ((sum) * -1)) {
                                        send("watt_" + config.name, 0, "kW");
                                    } else {
                                        if (Number.isFinite(batWatts))
                                            watts.state = batWatts + sum;
                                        send("watt_" + config.name, ((batWatts + sum) / 1000).toFixed(2), "kW");
                                    }
                                } else {
                                    watts.state = ~~sum;
                                    send("watt_" + config.name, (sum / 1000).toFixed(2), "kW");
                                }
                            }
                        } else if (config.sensorAmp != undefined && config.sensorVolt != undefined) {
                            let amps = entity[config.sensorAmp].state, volts = entity[config.sensorVolt]?.state;
                            if (Number.isFinite(volts * amps)) watts.state = volts * amps;
                            else (watts.state = 0.0);
                            send("watt_" + config.name, (watts.state / 1000).toFixed(2), "kW");
                        }
                        if (config.record == true) {
                            if (Number.isFinite(watts.state) && Math.sign(watts.state) != -1)
                                st.recorder.watt[config.name].wh += watts.state;
                            if (st.recorder.watt[config.name].min == null) {
                                log("starting recorder for watt sensor - " + config.name);
                                st.recorder.watt[config.name].min = time.min;
                            } else if (time.min != st.recorder.watt[config.name].min) {
                                let whFinal = ((st.recorder.watt[config.name].wh / 60) / 60);
                                nv.sensor.watt[config.name].total += whFinal;
                                recorder(nv.sensor.watt[config.name], whFinal, config.name);
                                st.recorder.watt[config.name].wh = 0;
                                st.recorder.watt[config.name].min = time.min;
                            }
                        }
                        watts.update = time.epoch;
                    }
                }
                function calcSolarPower() {
                    if (st.sunlight[sunConverted] == undefined) {
                        //   log("creating new solar power name: " + sunConverted);
                        st.sunlight[sunConverted] = { low: solarPower, high: solarPower, average: null };
                    } else {
                        if (solarPower < st.sunlight[sunConverted].low) {
                            st.sunlight[sunConverted].low = solarPower;
                            st.sunlight[sunConverted].average = Math.round(st.sunlight[sunConverted].low + st.sunlight[sunConverted].high / 2);
                            //     log("solar power name: " + sunConverted + "  low is being updated: " + solarPower + "  new average: " + st.sunlight[sunConverted].average);
                        }
                        if (solarPower > st.sunlight[sunConverted].high) {
                            st.sunlight[sunConverted].high = solarPower;
                            st.sunlight[sunConverted].average = Math.round(st.sunlight[sunConverted].low + st.sunlight[sunConverted].high / 2);
                            //    log("solar power name: " + sunConverted + "  high is being updated: " + solarPower + "  new average: " + st.sunlight[sunConverted].average);
                        }
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

                    send("kwh_" + name + "_total", Math.round((obj.total / 1000) * 10) / 10, "kWh");
                    send("kwh_" + name + "_hour", Math.round((lastHour / 1000) * 100) / 100, "kWh");
                    send("kwh_" + name + "_day", Math.round((lastDay / 1000) * 100) / 100, "kWh");
                    send("kwh_" + name + "_30days", Math.round((last30Days / 1000) * 10) / 10, "kWh");
                    send("kwh_" + name + "_12months", Math.round((last30Days / 1000)), "kWh");
                }
                function pointers() {
                    log = (m, l) => slog(m, l, _name);
                    nvMem[_name] ||= {};
                    nv = nvMem[_name];
                    if (config[_name]) cfg = config[_name];
                    if (state[_name]) st = state[_name];
                }
            } catch (error) { console.error(error) }
        }
    }
};

