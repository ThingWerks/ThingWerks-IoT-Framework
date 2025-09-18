#!/usr/bin/node
ha = {
    subscribe: [
        "input_boolean.auto_bubon",
        "input_number.profile_bubon",
        "input_number.timer_oneshot_bubon",
        "input_number.timer_oneshot_irrigation",
        "Switch Kitchen Pump",
        "switch.relay_bodega_freezer_fujidenzo",
        "input_boolean.auto_freezer",
        "Button Bodega Water Filtered",
        "input_boolean.auto_irrigatiion",
        "Button Irrigation Entrance",
        "Button Water Groogies",
        "Button Water Irrigation House Back",
        "Button Water Irrigation Piggary",
        "Button Water Irrigation Dalom",
    ],
    sync: [
        ["switch.switch_test", "input_boolean.lights_stairs",],
        ["switch.lights_outside_bedroom", "input_boolean.lights_bedroom_outside"],
        ["switch.lights_outside_entrance", "input_boolean.lights_house_entrance"],
    ]
}
esp = {
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
}
automation = {
    Pumper: function (_name, push) {
        let st, cfg, nv;
        var log = (m, l) => slog(m, l, _name);
        if (!state[_name]) {
            state[_name] = {               // initialize automation volatile memory
                init: true, dd: [], ha: { pushLast: [] }, fountain: [],
                timer: {}
            };
            config[_name] ||= {
                dd: [       // config for the Demand/Delivery automation function, 1 object for each DD system
                    {   // DD system example
                        name: "Bubon",       // Demand Delivery system 2d
                        ha: {
                            auto: "input_boolean.auto_bubon",           // home assistant auto toggle ID number (specified above in cfg.ha config)
                            solar: "input_boolean.auto_solar_bubon",    // solar automation boolean/toggle
                            // turbo: 5,                                // secondary high stop pressure point
                            profile: "input_number.profile_bubon",      // pressure profile
                            // reserve: 9,                              // ha entity for reserve tank/pump
                            oneShot: ["Switch Kitchen Pump", "Button Bodega Water Filtered", "Button Water Groogies"],   // single shot pump automation run button, must be array 
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
                            oneShot: ["Button Irrigation Entrance", "Button Water Irrigation House Back", "Button Water Irrigation Piggary", "Button Water Irrigation Dalom",],  // single shot pump automation run button, must be array 
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
            }
            pointers();
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
                st.fountain.push({ step: null, timerFlow: null, flowCheck: false, })
            }
            for (let x = 0; x < cfg.dd.length; x++) {
                log(cfg.dd[x].name + " - initializing");
                st.dd.push({     // initialize volatile memory for each Demand Delivery system
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
                    auto: { get state() { return entity[cfg.dd[x].ha.auto]?.state }, name: cfg.dd[x].ha.auto },
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
                    st.dd[x].pump.push({
                        cfg: cfg.dd[x].pump[y],
                        get state() { return entity[cfg.dd[x].pump[y].entity]?.state; },
                        name: cfg.dd[x].pump[y].entity
                    });
                    if (cfg.dd[x].pump[y].flow != undefined & cfg.dd[x].pump[y].flow.sensor != undefined) {
                        st.dd[x].flow ||= [];
                        st.dd[x].flow.push(entity[("flow_" + cfg.dd[x].pump[y].flow.sensor)])
                    }
                }
                if (cfg.dd[x].press != undefined && cfg.dd[x].press.output != undefined
                    && cfg.dd[x].press.output.profile != undefined) {
                    if (cfg.dd[x].ha.profile != undefined && cfg.dd[x].press.output.profile.length > 0) {
                        log(cfg.dd[x].name + " - profile selector enabled");
                        st.dd[x].state.profile = parseInt(entity[cfg.dd[x].ha.profile]?.state);
                    } else {
                        log(cfg.dd[x].name + " - no profile entity - selecting profile 0");
                        st.dd[x].state.profile = 0;
                    }
                }
                if (cfg.dd[x].ha.turbo != undefined) {
                    st.dd[x].state.turbo = entity[cfg.dd[x].ha.turbo].state;
                }
            }
            calcFlow();
            calcFlowMeter();
            pushSensor();
            st.timer.hour = setInterval(() => {     // called every hour  -  reset hourly notifications
                for (let x = 0; x < cfg.dd.length; x++) {
                    st.dd[x].fault.flowOver = false;
                    st.dd[x].warn.tankLow = false;
                }
            }, 3600e3);
            st.timer.second = setInterval(() => {     // called every second  -  rerun this automation every second
                calcFlow();
                pushSensor(state);
                for (let x = 0; x < cfg.dd.length; x++) pumpControl(x);
            }, 1e3);
            st.timer.minute = setInterval(() => { timer(); }, 60e3);
        } else {
            pointers();
            if (!hotBoot[_name]) {
                log("hot reload initiated");
                clearInterval(st.timer.hour);
                clearInterval(st.timer.minute);
                clearInterval(st.timer.second);
                state[_name] = undefined;
                config[_name] = undefined;
            }
        }
        function pointers() {
            hotBoot[_name] ||= true;
            nvMem[_name] ||= {};
            nv = nvMem[_name];
            cfg = config[_name];
            st = state[_name];
        }
        if (push) {
            for (let x = 0; x < cfg.dd.length; x++) {
                let dd = st.dd[x];
                // log("dd automation toggle: " + push.name + " state:" + push.newState)
                if (push.name == dd.auto.name) {
                    time.sync();
                    switch (push.newState) {
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
                            pumpStop(x);
                            return;
                    }
                    return;
                }
                if (cfg.dd[x].ha.oneShot && cfg.dd[x].ha.oneShot.includes(push.name)) {
                    log(cfg.dd[x].name + " - One Shot operation triggered by: " + push.name);
                    if (push.newState.includes("remote_button_short_press") || !push.newState.includes("remote_button")) {
                        let duration = Math.trunc(entity[cfg.dd[x].ha.oneShotTimer].state);
                        log(cfg.dd[x].name + " - starting one shot operation - stopping in " + duration + " minutes");
                        send(cfg.dd[x].ha.auto, true);
                        st.dd[x].state.oneShot = setTimeout(() => {
                            log(cfg.dd[x].name + " - stopping one shot operation after " + duration + " minutes");
                            send(cfg.dd[x].ha.auto, false);
                        }, (duration * 60 * 1e3));
                    }
                    return;
                }
                if (cfg.dd[x].ha.turbo == push.name) {
                    log(cfg.dd[x].name + " - Turbo operation triggered by: " + push.name);
                    if (push.newState == true) {
                        log(cfg.dd[x].name + " - enabling pump turbo mode");
                        st.dd[x].state.turbo = true;
                    } else {
                        log(cfg.dd[x].name + " - disabling pump turbo mode");
                        st.dd[x].state.turbo = false;
                    }
                    return;
                }
                if (cfg.dd[x].ha.profile == push.name) {
                    log(cfg.dd[x].name + " - pump profile change triggered by: " + push.name);
                    log(cfg.dd[x].name + " - pump profile changing to mode: " + ~~push.newState);
                    st.dd[x].state.profile = parseInt(push.newState);
                    return;
                }
            }
            for (let x = 0; x < cfg.fountain.length; x++) {
                if (cfg.fountain[x].haAuto == push.name) {
                    log(cfg.fountain[x].name + " - automation triggered by: " + push.name);
                    if (push.newState == true) {
                        log(cfg.fountain[x].name + " auto is starting");
                        pumpFountain(x, true);
                    } else {
                        log(cfg.fountain[x].name + " auto is stopping");
                        pumpFountain(x, false);
                    }
                    return;
                }
            }
            if (push.only) return;
        }
        /*
        fountain advanced time window - coordinate with solar power profile - fault run time 
        solar fountain controls auto, when low sun, auto fountain resumes with pump stopped (fail safe)
        */
        function timer() {    // called every minute
            for (let x = 0; x < cfg.dd.length; x++) { st.dd[x].warn.flowFlush = false; }
            if (time.hour == 4 && time.min == 0) {
                for (let x = 0; x < cfg.dd.length; x++) { st.dd[x].warn.flowDaily = false; } // reset low flow daily warning
            }
            if (time.hour == 0 && time.min == 0) {
                log("resetting daily flow meters")
                for (const name in nv.flow) { nv.flow[name].today = 0; }  // reset daily low meters
            }
            calcFlowMeter();
            file.write.nv();
        }
        function fountain(x) {
            let fount = { st: st.fountain[x], cfg: cfg.fountain[x] }
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
            let dd = st.dd[x];
            pointers();
            pumpShared(x);
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
                                                pumpStop(x, true);
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
                                            pumpStop(x, true);
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
                                    pumpStop(x);
                                    return;
                                }
                            } else if (dd.state.turbo) {
                                if (dd.press.out.state.psi >= dd.cfg.press.turbo.stop) {
                                    log(dd.cfg.name + " - " + dd.press.out.cfg.name + " turbo shutoff pressure reached - pump is stopping");
                                    pumpStop(x);
                                    return;
                                }
                            } else if (dd.state.profile != null) {
                                if (dd.press.out.state.psi >= dd.cfg.press.output.profile[dd.state.profile].stop) {
                                    log(dd.cfg.name + " - " + dd.press.out.cfg.name + " pump profile: " + dd.state.profile + " pressure reached: "
                                        + dd.press.out.state.psi.toFixed(0) + " psi - pump is stopping");
                                    pumpStop(x);
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
                                pumpStop(x);
                                return;
                            }
                            if (time.epoch - dd.state.timerRun >= dd.cfg.fault.runLongError * 60) {
                                log(dd.cfg.name + " - pump: " + dd.pump[dd.state.pump].name + " - max runtime exceeded - DD system shutting down", 3);
                                pumpStop(x);
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
                                    pumpStop(x);
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
                            if (dd.pump[dd.state.pump].state === null || dd.pump[dd.state.pump].state == true) pumpStop(x, true);
                            return;
                        }
                    }
                    break;
            }
            if (dd.press.out.state.meters >= (dd.cfg.press.stop + .12) && dd.fault.flowOver == false) {
                log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is overflowing (" + dd.press.out.state.meters
                    + dd.press.out.cfg.unit + ") - possible SSR or hardware failure", 3);
                pumpStop(x);
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
                        //automation[_name](_name, slog, send, file, nvMem, entity, state, config);
                        pumpFlowCheck();
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
            function pumpPressCheck() {
                if (time.epoch - dd.state.timerRise >= dd.cfg.press.outputRiseTime) {
                    if (dd.press.out.cfg.unit == "m") {
                        log("checking pressure rise, starting: " + dd.state.pressStart + "  current: " + dd.press.out.state.percent
                            + "  difference: " + (dd.press.out.state.percent - dd.state.pressStart) + "%", 0);
                        if (!(dd.press.out.state.percent - dd.state.pressStart) > dd.cfg.press.outputRiseError) {
                            if (type == 0) log(dd.cfg.name + " - tank level not rising - DD system shutting down", 3);
                            send(dd.auto.name, false);
                            dd.auto.state = false;
                            pumpStop(x, true)
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
                            pumpStop(x, true)
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
                                    log(dd.cfg.name + " - flow check FAILED!! (" + flow.toFixed(1) + "lm) - ", press.psi, " psi - HA Pump State: "
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
                            pumpStop(x, true);
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
                                trigger((" - RUN flow stop (" + flow.toFixed(1) + "lm) - pump stopping - " + press.psi + " psi"), false);
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
                                    pumpStop(x, true);
                                } else {
                                    log(dd.cfg.name + msg, 1);
                                    pumpStop(x);
                                }
                            }
                        }
                    }
                }
            }
            function pointers() {
                for (let y = 0; y < cfg.dd[x].pump.length; y++) {
                    dd.pump[y].state = entity[cfg.dd[x].pump[y].entity].state;
                }
            }
        }
        function pumpStop(x, fault) {
            let dd = st.dd[x],
                runTime = time.epoch - dd.state.timerRun,
                hours = Math.floor(runTime / 60 / 60),
                minutes = Math.floor(runTime / 60),
                extraSeconds = runTime % 60, lbuf;
            pumpShared(x);
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
        function pumpShared(x) {
            let dd = st.dd[x];
            dd.sharedPump = { shared: null, run: false, num: null };
            for (let y = 0; y < cfg.dd.length; y++) {
                if (y != x && dd.pump[dd.state.pump].cfg.entity == cfg.dd[y].pump[st.dd[y].state.pump].entity) {
                    if (st.dd[y].state.run == true) {
                        dd.sharedPump.run = true;
                    } else { setTimeout(() => { dd.sharedPump.run = false; }, 10e3); }
                    dd.sharedPump.shared = true;
                    dd.sharedPump.num = y;
                    break;
                }
            }
        }
        function pumpFountain(x, power) {
            let fount = { st: st.fountain[x], cfg: cfg.fountain[x] }
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
                            stopPressure = cfg.dd[y].press.profile[st.dd[y].state.profile].stop;
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
                    entity[flowNameEntity].lm = entity[cfg.sensor.flow[x].entity]?.state / cfg.sensor.flow[x].pulse / 60;
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
    },
    Compound: function (_name, push) {
        let st, cfg, nv;
        var log = (m, l) => slog(m, l, _name);
        if (!state[_name]) {
            state[_name] = {
                boot: false
            };
            config[_name] ||= {

            }
            pointers();
            log(_name + " automation is starting");
            setInterval(() => { timer(); }, 60e3);

        } else {
            pointers();
            if (!hotBoot[_name]) {
                log("hot reload initiated");
                clearInterval(st.timer.hour);
                clearInterval(st.timer.minute);
                clearInterval(st.timer.second);
                state[_name] = undefined;
            }
        }
        function pointers() {
            hotBoot[_name] = true;
            nvMem[_name] ||= {};
            nv = nvMem[_name];
            cfg = config[_name];
            st = state[_name];
        }
        function timer() {
            if (time.hour == 0 && time.min == 0) {
                log("Lights - Outside Lights - Turning OFF");
                send("input_boolean.lights_stairs", false);
                send("switch.lights_bodega_front_1", false);
            }
            if (time.hour == 2 && time.min == 0) {
                // send("switch.relay_bodega_freezer_fujidenzo", false);
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
    },
};
module.exports = { ha, esp, automation, cleanup: () => { } };
hotBoot = {};
