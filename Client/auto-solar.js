#!/usr/bin/node
let twit = require("./twit.js").framework;
module.exports = {
    automation: {
        Solar: function (_name, _push, _reload) {
            try {
                let { state, config, nv, log, write, push, send, tool } = twit(_name);
                let solar = {
                    auto: function () { // check sequence director
                        ({ state, config, nv } = twit(_name));
                        for (let x = 0; x < config.inverter.length; x++) solar.init(x);
                        for (let x = config.inverter.length - 1; x > -1; x--) solar.off(x);
                        for (let x = 0; x < config.inverter.length; x++) solar.on(x);
                    },
                    init: function (x) {
                        if (config.inverter[x].enable == true) {
                            let { voltsBat, cfg, inverter, inverterVolts } = solar.pointers(x) || undefined;
                            if (cfg.voltsStop == undefined) {
                                log("inverter: " + cfg.name + " - config error, you must configure 'voltsStop' - Inverter auto is going offline", 3);
                                config.inverter[x].enable = false;
                                solar.power(x, false, true);
                                send(config.solar.inverterAuto, false);
                            }
                            if (inverter.state == null || inverter.boot == false) {
                                if (config.inverter[x].entity != undefined) {
                                    log("inverter: " + config.inverter[x].name + " - syncing operation entity - state: " + entity[config.inverter[x].entity]?.state);
                                    if (entity[cfg.transfer.switchOn[0].entity] != null) {
                                        if (entity[config.inverter[x].entity].state == true) {
                                            if (entity[cfg.transfer.switchOn[0].entity].state != cfg.transfer.switchOn[0].state) {
                                                log("inverter: " + config.inverter[x].name + " - primary ATS state OFF (" + entity[cfg.transfer.switchOn[0].entity]?.state
                                                    + ") is not expected - HA says its ON", 2);
                                                solar.power(x, true);
                                                // inverter.state = true;
                                            } else inverter.state = true;
                                        } else {
                                            if (entity[cfg.transfer.switchOff[0].entity].state != cfg.transfer.switchOff[0].state) {
                                                log("inverter: " + config.inverter[x].name + " - primary ATS state ON (" + entity[cfg.transfer.switchOff[0].entity]?.state
                                                    + ") is not expected - HA says its OFF", 2);
                                                inverter.state = false;
                                            } else inverter.state = false;
                                        }
                                    } else {
                                        log("inverter: " + cfg.name + " - operational entity is offline or unavailable - inverter auto is going offline", 3);
                                        solar.power(x, false, true);
                                        send(config.solar.inverterAuto, false);
                                    }
                                } else {
                                    log("inverter: " + cfg.name + " - config error, you must config inverter operation entity - Inverter auto is going offline", 3);
                                    solar.power(x, false, true);
                                    send(config.solar.inverterAuto, false);
                                }
                                //solar.nightMode(x);
                                inverter.delayStep = false;
                                inverter.delayVoltsStep = false;
                                inverter.delayFaultStep = false;
                                inverter.delayStepSun = false;
                                inverter.delayTimer = time.epoch;
                                inverter.delayTimerSun = time.epoch;
                                inverter.stepPower = time.epoch - 20;
                                inverter.step = time.epoch - 20;
                                if (inverter.state == false) {
                                    if (cfg.power.startAuto == true) {
                                        if (voltsBat > cfg.voltsStop) {
                                            log("inverter: " + cfg.name + " - first start, volts (" + voltsBat + ") is greater than stop volts (" + cfg.voltsStop + "), good to run");
                                            solar.power(x, true);
                                        }
                                    } else if (nv.battery[cfg.battery].floating == true) {
                                        log("inverter: " + cfg.name + " - first start, battery is floating, good to run");
                                        solar.power(x, true);
                                    }
                                }
                                inverter.boot = true;
                            } else {
                                if (entity[cfg.transfer.switchOn[0].entity] == null) {
                                    log("inverter: " + cfg.name + " - operational entity is offline or unavailable - inverter auto is going offline", 3);
                                    solar.power(x, false, true);
                                    send(config.solar.inverterAuto, false);
                                }
                                if (inverter.state == "faulted") {
                                    if (inverterVolts <= cfg.voltsFloatStop) {
                                        log("inverter: " + cfg.name + " - inverter was faulted but now resetting because charger is no longer floating", 2);
                                        inverter.state = false;
                                    }
                                    if (config.solar.watts.inverterPower != undefined
                                        && entity[config.solar.watts.inverterPower].state >= cfg.welderWatts) {
                                        log("inverter: " + cfg.name + " - inverter was faulted but now resetting because welding is detected", 2);
                                        inverter.state = false;
                                    }
                                }
                            }
                        }
                    },
                    on: function (x) {  // when inverter is running
                        let { voltsBat, inverterVolts, ampsBat, sun, inverterWatts, cfg, inverter } = solar.pointers(x);
                        if (config.inverter[x].enable == true && inverter.state != "faulted" && inverter.state == true) {
                            if (solar.nightMode(x) == true) {
                                if (voltsBat < cfg.nightMode.startVoltageMin) {
                                    log("inverter: " + cfg.name + " - Battery is too low to make it through the night: "
                                        + voltsBat + "v, switching off");
                                    solar.power(x, false);
                                    return;
                                }
                            } else if (state.grid.state !== false) {
                                if (inverter.nightMode != true) {
                                    if (cfg.sunStop != undefined) {
                                        if (sun <= cfg.sunStop) {
                                            trigger(false, "Sun is low: " + sun + "  voltsBat: " + voltsBat + ", switching to grid ");
                                        } else inverter.delayStep = false;
                                    } else if (cfg.ampsStop != undefined) {
                                        if (nv.battery[cfg.battery].floating == false || cfg.ampsStopFloat == undefined) {
                                            if (ampsBat <= cfg.ampsStop) {
                                                // console.log("amps below: " + ampsBat + " - floating: " + nv.battery[cfg.battery].floating + " - stop float: " + inverter.ampsStopFloat)
                                                if (cfg.ampsStopVoltsMin != undefined) {
                                                    if (voltsBat < cfg.ampsStopVoltsMin) ampStop();
                                                } else ampStop();
                                            } else inverter.delayStep = false;
                                        } else {
                                            if (ampsBat <= cfg.ampsStopFloat) {
                                                if (cfg.ampsStopVoltsMin != undefined) {
                                                    if (voltsBat < cfg.ampsStopVoltsMin) ampStop();
                                                } else ampStop();
                                            }
                                            else inverter.delayStep = false;
                                        }
                                    }
                                    function ampStop() {
                                        trigger(false, "solar power too low: " + ampsBat + "a  voltsBat: " + voltsBat
                                            + "v  Floating: " + nv.battery[cfg.battery].floating + " Sun: "
                                            + sun + "v  Watts: " + inverterWatts + ", switching to grid ");
                                        inverter.switchWatts = inverterWatts;
                                        inverter.switchSun = sun;
                                    }
                                }
                            }
                            if (voltsBat <= cfg.voltsStop && ampsBat < 0.0) {
                                if (inverter.delayVoltsStep == false && !checkPriority()) {
                                    inverter.delayVoltsTimer = time.epoch;
                                    inverter.delayVoltsStep = true;
                                } else if (time.epoch - inverter.delayVoltsTimer >= 60) {
                                    log("inverter: " + cfg.name + " - Battery is low: " + voltsBat + "v, is switching to grid ");
                                    solar.power(x, false);
                                }
                            } else inverter.delayVoltsStep = false;
                            if (inverter.nightMode == true && time.hour >= cfg.nightMode.endHour
                                && time.hour < cfg.nightMode.startHour) {
                                if (cfg.nightMode.endAmps != undefined) {
                                    if (ampsBat >= cfg.nightMode.endAmps) {
                                        log("inverter: " + cfg.name + " - Battery is charging, current is high: " + ampsBat
                                            + "a  " + voltsBat + "v, exiting night mode");
                                        inverter.nightMode = false;
                                    }
                                } else solar.changing(x, false); // inverter only exits night mode when there is sufficient charging
                            }
                            if (inverterVolts < 20) {
                                log("inverter: " + cfg.name + " - FAULT - no output - Inverter is going offline", 3);
                                solar.power(x, false, true);
                            }
                            else inverter.delayFaultStep = false;
                        }
                        function checkPriority() {  // check if all priority entities are shutdown before toggling inverter
                            if (cfg.priorityWait && entity[config.solar.priority.entityAuto]?.state == true) {
                                for (let y = 0; y < config.solar.priority.queue.length; y++)
                                    if (state.priority.queue[y].state) return true;
                            } else return false;
                        }
                        function trigger(newState, message, level = 1) {
                            if (!checkPriority()) {
                                if (level == 3) { // not used, faults trigger shutdown immediately 
                                    if (inverter.delayFaultStep == false) {
                                        inverter.delayFaultTimer = time.epoch;
                                        inverter.delayFaultStep = true;
                                    } else if (time.epoch - inverter.delayFaultTimer >= 10) toggle();
                                } else {
                                    if (inverter.delayStep == false) {
                                        // console.log("amps stop : " + ampsBat)
                                        inverter.delayTimer = time.epoch;
                                        inverter.delayStep = true;
                                    } else if (time.epoch - inverter.delayTimer >= cfg.delaySwitchOff) toggle();
                                }
                                function toggle() {
                                    log("inverter: " + cfg.name + " - " + message, level);
                                    solar.power(x, newState, (level == 3 ? true : undefined));
                                    return;
                                }
                            }
                            if (cfg.inverterWattsSwitch) {
                                clearTimeout(inverter.switchWattsTimer);
                                inverter.switchWattsTimer = setTimeout(() => {
                                    if (inverter.switchWatts != null) {
                                        log("inverter: " + cfg.name + " SwitchWatts timeout (10min) - clearing lasSwitch Watts reading");
                                        clearTimeout(inverter.switchWattsTimer);
                                        inverter.switchWatts = null;
                                    }
                                }, 500e3);
                            }
                        }

                    },
                    off: function (x) { // when inverter is stopped
                        if (config.inverter[x].enable == true) {
                            let { voltsBat, inverterVolts, battery, cfg, inverter } = solar.pointers(x);
                            //   console.log(inverter.state)
                            if (battery.sensorVolt != undefined) {
                                if (inverter.state != "faulted" && inverter.state === false) {
                                    solar.changing(x, true);
                                    // console.log("checking...")
                                    if (solar.nightMode(x) == true) {
                                        if (voltsBat >= cfg.nightMode.startVoltageMin) {
                                            log("Battery is enough to make it through the night: " + voltsBat + ", " + cfg.name + " switching on");
                                            solar.power(x, true);
                                        } else log("Battery is too low to make it through the night: " + voltsBat + ", " + cfg.name + " staying off");
                                    }
                                    if (cfg.blackout == true && state.grid.state == false && voltsBat >= cfg.blackoutVoltMin) {
                                        log("Blackout detected, volts is enough to run: " + voltsBat + ", " + cfg.name + " switching on", 2);
                                        solar.power(x, true);
                                    }
                                    if (cfg.power.entity != undefined && entity[cfg.power.entity].state == false && inverter.delayOffTimer == null
                                        && time.epoch - inverter.timeShutdown > 10 && inverter.warn.manualPowerOn == false && inverterVolts > 20.0) {
                                        log("inverter: " + cfg.name + " is still on but should be off - manual power on??", 2);
                                        inverter.warn.manualPowerOn = true;
                                    }
                                }
                            }
                        }
                    },
                    changing: function (x, power) {
                        let { voltsBat, ampsBat, gridWatts, wattsSolar, sun, cfg, inverter } = solar.pointers(x);
                        if (cfg.voltsRun != undefined) {
                            if (voltsBat >= cfg.voltsRun) checkConditions();
                            else inverter.delayStep = false;
                        } else checkConditions();
                        function checkConditions() {
                            if (sun >= cfg.sunRun) {     // sunlight detection 
                                trigger(power, "battery is charging, sun is high: " + sun + ", switching on", true);
                            } else if (sun < cfg.sunRun) inverter.delayStepSun = false;
                            if (sun >= cfg.sunRunFloat && nv.battery[cfg.battery].floating == true) {     // sunlight detection 
                                trigger(power, "battery is floating, sun is high: " + sun + ", switching on", true);
                            } else if (sun < cfg.sunRunFloat) inverter.delayStepSun = false;
                            if (cfg.gridWatt != undefined) {
                                // console.log("checking watts for: " + x + "  gridWatts: " + gridWatts, " wattsSolar: " + wattsSolar)
                                if (wattsSolar > (gridWatts * cfg.gridWattMultiplier)) {
                                    trigger(power, "charge current is higher than grid power: " + wattsSolar + "w  " + voltsBat + "v, switching on");
                                }
                                if (wattsSolar <= (gridWatts * cfg.gridWattMultiplier)) { inverter.delayStep = false; }
                            } else if (cfg.inverterWattsSwitch && inverter.switchWatts) {
                                if (wattsSolar > inverter.switchWatts) {
                                    trigger(power, "charge watts (" + wattsSolar + "w) is higher than last switch watts: "
                                        + inverter.switchWatts + "w  " + voltsBat + "v, switching on");
                                } else inverter.delayStep = false;
                            } else if (cfg.ampsRun != undefined) {
                                //  console.log("checking amps for: " + x + "  ampsBat: " + ampsBat, " voltsBat: " + voltsBat)
                                if (ampsBat >= cfg.ampsRun) {   // current detection 
                                    trigger(power, "battery is charging, current is high: " + ampsBat + "a  " + voltsBat + "v, switching on");
                                } else if (ampsBat < cfg.ampsRun) inverter.delayStep = false;
                            }
                        }
                        function trigger(power, message, sunRun) {
                            if (sunRun) {
                                if (inverter.delayStepSun == false) {
                                    inverter.delayTimerSun = time.epoch;
                                    inverter.delayStepSun = true;
                                    return;
                                } else if (time.epoch - inverter.delayTimerSun >= cfg.delaySwitchOn) action();
                            } else {
                                if (inverter.delayStep == false) {
                                    // console.log("charge checking is being reset")
                                    inverter.delayTimer = time.epoch;
                                    inverter.delayStep = true;
                                    return;
                                } else if (time.epoch - inverter.delayTimer >= cfg.delaySwitchOn) action();
                            }
                            function action() {
                                if (inverter.nightMode == true) {
                                    log("inverter: " + cfg.name + " - exiting night mode");
                                    inverter.nightMode = false;
                                }
                                log("inverter: " + cfg.name + " - " + message);
                                if (power == true) solar.power(x, true);
                                clearTimeout(inverter.switchWattsTimer);
                                inverter.switchWatts = null;
                                config.solar.priority.queue.forEach((_, y) => {
                                    state.priority.queue[y].delayStep = false;
                                    state.priority.queue[y].delayStepSun = false;
                                });
                            }
                        }
                    },
                    power: function (x, run, faulted, refresh) { // inverter toggle sequence
                        let cfg = config.inverter[x];
                        if (run == true) {
                            if (time.epoch - state.inverter[x].stepPower >= config.solar.cycleError) {
                                if (cfg.power.entity == undefined) {
                                    //  log("inverter: " + cfg.name + " - transferring switches to inverter - wait");
                                    toggle(run);
                                } else {
                                    if (entity[cfg.power.entity].state == false) {
                                        send(cfg.power.entity, run);
                                        log("inverter: " + cfg.name + " - power on, delaying transfer switch 10 secs");
                                        toggle(run);
                                    } else {
                                        log("inverter: " + cfg.name + " - already on - clearing shutdown delay");
                                        clearTimeout(state.inverter[x].delayOffTimer);
                                        state.inverter[x].delayOffTimer = null;
                                        //  log("inverter: " + cfg.name + " - transferring switches to inverter - wait");
                                        toggle(run);
                                    }
                                }
                                state.inverter[x].state = true;
                                state.inverter[x].delayFaultStep = false;
                                setTimeout(() => { state.inverter[x].delayFaultStep = false }, 5e3);
                            } else {
                                log("inverter: " + cfg.name + " - cycling too frequently, epoch: "
                                    + time.epoch + " step:" + state.inverter[x].step + " - inverter auto shutting down", 3);
                                // state.inverter[x].state = false;
                                entity[config.inverter[x].entity].state = false;
                                send(config.solar.inverterAuto, false);
                                solar.power(x, false);
                            }
                        } else {
                            if (cfg.power.entity == undefined) {
                                //  log("inverter: " + cfg.name + " - transferring switches to grid - wait");
                                toggle(run);
                            } else {
                                // log("inverter: " + cfg.name + " - transferring switches to grid - wait");
                                toggle(run);
                                if (cfg.power.delayOff == undefined || faulted) {
                                    log("inverter: " + cfg.name + ", power off");
                                    state.inverter[x].delayOffTimer = setTimeout(() => {
                                        send(cfg.power.entity, false);
                                        state.inverter[x].delayOffTimer = null;
                                    }, 10e3);
                                } else {
                                    log("inverter: " + cfg.name + " - shutdown will delay by:" + cfg.power.delayOff + " seconds");
                                    state.inverter[x].delayOffTimer = setTimeout(() => {
                                        log("inverter: " + cfg.name + " - shutdown was delayed, now powering off");
                                        send(cfg.power.entity, false);
                                        state.inverter[x].delayOffTimer = null;
                                        state.inverter[x].timeShutdown = time.epoch;
                                    }, cfg.power.delayOff * 1000);
                                }
                            }
                            if (!faulted) state.inverter[x].state = false;
                            else state.inverter[x].state = "faulted";
                            state.inverter[x].step = time.epoch;
                            state.inverter[x].stepPower = time.epoch;
                        }
                        function toggle() {
                            let list, delay = 0;
                            if (run) list = cfg.transfer.switchOn; else list = cfg.transfer.switchOff;
                            for (let y = 0; y < list.length; y++) {
                                setTimeout(() => {
                                    // log("inverter: " + cfg.name + " - intention: " + run + ", transferring ATS switch "
                                    //      + y + " - state: " + list[y].state);
                                    send(list[y].entity, list[y].state);
                                }, delay);
                                delay += ((list[y].delay == undefined) ? 500 : (list[y].delay * 1e3));
                            }
                            if (config.inverter[x].entity != undefined && !refresh) send(config.inverter[x].entity, run);
                        }
                        state.inverter[x].delayStep = false;
                        state.inverter[x].delayVoltsStep = false;
                        state.inverter[x].delayFaultStep = false;
                        state.inverter[x].delayStepSun = false;
                        config.inverter.forEach((_, y) => { state.inverter[y].delayStep = false });
                        config.solar.priority.queue.forEach((_, y) => {
                            state.priority.queue[y].delayStep = false
                            state.priority.queue[y].delayStepSun = false;
                            state.priority.queue[y].delayStepBudget = false;
                        });
                    },
                    nightMode: function (x) {
                        let nightMode = null, cfg = config.inverter[x];
                        if (cfg.nightMode?.enable == true) {                     // undefined config returns false
                            if (time.hour == cfg.nightMode.startHour) {   // if nightMode match
                                if (cfg.nightMode.startMin != undefined) {
                                    if (time.min >= cfg.nightMode.startMin) { nightMode = true; }
                                } else { nightMode = true; }
                            } else if (time.hour > cfg.nightMode.startHour
                                || time.hour < cfg.nightMode.endHour) { nightMode = true; }
                            else nightMode = false;
                        } else nightMode = false;
                        if (nightMode == true) {
                            if (!state.inverter[x].nightMode) {
                                log("inverter: " + cfg.name + " - activating night mode");
                                state.inverter[x].nightMode = true;
                                return true;
                            } else return false;
                        } else return false;
                    },
                    welder: function () {    // needs to be rewritten for  config.inverter.sensorAmps or esp direct
                        if (entity[config.inverter[0].espPower].state >= config.inverter[0].welderWatts ||  // check inverter meter
                            entity[config.grid.espPower].state >= config.inverter[0].welderWatts) {           // check grid meter
                            state.welderStep = time.epoch;                   // extend welter timeout if still heavy loads
                            if (state.welder == false) {
                                log("welder detected: " + entity[config.inverter[0].espPower].state + "w - shutting down all pumps", 2);
                                state.welder = true;
                                state.priority[0] = false;
                                send("input_boolean.auto_compressor", false);
                                send("input_boolean.auto_pump_transfer", false);
                                //    send("uth-relay1", false);
                                // turn on fan
                            }
                        } else {
                            if (state.welder == true && time.epoch - state.welderStep >= config.inverter[0].welderTimeout) {
                                log("welder not detected: " + entity[config.inverter[0].espPower].state + "w");
                                state.welder = false;
                            }
                        }
                    },
                    pointers: function (x) {
                        let voltsBat, inverterVolts, ampsBat, sun, inverterWatts, gridWatts, wattsSolar, battery, cfg = config.inverter[x];
                        if (cfg.battery != undefined) {
                            battery = config.battery[config.battery.findIndex(battery => battery.name === cfg.battery)];
                            if (battery.sensorVolt != undefined)
                                voltsBat = tool.round(entity[battery.sensorVolt].state, 10);
                            if (battery.sensorAmp != undefined) {
                                if (Array.isArray(battery.sensorAmp)) {
                                    let temp = 0;
                                    for (let y = 0; y < battery.sensorAmp.length; y++) {
                                        temp += parseFloat(entity[battery.sensorAmp[y]].state);
                                        ampsBat = tool.round(temp, 10);
                                    }
                                } else ampsBat = tool.round(entity[battery.sensorAmp].state, 10);
                            }
                            if (battery.sensorWatt != undefined)
                                wattsSolar = tool.round(entity[battery.sensorWatt].state, 1000);
                        }
                        if (cfg.gridWatt != undefined)
                            gridWatts = tool.round(entity[cfg.gridWatt].state, 1000);
                        if (cfg.inverterVolts != undefined)
                            inverterVolts = ~~parseFloat(entity[cfg.inverterVolts].state);
                        if (cfg.inverterWatts != undefined)
                            inverterWatts = tool.round(entity[cfg.inverterWatts].state, 1000);
                        if (config.solar.sunlight != undefined)
                            sun = tool.round(entity[config.solar.sunlight].state, 100);
                        return { voltsBat, inverterVolts, ampsBat, sun, inverterWatts, gridWatts, wattsSolar, battery, cfg, inverter: state.inverter[x] };
                    },
                }
                let priority = {
                    auto: function () {
                        if (!state.priority.boot) {
                            state.priority.boot = true;
                            if (nv.battery[config.battery[0].name].floating)
                                log("priority queue initializing - system is going ONLINE - Battery Floating");
                            else log("priority queue initializing - system is going ONLINE");
                        }
                        for (let x = config.solar.priority.queue.length - 1; x > -1; x--) priority.onState.init(x);
                        for (let x = 0; x < config.solar.priority.queue.length; x++) priority.offState.init(x);
                    },
                    onState: { // when the member is on
                        init: function (x) {
                            let { battery, volts, amps, sun } = priority.pointers(x);
                            let member = state.priority.queue[x]; member.config = config.solar.priority.queue[x];

                            /*
                            if (member.state == null) {
                                log("priority queue - " + member.config.name + " - member is unavailable - priority going offline", 3);
                                //  entity[config.solar.priority.entityAuto]?.state = false;
                                send(entity[config.solar.priority.entityAuto]?.state, false);
                                return;
                            }
                            */
                            if (member.state == true) {
                                //  console.log("checking x:" + x + " amps: " + amps);
                                if (member.config.enable == true) {
                                    if (member.config.off.volts != undefined) {
                                        if (volts <= member.config.offVolts) {
                                            priority.trigger(x, "battery voltage is low (" + volts + "v) - stopping ", false);
                                            return;
                                        }
                                    }

                                    if (member.config.off.time?.hour == time.hour && member.config.off.time?.min == time.min) {
                                        log("priority queue - " + member.config.name + " - stop time reached - volts: " + volts);
                                        priority.send(x, false);
                                    }

                                    if (member.config.off.budget) priority.onState.budget(x);
                                    else priority.onState.conditions(x);
                                }
                            }

                        },
                        budget_old: function (x) {
                            let { battery, volts, amps, sun } = priority.pointers(x);
                            let member = state.priority.queue[x]; member.config = config.solar.priority.queue[x];
                            let discharge = battery.discharge.today / 1000.0;
                            let charge = battery.charge.today / 1000.0;
                            let solar = nv.sensor.watt[config.solar.priority.entitySolar].today / 1000.0;
                            let budgetHour = false;
                            for (let budget of member.config.off.budget) {
                                if (time.hour == (budget.hour)) {
                                    budgetHour = true;
                                    //   if (member.config.name == "Ram-Water ATS")
                                    //    console.log("further processing hour: "+ budget.hour)
                                    // this is useless until discharge counter resets in the morning 
                                    if (budget.discharge && discharge > budget.discharge) { triggerBudget("discharge budget exceeded"); break; }
                                    if (budget.charge && charge < budget.charge) { triggerBudget("insufficient charging"); break; }
                                    if (budget.solar && solar < budget.solar) { triggerBudget("insufficient solar harvest"); break; }
                                    if (budget.volts && volts < budget.volts) { triggerBudget("low battery voltage"); break; }
                                    if (budget.amps && amps < budget.amps) { triggerBudget("high discharge amps"); break; }
                                    // abort further processing if within budget
                                    member.delayStep = false;
                                    tool.debounce.reset(member.config.name + "_priority_budget");
                                    return;
                                } else continue;
                                function triggerBudget(msg) {
                                    tool.debounce(member.config.name + "_priority_budget", (member.config.off.delay != null
                                        ? member.config.off.delay : config.solar.priority.delaySwitchOff), () => {
                                            log(member.config.name + " - " + msg + " - hour: " + budget.hour
                                                + (budget.volts != null ? " - minVolts: " + budget.volts : "") + " volts: " + volts
                                                + (budget.amps != null ? " - minAmps: " + budget.amps : "") + " amps: " + amps + "\n"
                                                + (budget.solar != null ? " - minSolar: " + budget.solar : "") + " solar: " + solar.toFixed(1)
                                                + (budget.charge != null ? " - minCharge: " + budget.charge : "") + " charge: " + charge.toFixed(1)
                                                + (budget.discharge != null ? " - maxDischarge: " + budget.discharge : "") + " discharge : " + discharge.toFixed(1));
                                            if (!member.budgetSwitchOn) member.budgetSwitchOn = time.epoch;
                                            tool.debounce.reset(member.config.name + "_priority_budget");
                                            priority.send(x, false);
                                            return true;
                                        }
                                    )
                                }
                            }
                            if (!budgetHour) priority.onState.conditions(x);
                        },
                        budget: function (x) {
                            let { battery, volts, amps, sun } = priority.pointers(x);
                            let member = state.priority.queue[x];
                            member.config = config.solar.priority.queue[x];

                            let discharge = battery.discharge.today / 1000.0;
                            let charge = battery.charge.today / 1000.0;
                            let solar = nv.sensor.watt[config.solar.priority.entitySolar].today / 1000.0;

                            let budgetList = member.config.off.budget;
                            let currentIndex = budgetList.findIndex(b => b.hour === time.hour);

                            if (currentIndex === -1) {
                                priority.onState.conditions(x);
                                return;
                            }

                            let currentB = budgetList[currentIndex];
                            let prevB = budgetList[currentIndex - 1];
                            let nextB = budgetList[currentIndex + 1];
                            let progress = time.min / 60; // The exponent/coefficient for the hour

                            /**
                             * Interpolation Helper
                             * Same logic: Linear forward if next hour exists, 
                             * otherwise project based on previous hour's slope.
                             */
                            const getTarget = (key) => {
                                if (currentB[key] == null) return null;
                                if (nextB && nextB[key] != null) {
                                    return currentB[key] + (nextB[key] - currentB[key]) * progress;
                                } else if (prevB && prevB[key] != null) {
                                    let slope = currentB[key] - prevB[key];
                                    return currentB[key] + (slope * progress);
                                }
                                return currentB[key];
                            };

                            // Interpolated Targets
                            let targetSolar = getTarget('solar');
                            let targetVolts = getTarget('volts');
                            let targetCharge = getTarget('charge');
                            let targetDischarge = getTarget('discharge');

                            // Amps is a hard limit (no exponent)
                            let targetAmps = currentB.amps;

                            let msg = "";
                            if (targetDischarge != null && discharge > targetDischarge) msg = "max discharge exceeded";
                            else if (targetCharge != null && charge < targetCharge) msg = "insufficient charging";
                            else if (targetSolar != null && solar < targetSolar) msg = "insufficient solar harvest";
                            else if (targetVolts != null && volts < targetVolts) msg = "low battery voltage";
                            else if (targetAmps != null && amps < targetAmps) msg = "high discharge amps";

                            if (msg !== "") {
                                // Trigger Budget (Off)
                                tool.debounce(member.config.name + "_priority_budget",
                                    (member.config.off.delay != null ? member.config.off.delay : config.solar.priority.delaySwitchOff),
                                    () => {
                                        log(member.config.name + " - " + msg + " - hour: " + time.hour + ":" + time.min + " (Coef: " + progress.toFixed(2) + ")\n"
                                            + (targetVolts != null ? " - targetVolts: " + targetVolts.toFixed(2) : "") + " volts: " + volts + "\n"
                                            + (targetAmps != null ? " - targetAmps: " + targetAmps : "") + " amps: " + amps + "\n"
                                            + (targetSolar != null ? " - targetSolar: " + targetSolar.toFixed(2) : "") + " solar: " + solar.toFixed(1) + "\n"
                                            + (targetCharge != null ? " - targetCharge: " + targetCharge.toFixed(2) : "") + " charge: " + charge.toFixed(1) + "\n"
                                            + (targetDischarge != null ? " - targetDischarge: " + targetDischarge.toFixed(2) : "") + " discharge: " + discharge.toFixed(1));

                                        if (!member.budgetSwitchOn) member.budgetSwitchOn = time.epoch;
                                        tool.debounce.reset(member.config.name + "_priority_budget");
                                        priority.send(x, false);
                                        return true;
                                    }
                                );
                            } else {
                                // Within budget - clear debounce and exit
                                member.delayStep = false;
                                tool.debounce.reset(member.config.name + "_priority_budget");
                            }
                        },
                        conditions(x) {
                            let { battery, volts, amps, sun } = priority.pointers(x);
                            let member = state.priority.queue[x]; member.config = config.solar.priority.queue[x];

                            if (member.config.off.budget) tool.debounce.reset(member.config.name + "_priority_budget");
                            if (sun != undefined && member.config.off.sun != undefined) {
                                if (sun <= member.config.off.sun) {
                                    priority.trigger(x, "sun is low (" + sun + "v) - stopping ", false);
                                    return;
                                } else member.delayStep = false;
                            } else if (member.config.off.amps != undefined) {
                                if (volts < member.config.voltsFloat || nv.battery[config.solar.priority.battery].floating == true) {
                                    //  console.log("volts: " + volts + " voltsFloat: " + member.config.voltsFloat)
                                    if (amps <= member.config.off.amps) {
                                        priority.trigger(x, "charge amps is too low (" + amps + "a) - stopping ", false);
                                        return;
                                    } else member.delayStep = false;
                                } else if (amps <= member.config.off.ampsFloat) {
                                    priority.trigger(x, "(floating) discharge amps is high (" + amps + "a) - stopping ", false);
                                    return;
                                } else member.delayStep = false;
                            } else member.delayStep = false;
                        },
                    },
                    offState: { // when the member is off
                        init: function (x) {
                            let { battery, volts, amps, sun } = priority.pointers(x);
                            let member = state.priority.queue[x]; member.config = config.solar.priority.queue[x];
                            let required = true;

                            if (member.config.entityAuto == undefined
                                || member.config.entityAuto != undefined
                                && entity[member.config.entityAuto].state == true) {
                                if (member.state == false) {
                                    if (member.config.enable == true) {
                                        if (member.config.required != null) {
                                            for (const element of member.config.required) {
                                                if (!entity[element].state) {
                                                    log("priority queue - " + member.config.name + " - required member not active");
                                                    return;
                                                }
                                            }
                                        }

                                        if (member.config.inverter == undefined) {
                                            if (config.inverter[0]?.enable == true) {
                                                if (state.inverter[0].state == true) checkVolts();
                                            } else checkVolts();
                                        } else if (state.inverter[member.config.inverter].state == true) checkVolts();

                                        if (member.config.on?.time?.hour == time.hour && member.config.on?.time?.min == time.min) {
                                            if (member.config.on.timeVoltsMin && volts >= member.config.on.timeVoltsMin) {
                                                log("priority queue - " + member.config.name + " - start time reached - volts: " + volts);
                                                priority.send(x, true);
                                            } else {
                                                log("priority queue - " + member.config.name + " - start time reached - but voltage is too low - " + volts + "v");
                                                return;
                                            }
                                        }
                                    }
                                }
                            }

                            function checkVolts() {
                                if (member.config.on.volts != undefined) {
                                    if (volts >= member.config.on.volts) {
                                        conditions();
                                    } else member.delayStep = false;
                                } else conditions()
                            }

                            function conditions() {
                                if (member.config.on.budget) {
                                    if (member.config.on?.time?.hour) {
                                        if (time.hour < member.config.on?.time?.hour
                                            || time.hour == member.config.on?.time?.hour
                                            && time.minute < member.config.on?.time?.min) priority.offState.budget(x);
                                    } else priority.offState.budget(x);
                                } else priority.offState.conditions(x);
                            }
                        },
                        budget_old: function (x) {
                            let { battery, volts, amps, sun } = priority.pointers(x);
                            let member = state.priority.queue[x]; member.config = config.solar.priority.queue[x];
                            let discharge = battery.discharge.today / 1000.0;
                            let charge = battery.charge.today / 1000.0;
                            let solar = nv.sensor.watt[config.solar.priority.entitySolar].today / 1000.0;
                            let budgetHour = false;
                            for (let budget of member.config.on.budget) {
                                if (time.hour == budget.hour) {
                                    budgetHour = true;
                                    let pass = true;
                                    // this is useless until discharge counter resets in the morning 

                                    let budgetOff = member.config.off.budget.find(tbudget => tbudget.hour === time.hour);

                                    if (budget.discharge != null) {
                                        if (discharge >= budget.discharge) pass = false;
                                    } else if (budgetOff) {
                                        if (budgetOff.discharge != null && discharge >= budgetOff.discharge) pass = false;
                                    }
                                    if (budget.amps != null) {
                                        if (amps < budget.amps) pass = false;   // budget hour specific amps
                                    } else if (member.config.on.amps != null    // member general turn on amps
                                        && amps < member.config.on.amps) pass = false;
                                    if (budget.charge != null && charge < budget.charge) pass = false;
                                    if (budget.solar != null && solar < budget.solar) pass = false;
                                    if (budget.volts != null && volts < budget.volts) pass = false;

                                    if (pass) {
                                        if (!member.budgetSwitchOn) member.budgetSwitchOn = time.epoch - 30;

                                        tool.debounce(member.config.name + "_priority_budget", (member.config.on.delay != null
                                            ? member.config.on.delay : config.solar.priority.delaySwitchOn), () => {
                                                log(member.config.name + " - budget met or exceeded - hour: " + budget.hour
                                                    + (budget.volts != null ? " - minVolts: " + budget.volts : "") + " volts: " + volts + "\n"
                                                    + (budget.amps != null ? " - minAmps: " + budget.amps : "") + " amps: " + amps
                                                    + (budget.solar != null ? " - minSolar: " + budget.solar : "") + " solar: " + solar.toFixed(1)
                                                    + (budget.charge != null ? " - minCharge: " + budget.charge : "") + " charge: " + charge.toFixed(1)
                                                    + (budget.discharge != null ? " - maxDischarge: " + budget.discharge : "") + " discharge : " + discharge.toFixed(1));
                                                if (time.epoch - member.budgetSwitchOn < 30) {
                                                    log(member.config.name + " - last switch-on too recent - priority system shutting down", 3);
                                                    send(config.solar.priority.entityAuto, false);
                                                    return true;
                                                } else {
                                                    member.budgetSwitchOn = time.epoch;
                                                    member.budgetNotify = false;
                                                    member.delayStep = false;
                                                    tool.debounce.reset(member.config.name + "_priority_budget");
                                                    member.state = true;
                                                    priority.send(x, true);
                                                    return true;
                                                }
                                            })
                                    } else tool.debounce.reset(member.config.name + "_priority_budget");
                                    break;
                                } else continue;
                            }
                            if (!budgetHour) priority.offState.conditions(x);
                        },
                        budget: function (x) {
                            let { battery, volts, amps, sun } = priority.pointers(x);
                            let member = state.priority.queue[x];
                            member.config = config.solar.priority.queue[x];

                            let discharge = battery.discharge.today / 1000.0;
                            let charge = battery.charge.today / 1000.0;
                            let solar = nv.sensor.watt[config.solar.priority.entitySolar].today / 1000.0;

                            let budgetList = member.config.on.budget;
                            let currentIndex = budgetList.findIndex(b => b.hour === time.hour);

                            if (currentIndex === -1) {
                                priority.offState.conditions(x);
                                return;
                            }

                            let currentB = budgetList[currentIndex];
                            let prevB = budgetList[currentIndex - 1];
                            let nextB = budgetList[currentIndex + 1];
                            let progress = time.min / 60; // Our "exponent" or coefficient for the hour

                            /**
                             * Interpolation Helper
                             * If next hour exists: Linear interpolation forward.
                             * If last hour: Uses (Current - Prev) slope to project forward.
                             */
                            const getTarget = (key) => {
                                if (currentB[key] == null) return null;

                                if (nextB && nextB[key] != null) {
                                    // Standard: Interpolate toward next hour
                                    return currentB[key] + (nextB[key] - currentB[key]) * progress;
                                } else if (prevB && prevB[key] != null) {
                                    // Last in series: Project forward using previous hour's rate of change
                                    let slope = currentB[key] - prevB[key];
                                    return currentB[key] + (slope * progress);
                                }
                                return currentB[key]; // Fallback if no surrounding data
                            };

                            // Amps is a hard limit (no exponent)
                            let targetAmps = currentB.amps;

                            // Dynamic targets with minute-based coefficient
                            let targetSolar = getTarget('solar');
                            let targetVolts = getTarget('volts');
                            let targetCharge = getTarget('charge');
                            let targetDischarge = getTarget('discharge');

                            let pass = true;
                            let budgetOff = member.config.off.budget.find(t => t.hour === time.hour);

                            // Logic Checks
                            if (targetDischarge != null) {
                                if (discharge >= targetDischarge) pass = false;
                            } else if (budgetOff && budgetOff.discharge != null) {
                                if (discharge >= budgetOff.discharge) pass = false;
                            }

                            if (targetAmps != null) {
                                if (amps < targetAmps) pass = false;
                            } else if (member.config.on.amps != null && amps < member.config.on.amps) {
                                pass = false;
                            }

                            if (targetCharge != null && charge < targetCharge) pass = false;
                            if (targetSolar != null && solar < targetSolar) pass = false;
                            if (targetVolts != null && volts < targetVolts) pass = false;

                            if (pass) {
                                if (!member.budgetSwitchOn) member.budgetSwitchOn = time.epoch - 30;

                                tool.debounce(member.config.name + "_priority_budget",
                                    (member.config.on.delay != null ? member.config.on.delay : config.solar.priority.delaySwitchOn),
                                    () => {
                                        // Log including actual readings vs the calculated progressive targets
                                        log(member.config.name + " - budget met/exceeded - hour: " + time.hour + ":" + time.min + " (Coef: " + progress.toFixed(2) + ")\n"
                                            + (targetVolts != null ? " - targetVolts: " + targetVolts.toFixed(2) : "") + " volts: " + volts + "\n"
                                            + (targetAmps != null ? " - targetAmps: " + targetAmps : "") + " amps: " + amps + "\n"
                                            + (targetSolar != null ? " - targetSolar: " + targetSolar.toFixed(2) : "") + " solar: " + solar.toFixed(1) + "\n"
                                            + (targetCharge != null ? " - targetCharge: " + targetCharge.toFixed(2) : "") + " charge: " + charge.toFixed(1) + "\n"
                                            + (targetDischarge != null ? " - targetDischarge: " + targetDischarge.toFixed(2) : "") + " discharge: " + discharge.toFixed(1));

                                        if (time.epoch - member.budgetSwitchOn < 30) {
                                            log(member.config.name + " - last switch-on too recent - priority system shutting down", 3);
                                            send(config.solar.priority.entityAuto, false);
                                            return true;
                                        } else {
                                            member.budgetSwitchOn = time.epoch;
                                            member.budgetNotify = false;
                                            member.delayStep = false;
                                            tool.debounce.reset(member.config.name + "_priority_budget");
                                            member.state = true;
                                            priority.send(x, true);
                                            return true;
                                        }
                                    });
                            } else {
                                tool.debounce.reset(member.config.name + "_priority_budget");
                            }
                        },
                        conditions: function (x) {
                            let { battery, volts, amps, sun } = priority.pointers(x);
                            let member = state.priority.queue[x]; member.config = config.solar.priority.queue[x];
                            if (member.config.on.budget) tool.debounce.reset(member.config.name + "_priority_budget");
                            if (sun != undefined && member.config.on.sun != undefined) {
                                if (member.config.offAmpsFloat == undefined || member.config.offAmpsFloat != undefined
                                    && nv.battery[config.solar.priority.battery].floating == true) {
                                    if (sun >= member.config.on.sun) {
                                        // console.log("checking sun: " + sun + " floating:" + nv.battery[cfg.battery].floating)
                                        if (member.delayStepSun == false) {
                                            member.delayTimerSun = time.epoch;
                                            member.delayStepSun = true;
                                            return;
                                        } else if (time.epoch - member.delayTimerSun >= config.solar.priority.delaySwitchOn) {
                                            log("priority queue - " + member.config.name + " - sun is high (" + sun + "v) - starting ");
                                            priority.send(x, true);
                                            return;
                                        }
                                    } else member.delayStepSun = false;
                                }
                            }
                            if (member.config.on.amps != undefined) {
                                if (amps >= member.config.on.amps) {
                                    priority.trigger(x, "charge amps is high (" + amps + "a) volts: " + volts + " on-volts: "
                                        + member.config.onVolts + " - starting ", true);
                                    return;
                                } else if (amps <= member.config.on.amps) member.delayStep = false;
                            } else if (member.config.on.volts != undefined) {
                                priority.trigger(x, "battery volts is enough (" + volts + "v) - starting ", true);
                                return;
                            }
                        },
                    },

                    trigger: function (x, message, newState, isSun) {
                        let member = state.priority.queue[x]; member.config = config.solar.priority.queue[x];
                        if (config.inverter.length > 0) {
                            if (checkInverter()) proceed();
                        } else proceed();
                        function checkInverter() {
                            for (let y = 0; y < config.inverter.length; y++) {
                                if (config.inverter[y].enable) {
                                    if (newState == false) { // reset delay step for assigned inverter or all inverters if none assigned 
                                        if (member.inverter != undefined) {
                                            if (member.inverter === y) state.inverter[y].delayStep = false;
                                        } else state.inverter[y].delayStep = false;
                                    }
                                    if (entity[config.inverter[y].entity]?.state == false) return false;
                                }
                            }
                            return true;
                        }
                        function proceed() {
                            if (member.delayStep == false) {
                                member.delayTimer = time.epoch;
                                member.delayStep = true;
                                return;
                            } else if (time.epoch - member.delayTimer >= (newState
                                ? ((member.config.delayOn != null) ? member.config.delayOn : config.solar.priority.delaySwitchOn)
                                : ((member.config.delayOff != null) ? member.config.delayOff : config.solar.priority.delaySwitchOff))) {
                                log("priority queue - " + member.config.name + " - " + message);
                                if (!member.budgetSwitchOn) member.budgetSwitchOn = time.epoch;
                                if (newState) member.budgetNotify = false;
                                priority.send(x, newState);
                                return;
                            }
                        }
                    },
                    send: function (x, newState) {
                        let member = state.priority.queue[x]; member.config = config.solar.priority.queue[x];
                        for (let y = 0; y < member.config.entity.length; y++) {
                            state.priority.skipLog = true;
                            send(member.config.entity[y], newState);
                        }
                        config.inverter.forEach((_, y) => { state.inverter[y].delayStep = false });
                        config.solar.priority.queue.forEach((_, y) => { state.priority.queue[y].delayStep = false; member.delayStepSun = false; });
                        member.state = newState;
                        state.priority.step = time.epoch;
                    },
                    pointers: function (x) {
                        let battery;
                        if (config.solar.priority.queue[x].battery)
                            battery = nv.battery[config.solar.priority.queue[x].battery];
                        else battery = nv.battery[config.solar.priority.battery] ?? nv.battery[0];
                        let batteryConfig = config.battery[config.battery.findIndex(batt => batt.name === config.solar.priority.battery)];
                        let volts = Math.round(entity[batteryConfig.sensorVolt]?.state * 10) / 10;
                        let sun = Math.round(entity[config.solar.sunlight]?.state * 100) / 100;
                        let amps;
                        if (config.solar.priority.battery != undefined) {
                            if (Array.isArray(batteryConfig.sensorAmp)) {
                                let temp = 0;
                                for (let y = 0; y < batteryConfig.sensorAmp.length; y++) {
                                    temp += Math.round(entity[batteryConfig.sensorAmp[y]]?.state * 10) / 10;
                                    amps = temp;
                                }
                            } else amps = Math.round(entity[batteryConfig.sensorAmp]?.state * 10) / 10;
                        }
                        return { battery, volts, sun, amps }
                    },
                }
                let check = {
                    temp: function () {
                        let cfg = config.fan, fan = state.fan, wattsBat,
                            wattsInv = Math.round(state.sensor.watt[cfg.sensor.watt.inverter]), temp = 0,
                            tempUnit = config.sensor.temp[cfg.sensor.temp].unit;
                        if (Math.sign(state.sensor.watt[cfg.sensor.watt.battery]) == -1)
                            wattsBat = (Math.round(state.sensor.watt[cfg.sensor.watt.battery]) * -1);
                        else wattsBat = Math.round(state.sensor.watt[cfg.sensor.watt.battery]);
                        if (config.sensor.temp[cfg.sensor.temp].CtoF) {
                            temp = (Math.round((9 / 5 * state.sensor.temp[cfg.sensor.temp] + 32) * 10) / 10)
                        }
                        else temp = Math.round(state.sensor.temp[cfg.sensor.temp] * 10) / 10
                        switch (fan.run) {
                            case false:
                                if (temp >= cfg.temp.on) {
                                    log("room temp is rising, fan turning on: " + temp + tempUnit);
                                    fanSwitchNow();
                                    fan.warn = true;
                                    return;
                                }
                                if (cfg.sun != undefined) {
                                    if (entity[config.solar.espSunlight].state >= cfg.sun.on) {
                                        if (fanSwitch(true)) {
                                            log("sun is high: " + entity[config.solar.espSunlight].state + ", fan turning on: " + temp + tempUnit);
                                            return;
                                        }
                                    } else fan.delayStep = false;
                                } else if (cfg.watts != undefined) {
                                    if (cfg.watts.night != undefined && state.inverter[0].nightMode == true) {
                                        if (wattsBat >= cfg.watts.night.on) {
                                            if (fanSwitch(true)) {
                                                log("(nightmode) battery power is rising: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                                return;
                                            }
                                        }
                                        if (wattsInv >= cfg.watts.night.on) {
                                            if (fanSwitch(true)) {
                                                log("(nightmode) inverter power is rising: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                                return;
                                            }
                                        }
                                        if (wattsBat < cfg.watts.night.on && wattsInv < cfg.watts.night.on) fan.delayStep = false;
                                    } else {
                                        if (wattsBat >= cfg.watts.on) {
                                            if (fanSwitch(true)) {
                                                log("battery power is rising: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                                return;
                                            }
                                        }
                                        if (wattsInv >= cfg.watts.on) {
                                            if (fanSwitch(true)) {
                                                log("inverter power is rising: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                                return;
                                            }
                                        }
                                        if (wattsBat < cfg.watts.on && wattsInv < cfg.watts.on) fan.delayStep = false;
                                    }
                                }
                                if (temp < cfg.temp.on) fan.delayStep = false;
                                break;
                            case true:
                                if (cfg.sun != undefined) {
                                    if (entity[config.solar.espSunlight].state <= cfg.sun.off) {
                                        if (fanSwitch(false)) {
                                            log("room has cooled down and sun is low, fan turning off: " + temp + tempUnit);
                                            return;
                                        }
                                    } else fan.delayStep = false;
                                } else if (cfg.watts != undefined && temp <= cfg.temp.off) {
                                    if (cfg.watts.night != undefined && state.inverter[0].nightMode == true) {
                                        if (wattsBat <= cfg.watts.night.off) {
                                            if (fanSwitch(false)) {
                                                log("(nightmode) battery power has lowered: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                                return;
                                            }
                                        }
                                        if (wattsInv <= cfg.watts.night.off) {
                                            if (fanSwitch(false)) {
                                                log("(nightmode) inverter power has lowered: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                                return;
                                            }
                                        }
                                        if (wattsBat > cfg.watts.night.off && wattsInv > cfg.watts.night.off) fan.delayStep = false;
                                    } else {
                                        if (wattsBat <= cfg.watts.off) {
                                            if (fanSwitch(false)) {
                                                log("battery power has lowered: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                                return;
                                            }
                                        }
                                        if (wattsInv <= cfg.watts.off) {
                                            if (fanSwitch(false)) {
                                                log("inverter power has lowered: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                                return;
                                            }
                                        }
                                        if (wattsBat > cfg.watts.off && wattsBat > cfg.watts.off) fan.delayStep = false;
                                    }
                                } else {
                                    if (temp <= cfg.temp.off) {
                                        if (fanSwitch(false)) {
                                            log("room has cooled, fan turning off: " + temp + tempUnit);
                                            return;
                                        }
                                    } else fan.delayStep = false;
                                }
                                break;
                            case null:
                                fan.run = entity[cfg.espPower].state;
                                log("syncing fan state: " + fan.run);
                                break;
                        }
                        if (temp >= cfg.temp.warn && fan.warn == false) {
                            if (temp >= cfg.temp.error && fan.error == false) {
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

                        if (time.epochMin - fan.faultStep >= cfg.refaultMin) {
                            fan.error = false;
                            fan.warn = false;
                            fan.faultStep = time.epochMin;
                        }
                        function fanSwitchNow() {
                            send(cfg.espPower, true);
                            fan.run = true;
                            fan.faultStep = time.epochMin;
                        }
                        function fanSwitch(newState) {
                            if (fan.delayStep == false) {
                                fan.delayTimer = time.epoch;
                                fan.delayStep = true;
                            } else if (newState == true) {
                                if (time.epoch - fan.delayTimer >= cfg.delayOn) {
                                    fan.run = newState;
                                    send(cfg.espPower, newState);
                                    fan.delayStep = false;
                                    return true;
                                }
                            } else if (time.epoch - fan.delayTimer >= cfg.delayOff) {
                                fan.run = newState;
                                send(cfg.espPower, newState);
                                fan.delayStep = false;
                                return true;
                            }
                        }
                    },
                    grid: function () {
                        // global function to give h m s?
                        // log grid blackout statistics
                        // log sunlight daily name
                        // grid statistics , save to nv
                        if (config.grid.espVoltage) {
                            let volts = ~~parseFloat(entity[config.grid.espVoltage].state), cfg = config.grid, grid = state.grid;
                            if (time.boot > 10) {
                                if (volts >= cfg.voltMax) {
                                    if (grid.state != false) {
                                        log("grid over-voltage: " + volts + "v", 2);
                                        blackout();
                                    } else grid.delayOn = time.epoch;
                                } else if (volts < cfg.voltMin && volts > 20.0) {
                                    if (grid.state != false) {
                                        log("grid under-voltage: " + volts + "v", 2);
                                        blackout();
                                    } else grid.delayOn = time.epoch;
                                } else if (volts < 20.0 || Number.isFinite(volts) == false) {
                                    if (grid.state != false) {
                                        log("grid blackout: " + volts + "  raw: " + entity[config.grid.espVoltage].state, 2);
                                        blackout();
                                    } else grid.delayOn = time.epoch;
                                } else if (grid.state == null) {
                                    log("grid is online: " + volts + "v");
                                    grid.state = true;
                                } else if (grid.state == false) {
                                    if (time.epoch - grid.delayOn >= cfg.delayRecover) {
                                        let outage = (time.epoch - state.grid.timerBlackout);
                                        log("grid back online: " + volts + "v,  offline for: " + outage + "s", 2);
                                        grid.state = true;
                                    }
                                }
                            }
                            function blackout() {
                                state.grid.timerBlackout = time.epoch;
                                grid.state = false;
                                grid.delayOn = time.epoch;
                            }
                        }
                    },
                    battery: function () {
                        for (let x = 0; x < config.battery.length; x++) {
                            let cfg = config.battery[x], bat = state.battery[x], name = config.battery[x].name,
                                amps = ~~entity[cfg.sensorAmp]?.state,
                                volts = Math.round(entity[cfg.sensorVolt].state * 100) / 100,
                                watts = entity[cfg.sensorWatt]?.state;

                            if (nv.battery[name] == undefined) {
                                log("initializing NV memory for - Battery: " + name);
                                nv.battery[name] = {
                                    cycles: 0, floating: false, chargeFull: false, chargeCycle: false, dischargeReset: false,
                                    charge: { total: 0, today: 0 }, discharge: { total: 0, today: 0 }
                                };
                            }

                            let harvest = nv.sensor.watt[config.solar.priority.entitySolar]?.today / 1000.0,
                                charge = nv.battery[name].charge.today / 1000.0;

                            if (entity[cfg.sensorVolt]) {
                                if (!nv.battery[name].chargeCycle && volts >= cfg.voltschargeCycle) {
                                    log("battery - " + cfg.name + " - recording charge cycle: " + volts + "v");
                                    nv.battery[name].chargeCycle = true;
                                    nv.battery[name].cycles++;
                                }
                                if (!nv.battery[name].floating) {
                                    if (volts >= cfg.voltsFloat) {
                                        tool.debounce("battery_float", 30, () => {
                                            log("battery - " + cfg.name + " - charger is floating: " + volts + "v - solar: "
                                                + harvest.toFixed(1) + "kwh - charge: " + charge.toFixed(1) + " kwh");
                                            if (cfg.voltschargeCycle == null) nv.battery[name].cycles++;
                                            nv.battery[name].floating = true;
                                            nv.battery[name].chargeFull = true;
                                        })
                                    } else tool.debounce.reset("battery_float");
                                } else {
                                    if (volts <= cfg.voltsFloatStop) {
                                        tool.debounce("battery_float", 30, () => {
                                            log("battery - " + cfg.name + " - charger no longer floating: " + volts + "v");
                                            nv.battery[name].floating = false;
                                        })
                                    } else tool.debounce.reset("battery_float");
                                }
                                bat.percent = Math.round(voltPercent(volts, cfg));
                                // console.log("bat percent: " + bat.percent)
                                send("battery_" + cfg.name, bat.percent, "%");

                                if (cfg.sensorAmp) {
                                    if (amps >= cfg.ampsResetDischarge) {
                                        if (nv.battery[name].dischargeReset == true) {
                                            log("battery - " + cfg.name + " - resetting discharge meter - amps: " + amps);
                                            nv.battery[name].dischargeReset = false;
                                            nv.battery[name].discharge.today = 0;
                                        }
                                    }
                                }

                                if (cfg.sensorWatt) {
                                    if (Number.isFinite(watts)) {
                                        if (Math.sign(watts) == -1) bat.whNeg += watts;
                                        else bat.whPos += watts;
                                    }
                                    if (bat.min == null) {
                                        log("battery - " + cfg.name + " - starting recorder");
                                        bat.min = time.min;
                                    }
                                    if (time.min != bat.min) {
                                        let charge = (bat.whPos / 60 / 60), discharge = (bat.whNeg / 60 / 60) * -1;
                                        if (time.hour == 3 && time.min == 0) {
                                            log("battery - " + cfg.name + " - resetting discharge meter");
                                            nv.battery[name].dischargeReset = true;
                                            nv.battery[name].charge.today = 0;
                                        }
                                        if (!cfg.sensorAmp && time.hour == 10 && time.min == 0) {
                                            if (nv.battery[name].dischargeReset == true) {
                                                log("battery - " + cfg.name + " - resetting discharge meter");
                                                nv.battery[name].dischargeReset = false;
                                                nv.battery[name].discharge.today = 0;
                                            }
                                        }
                                        recorder(nv.battery[name].charge, charge, "battery_" + cfg.name + "_charge");
                                        recorder(nv.battery[name].discharge, discharge, "battery_" + cfg.name + "_discharge");
                                        nv.battery[name].charge.today += charge;
                                        nv.battery[name].discharge.today += discharge;
                                        nv.battery[name].charge.total += charge;
                                        nv.battery[name].discharge.total += discharge;
                                        send("kwh_battery_" + cfg.name + "_charge_today", (Math.round((nv.battery[name].charge.today / 1000) * 10) / 10), "KWh");
                                        send("kwh_battery_" + cfg.name + "_discharge_today", (Math.round((nv.battery[name].discharge.today / 1000) * 10) / 10), "KWh");
                                        //send("battery_" + cfg.name + "_charge_total", Math.round(nv.battery[name].charge.total / 1000), "KWh");
                                        //send("battery_" + cfg.name + "_discharge_total", Math.round(nv.battery[name].discharge.total / 1000), "KWh");
                                        send("battery_" + cfg.name + "_cycles", nv.battery[name].cycles, "x");
                                        bat.whPos = 0;
                                        bat.whNeg = 0;
                                        bat.min = time.min;

                                        let ceff = 0, deff = 0;
                                        for (let y = 0; y < nv.battery[name].charge.month.length; y++)
                                            ceff += nv.battery[name].charge.month[y] ?? 0;
                                        for (let y = 0; y < nv.battery[name].discharge.month.length; y++)
                                            deff += nv.battery[name].discharge.month[y] ?? 0;
                                        send("battery_" + cfg.name + "_efficiency", Math.round(((deff / ceff) * 100) * 10) / 10, "%");
                                    }
                                }

                            }
                        }
                        function voltPercent(voltage, cfg) {
                            let percent = null;
                            if (voltage >= config.soc[cfg.socTable][0]) return 100;
                            if (voltage <= config.soc[cfg.socTable].length - 1) return 0;
                            for (let i = 0; i < config.soc[cfg.socTable].length - 1; i++) {
                                const current = config.soc[cfg.socTable][i];
                                const next = config.soc[cfg.socTable][i + 1];
                                if (voltage <= current.voltage && voltage > next.voltage) {
                                    percent = next.percent + (voltage - next.voltage) * (current.percent - next.percent) / (current.voltage - next.voltage);
                                    return Math.round(percent * 10) / 10;
                                }
                            }
                        }
                    },
                    sensor: {     // calc watts based on amp/volt sensors 
                        amp: function () {
                            for (let x = 0; x < config.sensor.amp.length; x++) {
                                let cfg = config.sensor.amp[x], sum = 0;
                                entity[cfg.name] ||= {};
                                let amps = entity[cfg.name];
                                if (cfg.entity > 1) {
                                    for (let y = 0; y < cfg.entity.length; y++) {
                                        let value = parseFloat(entity[cfg.entity[y]].state)
                                        if (Number.isFinite(value)) {
                                            if (cfg.combineNegative === true) { sum += entity[cfg.entity[y]].state }
                                            else if (Math.sign(value) != -1) { sum += entity[cfg.entity[y]].state }
                                            //   else sum += (entity[cfg.entity[y]].state * -1)
                                        }
                                    }
                                    amps.state = (Math.round(sum * 10) / 10);
                                    amps.update = time.epoch;
                                    // console.log("entity: " + cfg.name + " -  state: " + amps.state)
                                    send("amp_" + cfg.name, amps.state, "A");
                                }
                            }
                        },
                        watt: function () {
                            for (let x = 0; x < config.sensor.watt.length; x++) {
                                let sum = 0, cfg = config.sensor.watt[x];
                                state.recorder.watt[cfg.name] ||= { min: null, wh: 0 };
                                entity[cfg.name] ||= {};
                                let watts = entity[cfg.name];
                                let whFinal = 0;

                                if (cfg.entity != undefined) {
                                    if (cfg.entity.length > 1 || cfg.solarPower == true) {
                                        for (let y = 0; y < cfg.entity.length; y++) {
                                            let value = parseFloat(entity[cfg.entity[y]]?.state)
                                            if (Number.isFinite(value)) {
                                                if (cfg.combineNegative === true) { sum += entity[cfg.entity[y]].state }
                                                else if (Math.sign(value) != -1) { sum += entity[cfg.entity[y]].state }
                                                //   else sum += (entity[cfg.entity[y]].state * -1)
                                            }
                                        }
                                        //  console.log("testing entity: "+ cfg.name + " - sum: " + sum)
                                        if (cfg.solarPower == true) {
                                            let batWatts = entity[cfg.batteryWatt].state;
                                            if (Math.sign(batWatts) == -1 && batWatts <= (sum * -1)) {
                                                send("watt_" + cfg.name, 0, "kW");
                                            } else {
                                                if (Number.isFinite(batWatts))
                                                    watts.state = batWatts + sum;
                                                send("watt_" + cfg.name, ((batWatts + sum) / 1000).toFixed(2), "kW");
                                            }
                                        } else {
                                            watts.state = ~~sum;
                                            send("watt_" + cfg.name, (sum / 1000).toFixed(2), "kW");
                                        }
                                    }
                                } else if (cfg.sensorAmp != undefined && cfg.sensorVolt != undefined) { // for volt/amp calc
                                    let amps = entity[cfg.sensorAmp].state, volts = entity[cfg.sensorVolt]?.state;
                                    if (Number.isFinite(volts * amps)) watts.state = volts * amps;
                                    else (watts.state = 0.0);
                                    send("watt_" + cfg.name, (watts.state / 1000).toFixed(2), "kW");
                                }

                                if (Number.isFinite(watts.state) && Math.sign(watts.state) != -1)
                                    state.recorder.watt[cfg.name].wh += watts.state;

                                if (state.recorder.watt[cfg.name].min == null) {
                                    if (cfg.record) log("starting recorder for watt sensor - " + cfg.name);
                                    state.recorder.watt[cfg.name].min = time.min;
                                } else if (time.min != state.recorder.watt[cfg.name].min) {
                                    whFinal = ((state.recorder.watt[cfg.name].wh / 60) / 60);
                                    nv.sensor.watt[cfg.name].total += whFinal;
                                    if (cfg.record !== false) {
                                        if (!nv.sensor.watt[cfg.name]) {
                                            log("initializing NV memory for - watt sensor: " + cfg.name);
                                            nv.sensor.watt[cfg.name] = { total: 0, today: 0, min: [], hour: [], day: [], month: [] };
                                        }
                                        recorder(nv.sensor.watt[cfg.name], whFinal, cfg.name);
                                    }


                                    if (state.recorder.watt[cfg.name].todayReset) {
                                        log("resetting daily watt meter for: " + cfg.name, 0);
                                        nv.sensor.watt[cfg.name].today = 0;
                                        state.recorder.watt[cfg.name].todayReset = false;
                                    }

                                    nv.sensor.watt[cfg.name].today += whFinal;
                                    send("kwh_" + cfg.name + "_today", (nv.sensor.watt[cfg.name].today / 1000).toFixed(2), "kWh");
                                    // console.log("watts today:" + nv.sensor.watt[cfg.name].today)

                                    state.recorder.watt[cfg.name].wh = 0;
                                    state.recorder.watt[cfg.name].min = time.min;
                                }

                                watts.update = time.epoch;
                            }
                        },
                    },
                    solarPower: function () { // old code map/to predict how sun readings correspond to wattage potential
                        if (state.sunlight[sunConverted] == undefined) {
                            //   log("creating new solar power name: " + sunConverted);
                            state.sunlight[sunConverted] = { low: solarPower, high: solarPower, average: null };
                        } else {
                            if (solarPower < state.sunlight[sunConverted].low) {
                                state.sunlight[sunConverted].low = solarPower;
                                state.sunlight[sunConverted].average = Math.round(state.sunlight[sunConverted].low + state.sunlight[sunConverted].high / 2);
                                //     log("solar power name: " + sunConverted + "  low is being updated: " + solarPower + "  new average: " + state.sunlight[sunConverted].average);
                            }
                            if (solarPower > state.sunlight[sunConverted].high) {
                                state.sunlight[sunConverted].high = solarPower;
                                state.sunlight[sunConverted].average = Math.round(state.sunlight[sunConverted].low + state.sunlight[sunConverted].high / 2);
                                //    log("solar power name: " + sunConverted + "  high is being updated: " + solarPower + "  new average: " + state.sunlight[sunConverted].average);
                            }
                        }
                    },
                }
                let constructor = {
                    init: function () {
                        log("initializing push constructors");
                        for (let sensor of config.sensor.amp)
                            if (sensor.entity) push[sensor.entity] = constructor.sensor.amp(sensor);
                        for (let sensor of config.sensor.volt)
                            if (sensor.entity) push[sensor.entity] = constructor.sensor.volt(sensor);
                        for (let sensor of config.sensor.watt)
                            if (sensor.entity) push[sensor.entity] = constructor.sensor.watt(sensor);
                        for (let sensor of config.sensor.kwh)
                            if (sensor.entity) push[sensor.entity] = constructor.sensor.kwh(sensor);
                        for (let sensor of config.sensor.temp)
                            if (sensor.entity) push[sensor.entity] = constructor.sensor.temp(sensor);

                        if (config.solar.inverterAuto)
                            push[config.solar.inverterAuto] = constructor.inverter.auto();

                        config.inverter.forEach((inverter, x) => {
                            if (inverter.entity)
                                push[inverter.entity] = constructor.inverter.operation(x);
                        });

                        if (config.solar.priority.entityAuto)
                            push[config.solar.priority.entityAuto] = constructor.priority.auto();

                        config.solar.priority.queue.forEach((queue, x) => {
                            if (queue.entityAuto)
                                push[queue.entityAuto] = constructor.priority.queueAuto(queue, x);
                            queue.entity.forEach((entity, y) => {
                                push[entity] = constructor.priority.queue(queue, entity, x, y);
                            })
                        })
                    },
                    sensor: {
                        amp: function (cfg) {
                            return (state, name) => {
                                let amps = entity[cfg.name] ||= {};
                                let factor = 0, corrected = 0, final = 0;
                                if (cfg.multiplier != undefined) {
                                    amps.state = parseFloat(state) * cfg.multiplier;
                                } else if (cfg.scale != undefined) {
                                    factor = cfg.rating / (cfg.scale / 2);
                                    corrected = parseFloat(state) - cfg.zero;
                                    final = corrected * factor;
                                    if (cfg.inverted == true) amps.state = (final * -1);
                                    else amps.state = final;
                                } else amps.state = parseFloat(state);
                                if (amps.state != null && Number.isFinite(amps.state)) {
                                    send("amp_" + cfg.name, Math.round(amps.state * 10) / 10, "A");
                                }
                                amps.update = time.epoch;
                            };
                        },
                        volt: function (cfg) {
                            return (state, name) => {
                                let volts = entity[cfg.name] ||= {};
                                let final = null, voltage = parseFloat(state);
                                const table = cfg.table;
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
                                        send("volt_" + cfg.name, Math.round(final * 10) / 10, "V");
                                } else if (cfg.multiplier != undefined) {
                                    volts.state = voltage * cfg.multiplier;
                                    if (volts.state != null && Number.isFinite(volts.state))
                                        send("volt_" + cfg.name, Math.round(volts.state * 10) / 10, "V");
                                } else volts.state = voltage;
                                volts.update = time.epoch;
                            };
                        },
                        watt: function (cfg) {
                            return (state, name) => {
                                let watts = entity[cfg.name] ||= {};
                                let newData;
                                if (cfg.multiplier != undefined) newData = parseFloat(state) * cfg.multiplier;
                                else newData = parseFloat(state);
                                if (Number.isFinite(watts.state)) {
                                    watts.state = newData;
                                    send("watt_" + cfg.name, ~~watts.state, "W");
                                } else watts.state = 0.0;
                                watts.update = time.epoch;
                            }
                        },
                        kwh: function (cfg) {
                            return (state, name) => {
                                if (!nv.sensor.kwh[cfg.name]) {
                                    log("initializing NV memory for - kWh sensor: " + cfg.name);
                                    nv.sensor.kwh[cfg.name] = { total: 0, min: [], hour: [], day: [], month: [], };
                                }
                                let kwh = nv.sensor.kwh[cfg.name];
                                let newData = parseInt(state);
                                if (Number.isFinite(newData)) {
                                    if (newData < 0) return;
                                    if (newData > 0) {
                                        if (kwh.total == 0) {
                                            log("sensor: " + cfg.name + " first time recording");
                                            kwh.total = newData;
                                        }
                                        if (kwh.last == 0) {
                                            log("starting recorder for PZEM Meter - " + cfg.name);
                                            recorder(kwh, 0, cfg.name);
                                            kwh.last = newData;
                                        } else {
                                            let diff = newData - kwh.last;
                                            if (diff < 0) {
                                                diff = (10000000 - kwh.last) + newData;
                                                log("PZEM rollover detected: " + cfg.name + " last=" + kwh.last + " new=" + newData + " diff=" + diff);
                                            }
                                            kwh.last = newData;
                                            if (diff > 0) {
                                                recorder(kwh, diff, cfg.name);
                                                kwh.total += diff;
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        temp: function (cfg) {
                            return (state, name) => {
                                let temp = entity[cfg.name] ||= {};
                                if (cfg.multiplier != undefined) {
                                    temp.state = parseFloat(state) * cfg.multiplier;
                                    if (temp.state != null && Number.isFinite(temp.state))
                                        send("temp_" + cfg.name, Math.round(temp.state * 10) / 10, cfg.unit);
                                } else {
                                    temp.state = parseFloat(state);
                                }
                            }
                        },
                        example: function (cfg) {
                            return (state, name) => {
                            }
                        },
                    },
                    inverter: {
                        auto: function () {
                            return (newState, name) => {
                                if (newState) log("inverter auto going online");
                                else log("inverter auto going offline");
                                for (let x = 0; x < config.inverter.length; x++) {
                                    if (entity[config.inverter[x].entity].state) {
                                        log("inverter: " + config.inverter[x].name + " - inverter ON - syncing ATS with inverter operational state");
                                        syncInverter(x, true);
                                    } else {
                                        log("inverter: " + config.inverter[x].name + " - inverter OFF - syncing ATS with inverter operational state");
                                        syncInverter(x, false);
                                        state.inverter[x].step = time.epoch - config.solar.cycleError - 5;
                                        state.inverter[x].stepPower = time.epoch - config.solar.cycleError - 5;
                                    }
                                }
                                function syncInverter(x, tState) {
                                    state.inverter[x].state = tState;
                                    // solar.nightMode(x);
                                    solar.power(x, tState);
                                    state.inverter[x].warn.manualPowerOn = false;
                                }
                            }
                        },
                        operation: function (x) {
                            return (newState, name) => {
                                if (config.inverter[x].enable) {
                                    if (state.inverter[x].state != "faulted" && state.inverter[x].state != state) {
                                        log("inverter: " + config.inverter[x].name + " - operational state entity switching to - syncing power/switches: " + newState);
                                        state.inverter[x].state = newState;
                                        // solar.nightMode(x);
                                        solar.power(x, newState, null, true);
                                        state.inverter[x].warn.manualPowerOn = false;
                                    }
                                }

                            }
                        },
                    },
                    priority: {
                        auto: function () {
                            return (newState, name) => {
                                log("priority queue - auto entity toggle - state: " + newState);
                                config.solar.priority.queue.forEach((element, index) => {
                                    state.priority.queue[index].delayStep = false;
                                    state.priority.queue[index].delayStepSun = false;
                                    state.priority.queue[index].delayStepBudget = false;
                                    state.priority.queue[index].budgetSwitchOn = null;
                                });
                            }
                        },
                        queue: function (priority, entity, x, y) {
                            return (newState, name) => {
                                if (!state.priority.skipLog)
                                    log("syncing priority queue: " + priority.name + "  with entity: " + entity + " - new state: " + newState);
                                state.priority.queue[x].state = newState;
                                state.priority.queue[x].delayStep = false;
                                state.priority.queue[x].delayStepSun = false;
                                state.priority.queue[x].delayStepBudget = false;
                                state.priority.skipLog = false;
                            }
                        },
                        queueAuto: function (priority) {
                            return (newState, name) => {
                                if (newState) log("priority queue member" + priority.name + " going online");
                                else log("priority queue member " + priority.name + " going offline");
                            }
                        },
                    },
                    example: function (config) {
                        return (newState, name) => {
                        }
                    },
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
                function timer() {    // called every minute
                    if (time.hour == 3 && time.min == 0) {
                        log("timer - resetting daily watt meters", 0);
                        config.sensor.watt.forEach(cfg => { state.recorder.watt[cfg.name].todayReset = true; })
                        config.battery.forEach(element => {
                            nv.battery[element.name].chargeCycle = false;
                            nv.battery[element.name].chargeFull = false;
                        });
                    }
                }
                if (_push === "init") {
                    global.state[_name] = {               // initialize automation volatile memory
                        priority: { step: time.epoch, queue: [], skipLog: false, },
                        inverter: [],
                        battery: [],
                        grid: { state: null, delayOn: time.epoch, timerBlackout: time.epoch, voltOver: false, },
                        fan: {
                            run: null, delayStep: false, delayTimer: time.epoch, warn: false, error: false,
                            faultStep: time.epochMin
                        },
                        recorder: { watt: {}, kwh: {} },
                        welder: { detect: false, step: null },
                        timer: { second: null, minute: null, priority: null },
                    };
                    global.nv[_name] ||= {};
                    ({ state, config, nv, push } = twit(_name));
                    config.inverter.forEach(_ => {
                        state.inverter.push({
                            state: null, boot: false, step: time.epoch - 20, stepPower: time.epoch - 20, nightMode: null, delayOffTimer: undefined, switchWatts: 0,
                            switchSun: 0, switchWattsTimer: time.epoch, delayTimer: time.epoch, delayStep: false, delayVoltsTimer: time.epoch,
                            delayVoltsStep: false, delaySunTimer: time.epoch, delayStepSun: false, delayFaultStep: false,
                            delayFaultTimer: time.epoch, timeShutdown: null,
                            warn: { manualPowerOn: false, }
                        });
                    });
                    config.solar.priority.queue.forEach(_ => {
                        state.priority.queue.push({
                            state: null, delayStep: false, delayStepBudget: false, delayStepSun: false, delayTimer: time.epoch, delayTimerSun: time.epoch,
                            delayTimerBudget: time.epoch, boot: false, budgetNotify: false
                        })
                    });
                    config.battery.forEach(_ => {
                        state.battery.push({ percent: null, min: null, whPos: 0, whNeg: 0, floatStep: false, floatTimer: null })
                    });
                    (function initNV() {
                        log("initializing NV data");
                        nv.sensor ||= {};
                        nv.sensor.watt ||= {};
                        nv.sensor.kwh ||= {};
                        nv.grid ||= { power: false, blackout: [], sec: 0 };
                        nv.battery ||= {};
                    })();
                    log("solar automation system starting");

                    state.timer.second = setInterval(() => {
                        check.sensor.amp();
                        check.sensor.watt();
                        check.battery();
                        check.grid();
                        if (entity[config.solar?.inverterAuto]?.state == true) {
                            solar.auto();
                            // if  (state.welder.detect == false) 
                        }
                        if (config.fan?.sensor?.temp != undefined) check.temp();
                        if (entity[config.solar?.priority?.entityAuto]?.state == true) priority.auto();
                    }, 1e3);

                    setTimeout(() => {  // start minute timer aligned with system minute
                        timer();
                        state.timer.minute = setInterval(() => { timer(); }, 60e3);
                    }, (60e3 - ((time.sec * 1e3) + time.mil)));

                    state.timer.write = setInterval(() => { write(); }, 30e3);
                    if (config.solar.inverterAuto != undefined
                        && entity[config.solar.inverterAuto]?.state == true) log("inverter automation is on");
                    else log("inverter automation is off");
                    write();

                    constructor.init();

                    return;
                }
                else if (_push) push[_push.name]?.(_push.state, _push.name);
                else if (_reload) {
                    if (push) push.forIn((name) => {
                        log("deleting constructor for: " + name, 0);
                        delete push[name];
                    })
                    if (_reload == "config") {
                        ({ state, config, nv } = twit(_name));
                        constructor.init();
                    } else {
                        log("hot reload initiated");
                        state.inverter.forEach(inverter => {
                            clearTimeout(inverter.switchWattsTimer);
                        });
                        clearInterval(state.timer.write);
                        clearInterval(state.timer.minute);
                        clearInterval(state.timer.second);
                        clearInterval(state.timer.priority);
                    }
                    return;
                }
            } catch (error) { console.trace(error); process.exit(1); }
        }
    }
};
