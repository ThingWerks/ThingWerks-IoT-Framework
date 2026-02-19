module.exports = {
    entity: {
        subscribe: [
            "input_boolean.auto_bubon",
            "input_boolean.auto_freezer",
            "input_boolean.auto_irrigatiion",

            "input_number.profile_bubon",
            "input_number.timer_oneshot_bubon",
            "input_number.timer_oneshot_irrigation",

            "input_button.oneshot_irrigation",
            "input_button.oneshot_bubon",
            "Button Bodega Water Filtered",
            "Button Irrigation Entrance",
            "Button Water Groogies",
            "Button Water Irrigation House Back",
            "Button Water Irrigation Piggary",
            "Button Water Irrigation Dalom",
            "Button-eWeLink",
            "Switch Kitchen Pump",

            "psi-main",
            "psi-irrigation",
            "flow-raw-bubon",
            "flow-raw-carbon-shop",
            "flow-raw-carbon-groogies",
            "shop-relay1-pump",
            "solar-relay3-pump-bubon",
            "flow-raw-irrigation"
        ],
        sync: {},
        heartbeat: {
            "esp_heartbeat_solar": 3000,
            "esp_heartbeat_pump": 3000
        },
        create: [
            "clear-oneShot"
        ]
    },
    config: {
        Pumper: {
            pump: {
                "1.5hp jetpump": {
                    power: {
                        entity: "solar-relay3-pump-bubon",
                    },

                    valve: {
                        entity: undefined,
                        startDelay: undefined,
                        stopDelay: undefined,
                    },
                    team: {
                        type: "assist",     // parallel, changeover, assist, 
                        priority: 0,
                        members: [],
                    },
                    flow: {
                        entity: "bubon",
                        startWarn: 15,
                        startError: 10,
                        startCheckTime: 5,
                        runWarn: 8,
                        runError: 5,
                    },
                    press: {
                        entity: "bubon",
                        minRise: 22,
                        minRiseTime: 20,
                        minFall: 15
                    },
                    vfd: {
                        entity: undefined,
                        type: "pwm",            // pwm, modbus, HDI, 4P
                        startSet: undefined,
                        rampSpeedUp: 20,
                        rampSpeedDown: 20,
                        pwm: [],
                    },
                }
            },
            dd: [       // config for the Demand/Delivery automation function, 1 object for each DD system
                {   // DD system example
                    name: "Bubon",       // Demand Delivery system 2d
                    enable: true,
                    ha: {
                        auto: "input_boolean.auto_bubon",           // home assistant auto toggle ID number (specified above in cfg.ha config)
                        solar: "input_boolean.auto_solar_bubon",    // solar automation boolean/toggle
                        // turbo: 5,                                // secondary high stop pressure point
                        profile: "input_number.profile_bubon",      // pressure profile
                        // reserve: 9,                              // ha entity for reserve tank/pump
                    },
                    oneShot: {
                        buttons: {// single shot pump automation run button, must be array 
                            "Switch Kitchen Pump": { oneShot: "remote_button_short_press", stop: "remote_button_long_press" },
                            "Button Bodega Water Filtered": { oneShot: "remote_button_short_press", stop: "remote_button_long_press" },
                            "Button Water Groogies": { oneShot: "remote_button_short_press", stop: "remote_button_long_press" },
                            "input_button.oneshot_bubon": { oneShot: "remote_button_short_press", stop: "remote_button_long_press" },
                        },
                        durationEntity: "input_number.timer_oneshot_bubon",  // REQUIRED - single shot pump run time length
                        extend: true,                                    // extend OneShot timer after last usage
                        // duration: 10, // duration of oneShot in minutes
                    },
                    pump: [
                        {
                            name: "1.5hp jetpump",
                            entity: "solar-relay3-pump-bubon",  // ESP/HA cfg ID number
                            class: "primary", // for reserve pump only as of now
                            flow: {
                                sensor: "bubon",    // flow sensor number (in cfg.sensor.flow block)
                                startWarn: 11,      // min start flow before triggering notification (useful for filters)
                                startError: 9,     // minimum flow rate pump must reach at start
                                startWait: 6,       // seconds to wait before checking flow after pump starts
                                runError: 5,        // flow rate to fault 
                                runStop: 10         // flow rate to stop 
                            },
                            input: {

                            },

                        },
                    ],
                    press: {
                        input: {

                        },
                        output: {
                            sensor: "bubon", // pressure sensor number (in cfg.sensor.press block)
                            profile: [{ start: 22 }, { start: 45 }, { start: 50 }],
                            // profile: [{ start: 22, stop: 35 }, { start: 45, stop: 59 }, { start: 50, stop: 62 }],
                            riseTime: undefined,
                        },
                    },
                    fault: {
                        retryCount: 2,      // times to try pump restart
                        retryWait: 10,      // time in seconds to wait for retry
                        retryFinal: 1,      // time in minutes to wait for final retry
                        runLongError: 10,   // max run time in minutes
                        runLongWarn: 5,     // max run time in minutes
                        // cycleCount: 0,   // max cycle times per cycleTime window
                        //  cycleTime: 10,  // max cycleTime time window  (in seconds)
                        flushWarning: false,
                    },
                },
                {                           // DD system example
                    name: "Irrigation",
                    enable: true,
                    ha: {
                        auto: "input_boolean.auto_irrigatiion",                 // home assistant auto toggle ID number (specified above in cfg.ha config)
                        // solar: "input_boolean.auto_solar_bubon",             // solar automation boolean/toggle
                        // turbo: 5,                                            // secondary high stop pressure point
                        //   profile: "input_number.profile_bubon",             // pressure profile
                        // reserve: 9,                                          // ha entity for reserve tank/pump

                    },
                    oneShot: {
                        buttons: { // single shot pump automation run button, must be array 
                            /*
                            old buttons:
                                "remote_button_short_press" "remote_button_short_press" "remote_button_double_press"
                            new buttons: true, false and "toggle"
                            "any" can be used to trigger the action for any state
                            */
                            "Button Water Irrigation House Back": { oneShot: "remote_button_short_press", stop: "remote_button_long_press" },
                            "Button Water Irrigation Dalom": { oneShot: "remote_button_short_press", stop: "remote_button_short_press" },
                            "Button Water Irrigation Piggary": { oneShot: "remote_button_short_press", stop: "remote_button_long_press" },
                            "Button Irrigation Entrance": { oneShot: "remote_button_short_press", stop: "remote_button_long_press" },
                            "input_button.oneshot_irrigation": { oneShot: "any" },
                            "Button-eWeLink": { oneShot: ["toggle", true, false], duration: 5 },
                        },
                        // durationEntity: "input_number.timer_oneshot_irrigation",  // REQUIRED - single shot pump run time length
                        duration: 20,           // duration of oneShot in minutes
                        pumpUp: true,           // top off the tank                   
                        interrupt: false,       // interrupt current pump operation if timeout reached
                        extend: true,           // extend OneShot timer after last usage
                        extendLiterMin: 30.0,   // minimum liters pumped to keep extending
                        extendRetry: 2,         // extension short cycle evaluation allowance window    
                    },
                    pump: [
                        {
                            name: "1.5hp LuckyPro",
                            entity: "shop-relay1-pump",  // ESP/HA cfg ID number
                            flow: {
                                sensor: "irrigation",   // flow sensor number (in cfg.sensor.flow block)
                                startWarn: 40,          // min start flow before triggering notification (useful for filters)
                                startError: 10,         // REQUIRED - minimum flow rate pump must reach at start
                                startWait: 6,           // seconds to wait before checking flow after pump starts
                                // runWarn: 3,          // optional - flow rate during operation which will cause warning
                                // runError: 3,         // optional - flow rate during operation which will cause fault
                                runStop: 5,             // flow rate to gracefully stop pump
                            },
                            press: {
                                input: {

                                }
                            }
                        },
                    ],
                    press: {
                        output: {
                            sensor: "irrigation", // pressure sensor number (in cfg.sensor.press block)
                            profile: [{ start: 48 }],
                        },
                    },
                    fault: {
                        retryCount: 0,      // optional - times to try pump restart
                        retryWait: 10,      // time in seconds to wait for retry
                        // retryFinal: 2,   // time in minutes to wait for final retry
                        runLongError: 40,   // max run time in minutes
                        runLongWarn: 5,     // max run time in minutes
                        cycleCount: 0,      // max cycle times per cycleTime window
                        cycleTime: 10,      // max cycleTime time window  (in seconds)
                        cycleMinFlow: 30,   // min water pumped per cycle
                        flushWarning: false,
                    },
                }
            ],
            fountain: [
                {
                    name: "Fountain",
                    intervalOn: 6,          // run duration in minutes
                    intervalOff: 90,
                    haAuto: 6,
                    pump: 12,
                    flow: {
                        entity: 2,              // flow meter config ID number
                        startWarn: 10,      // min start flow before triggering notification (useful for filters)
                        startError: 2,      // minimum flow rate pump must reach at start
                        startWait: 6,       // seconds to wait before checking flow after pump starts
                    }
                }
            ],
            sensor: {
                press: [     // config for tanks used with Home Assistant -- these tanks get sent back to HA as sensors
                    {   // Tank 1 example
                        name: "bubon",       // tank name (do not use spaces or dash, underscore only)
                        unit: "psi",              // measurement unit (i.e. PSI or meters) "m" or "psi" only
                        entity: "psi-main",                  // HA or ESP ID number, corresponds to array number (zero indexed) 
                        // levelFull: 3.90,        // for tanks not assigned to DD systems - meter reading only (HA % sensor)
                        average: 1,            // amount of samples to average over
                        zero: 0.493,      // calibration, minimum value when sensor is at atmospheric pressure 
                        pressureRating: 100,     // max rated pressure of transducer in PSI
                    },
                    {   // Tank 1 example
                        name: "irrigation",
                        unit: "psi",
                        entity: "psi-irrigation",
                        // levelFull: 3.90,       
                        average: 1,
                        zero: 0.479,
                        pressureRating: 150,
                    },
                ],
                flow: [      // config for flow meters used with Home Assistant -- these flow meters get sent back to HA as sensors
                    /*
                    { size: "3/8", name: "Sea YF-S402C", pulse: 23.0, flow: ".3-10 LPM" },
                    { size: "1/2", name: "Sea YF-S201", pulse: 7.5, flow: "1-30 LPM" },
                    { size: "3/4", name: "FS300A-G3/4", pulse: 5.5, flow: "1-60 LPM" },
                    { size: "1", name: "FS400A-G1", pulse: 4.8, flow: "1-60 LPM" },
                    { size: "1", name: "Sea YF-G1", pulse: 1, flow: "2-100 LPM" },
                    { size: "1-1/4", name: "Sea DN32", pulse: .45, flow: "120 LPM" },
                    { size: "1-1/2", name: "Sea YF-DN40", pulse: .45, flow: "5-150 LPM" },
                    { size: "2", name: "Sea YF-DN50", pulse: .2, flow: "10-200 LPM" },
                    { size: "3", name: "DN80", pulse: .55, flow: "30-500" },
                     */
                    {   // flow meter 1 example
                        name: "bubon",           // flow meter name that will appear in HA as a sensor (do not use spaces or dash, underscore only)
                        entity: "flow-raw-bubon",                  // HA or ESP ID number, corresponds to array number (zero indexed) 
                        pulse: 4.8,             // pulse calculation factor for your specific flow meter
                        unit: "m3",             // unit of measurement (cubic meters)
                    },
                    {
                        name: "carbon_shop",
                        entity: "flow-raw-carbon-shop",
                        pulse: 7.5,
                        unit: "m3",
                    },
                    {
                        name: "carbon_groogies",
                        entity: "flow-raw-carbon-groogies",
                        pulse: 7.5,
                        unit: "m3",
                    },
                    {
                        name: "irrigation",
                        entity: "flow-raw-irrigation",
                        pulse: .45,
                        unit: "m3",
                    },
                    {
                        name: "carbon_total",
                        entityAdd: ["carbon_groogies", "carbon_shop"],
                        entitySubtract: [],
                        unit: "m3",
                    },
                ]
            },
        }
    }
}
