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
    config: {
        Solar: {
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
                            // offSun: 2.35,        // sunlight level to deactivate this system - independent of battery level
                            offAmps: -15.0,
                            offAmpsFloat: -30.0,
                            // onVolts: 54.0,       // battery level to turn on system - in addition to sunlight if configured
                            // offVolts: 53.7,      // battery level to turn off system - independent of battery level
                            delayOff: 300,          // set delay for shutdown criteria hold time 
                            // inverter: 0          // optional - which inverter carries the load - if not specified, inverter 0 is used
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
                        startHour: 15,              // hour to start night mode  
                        startMin: 30,               // minute to start night mode
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
                    delaySwitchOn: 20,  //20
                    delaySwitchOff: 30, //30
                    gridWatt: "grid_power",         // optional - esp ID for grid watt sensor - needed to switch back fromm gid (comparing power)
                    gridWattMultiplier: 1.1,        // multiple of charge power exceeding grid power needed to switch load to inverter
                    inverterWatts: "inverter_11kw", // optional - used for transfer switch (back to inverter)
                    inverterWattsSwitch: false,     // experimental - switch on last switch off watts
                    // inverterVolts: 26,           // optional - AC output voltage, used to sense inverter output voltage fault
                    // blackout: true,              // optional - switch to inverter on blackout if voltage is less than (voltsRun)
                    // blackoutVoltMin: 54.0,       // optional - minimum voltage needed to recover from blackout 
                    // voltsRun: 54.0,              // optional - volts to start inverter - in addition to sunlight/amps if configured
                    voltsStop: 52.0,                // volts to stop inverter - will stop Independent of sunlight level
                    sunRunFloat: 0.7,               // optional - sunlight sensor level to start inverter (while floating) 
                    sunRun: 0.7,                    // optional - sunlight sensor level to start inverter (while charging)                                
                    ampsRun: 45.0,                  // optional - charger amp level to transfer load to inverter - (must use espgridWatt if not)
                    ampsStop: -5.0,                 // optional - discharge amp level to transfer load to grid 
                    ampsStopFloat: -10.0,           // optional - discharge amp level to transfer load to grid when floating
                    // ampsStopVoltsMin: 52.5,      // optional - minimum voltage needed to enable amp stop switching 
                    battery: "main",                // optional - battery bank assigned to this inverter - required to use ampsStopFloat
                    floatRetryInterval: undefined,
                    // welderWatts: 4000,              // optional - high load detection
                    // welderTimeout: 240,             // optional - time in seconds to observe and reset
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
                        zero: 5000, //5002
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
                        record: true
                    },
                    {
                        name: "inverter_10kw",         // all inverters
                        entity: ["pzem-ram-water_watts", "pzem-ram-house_watts"],
                        record: true
                    },
                    {
                        name: "inverter_all",         // all inverters
                        entity: ["inverter_11kw", "inverter_10kw"],
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
                    voltsFullCharge: 58.1,
                    voltsFloatStop: 57.0,
                    ampsResetDischarge: 50.0,
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
        },
    }
}
