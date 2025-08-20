#!/usr/bin/node
let
    cfg = {
        moduleName: "Pumper",
        telegram: {
            password: "test",
        },
        ha: {
            subscribe: [
                "input_boolean.auto_bubon",
                "input_number.profile_bubon",
                "input_number.timer_oneshot_bubon",
                "input_number.timer_oneshot_irrigation",
                "Switch Kitchen Pump",
                "input_number.timer_freezer_on",
                "input_number.timer_freezer_off",
                "switch.relay_bodega_freezer_fujidenzo",
                "input_boolean.auto_freezer",
                "Button Bodega Water Filtered",
                "input_boolean.auto_irrigatiion",
                "Button Irrigation Entrance",
                "Button Water Groogies",
                "Button Water Irrigation House Back",
            ],
            sync: [
                ["switch.switch_test", "input_boolean.lights_stairs",],
                ["switch.lights_outside_bedroom", "input_boolean.lights_bedroom_outside"],
                ["switch.lights_outside_entrance", "input_boolean.lights_house_entrance"],
            ]
        },
        esp: {
            subscribe: [
                "psi-main", ,
                "psi-irrigation",
                "flow-raw-bubon",
                "flow-raw-carbon-shop",
                "flow-raw-carbon-groogies",
                "shop-relay1-pump",
                "solar-relay3-pump-bubon",
                "flow-raw-irrigation"
            ],
            heartbeat: [      // heartbeats for ESPHome devices 
                { name: "esp_heartbeat_solar", interval: 3 }, // interval is in seconds
                { name: "esp_heartbeat_pump", interval: 3 }
            ],
        },
        coreData: [
            "test", "test4",
        ],
        dd: [       // config for the Demand/Delivery automation function, 1 object for each DD system
            {   // DD system example
                name: "Bubon",       // Demand Delivery system 2d
                ha: {
                    auto: "input_boolean.auto_bubon",           // home assistant auto toggle ID number (specified above in cfg.ha config)
                    solar: "input_boolean.auto_solar_bubon",    // solar automation boolean/toggle
                    // turbo: 5,                                // secondary high stop pressure point
                    profile: "input_number.profile_bubon",      // pressure profile
                    // reserve: 9,                              // ha entity for reserve tank/pump
                    oneShot: ["Switch Kitchen Pump", "Button Bodega Water Filtered"],   // single shot pump automation run button, must be array 
                    oneShotTimer: "input_number.timer_oneshot_bubon", // single shot pump run time length
                    oneShotExtend: true,
                },
                pump: [
                    {
                        name: "1.5hp jetpump",
                        entity: "solar-relay3-pump-bubon",  // ESP/HA cfg ID number
                        flow: {
                            sensor: "bubon",   // flow sensor number (in cfg.sensor.flow block)
                            startWarn: 15,          // min start flow before triggering notification (useful for filters)
                            startError: 10,         // minimum flow rate pump must reach at start
                            startWait: 6,           // seconds to wait before checking flow after pump starts
                            runError: 5,
                            //     stop: 15
                        },
                        press: {
                            input: {

                            }
                        }
                    },
                ],
                press: {
                    output: {
                        sensor: "bubon", // pressure sensor number (in cfg.sensor.press block)
                        profile: [{ start: 22, stop: 35 }, { start: 45, stop: 62 }, { start: 50, stop: 62 }],
                    },
                },
                fault: {
                    retryCount: 2,      // times to try pump restart
                    retryWait: 10,      // time in seconds to wait for retry
                    retryFinal: 2,      // time in minutes to wait for final retry
                    runLongError: 10,   // max run time in minutes
                    runLongWarn: 5,     // max run time in minutes
                    cycleCount: 0,      // max cycle times per cycleTime window
                    cycleTime: 10,      // max cycleTime time window  (in seconds)
                    flushWarning: false,
                },
            },
            {                           // DD system example
                name: "Irrigation",                                         // Demand Delivery system 2d
                ha: {
                    auto: "input_boolean.auto_irrigatiion",                 // home assistant auto toggle ID number (specified above in cfg.ha config)
                    // solar: "input_boolean.auto_solar_bubon",             // solar automation boolean/toggle
                    // turbo: 5,                                            // secondary high stop pressure point
                    //   profile: "input_number.profile_bubon",             // pressure profile
                    // reserve: 9,                                          // ha entity for reserve tank/pump
                    oneShot: ["Button Irrigation Entrance", "Button Water Irrigation House Back"],  // single shot pump automation run button, must be array 
                    oneShotTimer: "input_number.timer_oneshot_irrigation",  // REQUIRED - single shot pump run time length
                    oneShotExtend: true,                                    // extend OneShot timer after last usage
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
                            //-----     runWarn: 3,             // optional - flow rate during operation which will cause warning
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
                        profile: [{ start: 40, stop: 62 }],
                    },
                },
                fault: {
                    retryCount: 0,      // optional - times to try pump restart
                    retryWait: 10,      // time in seconds to wait for retry
                    // retryFinal: 2,   // time in minutes to wait for final retry
                    runLongError: 10,   // max run time in minutes
                    runLongWarn: 5,     // max run time in minutes
                    cycleCount: 0,      // max cycle times per cycleTime window
                    cycleTime: 10,      // max cycleTime time window  (in seconds)
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
                    voltageMin: 0.493,      // calibration, minimum value when sensor is at atmospheric pressure 
                    pressureRating: 100,     // max rated pressure of transducer in PSI
                },
                {   // Tank 1 example
                    name: "irrigation",
                    unit: "psi",
                    entity: "psi-irrigation",
                    // levelFull: 3.90,       
                    average: 1,
                    voltageMin: 0.479,
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
            ],
        },
    },
    automation = {
        Pumper: function (autoName) {
            if (!auto[autoName]) {
                auto[autoName] = {               // initialize automation volatile memory
                    init: true, dd: [], ha: { pushLast: [] }, fountain: []
                };
                var state = auto[autoName];
                var log = (m, l) => slog(m, l, autoName);
                if (cfg.sensor.flow != undefined) {
                    if (nv.flow == undefined) {             // initialize flow meter NV memory if no NV data
                        log("initializing flow meter data...");
                        nv.flow = {};
                        for (let x = 0; x < cfg.sensor.flow.length; x++) {
                            let flowName = cfg.sensor.flow[x].name;
                            if (!nv.flow[flowName])
                                nv.flow[flowName] = { total: 0, today: 0, min: [], hour: [], day: [] }
                            for (let y = 0; y < 60; y++) nv.flow[flowName].min.push(0);
                            for (let y = 0; y < 24; y++) nv.flow[flowName].hour.push(0);
                            for (let y = 0; y < 30; y++) nv.flow[flowName].day.push(0);
                        }
                        log("writing NV data to disk...");
                        file.write.nv();
                    }
                }
                cfg.sensor.press.forEach(element => {
                    entity[("press_" + element.name)] ||= { average: [], step: 0, meters: null, psi: null, percent: null, volts: null, };
                });
                cfg.sensor.flow.forEach(element => {
                    entity[("flow_" + element.name)] ||= { lm: 0, temp: undefined, hour: 0, day: 0, batch: 0 };
                });
                for (let x = 0; x < cfg.fountain.length; x++) {
                    state.fountain.push({ step: null, timerFlow: null, flowCheck: false, })
                }
                for (let x = 0; x < cfg.dd.length; x++) {
                    log(cfg.dd[x].name + " - initializing");
                    state.dd.push({     // initialize volatile memory for each Demand Delivery system
                        cfg: cfg.dd[x],
                        state: {
                            run: false,
                            oneShot: false,
                            turbo: false,
                            profile: null,
                            pump: 0,
                            flowCheck: false,
                            flowCheckPassed: false,
                            flowCheckRunDelay: false,
                            flowTimer: null,
                            timeoutOff: true,
                            timeoutOn: false,
                            timerFlow: null, // for run flow fault delay
                            cycleCount: 0,
                            timerRun: null,
                            pressStart: null,
                            timerRise: null,
                            heartbeat: false,
                        },
                        fault: {
                            flow: false,
                            flowRestarts: 0,
                            flowOver: false,
                            inputLevel: false,
                        },
                        warn: {
                            flow: false,
                            flowDaily: false,
                            flowFlush: false,
                            haLag: false,
                            tankLow: false,
                            inputLevel: false,
                        },
                        auto: { get state() { return entity[cfg.dd[x].ha.auto].state }, name: cfg.dd[x].ha.auto },
                        press: {
                            in: (cfg.dd[x].press.input != undefined && cfg.dd[x].press.input.sensor) ? {
                                cfg: cfg.sensor.press.find(obj => obj.name === cfg.dd[x].press.input.sensor),
                                get state() { return entity[("press_" + cfg.dd[x].press.input.sensor)] }
                            } : undefined,
                            out: (cfg.dd[x].press.output != undefined && cfg.dd[x].press.output.sensor) ? {
                                cfg: cfg.sensor.press.find(obj => obj.name === cfg.dd[x].press.output.sensor),
                                get state() { return entity[("press_" + cfg.dd[x].press.output.sensor)] },
                            } : undefined,
                        },
                        pump: [],
                    })
                    for (let y = 0; y < cfg.dd[x].pump.length; y++) {
                        state.dd[x].pump.push({
                            cfg: cfg.dd[x].pump[y],
                            get state() { return entity[cfg.dd[x].pump[y].entity].state; },
                            name: cfg.dd[x].pump[y].entity
                        });
                        if (cfg.dd[x].pump[y].flow != undefined & cfg.dd[x].pump[y].flow.sensor != undefined) {
                            state.dd[x].flow ||= [];
                            state.dd[x].flow.push(entity[("flow_" + cfg.dd[x].pump[y].flow.sensor)])
                        }
                    }
                    if (cfg.dd[x].press != undefined && cfg.dd[x].press.output != undefined
                        && cfg.dd[x].press.output.profile != undefined) {
                        if (cfg.dd[x].ha.profile != undefined && cfg.dd[x].press.output.profile.length > 0) {
                            log(cfg.dd[x].name + " - profile selector enabled");
                            state.dd[x].state.profile = parseInt(entity[cfg.dd[x].ha.profile].state);
                        } else {
                            log(cfg.dd[x].name + " - no profile entity - selecting profile 0");
                            state.dd[x].state.profile = 0;
                        }
                    }
                    if (cfg.dd[x].ha.turbo != undefined) {
                        state.dd[x].state.turbo = entity[cfg.dd[x].ha.turbo].state;
                    }
                }
                calcFlow();
                calcFlowMeter();
                pushSensor();
                setInterval(() => {     // called every hour  -  reset hourly notifications
                    for (let x = 0; x < cfg.dd.length; x++) {
                        state.dd[x].fault.flowOver = false;
                        state.dd[x].warn.tankLow = false;
                    }
                }, 3600e3);
                setInterval(() => {     // called every second  -  rerun this automation every second
                    //   automation[autoName](autoName);
                    calcFlow();
                    pushSensor(state);
                    for (let x = 0; x < cfg.dd.length; x++) pumpControl(x);
                    // for (let x = 0; x < cfg.fountain.length; x++) fountain(x);


                }, 1e3);
                setInterval(() => { timer(); }, 60e3);
                listeners();
            }
            /*
            fountain advanced time window - coordinate with solar power profile - fault run time 
            solar fountain controls auto, when low sun, auto fountain resumes with pump stopped (fail safe)
            */
            function timer() {    // called every minute
                for (let x = 0; x < cfg.dd.length; x++) { state.dd[x].warn.flowFlush = false; }
                if (time.hour == 4 && time.min == 0) {
                    for (let x = 0; x < cfg.dd.length; x++) { state.dd[x].warn.flowDaily = false; } // reset low flow daily warning
                }
                if (time.hour == 0 && time.min == 0) {
                    log("resetting daily flow meters")
                    for (const name in nv.flow) { nv.flow[name].today = 0; }  // reset daily low meters
                }
                calcFlowMeter();
                file.write.nv();
            }
            function fountain(x) {
                let fount = { st: state.fountain[x], cfg: cfg.fountain[x] }
                if (entity[fount.cfg.haAuto].state == true) {
                    if (fount.state.step == null) pumpFountain(x, true);
                    if (entity[fount.cfg.pump] == true) {
                        if (time.epochMin - fount.state.step >= fount.cfg.intervalOn) pumpFountain(x, false);
                    } else {
                        if (time.epochMin - fount.state.step >= fount.cfg.intervalOff) pumpFountain(x, true);
                    }
                }
                if (fount.state.flowCheck) {
                    let flow = (entity[cfg.sensor.flow[fount.cfg.sensor.flow.entity].entity].state / 60).toFixed(0);
                    if (flow <= fount.cfg.sensor.flow.startError) {
                        log(fount.cfg.name + " - flow check FAILED: " + flow + "lpm - auto will shut down", 3);
                        send(fount.cfg.haAuto, false);
                        pumpFountain(x, false);
                        return;
                    }
                }
            }
            function pumpControl(x) {
                let dd = state.dd[x];
                pointers();
                pumpShared();
                if (dd.state.listener == undefined) listener();     // setup HA/ESP Input event listeners
                switch (dd.auto.state) {
                    case true:                  // when Auto System is ONLINE
                        switch (dd.state.run) {
                            case false:     // when pump is STOPPED (local perspective)
                                switch (dd.fault.flow) {
                                    case false: // when pump is STOPPED and not flow faulted
                                        if (dd.press.out.cfg.unit == "m") {
                                            if (dd.press.out.state.meters <= dd.cfg.press.start) {
                                                log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.meters.toFixed(2)
                                                    + "m) - pump is starting");
                                                pumpStart();
                                                return;
                                            }
                                        } else if (dd.state.turbo) {
                                            //  console.log("turbo ", dd.press.out.state.psi)
                                            if (dd.press.out.state.psi <= dd.cfg.press.turbo.start) {
                                                log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.psi.toFixed(0)
                                                    + "psi) - pump turbo is starting");
                                                pumpStart();
                                                return;
                                            }
                                        } else if (dd.state.profile != null) {
                                            //  console.log("profile pressure: ", dd.press.out.state.psi, " - starting pressure: "
                                            //     + dd.cfg.press.output.profile[dd.state.profile].start)
                                            if (dd.press.out.state.psi <= dd.cfg.press.output.profile[dd.state.profile].start) {
                                                log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.psi.toFixed(0)
                                                    + "psi) - pump is starting with profile: " + dd.state.profile);
                                                pumpStart();
                                                return;
                                            }
                                        } else if (dd.press.out.state.psi <= dd.cfg.press.start) {
                                            //  console.log("current pressure: ", dd.press.out.state.psi)
                                            log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.psi.toFixed(0)
                                                + "psi) - pump is starting");
                                            pumpStart();
                                            return;
                                        }
                                        if (dd.state.timeoutOff == true) {  // after pump has been off for a while
                                            if (dd.pump[dd.state.pump].state === true && dd.sharedPump.run == false) {
                                                log(dd.cfg.name + " - pump running in HA/ESP but not here - switching pump ON");
                                                pumpStart();
                                                return;
                                            } else {
                                                if (dd.flow != undefined && dd.flow[dd.state.pump].lm > dd.cfg.pump[dd.state.pump].flow.startError
                                                    && dd.warn.flowFlush == false && dd.sharedPump.shared == false) {
                                                    log(dd.cfg.name + " - flow is detected (" + dd.flow[dd.state.pump].lm.toFixed(0) + "lpm) possible sensor damage or flush operation", 2);
                                                    dd.warn.flowFlush = true;
                                                    log(dd.cfg.name + " - shutting down auto system");
                                                    send(dd.auto.name, false);
                                                    dd.auto.state = false;
                                                    pumpStop(true);
                                                    return;
                                                }
                                            }
                                        }
                                        break;
                                    case true:  // when pump is STOPPED and flow faulted but HA/ESP home report as still running
                                        if (dd.state.timeoutOff == true) {
                                            if (dd.pump[dd.state.pump].state === true || dd.flow != undefined && dd.flow[dd.state.pump].lm > dd.cfg.pump[dd.state.pump].flow.startError) {
                                                log(dd.cfg.name + " - pump is flow faulted but HA pump status is still ON, trying to stop again", 3);
                                                send(dd.auto.name, false);
                                                dd.auto.state = false;
                                                pumpStop(true);
                                                return;
                                            }
                                        }
                                        break;
                                }
                                break;
                            case true:      // when pump is RUNNING
                                if (dd.press.out.cfg.unit == "m") {
                                    if (dd.press.out.state.meters >= dd.cfg.press.stop) {
                                        log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is full - pump is stopping");
                                        pumpStop();
                                        return;
                                    }
                                } else if (dd.state.turbo) {
                                    if (dd.press.out.state.psi >= dd.cfg.press.turbo.stop) {
                                        log(dd.cfg.name + " - " + dd.press.out.cfg.name + " turbo shutoff pressure reached - pump is stopping");
                                        pumpStop();
                                        return;
                                    }
                                } else if (dd.state.profile != null) {
                                    if (dd.press.out.state.psi >= dd.cfg.press.output.profile[dd.state.profile].stop) {
                                        log(dd.cfg.name + " - " + dd.press.out.cfg.name + " pump profile: " + dd.state.profile + " pressure reached: "
                                            + dd.press.out.state.psi.toFixed(0) + " psi - pump is stopping");
                                        pumpStop();
                                        return;
                                    }
                                    if (dd.cfg.pump[dd.state.pump].press.input != undefined && dd.cfg.pump[dd.state.pump].press.input.sensor) {
                                        if (entity[dd.cfg.pump[dd.state.pump].press.input.sensor]
                                            <= dd.cfg.pump[dd.state.pump].press.input.minError) {
                                            log(dd.cfg.name + " - input tank level is too low " + dd.press.in.state.meters
                                                + "m - DD system shutting down", 3);
                                            send(dd.auto.name, false);
                                            dd.fault.inputLevel = true;
                                            dd.auto.state = false;
                                            return;
                                        } else if (dd.warn.inputLevel == false && entity[dd.cfg.pump[dd.state.pump].press.input.sensor]
                                            <= dd.cfg.pump[dd.state.pump].press.input.minWarn) {
                                            log(dd.cfg.name + " - input tank level is getting low " + dd.press.in.state.meters
                                                + "m", 2);
                                            dd.warn.inputLevel = true;
                                            return;
                                        }
                                    }
                                } else if (dd.press.out.state.psi >= dd.cfg.press.stop) {
                                    log(dd.cfg.name + " - " + dd.press.out.cfg.name + " shutoff pressure reached - pump is stopping");
                                    pumpStop();
                                    return;
                                }
                                if (time.epoch - dd.state.timerRun >= dd.cfg.fault.runLongError * 60) {
                                    log(dd.cfg.name + " - pump: " + dd.pump[dd.state.pump].name + " - max runtime exceeded - DD system shutting down", 3);
                                    pumpStop();
                                    send(dd.auto.name, false);
                                    dd.auto.state = false;
                                    return;
                                }
                                if (dd.flow == undefined && dd.state.timeoutOn == true && dd.pump[dd.state.pump].state === false) {
                                    log(dd.cfg.name + " - is out of sync - auto is on, system is RUN but pump is off", 2);
                                    pumpStart();
                                    return;
                                }
                                if (dd.press.in != undefined && dd.press.in.state.meters <= dd.cfg.press.input.minError) {
                                    log(dd.cfg.name + " - input tank level is too low - DD system shutting down", 3);
                                    send(dd.auto.name, false);
                                    dd.auto.state = false;
                                    return;
                                }
                                if (dd.cfg.press.outputRiseTime != undefined) pumpPressCheck();
                                if (dd.flow != undefined) {
                                    if (dd.cfg.pump[dd.state.pump].flow.stopFlow != undefined && dd.flow[dd.state.pump].lm <= dd.cfg.pump[dd.state.pump].flow.stopFlow) {
                                        log(dd.cfg.name + " - stop flow rate reached - pump is stopping");
                                        pumpStop();
                                        return;
                                    }
                                    pumpFlowCheck();
                                }
                                break;
                        }
                        if (dd.warn.tankLow != undefined && dd.press.out.state.meters <= (dd.press.out.cfg.warn) && dd.warn.tankLow == false) {
                            log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is lower than expected (" + dd.press.out.state.meters.toFixed(2)
                                + dd.press.out.cfg.unit + ") - possible hardware failure or low performance", 2);
                            dd.warn.tankLow = true;
                        }
                        break;
                    case false:  // when auto is OFFLINE
                        if (dd.state.timeoutOff == true) {
                            if (dd.pump[dd.state.pump].state === true && dd.sharedPump.run == false) {        // this is mainly to sync the state of pumper after a service restart
                                log(dd.cfg.name + " - is out of sync - auto is off but pump is on - switching auto ON", 2);
                                send(dd.auto.name, true);
                                dd.auto.state = true;
                                pumpStart(false);
                                return;
                            }
                            if (dd.flow != undefined && dd.flow[dd.state.pump].lm > dd.cfg.pump[dd.state.pump].flow.startError
                                && dd.warn.flowFlush == false && dd.cfg.fault.flushWarning != false && dd.sharedPump.shared == false) {
                                dd.warn.flowFlush = true;
                                log(dd.cfg.name + " - Auto is off but flow is detected (" + dd.flow[dd.state.pump].lm.toFixed(1) + ") possible sensor damage or flush operation", 2);
                                if (dd.pump[dd.state.pump].state === null || dd.pump[dd.state.pump].state == true) pumpStop(true);
                                return;
                            }
                        }
                        break;
                }
                if (dd.press.out.state.meters >= (dd.cfg.press.stop + .12) && dd.fault.flowOver == false) {
                    log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is overflowing (" + dd.press.out.state.meters
                        + dd.press.out.cfg.unit + ") - possible SSR or hardware failure", 3);
                    pumpStop();
                    dd.fault.flowOver = true;
                }
                function pumpStart(sendOut) {
                    dd.warn.inputLevel = false;
                    if (dd.state.cycleCount == 0) {
                        dd.state.cycleTimer = time.epoch;
                        dd.state.timerRise = time.epoch;
                    } else if (dd.state.cycleCount > dd.cfg.fault.cycleCount) {
                        if (time.epoch - dd.state.cycleTimer < dd.cfg.fault.cycleTime) {
                            log(dd.cfg.name + " - pump is cycling to frequently - DD system shutting down", 3);
                            send(dd.auto.name, false);
                            dd.auto.state = false;
                            return;
                        } else { dd.state.cycleTimer = time.epoch; dd.state.cycleCount = 0; }
                    }

                    if (dd.cfg.ha.reserve != undefined) {
                        if (entity[dd.cfg.ha.reserve].state == true) dd.state.pump = 1;
                        else dd.state.pump = 0;
                    } else dd.state.pump = 0;

                    if (dd.state.profile != null && dd.cfg.pump[dd.state.pump].press.input != undefined
                        && dd.cfg.pump[dd.state.pump].press.input.sensor) {
                        if (entity[dd.cfg.pump[dd.state.pump].press.input.sensor] <= dd.cfg.pump[dd.state.pump].press.input.minError) {
                            log(dd.cfg.name + " - input tank level is too low " + dd.press.in.state.meters + "m - DD system shutting down", 3);
                            send(dd.auto.name, false);
                            dd.fault.inputLevel = true;
                            dd.auto.state = false;
                            return;
                        } else if (dd.warn.inputLevel == false && entity[dd.cfg.pump[dd.state.pump].press.input.sensor]
                            <= dd.cfg.pump[dd.state.pump].press.input.minWarn) {
                            log(dd.cfg.name + " - input tank level is getting low " + dd.press.in.state.meters
                                + "m", 2);
                            dd.warn.inputLevel = true;
                            return;
                        }
                    }

                    if (dd.press.in != undefined && dd.press.in.state.meters <= entity[dd.cfg.pump[dd.state.pump].press.input.sensor]) {
                        log(dd.cfg.name + " - input tank level is too low - DD system shutting down", 3);
                        send(dd.auto.name, false);
                        dd.auto.state = false;
                        return;
                    }

                    if (dd.press.out != undefined) {
                        if (dd.press.out.cfg.unit == "m") dd.state.pressStart = dd.press.out.state.percent;
                        if (dd.press.out.cfg.unit == "psi") dd.state.pressStart = dd.press.out.state.psi;
                    }
                    dd.state.cycleCount++;

                    if (dd.flow != undefined && dd.cfg.pump[dd.state.pump].flow != undefined)
                        dd.flow[dd.state.pump].batch = nv.flow[dd.cfg.pump[dd.state.pump].flow.sensor].total;


                    if (dd.cfg.ha.oneShotExtend && dd.state.oneShot !== false) {
                        log(dd.cfg.name + " - pausing OneShot timer", 1);
                        clearTimeout(dd.state.oneShot);
                    }

                    dd.fault.flow = false;
                    dd.state.run = true;
                    dd.state.timerRun = time.epoch;
                    dd.state.flowCheck = false;
                    dd.state.flowCheckPassed = false;
                    dd.state.flowCheckRunDelay = false;
                    dd.state.timeoutOn = false;
                    setTimeout(() => { dd.state.timeoutOn = true }, 10e3);
                    if (dd.cfg.pump[dd.state.pump].flow.sensor != undefined) {
                        setTimeout(() => {
                            log(dd.cfg.name + " - checking pump flow");
                            dd.state.flowCheck = true;
                            automation[autoName](autoName);
                        }, dd.cfg.pump[dd.state.pump].flow.startWait * 1000);
                    }
                    dd.state.sendRetries = 0;
                    if (sendOut !== false) {
                        if (dd.cfg.solenoid != undefined) {
                            log(dd.cfg.name + " - opening solenoid");
                            send(dd.cfg.solenoid.entity, true);
                            setTimeout(() => { startMotor(); }, 2e3);
                        } else startMotor();
                        function startMotor() {
                            log(dd.cfg.name + " - starting pump: " + dd.pump[dd.state.pump].cfg.name + " - cycle count: "
                                + dd.state.cycleCount + "  Time: " + (time.epoch - dd.state.cycleTimer));
                            send(dd.pump[dd.state.pump].cfg.entity, true);
                        }
                    }
                }
                function pumpStop(fault) {
                    let dd = state.dd[x],
                        runTime = time.epoch - dd.state.timerRun,
                        hours = Math.floor(runTime / 60 / 60),
                        minutes = Math.floor(runTime / 60),
                        extraSeconds = runTime % 60, lbuf;
                    pumpShared();
                    if (dd.sharedPump.run == false) {
                        lbuf = dd.cfg.name + " - stopping pump: " + dd.pump[dd.state.pump].cfg.name + " - Runtime: " + hours + "h:" + minutes + "m:" + extraSeconds + "s";
                        send(dd.pump[dd.state.pump].cfg.entity, false);
                    } else {
                        lbuf = dd.cfg.name + " - stopping " + dd.pump[dd.state.pump].cfg.name + " but pump still in use by "
                            + cfg.dd[dd.sharedPump.num].name + " - Runtime: " + hours + "h:" + minutes + "m:" + extraSeconds + "s";
                    }
                    setTimeout(() => { dd.state.timeoutOff = true }, 10e3);
                    if (fault == true) {
                        if (dd.cfg.ha.solar != undefined) {
                            log(dd.cfg.name + " faulted - solar pump automation: " + dd.cfg.ha.solar + " - is going offline", 2);
                            send(dd.cfg.ha.solar, false);
                        }
                    }
                    setTimeout(() => {
                        if (dd.cfg.solenoid != undefined) {
                            log(dd.cfg.name + " - closing solenoid");
                            send(dd.cfg.solenoid.entity, false);
                        }
                    }, 4e3);
                    if (dd.flow != undefined) {
                        let tFlow = nv.flow[dd.cfg.pump[dd.state.pump].flow.sensor].total
                            - dd.flow[dd.state.pump].batch;
                        log(lbuf + " - pumped "
                            + ((tFlow < 2.0) ? ((tFlow * 1000).toFixed(1) + "L") : (tFlow.toFixed(2) + "m3"))
                            + " - Average: "
                            + ((tFlow * 1000) / (time.epoch - dd.state.timerRun) * 60).toFixed(1) + "lm");
                    }
                    else log(lbuf);
                    dd.state.timeoutOff = false;
                    dd.state.run = false;
                    dd.pump[dd.state.pump].state = false;

                    if (dd.cfg.ha.oneShotExtend && dd.state.oneShot !== false) {
                        log(dd.cfg.name + " - extending OneShot timer", 1);
                        clearTimeout(dd.state.oneShot);
                        let duration = Math.trunc(entity[dd.cfg.ha.oneShotTimer].state);
                        dd.state.oneShot = setTimeout(() => {
                            log(dd.cfg.name + " - stopping one shot operation after " + duration + " minutes (from last use)");
                            send(dd.cfg.ha.auto, false);
                            dd.state.oneShot = false;
                        }, (duration * 60 * 1e3));
                    }

                }
                function pumpPressCheck() {
                    if (time.epoch - dd.state.timerRise >= dd.cfg.press.outputRiseTime) {
                        if (dd.press.out.cfg.unit == "m") {
                            log("checking pressure rise, starting: " + dd.state.pressStart + "  current: " + dd.press.out.state.percent
                                + "  difference: " + (dd.press.out.state.percent - dd.state.pressStart) + "%", 0);
                            if (!(dd.press.out.state.percent - dd.state.pressStart) > dd.cfg.press.outputRiseError) {
                                if (type == 0) log(dd.cfg.name + " - tank level not rising - DD system shutting down", 3);
                                send(dd.auto.name, false);
                                dd.auto.state = false;
                                pumpStop(true)
                                return;
                            }
                            else if (!(dd.press.out.state.percent - dd.state.pressStart) > dd.cfg.press.outputRiseWarn) {
                                if (type == 0) log(dd.cfg.name + " - tank level not rising", 2);
                            }
                            dd.state.pressStart = dd.press.out.state.percent;
                        }
                        if (dd.press.out.cfg.unit == "psi") {
                            log("checking pressure rise, starting: " + dd.state.pressStart + "  current: " + dd.press.out.state.percent
                                + "  difference: " + (dd.press.out.state.percent - dd.state.pressStart) + "psi", 0);
                            if (!(dd.press.out.state.psi - dd.state.pressStart) > dd.cfg.press.outputRiseError) {
                                if (type == 0) log(dd.cfg.name + " - tank level not rising - DD system shutting down", 3);
                                send(dd.auto.name, false);
                                dd.auto.state = false;
                                pumpStop(true)
                                return;
                            }
                            else if (!(dd.press.out.state.psi - dd.state.pressStart) > dd.cfg.press.outputRiseWarn) {
                                if (type == 0) log(dd.cfg.name + " - tank level not rising", 2);
                            }
                            dd.state.pressStart = dd.press.out.state.psi;
                        }
                        dd.state.timerRise = time.epoch;
                    }
                }
                function pumpFlowCheck() {
                    let flow = dd.flow[dd.state.pump].lm, pump = dd.cfg.pump[dd.state.pump].flow, press = dd.press.out.state;
                    if (dd.state.flowCheck == true) {
                        if (dd.state.flowCheckPassed == false) {
                            if (flow < pump.startError) {
                                dd.fault.flow = true;
                                if (dd.cfg.fault.retryCount && dd.cfg.fault.retryCount > 0) {
                                    if (dd.fault.flowRestarts < dd.cfg.fault.retryCount) {
                                        log(dd.cfg.name + " - flow check FAILED!! (" + flow.toFixed(1) + "lm) - ", press, " psi - HA Pump State: "
                                            + dd.pump[dd.state.pump].state + " - waiting for retry " + (dd.fault.flowRestarts + 1), 2);
                                        dd.fault.flowRestarts++;
                                        dd.state.flowTimer = setTimeout(() => {
                                            log(dd.cfg.name + " - no flow retry wait complete, pump reenabled");
                                            dd.fault.flow = false;
                                        }, dd.cfg.fault.retryWait * 1000);
                                    } else if (dd.fault.flowRestarts == dd.cfg.fault.retryCount && dd.cfg.fault.retryFinal) {
                                        log(dd.cfg.name + " - low flow (" + flow.toFixed(1) + "lm) HA State: "
                                            + dd.pump[dd.state.pump].state + " - retries exceeded - going offline for " + dd.cfg.fault.retryFinal + "m", 3);
                                        dd.fault.flowRestarts++;
                                        dd.state.flowTimer = setTimeout(() => {
                                            log(dd.cfg.name + " - no flow retry extended wait complete, pump reenabled", 2);
                                            dd.fault.flow = false;
                                        }, dd.cfg.fault.retryFinal * 60 * 1000);
                                    } else {
                                        dd.fault.flowRestarts++;
                                        log(dd.cfg.name + " - low flow (" + flow.toFixed(1) + "lm) HA State: "
                                            + dd.pump[dd.state.pump].state + " - all retries failed - going OFFLINE permanently", 3);
                                        send(dd.auto.name, false);
                                        dd.auto.state = false;
                                    }
                                } else {
                                    log(dd.cfg.name + " - low flow (" + flow.toFixed(1) + "lm) HA State: "
                                        + dd.pump[dd.state.pump].state + " - pump retry not enabled - going OFFLINE permanently", 3);
                                    send(dd.auto.name, false);
                                    dd.auto.state = false;
                                }
                                pumpStop(true);
                            } else if (flow < pump.startWarn && dd.warn.flowDaily == false) {
                                log(dd.cfg.name + " - pump flow is lower than optimal (" + flow.toFixed(1) + "lm) - clean filter", 2);
                                dd.state.flowCheckPassed = true;
                                dd.fault.flowRestarts = 0;
                                dd.warn.flowDaily = true;
                            } else {
                                log(dd.cfg.name + " - pump flow check PASSED (" + flow.toFixed(1) + "lm)");
                                dd.state.flowCheckPassed = true;
                                dd.fault.flowRestarts = 0;
                            }
                        } else {
                            if (pump.runStop != undefined) {
                                if (flow < pump.runStop) {
                                    trigger((" - RUN flow stop (" + flow.toFixed(1) + "lm) - pump stopping - " + press + " psi"), false);
                                } else dd.state.flowCheckRunDelay = false;
                            } else if (pump.runError != undefined) {
                                if (flow < pump.runError) {
                                    trigger((" - RUN low flow (" + flow.toFixed(1) + "lm) HA State: "
                                        + dd.pump[dd.state.pump].state + " - going OFFLINE permanently"), true);
                                } else dd.state.flowCheckRunDelay = false;
                            } else if (pump.runError == undefined) {
                                if (flow < pump.startError) {
                                    trigger((" - RUN low flow (" + flow.toFixed(1) + "lm) HA State: "
                                        + dd.pump[dd.state.pump].state + " - going OFFLINE permanently"), true);
                                } else dd.state.flowCheckRunDelay = false;
                            }
                            function trigger(msg, error) {
                                if (dd.state.flowCheckRunDelay == false) {
                                    dd.state.timerFlow = time.epoch;
                                    dd.state.flowCheckRunDelay = true;
                                    return;
                                } else if (time.epoch - dd.state.timerFlow >= 10) {
                                    if (error) {
                                        log(dd.cfg.name + msg, 3);
                                        send(dd.auto.name, false);
                                        dd.auto.state = false;
                                        pumpStop(true);
                                    } else {
                                        log(dd.cfg.name + msg, 1);
                                        pumpStop();
                                    }
                                }
                            }
                        }
                    }
                }
                function pumpShared() {
                    let dd = state.dd[x];
                    dd.sharedPump = { shared: null, run: false, num: null };
                    for (let y = 0; y < cfg.dd.length; y++) {
                        if (y != x && dd.pump[dd.state.pump].cfg.entity == cfg.dd[y].pump[state.dd[y].state.pump].entity) {
                            if (state.dd[y].state.run == true) {
                                dd.sharedPump.run = true;
                            } else { setTimeout(() => { dd.sharedPump.run = false; }, 10e3); }
                            dd.sharedPump.shared = true;
                            dd.sharedPump.num = y;
                            break;
                        }
                    }
                }
                function listener() {
                    log(dd.cfg.name + " - creating event listener for HA automation control");
                    em.on(dd.auto.name, function (data) {
                        time.sync();
                        switch (data) {
                            case true:
                                log(dd.cfg.name + " - is going ONLINE");
                                dd.auto.state = true;
                                dd.fault.flow = false;
                                dd.fault.flowRestarts = 0;
                                dd.fault.inputLevel = false;
                                dd.warn.tankLow = false;
                                dd.warn.inputLevel = false;
                                dd.state.cycleTimer = time.epoch;
                                dd.state.cycleCount = 0;
                                clearTimeout(dd.state.flowTimer);
                                return;
                            case false:
                                log(dd.cfg.name + " - is going OFFLINE - pump is stopping");
                                dd.auto.state = false;
                                clearTimeout(dd.state.oneShot);
                                dd.state.oneShot == false;
                                clearTimeout(dd.state.flowTimer);
                                pumpStop();
                                return;
                        }
                        return;
                    });
                    dd.state.listener = true;
                    return;
                }
                function pointers() {
                    for (let y = 0; y < cfg.dd[x].pump.length; y++) {
                        dd.pump[y].state = entity[cfg.dd[x].pump[y].entity].state;
                    }
                }
            }
            function pumpFountain(x, power) {
                let fount = { st: state.fountain[x], cfg: cfg.fountain[x] }
                fount.state.step = time.epochMin;
                if (power) {
                    log(fount.cfg.name + " - is turning on");
                    send(cfg.esp[fount.cfg.pump], true);
                    if (fount.cfg.flow != undefined && fount.cfg.flow.entity != undefined) {
                        fount.state.timerFlow = setTimeout(() => {
                            let flow = (entity[cfg.flow[fount.cfg.flow.entity].entity].state / 60).toFixed(0);
                            log(fount.cfg.name + " - checking flow");
                            if (flow < fount.cfg.flow.startError) {
                                log(fount.cfg.name + " - flow check FAILED: " + flow + "lpm - auto will shut down", 3);
                                send(fount.cfg.haAuto, false);
                                pumpFountain(x, false);
                                return;
                            } else if (flow < fount.cfg.flow.startWarn) {
                                log(fount.cfg.name + " - starting flow less than normal: " + flow + "lpm", 2);
                                send(fount.cfg.haAuto, false);
                            } else {
                                log(fount.cfg.name + " - flow check PASSED: " + flow + "lpm");
                                fount.state.flowCheck = true;
                            }
                        }, (fount.cfg.flow.startWait * 1e3));
                    }
                } else {
                    log(fount.cfg.name + " - is turning off");
                    send(cfg.esp[fount.cfg.pump], false);
                    clearTimeout(fount.state.timerFlow);
                    fount.state.flowCheck = false;
                }
            }
            function pushSensor() {
                let sendDelay = 0;
                let list = ["_total", "_hour", "_day", "_lm", "_today"];
                for (let x = 0; x < cfg.sensor.flow.length; x++) {
                    //   entity[cfg.sensor.flow[x].name] ||= { lm: 0, temp: undefined, hour: 0, day: 0, batch: 0 };
                    let flowName = cfg.sensor.flow[x].name;
                    let flowNameEntity = "flow_" + cfg.sensor.flow[x].name;
                    let unit = [cfg.sensor.flow[x].unit, cfg.sensor.flow[x].unit, cfg.sensor.flow[x].unit, "L/m", "L"]
                    let value = [nv.flow[flowName].total, entity[flowNameEntity].hour, entity[flowNameEntity].day, entity[flowNameEntity].lm, nv.flow[flowName].today];
                    for (let y = 0; y < 5; y++)
                        HAsend(flowNameEntity + list[y], Number(value[y]).toFixed(((unit[y] == "m3") ? 2 : 0)), unit[y]);
                }
                for (let x = 0; x < cfg.sensor.press.length; x++) {
                    let calc = { percent: [], sum: 0 },
                        name = "press_" + cfg.sensor.press[x].name,
                        config = cfg.sensor.press[x],
                        raw = entity[cfg.sensor.press[x].entity].state,
                        stopPressure = null;
                    for (let y = 0; y < cfg.dd.length; y++) {
                        if (cfg.dd[y].press.output == cfg.sensor.press[x].name) {
                            if (cfg.dd[y].press.profile != undefined) {
                                stopPressure = cfg.dd[y].press.profile[state.dd[y].state.profile].stop;
                                break;
                            } else {
                                stopPressure = cfg.dd[y].press.stop;
                                break;
                            }
                        }
                    }
                    if (stopPressure == null) stopPressure = config.levelFull;
                    if (entity[name].step < config.average) { entity[name].average[entity[name].step++] = raw; }
                    else { entity[name].step = 0; entity[name].average[entity[name].step++] = raw; }
                    for (let y = 0; y < entity[name].average.length; y++) calc.sum += entity[name].average[y];
                    calc.average = calc.sum / entity[name].average.length;
                    if (config.voltageMin == 0.5) log("sensor ID: " + x + " is uncalibrated - Average Volts: "
                        + calc.average.toFixed(3) + "  - WAIT " + config.average + " seconds");
                    calc.psi = (config.pressureRating / 4) * (calc.average - config.voltageMin);
                    calc.meters = 0.703249 * calc.psi;
                    calc.percent[0] = stopPressure - calc.meters;
                    calc.percent[1] = calc.percent[0] / stopPressure;
                    calc.percent[2] = Math.round(100 - (calc.percent[1] * 100));
                    entity[name].volts = Number(calc.average.toFixed(3));
                    entity[name].psi = (calc.psi < 0.0) ? 0 : Number(calc.psi.toFixed(2));
                    entity[name].meters = (calc.meters < 0.0) ? 0 : Number(calc.meters.toFixed(2));
                    entity[name].percent = (calc.percent[2] < 0.0) ? 0 : calc.percent[2];
                    entity[name].update = time.epoch;
                    HAsend(name + "_percent", entity[name].percent.toFixed(0), '%');
                    HAsend(name + "_meters", entity[name].meters.toFixed(2), 'm');
                    HAsend(name + "_psi", entity[name].psi.toFixed(0), 'psi');
                    send("cdata", {
                        name: config.name,
                        state: {
                            percent: entity[name].percent.toFixed(0),
                            meters: entity[name].meters.toFixed(2),
                            psi: entity[name].psi.toFixed(0)
                        }
                    });
                }
                function HAsend(name, value, unit) { setTimeout(() => { send(name, value, unit) }, sendDelay); sendDelay += 25; };
            }
            function calcFlow() {
                for (let x = 0; x < cfg.sensor.flow.length; x++) {
                    let flowName = cfg.sensor.flow[x].name;
                    let flowNameEntity = "flow_" + cfg.sensor.flow[x].name;
                    if (!nv.flow[flowName]) nv.flow[flowName] = {
                        total: 0, today: 0, min: new Array(60).fill(0), hour: new Array(24).fill(0), //day: new Array(31).fill(0)
                    }
                    if (cfg.sensor.flow[x].entity) {
                        entity[flowNameEntity].lm = entity[cfg.sensor.flow[x].entity].state / cfg.sensor.flow[x].pulse / 60;
                        // console.log("flow meter: " + entity.lm);
                        entity[flowNameEntity].update = time.epoch;
                        if (isFinite(entity[flowNameEntity].lm)) {
                            nv.flow[flowName].total += entity[flowNameEntity].lm / 60 / 1000;
                            nv.flow[flowName].today += entity[flowNameEntity].lm / 60;
                        }
                    }
                    if (cfg.sensor.flow[x].entityAdd) {
                        let tFlow = 0;
                        for (let y = 0; y < cfg.sensor.flow[x].entityAdd.length; y++) {
                            //   console.log("tflow added: " + entity[("flow_" + cfg.sensor.flow[x].entityAdd[y])]?.lm)
                            tFlow += entity[("flow_" + cfg.sensor.flow[x].entityAdd[y])]?.lm;
                        }
                        if (cfg.sensor.flow[x].entitySubtract)
                            for (let z = 0; z < cfg.sensor.flow[x].entitySubtract.length; z++) {
                                tFlow -= entity[("flow_" + cfg.sensor.flow[x].entitySubtract[z])]?.lm;
                            }
                        if (isFinite(tFlow) == true) {
                            entity[flowNameEntity].lm = tFlow;
                            nv.flow[flowName].total += tFlow / 60 / 1000;
                            nv.flow[flowName].today += tFlow / 60;
                        }
                    }
                    //  console.log("flow raw : ", entity[cfg.sensor.flow[x].entity].state, "  - Flow LM: ", entity[flowName].lm)
                }
            }
            function calcFlowMeter() {
                for (let x = 0; x < cfg.sensor.flow.length; x++) {
                    let flowName = cfg.sensor.flow[x].name;
                    let flowNameEntity = "flow_" + flowName;

                    // First run: initialize temp tracker
                    if (entity[flowNameEntity].temp === undefined) {
                        entity[flowNameEntity].temp = nv.flow[flowName].total;
                    }

                    // Calculate how much flow occurred since last check
                    let calcFlow = 0;
                    if (nv.flow[flowName].total !== entity[flowNameEntity].temp) {
                        calcFlow = nv.flow[flowName].total - entity[flowNameEntity].temp;
                        entity[flowNameEntity].temp = nv.flow[flowName].total;
                    }

                    // Overwrite this minute slot (removes stale values)
                    nv.flow[flowName].min ||= [];
                    nv.flow[flowName].min[time.min] = calcFlow;

                    // Sum the last 60 minutes to get the current hour total
                    let hourSum = 0;
                    for (let y = 0; y < 60; y++) {
                        hourSum += nv.flow[flowName].min[y] || 0;
                    }
                    nv.flow[flowName].hour ||= [];
                    nv.flow[flowName].hour[time.hour] = hourSum;
                    entity[flowNameEntity].hour = hourSum;

                    // Sum all 24 hour slots to get the day total
                    let daySum = 0;
                    for (let y = 0; y < 24; y++) {
                        daySum += nv.flow[flowName].hour[y] || 0;
                    }
                    entity[flowNameEntity].day = daySum;
                }
            }
            function listeners() {
                for (let x = 0; x < cfg.dd.length; x++) {
                    if (cfg.dd[x].ha.oneShot != undefined && cfg.dd[x].ha.oneShotTimer != undefined) {
                        let duration = Math.trunc(entity[cfg.dd[x].ha.oneShotTimer].state);
                        cfg.dd[x].ha.oneShot.forEach(element => {
                            log(cfg.dd[x].name + " - creating listener for One Shot operation: " + element);
                            em.on(element, (newState) => {
                                if (newState.includes("remote_button_short_press") || !newState.includes("remote_button")) {
                                    log(cfg.dd[x].name + " - starting one shot operation - stopping in " + duration + " minutes");
                                    send(cfg.dd[x].ha.auto, true);
                                    state.dd[x].state.oneShot = setTimeout(() => {
                                        log(cfg.dd[x].name + " - stopping one shot operation after " + duration + " minutes");
                                        send(cfg.dd[x].ha.auto, false);
                                    }, (duration * 60 * 1e3));
                                }
                            });
                        });
                    }
                    if (cfg.dd[x].ha.turbo != undefined) {
                        log(cfg.dd[x].name + " - creating listener for Turbo operation: " + cfg.dd[x].ha.turbo);
                        em.on(cfg.dd[x].ha.turbo, (newState) => {
                            if (newState == true) {
                                log(cfg.dd[x].name + " - enabling pump turbo mode");
                                state.dd[x].state.turbo = true;
                            } else {
                                log(cfg.dd[x].name + " - disabling pump turbo mode");
                                state.dd[x].state.turbo = false;
                            }
                        });
                    }
                    if (cfg.dd[x].press.output != undefined && cfg.dd[x].press.output.profile != undefined &&
                        cfg.dd[x].ha.profile != undefined && cfg.dd[x].press.output.profile.length > 1) {
                        log(cfg.dd[x].name + " - creating listener for pump profile: " + cfg.dd[x].ha.profile);
                        em.on(cfg.dd[x].ha.profile, (newState) => {
                            log(cfg.dd[x].name + " - pump profile changing to mode: " + ~~newState);
                            state.dd[x].state.profile = parseInt(newState);
                        });
                    }
                }
                for (let x = 0; x < cfg.fountain.length; x++) {
                    if (cfg.fountain[x].haAuto != undefined) {
                        log(cfg.fountain[x].name + " - creating automation Listener: " + cfg.dd[x].ha.profile);
                        em.on(cfg.fountain[x].haAuto, (newState) => {
                            if (newState == true) {
                                log(cfg.fountain[x].name + " auto is starting");
                                pumpFountain(x, true);
                            } else {
                                log(cfg.fountain[x].name + " auto is stopping");
                                pumpFountain(x, false);
                            }
                        });
                    }
                }
            }
        },
        Compound: function (autoName) { // compound automation 
            if (!auto[autoName]) {
                auto[autoName] = { freezer: { boot: false } };
                var state = auto[autoName];
                var log = (...buf) => slog(...buf, autoName);
                setInterval(() => { timer(); }, 60e3);

                let buttonPumpFIlter = [
                    "Switch Kitchen Pump",
                    "Button Bodega Water Filtered"
                ];
                buttonPumpFIlter.forEach(element => {
                    em.on(element, (newState) => {
                        if (newState == "remote_button_long_press") send("input_boolean.auto_bubon", false)
                        if (newState == "remote_button_double_press") send("input_boolean.auto_bubon", true)
                    });
                });

                em.on("Button Bodega Water Filtered", (newState) => {
                    if (newState == "remote_button_long_press") send("input_boolean.auto_bubon", false)
                    if (newState == "remote_button_double_press") send("input_boolean.auto_bubon", true)
                });
                em.on("input_boolean.auto_freezer", (newState) => {
                    if (newState) { state.freezer.boot = false; freezer(); }
                    else {
                        log("Freezer - Turning ON permanently");
                        send("switch.relay_bodega_freezer_fujidenzo", true);
                        nv.freezer.update = time.epochMin;
                        file.write.nv();
                    }
                });
                if (entity["input_boolean.auto_freezer"].state) freezer();
                setInterval(() => { if (entity["input_boolean.auto_freezer"].state) freezer(); }, 60e3);
            }
            function timer() {
                if (time.hour == 0 && time.min == 0) {
                    log("Lights - Outside Lights - Turning OFF");
                    send("input_boolean.lights_stairs", false);
                    send("switch.lights_bodega_front_1", false);
                }
                if (time.hour == 2 && time.min == 0) {
                    send("switch.relay_bodega_freezer_fujidenzo", false);
                }
                if (time.hour == 4 && time.min == 0) {
                    log("Lights - Outside Lights (bodega front 2) - Turning OFF");
                    send("switch.lights_bodega_front_2", false);
                    send("switch.lights_outside_entrance", false);
                }
                if (time.hour == 6 && time.min == 0) {
                    send("switch.relay_bodega_freezer_fujidenzo", true);
                }
                if (time.hour == 6 && time.min == 30) {
                    send("input_boolean.auto_bubon", true);
                }
                if (time.hour == 18 && time.min == 0) {
                    send("input_boolean.auto_bubon", false);
                    send("switch.lights_bodega_front_1", true);
                 //   send("switch.relay_bodega_freezer_fujidenzo", false);
                }
                if (time.hour == 18 && time.min == 10) {
                    log("Lights - Outside Lights - Turning ON");
                    send("input_boolean.lights_stairs", true);
                    send("switch.lights_bodega_front_2", true);
                    send("switch.lights_outside_bedroom", true);
                    send("switch.lights_outside_entrance", true);
                }
                if (time.hour == 21 && time.min == 0) {
                    send("switch.relay_bodega_freezer_fujidenzo", true);
                }
                if (time.hour == 22 && time.min == 0) {
                    send("switch.lights_outside_bedroom", false);
                }
            }
            function freezer() {
                if (entity["switch.relay_bodega_freezer_fujidenzo"] != undefined) {
                    if (!nv.freezer) {
                        log("Freezer - NV mem initializing");
                        nv.freezer = { update: time.epochMin, state: true };
                        file.write.nv();
                    }
                    let timerOn = entity["input_number.timer_freezer_on"].state;
                    let timerOff = entity["input_number.timer_freezer_off"].state;
                    if (entity["switch.relay_bodega_freezer_fujidenzo"].state) {
                        if (!state.freezer.boot) {
                            log("Freezer - is ON - shutdown in " + (timerOn - (time.epochMin - nv.freezer.update)) + " mins");
                            state.freezer.boot = true;
                        }
                        if (time.epochMin - nv.freezer.update >= timerOn) {
                            log("Freezer - Turning OFF for - " + timerOff + " mins");
                            send("switch.relay_bodega_freezer_fujidenzo", false);
                            entity["input_number.timer_freezer_on"].state = false;
                            nv.freezer.update = time.epochMin;
                            file.write.nv();
                        }
                    } else {
                        if (!state.freezer.boot) {
                            log("Freezer - is OFF - Startup in " + (timerOff - (time.epochMin - nv.freezer.update)) + " mins");
                            state.freezer.boot = true;
                        }
                        if (time.epochMin - nv.freezer.update >= timerOff) {
                            log("Freezer - Turning ON for - " + timerOn + " mins");
                            send("switch.relay_bodega_freezer_fujidenzo", true);
                            entity["input_number.timer_freezer_on"].state = true;
                            nv.freezer.update = time.epochMin;
                            file.write.nv();
                        }
                    }
                } else {
                    log("Freezer Relay is OFFLINE", 3);
                }
            }
        },
    };
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
                    case "espState":            // incoming state change (from ESP)
                        // console.log("receiving esp data, name: " + buf.obj.name + " state: " + buf.obj.state);
                        entity[buf.obj.name] ||= {}; // If state.esp[buf.obj.name] is falsy (undefined, null, 0, '', false), assign it an empty object.
                        entity[buf.obj.name].state = buf.obj.state;
                        entity[buf.obj.name].update = time.epoch;
                        if (online == true) {
                            em.emit(buf.obj.name, buf.obj.state);
                            for (const name in automation) { if (auto[name]) automation[name](name) }
                        }
                        break;
                    case "haStateUpdate":       // incoming state change (from HA websocket service)
                        slog("receiving HA state data, entity: " + buf.obj.name + " value: " + buf.obj.state, 0);
                        // console.log(buf);
                        entity[buf.obj.name] ||= {};
                        entity[buf.obj.name].update = time.epoch;
                        try { entity[buf.obj.name].state = buf.obj.state; } catch { }
                        if (online == true) {
                            em.emit(buf.obj.name, buf.obj.state);
                            for (const name in automation) { if (auto[name]) automation[name](name) }
                        }
                        break;
                    case "haFetchReply":        // Incoming HA Fetch result
                        // console.log(buf.obj)
                        Object.assign(entity, buf.obj);
                        slog("receiving fetch data...");
                        if (onlineHA == false) sys.boot(4);
                        break;
                    case "haFetchAgain":        // Core is has reconnected to HA, so do a refetch
                        slog("Core has reconnected to HA, fetching again");
                        udp.send(JSON.stringify({ type: "espFetch" }), 65432, '127.0.0.1');
                        udp.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1');
                        break;
                    case "haQueryReply":        // HA device query
                        console.log("Available HA Devices: " + buf.obj);
                        break;
                    case "udpReRegister":       // reregister request from server
                        if (online == true) {
                            slog("server lost sync, reregistering...");
                            setTimeout(() => {
                                sys.register();
                                if (cfg.ha != undefined) { udp.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1'); }
                            }, 1e3);
                        }
                        break;
                    case "coreData":
                        // console.log("received coreData: ", buf.obj);
                        if (buf.obj.name && buf.obj.state) {
                            if (!entity[buf.obj.name]) entity[buf.obj.name] = {};
                            entity[buf.obj.name].state = buf.obj.state;
                            entity[buf.obj.name].update = time.epoch;
                            em.emit(buf.obj.name, buf.obj.state);
                        }
                        break;
                    case "diag":                // incoming diag refresh request, then reply object
                        udp.send(JSON.stringify({ type: "diag", obj: { state: auto, nv } }), 65432, '127.0.0.1');
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
                    case "proceed": if (online == false) setTimeout(() => { sys.boot(3); }, 1e3); break;
                    case "log": console.log(buf.obj); break;
                }
            });
        },
        register: function () {
            let obj = {};
            if (cfg.ha != undefined) obj.ha = cfg.ha;
            if (cfg.esp) {
                if (cfg.esp.subscribe) obj.esp = cfg.esp.subscribe;
                if (cfg.esp.heartbeat != undefined && cfg.esp.heartbeat.length > 0) {
                    cfg.esp.heartbeat.forEach((e, x) => {
                        slog("registering heartbeat for ESP: " + e.name);
                        if (heartbeat.timer[x]) clearInterval(heartbeat.timer[x]);
                        heartbeat.timer[x] = setInterval(() => {
                            if (heartbeat.state[x]) {
                                udp.send(JSON.stringify({
                                    type: "espState",
                                    obj: { name: e.name, state: false }
                                }), 65432, '127.0.0.1')
                                heartbeat.state[x] = false;
                            }
                            else {
                                udp.send(JSON.stringify({
                                    type: "espState",
                                    obj: { name: e.name, state: true }
                                }), 65432, '127.0.0.1')
                                heartbeat.state[x] = true;
                            }
                        }, e.interval * 1e3);
                    });
                }

            }
            if (cfg.telegram != undefined) obj.telegram = true;
            udp.send(JSON.stringify({ type: "register", obj, name: cfg.moduleName }), 65432, '127.0.0.1');
            if (cfg.telegram != undefined) {
                if (nv.telegram == undefined) nv.telegram = [];
                else for (let x = 0; x < nv.telegram.length; x++) {
                    udp.send(JSON.stringify({ type: "telegram", obj: { class: "sub", id: nv.telegram[x].id } }), 65432, '127.0.0.1');
                }
            }
            if (cfg.coreData && cfg.coreData.length > 0) {
                send("cdata", { register: true, name: cfg.coreData });
            }
        },
        init: function () {
            nv = {};
            auto = {};
            heartbeat = { timer: [], state: [] };
            logName = null;
            entity = {};
            onlineHA = false;
            online = false;
            timer = {};
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
            ha = { getEntities: function () { send("haQuery") }, };
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
                slog("installing TWIT-Client-" + cfg.moduleName + " service...");
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
                slog("service installed and started");
                console.log("type: journalctl -fu twit-client-" + moduleName);
                process.exit();
            }
            if (process.argv[2] == "-u") {
                moduleName = cfg.moduleName.toLowerCase();
                slog("uninstalling TWIT-Client-" + cfg.moduleName + " service...");
                execSync("systemctl stop twit-client-" + moduleName);
                execSync("systemctl disable twit-client-" + moduleName + ".service");
                fs.unlinkSync("/etc/systemd/system/twit-client-" + moduleName + ".service");
                console.log("TWIT-Client-" + cfg.moduleName + " service uninstalled");
                process.exit();
            }
            file = {
                write: {
                    nv: function () {  // write non-volatile memory to the disk
                        clearTimeout(timer.fileWrite);
                        if (time.epoch - timer.fileWriteLast > 10) writeFile();
                        else timer.fileWrite = setTimeout(() => { writeFile(); }, 10e3);
                        function writeFile() {
                            // slog("writing NV data...");
                            timer.fileWriteLast = time.epoch;
                            fs.writeFile(workingDir + "/nv-" + scriptName + "-bak.json", JSON.stringify(nv, null, 2), function () {
                                fs.copyFile(workingDir + "/nv-" + scriptName + "-bak.json", workingDir + "/nv-" + scriptName + ".json", (err) => {
                                    if (err) throw err;
                                });
                            });
                        }
                    }
                },
            };
            telegram = {
                sub: function (msg) {
                    let buf = { user: msg.from.first_name + " " + msg.from.last_name, id: msg.from.id }
                    if (!telegram.auth(msg)) {
                        slog("telegram - user just joined the group - " + msg.from.first_name + " " + msg.from.last_name + " ID: " + msg.from.id, 0, 2);
                        nv.telegram.push(buf);
                        bot(msg.chat.id, 'registered');
                        udp.send(JSON.stringify({ type: "telegram", obj: { class: "sub", id: msg.from.id } }), 65432, '127.0.0.1');
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
                buttonMulti: function (msg, auto, array) {
                    buf = { reply_markup: { inline_keyboard: [[]] } };
                    array.forEach(element => {
                        buf.reply_markup.inline_keyboard[0].push({ text: element, callback_data: (auto + element) })
                    });
                    bot(msg.from.id, buf);
                },
            };
            bot = function (id, data, obj) {
                udp.send(JSON.stringify({ type: "telegram", obj: { class: "send", id, data, obj } }), 65432, '127.0.0.1');
            };
            send = function (name, state, unit, id) {
                for (let x = 0; x < cfg.esp.subscribe.length; x++) {
                    if (name == cfg.esp.subscribe[x]) {
                        udp.send(JSON.stringify({
                            type: "espState",
                            obj: { name: name, state: state }
                        }), 65432, '127.0.0.1')
                        return;
                    }
                }
                if (name == "cdata") {
                    udp.send(JSON.stringify({
                        type: "coreData",
                        obj: state
                    }), 65432, '127.0.0.1')
                } else {
                    // console.log("sending to HA - name: " + name + " - state: " + state)
                    udp.send(JSON.stringify({
                        type: "haState",
                        obj: { name: name, state: state, unit: unit, haID: id }  // ID is used to send sensor to HA on core other than ID 0
                    }), 65432, '127.0.0.1')
                }
            };
            slog = function (message, level, system) {
                if (level == undefined) level = 1;
                if (!system) {
                    udp.send(JSON.stringify({
                        type: "log",
                        obj: { message: message, mod: (cfg.moduleName + "-System"), level: level }
                    }), 65432, '127.0.0.1');
                } else udp.send(JSON.stringify({
                    type: "log",
                    obj: { message: message, mod: system, level: level }
                }), 65432, '127.0.0.1');
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
                            slog("\x1b[33;1mNon-Volatile Storage does not exist\x1b[37;m"
                                + ", nv-" + scriptName + ".json file should be in same folder as client.js file (" + workingDir + ")");
                            nv = { telegram: [] };
                        }
                        else { nv = JSON.parse(data); }
                        sys.boot(2);
                    });
                    break;
                case 1:
                    console.log("Loading config data...");
                    // fs.writeFileSync(workingDir + "/config-" + scriptName + ".json", JSON.stringify(cfg, null, 2), 'utf-8')
                    //process.exit();
                    fs.readFile(workingDir + "/config-" + scriptName + ".json", function (err, data) {
                        if (err) {
                            slog("\x1b[33;1mconfig file does not exist\x1b[37;m"
                                + ", config-" + scriptName + ".json file should be in same folder as client-" + scriptName + ".js file (" + workingDir + ")");
                            process.exit();
                        }
                        else { cfg = JSON.parse(data); }
                        sys.boot(2);
                    });
                    break;
                case 2:
                    sys.com();
                    slog("trying to register with TWIT Core");
                    sys.register();
                    bootWait = setInterval(() => { sys.register(); }, 10e3);
                    break;
                case 3:
                    clearInterval(bootWait);
                    slog("registered with TWIT Core");
                    if (cfg.ha) {
                        slog("fetching Home Assistant entities");
                        udp.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1');
                        bootWait = setInterval(() => {
                            slog("HA fetch is failing, retrying...", 2);
                            udp.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1');
                        }, 10e3);
                    } else sys.boot(4);
                    break;
                case 4:
                    clearInterval(bootWait);
                    if (cfg.ha) {
                        slog("Home Assistant fetch complete");
                        if (cfg.ha.sync && cfg.ha.sync.length > 0) {
                            slog("setting up HA sync partners");
                            cfg.ha.sync.forEach(element => {
                                // console.log("partners: ", element[0], "  -  ", element[1]);
                                em.on(element[0], (newState) => { send(element[1], newState); });
                                em.on(element[1], (newState) => { send(element[0], newState); });
                            });
                        }
                        onlineHA = true;
                    }
                    if (cfg.esp && cfg.esp.subscribe && cfg.esp.subscribe.length > 0) {
                        slog("fetching esp entities");
                        udp.send(JSON.stringify({ type: "espFetch" }), 65432, '127.0.0.1');
                        setTimeout(() => { sys.boot(5); }, 1e3);
                    } else sys.boot(5);
                    break;
                case 5:
                    if (cfg.esp && cfg.esp.subscribe && cfg.esp.subscribe.length > 0)
                        slog("ESP fetch complete");
                    online = true;
                    for (const name in automation) {
                        slog(name + " automation initializing...");
                        automation[name](name);
                    }
                    setInterval(() => { udp.send(JSON.stringify({ type: "heartbeat" }), 65432, '127.0.0.1'); time.boot++; }, 1e3);
                    break;
            }
        },
    };
setTimeout(() => { sys.init(); }, 1e3);
