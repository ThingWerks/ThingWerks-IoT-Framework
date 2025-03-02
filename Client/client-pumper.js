#!/usr/bin/node
let
    cfg = {
        moduleName: "Pumper",
        telegram: {
            password: "test",
        },
        ha: [
            "input_boolean.auto_compressor",
            "input_boolean.all_systems_timer",
            "input_boolean.auto_pump_transfer",
            "input_boolean.auto_pump_pressure",
            "input_boolean.auto_solar",
            "input_boolean.auto_pump_pressure_turbo",
            "input_boolean.auto_fountain",
            "input_button.pump_uth_one_shot",
            "input_number.pump_uth_timer",
            "input_boolean.pump_uth_reserve",
            "input_number.auto_pump_profile",
        ],
        esp: [
            "lth-tank",             // 0
            "lth-relay1",
            "uth-tank",
            "lth-relay2",
            "uth-relay1",
            "uth-relay2",
            "uth-relay3",
            "uth-relay4",
            "uth-pump",
            "flow-lth-submersible", // 9 
            "flow-uth-pump",        // 10
            "flow-fountain-pump",   // 11
            "fountain-relay1",      // 12
        ],
        dd: [       // config for the Demand/Delivery automation function, 1 object for each DD system
            {   // DD system example
                name: "LTH-AirLift",       // Demand Delivery system name
                ha: {
                    auto: 0,            // home assistant auto toggle ID number (specified above in cfg.ha config)
                },
                pump: [
                    {
                        id: 1,              // ESP/HA cfg ID number
                        type: "esp",
                        class: "single",
                        name: "Compressor",
                        flow: {                 // - must be an undefined object if not used
                            id: undefined,      // flow sensor number (in cfg.flow block) - must be undefined if not used
                            startWarn: 70,      // min start flow before triggering notification (useful for filters)
                            startError: 20,     // minimum flow rate pump must reach at start
                            startWait: 6,       // seconds to wait before checking flow after pump starts
                        },
                    },
                ],
                press: {                // - must be an undefined object if not used
                    output: 0,          // pressure sensor number (in cfg.press block)
                    input: undefined,   // id for tank feeding this system
                    start: 3.80,        // output tank start psi/meters
                    stop: 3.90,         // output tank stop psi/meters 
                },

                fault: {
                    retry: 10,          // time in seconds to wait for retry
                    retryFinal: 2,      // time in minutes to wait for final retry
                    runLong: 600,       // max run time in minutes
                    cycleCount: 3,      // max cycle times per cycleTime window
                    cycleTime: 120,     // max cycleTime time window  (in seconds)
                },
            },
            {   // DD system example
                name: "LTH-UTH-Transfer",       // Demand Delivery system 2d
                ha: {
                    auto: 2,                // home assistant auto toggle ID number (specified above in cfg.ha config)
                },
                solenoid: {
                    id: 5,              // ESP/HA cfg ID number
                    type: "esp",
                    name: "2 Inch 12v",
                },
                pump: [
                    {
                        id: 3,              // ESP/HA cfg ID number
                        type: "esp",
                        class: "single",
                        name: "Submersible",
                        flow: {
                            id: 0,                  // flow sensor number (in cfg.flow block)
                            startWarn: 120,         // min start flow before triggering notification (useful for filters)
                            startError: 100,        // minimum flow rate pump must reach at start
                            startWait: 6,           // seconds to wait before checking flow after pump starts
                        },
                    },
                ],
                press: {
                    output: 1,              // pressure sensor number (in cfg.press block)
                    outputRiseTime: 600,    // time to wait to check for level rise
                    outputRiseWarn: 5,      // level the tank must rise to   percentage for level/meter sensors and psi for pressure tanks
                    outputRiseError: 3,     // level to throw warning
                    start: .95,            // output tank start psi/meters
                    stop: 1.0,             // output tank stop psi/meters 
                    input: 0,               // input tank feeding the pump
                    // inputMin: 15         // minimum input level in percent
                },

                fault: {
                    retry: 10,              // time in seconds to wait for retry
                    retryFinal: 2,          // time in minutes to wait for final retry
                    runLong: 60,            // max run time in minutes
                    cycleCount: 1,          // max cycle times per cycleTime window
                    cycleTime: 120,         // max cycleTime time window  (in seconds)
                },
            },
            {   // DD system example
                name: "UTH-Pressure",       // Demand Delivery system 2d
                ha: {
                    auto: 3,                // home assistant auto toggle ID number (specified above in cfg.ha config)
                    turbo: 5,               // secondary high stop pressure point
                    profile: 10,            // pressure profile
                    reserve: 9,             // ha entity for reserve tank/pump
                    oneShot: 7,             // single shot pump run 
                    oneShotTimer: 8,        // single shot pump run time length
                },
                pump: [
                    {
                        id: 3,              // ESP/HA cfg ID number
                        type: "esp",
                        class: "single",
                        name: "Submersible",
                        flow: {
                            id: 0,                  // flow sensor number (in cfg.flow block)
                            startWarn: 80,         // min start flow before triggering notification (useful for filters)
                            startError: 40,        // minimum flow rate pump must reach at start
                            startWait: 6,           // seconds to wait before checking flow after pump starts
                        },
                    },
                    {
                        id: 4,              // ESP/HA cfg ID number
                        type: "esp",
                        class: "reserve",
                        name: "1/2 HP Speroni",
                        flow: {                 // object must be declared
                            id: 1,              // flow sensor number (in cfg.flow block)
                            startWarn: 10,      // min start flow before triggering notification (useful for filters)
                            startError: 2,      // minimum flow rate pump must reach at start
                            startWait: 6,       // seconds to wait before checking flow after pump starts
                            //    stopFlow: 4,        // flow rate to signal pump stop
                        },
                    },
                ],
                press: {
                    output: 2,          // pressure sensor number (in cfg.press block)
                    input: undefined,
                    profile: [
                        { start: 20, stop: 30 },
                        { start: 26, stop: 35 },
                        { start: 30, stop: 42 },
                    ],
                    turbo: {
                        start: 26,
                        stop: 31,
                    }
                },
                flow: {                 // object must be declared
                    id: 1,              // flow sensor number (in cfg.flow block)
                    startWarn: 10,      // min start flow before triggering notification (useful for filters)
                    startError: 2,      // minimum flow rate pump must reach at start
                    startWait: 6,       // seconds to wait before checking flow after pump starts
                    //    stopFlow: 4,        // flow rate to signal pump stop
                },
                fault: {
                    retry: 10,          // time in seconds to wait for retry
                    retryFinal: 2,      // time in minutes to wait for final retry
                    runLong: 60,        // max run time in minutes
                    cycleCount: 0,      // max cycle times per cycleTime window
                    cycleTime: 120,     // max cycleTime time window  (in seconds)
                    flushWarning: false,
                },
            }
        ],
        press: [     // config for tanks used with Home Assistant -- these tanks get sent back to HA as sensors
            {   // Tank 1 example
                name: "tank_lth",       // tank name (do not use spaces or dash, underscore only)
                unit: "m",              // measurement unit (i.e. PSI or meters) "m" or "psi" only
                type: "esp",            // the sensor ID in "ha" or "esp" block
                id: 0,                  // HA or ESP ID number, corresponds to array number (zero indexed) 
                // levelFull: 3.90,        // for tanks not assigned to DD systems - meter reading only 
                average: 40,            // amount of samples to average over
                voltageMin: 0.566,      // calibration, minimum value when sensor is at atmospheric pressure 
                pressureRating: 15,     // max rated pressure of transducer in PSI
            },
            {   // Tank 1 example
                name: "tank_uth",       // tank name (do not use spaces or dash, underscore only)
                unit: "m",              // measurement unit (i.e. PSI or meters) "m" or "psi" only
                type: "esp",            // the sensor ID in "ha" or "esp" block
                id: 2,                  // HA or ESP ID number, corresponds to array number (zero indexed) 
                average: 40,            // amount of samples to average over
                voltageMin: 0.666,      // calibration, minimum value when sensor is at atmospheric pressure 
                pressureRating: 5,      // max rated pressure of transducer in PSI
            },
            {   // Tank 1 example
                name: "pump_uth",       // tank name (do not use spaces or dash, underscore only)
                unit: "psi",            // measurement unit (i.e. PSI or meters) "m" or "psi" only
                type: "esp",            // the sensor ID in "ha" or "esp" block
                id: 8,                  // HA or ESP ID number, corresponds to array number (zero indexed) 
                average: 5,             // amount of samples to average over
                voltageMin: 0.609,      // calibration, minimum value when sensor is at atmospheric pressure 
                pressureRating: 174,    // max rated pressure of transducer in PSI
            },
        ],
        fountain: [
            {
                name: "Fountain",
                intervalOn: 6,          // run duration in minutes
                intervalOff: 90,
                haAuto: 6,
                pump: 12,
                flow: {
                    id: 2,              // flow meter config ID number
                    startWarn: 10,      // min start flow before triggering notification (useful for filters)
                    startError: 2,      // minimum flow rate pump must reach at start
                    startWait: 6,       // seconds to wait before checking flow after pump starts
                }
            }
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
                name: "flow_lth_submersible",           // flow meter name that will appear in HA as a sensor (do not use spaces or dash, underscore only)
                type: "esp",            // the sensor is "ha" or "esp" 
                id: 9,                  // HA or ESP ID number, corresponds to array number (zero indexed) 
                pulse: 0.2,             // pulse calculation factor for your specific flow meter
                unit: "m3",             // unit of measurement (cubic meters)
            },
            {   // flow meter 1 example
                name: "flow_uth_pump",  // flow meter name that will appear in HA as a sensor (do not use spaces or dash, underscore only)
                type: "esp",            // the sensor is "ha" or "esp" 
                id: 10,                 // HA or ESP ID number, corresponds to array number (zero indexed) 
                pulse: 4.8,             // pulse calculation factor for your specific flow meter
                unit: "m3",             // unit of measurement (cubic meters)
            },
            {   // flow meter 1 example
                name: "flow_fountain",  // flow meter name that will appear in HA as a sensor (do not use spaces or dash, underscore only)
                type: "esp",            // the sensor is "ha" or "esp" 
                id: 11,                 // HA or ESP ID number, corresponds to array number (zero indexed) 
                pulse: .45,             // pulse calculation factor for your specific flow meter
                unit: "m3",             // unit of measurement (cubic meters)
            }
        ],
    },
    automation = [
        (index) => {
            /*
            does flow/pressure fault remain true after auto is shut down? Solar automation needs to read fault statue

            fountain advanced time window - coordinate with solar power profile - fault run time 
            solar fountain controls auto, when low sun, auto fountain resumes with pump stopped (fail safe)

            */
            if (state.auto[index] == undefined) init();
            function timer() {    // called every minute
                if (time.hour == 4 && time.min == 0) {
                    for (let x = 0; x < cfg.dd.length; x++) { state.auto[index].dd[x].warn.flowDaily = false; } // reset low flow daily warning
                }
                if (state.ha[1] == true) {
                    if (time.hour == 6 && time.min == 30) {
                        clearTimeout(state.auto[index].dd[2].oneShot);
                        ha.send("input_number.auto_pump_profile", 0);
                        ha.send("input_boolean.auto_pump_pressure", true);
                    }
                    if (time.hour == 6 && time.min == 40) {
                        ha.send("input_boolean.auto_pump_pressure", false);
                    }
                    if (time.hour == 7 && time.min == 0) {
                        clearTimeout(state.auto[index].dd[2].oneShot);
                        ha.send("input_number.auto_pump_profile", 0);
                        ha.send("input_boolean.auto_pump_pressure", true);
                    }
                    if (time.hour == 7 && time.min == 30) {
                        ha.send("input_boolean.auto_pump_pressure", false);
                    }
                    if (time.hour == 11 && time.min == 30) {
                        clearTimeout(state.auto[index].dd[2].oneShot);
                        ha.send("input_number.auto_pump_profile", 2);
                        ha.send("input_boolean.auto_pump_pressure", true);
                    }
                    if (time.hour == 12 && time.min == 0) {
                        ha.send("input_boolean.auto_pump_pressure", false);
                        ha.send("input_number.auto_pump_profile", 0);
                    }
                    if (time.hour == 17 && time.min == 0) {
                        clearTimeout(state.auto[index].dd[2].oneShot);
                        ha.send("input_number.auto_pump_profile", 0);
                        ha.send("input_boolean.auto_pump_pressure", true);
                    }
                    if (time.hour == 17 && time.min == 15) {
                        ha.send("input_boolean.auto_pump_pressure", false);
                    }
                }
                if (time.hour == 19 && time.min == 30 || time.hour == 21 && time.min == 0) {
                    if (state.ha[1] == true) ha.send("input_boolean.auto_pump_pressure", false);
                }
                if (time.hour == 22 && time.min == 0) {
                    log("resetting daily flow meters", index, 1)
                    for (let x = 0; x < cfg.flow.length; x++) nv.flow[x].today = 0; // reset daily low meters
                }
                calcFlowMeter();
                file.write.nv();
                for (let x = 0; x < cfg.dd.length; x++) { state.auto[index].dd[x].warn.flowFlush = false; }
            }
            function fountain(x) {
                let fount = { st: state.auto[index].fountain[x], cfg: cfg.fountain[x] }
                if (state.ha[fount.cfg.haAuto] == true) {
                    if (fount.st.step == null) pumpFountain(x, true);
                    if (state.esp[fount.cfg.pump] == true) {
                        if (time.epochMin - fount.st.step >= fount.cfg.intervalOn) pumpFountain(x, false);
                    } else {
                        if (time.epochMin - fount.st.step >= fount.cfg.intervalOff) pumpFountain(x, true);
                    }
                }
                if (fount.st.flowCheck) {
                    let flow = (state.esp[cfg.flow[fount.cfg.flow.id].id] / 60).toFixed(0);
                    if (flow <= fount.cfg.flow.startError) {
                        log(fount.cfg.name + " - flow check FAILED: " + flow + "lpm - auto will shut down", index, 3);
                        ha.send(fount.cfg.haAuto, false);
                        pumpFountain(x, false);
                        return;
                    }
                }
            }
            function pumpControl(x) {
                let dd = state.auto[index].dd[x];
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
                                                    + "m) - pump is starting", index, 1);
                                                pumpStart(true);
                                                return;
                                            }
                                        } else if (dd.state.turbo) {
                                            if (dd.press.out.state.psi <= dd.cfg.press.turbo.start) {
                                                log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.psi.toFixed(0)
                                                    + "psi) - pump turbo is starting", index, 1);
                                                pumpStart(true);
                                                return;
                                            }
                                        } else if (dd.state.profile != null) {
                                            if (dd.press.out.state.psi <= dd.cfg.press.profile[dd.state.profile].start) {
                                                log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.psi.toFixed(0)
                                                    + "psi) - pump is starting with profile: " + dd.state.profile, index, 1);
                                                pumpStart(true);
                                                return;
                                            }
                                        } else if (dd.press.out.state.psi <= dd.cfg.press.start) {
                                            log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.psi.toFixed(0)
                                                + "psi) - pump is starting", index, 1);
                                            pumpStart(true);
                                            return;
                                        }
                                        if (dd.state.timeoutOff == true) {  // after pump has been off for a while
                                            if (dd.pump[dd.state.pump].state === true && dd.sharedPump.run == false) {
                                                log(dd.cfg.name + " - pump running in HA/ESP but not here - switching pump ON", index, 1);
                                                pumpStart(true);
                                                return;
                                            } else {
                                                if (dd.flow != undefined && dd.flow[dd.state.pump].lm > dd.cfg.pump[dd.state.pump].flow.startError
                                                    && dd.warn.flowFlush == false && dd.sharedPump.shared == false) {
                                                    log(dd.cfg.name + " - flow is detected (" + dd.flow[dd.state.pump].lm.toFixed(0) + "lpm) possible sensor damage or flush operation", index, 2);
                                                    dd.warn.flowFlush = true;
                                                    log(dd.cfg.name + " - shutting down auto system", index, 1);
                                                    ha.send(dd.auto.name, false);
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
                                                log(dd.cfg.name + " - pump is flow faulted but HA pump status is still ON, trying to stop again", index, 3);
                                                ha.send(dd.auto.name, false);
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
                                        log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is full - pump is stopping", index, 1);
                                        pumpStop();
                                        return;
                                    }
                                } else if (dd.state.turbo) {
                                    if (dd.press.out.state.psi >= dd.cfg.press.turbo.stop) {
                                        log(dd.cfg.name + " - " + dd.press.out.cfg.name + " turbo shutoff pressure reached - pump is stopping", index, 1);
                                        pumpStop();
                                        return;
                                    }
                                } else if (dd.state.profile != null) {
                                    if (dd.press.out.state.psi >= dd.cfg.press.profile[dd.state.profile].stop) {
                                        log(dd.cfg.name + " - " + dd.press.out.cfg.name + " pump profile: " + dd.state.profile + " pressure reached: "
                                            + dd.press.out.state.psi.toFixed(0) + " - pump is stopping", index, 1);
                                        pumpStop();
                                        return;
                                    }
                                } else if (dd.press.out.state.psi >= dd.cfg.press.stop) {
                                    log(dd.cfg.name + " - " + dd.press.out.cfg.name + " shutoff pressure reached - pump is stopping", index, 1);
                                    pumpStop();
                                    return;
                                }
                                if (time.epoch - dd.state.timerRun >= dd.cfg.fault.runLong * 60) {
                                    log(dd.cfg.name + " - pump: " + dd.pump[dd.state.pump].name + " - max runtime exceeded - DD system shutting down", index, 3);
                                    pumpStop();
                                    ha.send(dd.auto.name, false);
                                    dd.auto.state = false;
                                    return;
                                }
                                if (dd.flow == undefined && dd.state.timeoutOn == true && dd.pump[dd.state.pump].state === false) {
                                    log(dd.cfg.name + " - is out of sync - auto is on, system is RUN but pump is off", index, 2);
                                    pumpStart(true);
                                    return;
                                }
                                if (dd.press.in != undefined && dd.press.in.state.percent <= dd.cfg.press.inputMin) {
                                    log(dd.cfg.name + " - input tank level is too low - DD system shutting down", index, 3);
                                    ha.send(dd.auto.name, false);
                                    dd.auto.state = false;
                                    return;
                                }
                                if (dd.cfg.press.outputRiseTime != undefined) pumpPressCheck();
                                if (dd.flow != undefined) {
                                    if (dd.cfg.pump[dd.state.pump].flow.stopFlow != undefined && dd.flow[dd.state.pump].lm <= dd.cfg.pump[dd.state.pump].flow.stopFlow) {
                                        log(dd.cfg.name + " - stop flow rate reached - pump is stopping", index, 1);
                                        pumpStop();
                                        return;
                                    }
                                    pumpFlowCheck();
                                }
                                break;
                        }
                        if (dd.warn.tankLow != undefined && dd.press.out.state.meters <= (dd.press.out.cfg.warn) && dd.warn.tankLow == false) {
                            log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is lower than expected (" + dd.press.out.state.meters.toFixed(2)
                                + dd.press.out.cfg.unit + ") - possible hardware failure or low performance", index, 2);
                            dd.warn.tankLow = true;
                        }
                        break;
                    case false:  // when auto is OFFLINE
                        if (dd.state.timeoutOff == true) {
                            if (dd.pump[dd.state.pump].state === true && dd.sharedPump.run == false) {        // this is mainly to sync the state of pumper after a service restart
                                log(dd.cfg.name + " - is out of sync - auto is off but pump is on - switching auto ON", index, 2);
                                ha.send(dd.auto.name, true);
                                dd.auto.state = true;
                                pumpStart();
                                return;
                            }
                            if (dd.flow != undefined && dd.flow[dd.state.pump].lm > dd.cfg.pump[dd.state.pump].flow.startError
                                && dd.warn.flowFlush == false && dd.cfg.fault.flushWarning != false && dd.sharedPump.shared == false) {
                                dd.warn.flowFlush = true;
                                log(dd.cfg.name + " - Auto is off but flow is detected (" + dd.flow[dd.state.pump].lm.toFixed(1) + ") possible sensor damage or flush operation", index, 2);
                                if (dd.pump[dd.state.pump].state === null || dd.pump[dd.state.pump].state == true) pumpStop(true);
                                return;
                            }
                        }
                        break;
                }
                if (dd.press.out.state.meters >= (dd.cfg.press.stop + .12) && dd.fault.flowOver == false) {
                    log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is overflowing (" + dd.press.out.state.meters
                        + dd.press.out.cfg.unit + ") - possible SSR or hardware failure", index, 3);
                    pumpStop();
                    dd.fault.flowOver = true;
                }
                function pumpStart(sendOut) {
                    if (dd.state.cycleCount == 0) {
                        dd.state.cycleTimer = time.epoch;
                        dd.state.timerRise = time.epoch;
                    } else if (dd.state.cycleCount > dd.cfg.fault.cycleCount) {
                        if (time.epoch - dd.state.cycleTimer < dd.cfg.fault.cycleTime) {
                            log(dd.cfg.name + " - pump is cycling to frequently - DD system shutting down", index, 3);
                            ha.send(dd.auto.name, false);
                            dd.auto.state = false;
                            return;
                        } else { dd.state.cycleTimer = time.epoch; dd.state.cycleCount = 0; }
                    }
                    if (dd.press.in != undefined && dd.press.in.state.percent <= dd.cfg.press.inputMin) {
                        log(dd.cfg.name + " - input tank level is too low - DD system shutting down", index, 3);
                        ha.send(dd.auto.name, false);
                        dd.auto.state = false;
                        return;
                    }
                    if (dd.press.out != undefined) {
                        if (dd.press.out.cfg.unit == "m") dd.state.pressStart = dd.press.out.state.percent;
                        if (dd.press.out.cfg.unit == "psi") dd.state.pressStart = dd.press.out.state.psi;
                    }
                    dd.state.cycleCount++;

                    if (dd.cfg.ha.reserve != undefined) {
                        if (state.ha[dd.cfg.ha.reserve] == true) dd.state.pump = 1;
                        else dd.state.pump = 0;
                    }

                    if (dd.flow != undefined && dd.cfg.pump[dd.state.pump].flow != undefined)
                        dd.flow[dd.state.pump].batch = nv.flow[dd.cfg.pump[dd.state.pump].flow.id].total;

                    dd.fault.flow = false;
                    dd.state.run = true;
                    dd.state.timerRun = time.epoch;
                    dd.state.flowCheck = false;
                    dd.state.flowCheckPassed = false;
                    dd.state.timeoutOn = false;
                    setTimeout(() => { dd.state.timeoutOn = true }, 10e3);
                    if (dd.cfg.pump[dd.state.pump].flow.id != undefined) {
                        setTimeout(() => {
                            log(dd.cfg.name + " - checking pump flow", 1);
                            dd.state.flowCheck = true;
                            automation[index](index);
                        }, dd.cfg.pump[dd.state.pump].flow.startWait * 1000);
                    }
                    dd.state.sendRetries = 0;
                    if (sendOut) {
                        if (dd.cfg.solenoid != undefined) {
                            log(dd.cfg.name + " - opening solenoid", index, 1);
                            if (dd.cfg.solenoid.type == "esp") {
                                esp.send(cfg.esp[dd.cfg.solenoid.id], true);
                                setTimeout(() => { startMotor(); }, 2e3);
                            } else startMotor();
                        } else startMotor();
                        function startMotor() {
                            log(dd.cfg.name + " - starting pump: " + dd.pump[dd.state.pump].name + " - cycle count: "
                                + dd.state.cycleCount + "  Time: " + (time.epoch - dd.state.cycleTimer), index, 1);
                            if (dd.pump[dd.state.pump].cfg.type == "ha") ha.send(cfg.ha[dd.pump[dd.state.pump].id], true); // if no "sendOut" then auto system is syncing state with HA/ESP
                            else setTimeout(() => { esp.send(dd.pump[dd.state.pump].name, true); }, 1e3);

                        }
                    }
                }
                function pumpStop(fault) {
                    let dd = state.auto[index].dd[x],
                        runTime = time.epoch - dd.state.timerRun,
                        hours = Math.floor(runTime / 60 / 60),
                        minutes = Math.floor(runTime / 60),
                        extraSeconds = runTime % 60, lbuf;
                    pumpShared();
                    if (dd.sharedPump.run == false) {
                        lbuf = dd.cfg.name + " - stopping pump: " + dd.pump[dd.state.pump].name + " - Runtime: " + hours + "h:" + minutes + "m:" + extraSeconds + "s";
                        if (dd.pump[dd.state.pump].cfg.type == "ha") ha.send(cfg.ha[dd.pump[dd.state.pump].id], false);
                        else esp.send(dd.pump[dd.state.pump].name, false);
                    } else {
                        lbuf = dd.cfg.name + " - stopping " + dd.pump[dd.state.pump].name + " but pump still in use by "
                            + cfg.dd[dd.sharedPump.num].name + " - Runtime: " + hours + "h:" + minutes + "m:" + extraSeconds + "s";
                    }
                    setTimeout(() => { dd.state.timeoutOff = true }, 10e3);
                    if (fault == true) {
                        log(dd.cfg.name + " faulted - solar automation is stopping", index, 2);
                        ha.send("input_boolean.auto_solar", false);
                    }
                    setTimeout(() => {
                        if (dd.cfg.solenoid != undefined) {
                            log(dd.cfg.name + " - closing solenoid", index, 1);
                            if (dd.cfg.solenoid.type == "esp") {
                                esp.send(cfg.esp[dd.cfg.solenoid.id], false);
                            }
                        }
                    }, 4e3);
                    if (dd.flow != undefined) {
                        let tFlow = nv.flow[dd.cfg.pump[dd.state.pump].flow.id].total - dd.flow[dd.state.pump].batch;
                        log(lbuf + " - pumped " + tFlow.toFixed(2) + "m3 - Average: "
                            + ((tFlow * 1000) / (time.epoch - dd.state.timerRun) * 60).toFixed(1) + "lm", index, 1);
                    }
                    else log(lbuf, index, 1);
                    dd.state.timeoutOff = false;
                    dd.state.run = false;
                    dd.pump[dd.state.pump].state = false;

                }
                function pumpPressCheck() {
                    if (time.epoch - dd.state.timerRise >= dd.cfg.press.outputRiseTime) {
                        if (dd.press.out.cfg.unit == "m") {
                            log("checking pressure rise, starting: " + dd.state.pressStart + "  current: " + dd.press.out.state.percent
                                + "  difference: " + (dd.press.out.state.percent - dd.state.pressStart) + "%", index, 0);
                            if (!(dd.press.out.state.percent - dd.state.pressStart) > dd.cfg.press.outputRiseError) {
                                if (type == 0) log(dd.cfg.name + " - tank level not rising - DD system shutting down", index, 3);
                                ha.send(dd.auto.name, false);
                                dd.auto.state = false;
                                pumpStop(true)
                                return;
                            }
                            else if (!(dd.press.out.state.percent - dd.state.pressStart) > dd.cfg.press.outputRiseWarn) {
                                if (type == 0) log(dd.cfg.name + " - tank level not rising", index, 2);
                            }
                            dd.state.pressStart = dd.press.out.state.percent;
                        }
                        if (dd.press.out.cfg.unit == "psi") {
                            log("checking pressure rise, starting: " + dd.state.pressStart + "  current: " + dd.press.out.state.percent
                                + "  difference: " + (dd.press.out.state.percent - dd.state.pressStart) + "psi", index, 0);
                            if (!(dd.press.out.state.psi - dd.state.pressStart) > dd.cfg.press.outputRiseError) {
                                if (type == 0) log(dd.cfg.name + " - tank level not rising - DD system shutting down", index, 3);
                                ha.send(dd.auto.name, false);
                                dd.auto.state = false;
                                pumpStop(true)
                                return;
                            }
                            else if (!(dd.press.out.state.psi - dd.state.pressStart) > dd.cfg.press.outputRiseWarn) {
                                if (type == 0) log(dd.cfg.name + " - tank level not rising", index, 2);
                            }
                            dd.state.pressStart = dd.press.out.state.psi;
                        }
                        dd.state.timerRise = time.epoch;
                    }
                }
                function pumpFlowCheck() {
                    if (dd.state.flowCheck == true) {
                        if (dd.flow[dd.state.pump].lm < dd.cfg.pump[dd.state.pump].flow.startError) {
                            dd.fault.flow = true;
                            if (dd.fault.flowRestarts < 3) {
                                log(dd.cfg.name + " - flow check FAILED!! (" + dd.flow[dd.state.pump].lm.toFixed(1) + "lm) HA Pump State: "
                                    + dd.pump[dd.state.pump].state + " - waiting for retry " + (dd.fault.flowRestarts + 1), index, 2);
                                dd.fault.flowRestarts++;
                                flowTimer[x] = setTimeout(() => {
                                    dd.fault.flow = false; log(dd.cfg.name + " - pump restating", index, 1);
                                }, dd.cfg.fault.retry * 1000);
                            } else if (dd.fault.flowRestarts == 3) {
                                log(dd.cfg.name + " - low flow (" + dd.flow[dd.state.pump].lm.toFixed(1) + "lm) HA State: "
                                    + dd.pump[dd.state.pump].state + " - retries exceeded - going offline for " + dd.cfg.fault.retryFinal + "m", index, 3);
                                dd.fault.flowRestarts++;
                                flowTimer[x] = setTimeout(() => {
                                    dd.fault.flow = false; log(dd.cfg.name + " - pump restating", index, 1);
                                }, dd.cfg.fault.retryFinal * 60 * 1000);
                            } else {
                                dd.fault.flowRestarts++;
                                log(dd.cfg.name + " - low flow (" + dd.flow[dd.state.pump].lm.toFixed(1) + "lm) HA State: "
                                    + dd.pump[dd.state.pump].state + " - all retries failed - going OFFLINE permanently", index, 3);
                                ha.send(dd.auto.name, false);
                                dd.auto.state = false;
                            }
                            pumpStop(true);
                        } else {
                            if (dd.state.flowCheckPassed == false) {
                                log(dd.cfg.name + " - pump flow check PASSED (" + dd.flow[dd.state.pump].lm.toFixed(1) + "lm)", index, 1);
                                dd.state.flowCheckPassed = true;
                                dd.fault.flowRestarts = 0;
                                if (dd.flow[dd.state.pump].lm < dd.cfg.pump[dd.state.pump].flow.startWarn && dd.warn.flowDaily == false) {
                                    dd.warn.flowDaily = true;
                                    log(dd.cfg.name + " - pump flow is lower than optimal (" + dd.flow[dd.state.pump].lm.toFixed(1) + "lm) - clean filter", index, 2);
                                }
                            }
                        }
                    }
                }
                function pumpShared() {
                    let dd = state.auto[index].dd[x];
                    dd.sharedPump = { shared: null, run: false, num: null };
                    for (let y = 0; y < cfg.dd.length; y++) {
                        if (y != x && dd.pump[dd.state.pump].cfg.id == cfg.dd[y].pump[state.auto[index].dd[y].state.pump].id) {
                            if (state.auto[index].dd[y].state.run == true) {
                                dd.sharedPump.run = true;
                            } else { setTimeout(() => { dd.sharedPump.run = false; }, 10e3); }
                            dd.sharedPump.shared = true;
                            dd.sharedPump.num = y;
                            break;
                        }
                    }
                }
                function listener() {
                    log(dd.cfg.name + " - creating event listeners", index, 1);
                    em.on(dd.auto.name, function (data) {
                        time.sync();
                        switch (data) {
                            case true:
                                log(dd.cfg.name + " - is going ONLINE", index, 1);
                                dd.auto.state = true;
                                dd.fault.flow = false;
                                dd.fault.flowRestarts = 0;
                                dd.warn.tankLow = false;
                                dd.state.cycleTimer = time.epoch;
                                dd.state.cycleCount = 0;
                                clearTimeout(state.auto[index].dd[x].oneShot);
                                clearTimeout(flowTimer[x]);
                                return;
                            case false:
                                log(dd.cfg.name + " - is going OFFLINE - pump is stopping", index, 1);
                                dd.auto.state = false;
                                clearTimeout(state.auto[index].dd[x].oneShot);
                                clearTimeout(flowTimer[x]);
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
                        //          dd.pump[y].state = state.esp[cfg.dd[x].pump[y].id];
                        if (cfg.dd[x].pump[y].type == "esp") {
                            dd.pump[y].state = state.esp[cfg.dd[x].pump[y].id];
                        } else if (cfg.dd[x].pump[y].type == "ha") {
                            dd.pump[y].state = state.ha[cfg.dd[x].pump[y].id];
                        }
                    }
                }
            }
            function pumpFountain(x, power) {
                let fount = { st: state.auto[index].fountain[x], cfg: cfg.fountain[x] }
                fount.st.step = time.epochMin;
                if (power) {
                    log(fount.cfg.name + " - is turning on", index, 1);
                    esp.send(cfg.esp[fount.cfg.pump], true);
                    if (fount.cfg.flow != undefined && fount.cfg.flow.id != undefined) {
                        fount.st.timerFlow = setTimeout(() => {
                            let flow = (state.esp[cfg.flow[fount.cfg.flow.id].id] / 60).toFixed(0);
                            log(fount.cfg.name + " - checking flow", index, 1);
                            if (flow < fount.cfg.flow.startError) {
                                log(fount.cfg.name + " - flow check FAILED: " + flow + "lpm - auto will shut down", index, 3);
                                ha.send(fount.cfg.haAuto, false);
                                pumpFountain(x, false);
                                return;
                            } else if (flow < fount.cfg.flow.startWarn) {
                                log(fount.cfg.name + " - starting flow less than normal: " + flow + "lpm", index, 2);
                                ha.send(fount.cfg.haAuto, false);
                            } else {
                                log(fount.cfg.name + " - flow check PASSED: " + flow + "lpm", index, 1);
                                fount.st.flowCheck = true;
                            }
                        }, (fount.cfg.flow.startWait * 1e3));
                    }
                } else {
                    log(fount.cfg.name + " - is turning off", index, 1);
                    esp.send(cfg.esp[fount.cfg.pump], false);
                    clearTimeout(fount.st.timerFlow);
                    fount.st.flowCheck = false;
                }
            }
            function init() {
                state.auto.push({               // initialize automation volatile memory
                    name: "Pumper", dd: [], flow: [], press: [], ha: { pushLast: [] }, fountain: []
                });
                if (cfg.flow != undefined) {
                    if (nv.flow == undefined) {             // initialize flow meter NV memory if no NV data
                        log("initializing flow meter data...", index, 1);
                        nv.flow = [];
                        for (let x = 0; x < cfg.flow.length; x++) {
                            nv.flow.push({ total: 0, min: [], hour: [], day: [], today: 0 })
                            for (let y = 0; y < 60; y++) nv.flow[x].min.push(0);
                            for (let y = 0; y < 24; y++) nv.flow[x].hour.push(0);
                            for (let y = 0; y < 30; y++) nv.flow[x].day.push(0);
                        }
                        log("writing NV data to disk...", index, 1);
                        file.write.nv();
                    }
                    for (let x = 0; x < cfg.flow.length; x++) {
                        state.auto[index].flow.push({ lm: 0, temp: undefined, hour: 0, day: 0, batch: 0 })
                    }
                }
                if (cfg.press != undefined) {
                    for (let x = 0; x < cfg.press.length; x++) {
                        state.auto[index].press.push({ raw: [], step: 0, meters: null, psi: null, percent: null, volts: null, })
                    }
                }
                for (let x = 0; x < cfg.fountain.length; x++) {
                    state.auto[index].fountain.push({ step: null, timerFlow: null, flowCheck: false, })
                }
                for (let x = 0; x < cfg.dd.length; x++) {
                    log(cfg.dd[x].name + " - initializing", index, 1);
                    flowTimer = [];
                    state.auto[index].dd.push({     // initialize volatile memory for each Demand Delivery system
                        cfg: cfg.dd[x],
                        state: {
                            run: false,
                            oneShot: null,
                            turbo: false,
                            profile: null,
                            pump: 0,
                            flowCheck: false,
                            flowCheckPassed: false,
                            timeoutOff: true,
                            timeoutOn: false,
                            cycleCount: 0,
                            timerRun: null,
                            pressStart: null,
                            timerRise: null,
                        },
                        fault: {
                            flow: false,
                            flowRestarts: 0,
                            flowOver: false,
                        },
                        warn: {
                            flow: false,
                            flowDaily: false,
                            flowFlush: false,
                            haLag: false,
                            tankLow: false,
                        },
                        auto: { state: state.ha[cfg.dd[x].ha.auto], name: cfg.ha[cfg.dd[x].ha.auto] },
                        press: {
                            in: (cfg.dd[x].press.input != undefined) ? {
                                cfg: cfg.press[cfg.dd[x].press.input],
                                state: state.auto[index].press[cfg.dd[x].press.input]
                            } : undefined,
                            out: (cfg.dd[x].press.output != undefined) ? {
                                cfg: cfg.press[cfg.dd[x].press.output],
                                state: state.auto[index].press[cfg.dd[x].press.output]
                            } : undefined,
                        },
                        pump: [],
                    })
                    for (let y = 0; y < cfg.dd[x].pump.length; y++) {
                        if (cfg.dd[x].pump[y].type == "esp") {
                            state.auto[index].dd[x].pump.push({
                                cfg: cfg.dd[x].pump[y],
                                state: state.esp[cfg.dd[x].pump[y].id],
                                name: cfg.esp[cfg.dd[x].pump[y].id]
                            });
                        } else if (cfg.dd[x].pump[y].type == "ha") {
                            state.auto[index].dd[x].pump.push({
                                cfg: cfg.dd[x].pump[y],
                                state: state.ha[cfg.dd[x].pump[y].id],
                                name: cfg.ha[cfg.dd[x].pump[y].id]
                            });
                        }
                        if (cfg.dd[x].pump[y].flow != undefined & cfg.dd[x].pump[y].flow.id != undefined) {
                            if (state.auto[index].dd[x].flow == undefined) state.auto[index].dd[x].flow = [];
                            state.auto[index].dd[x].flow.push(state.auto[index].flow[cfg.dd[x].pump[y].flow.id])
                        }
                    }
                    if (cfg.dd[x].press != undefined && cfg.dd[x].press.profile != undefined &&
                        cfg.dd[x].ha.profile != undefined && cfg.dd[x].press.profile.length > 0) {
                        state.auto[index].dd[x].state.profile = parseInt(state.ha[cfg.dd[x].ha.profile]);
                    }
                    if (cfg.dd[x].ha.turbo != undefined) {
                        state.auto[index].dd[x].state.turbo = state.ha[cfg.dd[x].ha.turbo];
                    }
                }
                calcFlow();
                calcFlowMeter();
                pushSensor();
                setInterval(() => {     // called every hour  -  reset hourly notifications
                    for (let x = 0; x < cfg.dd.length; x++) {
                        state.auto[index].dd[x].fault.flowOver = false;
                        state.auto[index].dd[x].warn.tankLow = false;
                    }
                }, 3600e3);
                setInterval(() => {     // called every second  -  rerun this automation every second
                    //   automation[index](index);
                    calcFlow();
                    pushSensor();
                    for (let x = 0; x < cfg.dd.length; x++) pumpControl(x);
                    for (let x = 0; x < cfg.fountain.length; x++) fountain(x);
                }, 1e3);
                setInterval(() => { timer(); }, 60e3);
                emitters();
            }
            function pushSensor() {
                let sendDelay = 0;
                let list = ["_total", "_hour", "_day", "_lm", "_today"];
                let pos = 0;
                //              if (state.ha.ws.online == true) {
                for (let x = 0; x < cfg.flow.length; x++) {
                    let unit = [cfg.flow[x].unit, cfg.flow[x].unit, cfg.flow[x].unit, "L/m", "L"]
                    let value = [nv.flow[x].total, state.auto[index].flow[x].hour, state.auto[index].flow[x].day
                        , state.auto[index].flow[x].lm, nv.flow[x].today];
                    for (let y = 0; y < 5; y++) {
                        if (state.auto[index].ha.pushLast[pos] == undefined) {
                            state.auto[index].ha.pushLast.push(Number(value[y]).toFixed(0));
                            sendHA(cfg.flow[x].name + list[y], Number(value[y]).toFixed(0), unit[y]);
                        } else if (state.auto[index].ha.pushLast[pos] != Number(value[y]).toFixed(0)) {
                            state.auto[index].ha.pushLast[pos] = (Number(value[y]).toFixed(0));
                            sendHA(cfg.flow[x].name + list[y], Number(value[y]).toFixed(0), unit[y]);
                        }
                        pos++;
                    }
                }
                for (let x = 0; x < cfg.press.length; x++) {
                    let calc = { percent: [], sum: 0 }, press = {
                        cfg: cfg.press[x], reading: (cfg.press[x].type == "esp")
                            ? state.esp[cfg.press[x].id] : state.ha[cfg.press[x].id],
                        out: state.auto[index].press[x].profiles,
                        state: state.auto[index].press[x],
                    };
                    let stopPressure = null;
                    for (let y = 0; y < cfg.dd.length; y++) {
                        if (cfg.dd[y].press.output == x) {
                            if (cfg.dd[y].press.profile != undefined) {
                                stopPressure = cfg.dd[y].press.profile[0].stop;
                                break;
                            } else {
                                stopPressure = cfg.dd[y].press.stop;
                                break;
                            }
                        }
                    }
                    if (stopPressure == null) stopPressure = press.cfg.levelFull;
                    if (press.state.step < press.cfg.average) { press.state.raw[press.state.step++] = press.reading; }
                    else { press.state.step = 0; press.state.raw[press.state.step++] = press.reading; }
                    for (let y = 0; y < press.state.raw.length; y++) calc.sum += press.state.raw[y];
                    calc.average = calc.sum / press.state.raw.length;
                    if (press.cfg.voltageMin == 0.5) log("sensor ID: " + x + " is uncalibrated - Average Volts: "
                        + calc.average.toFixed(3) + "  - WAIT " + press.cfg.average + " seconds", index, 1);
                    calc.psi = (press.cfg.pressureRating / 4) * (calc.average - press.cfg.voltageMin);
                    calc.meters = 0.703249 * calc.psi;
                    calc.percent[0] = stopPressure - calc.meters;
                    calc.percent[1] = calc.percent[0] / stopPressure;
                    calc.percent[2] = Math.round(100 - (calc.percent[1] * 100));
                    press.state.volts = Number(calc.average.toFixed(3));
                    press.state.psi = (calc.psi < 0.0) ? 0 : Number(calc.psi.toFixed(2));
                    press.state.meters = (calc.meters < 0.0) ? 0 : Number(calc.meters.toFixed(2));
                    press.state.percent = (calc.percent[2] < 0.0) ? 0 : calc.percent[2];
                    sendHA(press.cfg.name + "_percent", press.state.percent.toFixed(0), '%');
                    sendHA(press.cfg.name + "_meters", press.state.meters.toFixed(2), 'm');
                    sendHA(press.cfg.name + "_psi", press.state.psi.toFixed(0), 'psi');
                    send("coreData", {
                        name: press.cfg.name, data: {
                            percent: press.state.percent.toFixed(0),
                            meters: press.state.meters.toFixed(2),
                            psi: press.state.psi.toFixed(0)
                        }
                    });
                }
                function sendHA(name, value, unit) { setTimeout(() => { ha.send(name, value, unit) }, sendDelay); sendDelay += 25; };
            }
            function calcFlow() {
                for (let x = 0; x < cfg.flow.length; x++) {
                    if (cfg.flow[x].type == "esp") state.auto[index].flow[x].lm = state.esp[cfg.flow[x].id] / cfg.flow[x].pulse / 60;
                    else state.auto[index].flow[x].lm = state.ha[cfg.flow[x].id] / cfg.flow[x].pulse / 60;
                    if (!isNaN(parseFloat(state.auto[index].flow[x].lm)) == true && isFinite(state.auto[index].flow[x].lm) == true && state.auto[index].flow[x].lm != null) {
                        if (nv.flow[x] == undefined) nv.flow[x] = {
                            total: 0, today: 0, min: new Array(60).fill(0), hour: new Array(24).fill(0), //day: new Array(31).fill(0)
                        }
                        nv.flow[x].total += state.auto[index].flow[x].lm / 60 / 1000;
                        nv.flow[x].today += state.auto[index].flow[x].lm / 60;
                    }
                }
            }
            function calcFlowMeter() {
                let calcFlow = 0, calcHour = 0, calcDay = 0, hourNV = 0;
                for (let x = 0; x < cfg.flow.length; x++) {
                    if (state.auto[index].flow[x].temp == undefined) state.auto[index].flow[x].temp = nv.flow[x].total
                    if (state.auto[index].flow[x].temp != nv.flow[x].total) {
                        calcFlow = nv.flow[x].total - state.auto[index].flow[x].temp;
                        state.auto[index].flow[x].temp = nv.flow[x].total;
                    }
                    nv.flow[x].min[time.min] = calcFlow;

                    nv.flow[x].min.forEach((y) => calcHour += y);
                    state.auto[index].flow[x].hour = calcHour;

                    for (let y = 0; y <= time.min; y++) calcDay += nv.flow[x].min[y];
                    nv.flow[x].hour.forEach((y) => calcDay += y);
                    calcDay = calcDay - nv.flow[x].hour[time.hour];
                    state.auto[index].flow[x].day = calcDay;

                    for (let y = 0; y < 60; y++) hourNV += nv.flow[x].min[y];
                    nv.flow[x].hour[time.hour] = hourNV;
                }
            }
            function emitters() {
                for (let x = 0; x < cfg.dd.length; x++) {
                    if (cfg.dd[x].ha.oneShot != undefined && cfg.dd[x].ha.oneShotTimer != undefined) {
                        em.on(cfg.ha[cfg.dd[x].ha.oneShot], (newState) => {
                            log(cfg.dd[x].name + " - starting one shot operation - stopping in "
                                + parseInt(state.ha[cfg.dd[x].ha.oneShotTimer]).toFixed(0) + " minutes", index, 1);
                            ha.send(cfg.ha[cfg.dd[x].ha.auto], true);
                            state.auto[index].dd[x].oneShot = setTimeout(() => {
                                log(cfg.dd[x].name + " - stopping one shot operation after "
                                    + parseInt(state.ha[cfg.dd[x].ha.oneShotTimer]).toFixed(0) + " minutes", index, 1);
                                ha.send(cfg.ha[cfg.dd[x].ha.auto], false);
                            }, parseInt(state.ha[cfg.dd[x].ha.oneShotTimer]) * 60 * 1e3);
                        });
                    }
                    if (cfg.dd[x].ha.turbo != undefined) {
                        em.on(cfg.ha[cfg.dd[x].ha.turbo], (newState) => {
                            if (newState == true) {
                                log(cfg.dd[x].name + " - enabling pump turbo mode", index, 1);
                                state.auto[index].dd[x].state.turbo = true;
                            } else {
                                log(cfg.dd[x].name + " - disabling pump turbo mode", index, 1);
                                state.auto[index].dd[x].state.turbo = false;
                            }
                        });
                    }
                    if (cfg.dd[x].press != undefined && cfg.dd[x].press.profile != undefined &&
                        cfg.dd[x].ha.profile != undefined && cfg.dd[x].press.profile.length > 0) {
                        em.on(cfg.ha[cfg.dd[x].ha.profile], (newState) => {
                            log(cfg.dd[x].name + " - pump profile changing to mode: " + ~~newState, index, 1);
                            state.auto[index].dd[x].state.profile = parseInt(newState);
                        });
                    }
                }
                for (let x = 0; x < cfg.fountain.length; x++) {
                    if (cfg.fountain[x].haAuto != undefined) {
                        em.on(cfg.ha[cfg.fountain[x].haAuto], (newState) => {
                            if (newState == true) {
                                log(cfg.fountain[x].name + " auto is starting", index, 1);
                                pumpFountain(x, true);
                            } else {
                                log(cfg.fountain[x].name + " auto is stopping", index, 1);
                                pumpFountain(x, false);
                            }
                        });
                    }
                }
            }
        },
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
