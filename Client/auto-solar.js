#!/usr/bin/node
module.exports = {
    automation: {
        Solar: function (_name, _push, _reload) {
            try {
                let { state, cfg, nv, log, write, push, send } = _pointers(_name);
                if (_reload) {
                    if (_reload == "config") ({ state, cfg, nv } = _pointers(_name));
                    else {
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
                let solar = {
                    auto: function () {
                        ({ st, cfg, nv } = _pointers(_name));
                        for (let x = 0; x < cfg.inverter.length; x++) solar.init(x);
                        for (let x = cfg.inverter.length - 1; x > -1; x--) solar.off(x);
                        for (let x = 0; x < cfg.inverter.length; x++) solar.on(x);
                    },
                    init: function (x) {
                        if (cfg.inverter[x].enable == true) {
                            let { voltsBat, config, inverter, inverterVolts } = solar.pointers(x) || undefined;
                            if (inverter.state == null || inverter.boot == false) {
                                if (cfg.inverter[x].entity != undefined) {
                                    log("inverter: " + cfg.inverter[x].name + " - syncing operation entity - state: " + entity[cfg.inverter[x].entity]?.state);
                                    if (entity[config.transfer.switchOn[0].entity] != null) {
                                        if (entity[cfg.inverter[x].entity].state == true) {
                                            if (entity[config.transfer.switchOn[0].entity].state != config.transfer.switchOn[0].state) {
                                                log("inverter: " + cfg.inverter[x].name + " - primary ATS state OFF (" + entity[config.transfer.switchOn[0].entity]?.state
                                                    + ") is not expected - HA says its ON", 2);
                                                solar.power(x, true);
                                                // inverter.state = true;
                                            } else inverter.state = true;
                                        } else {
                                            if (entity[config.transfer.switchOff[0].entity].state != config.transfer.switchOff[0].state) {
                                                log("inverter: " + cfg.inverter[x].name + " - primary ATS state ON (" + entity[config.transfer.switchOff[0].entity]?.state
                                                    + ") is not expected - HA says its OFF", 2);
                                                inverter.state = false;
                                            } else inverter.state = false;
                                        }
                                    } else {
                                        log("inverter: " + config.name + " - operational entity is offline or unavailable - inverter auto is going offline", 3);
                                        solar.power(x, false, true);
                                        send(cfg.solar.inverterAuto, false);
                                    }
                                } else {
                                    log("inverter: " + config.name + " - config error, you must config inverter operation entity - Inverter auto is going offline", 3);
                                    solar.power(x, false, true);
                                    send(cfg.solar.inverterAuto, false);
                                }
                                inverter.delayStep = false;
                                inverter.delayVoltsStep = false;
                                inverter.delayFaultStep = false;
                                inverter.delaySunStep = false;
                                inverter.delayTimer = time.epoch;
                                inverter.delayTimerSun = time.epoch;
                                inverter.step = time.epoch - 20;
                                if (inverter.state == false) {
                                    if (config.power.startAuto == true) {
                                        if (voltsBat > config.voltsStop) {
                                            log("inverter: " + config.name + " - first start, volts (" + voltsBat + ") is greater than stop volts (" + config.voltsStop + "), good to run");
                                            solar.power(x, true);
                                        }
                                    } else if (nv.battery[config.battery].floating == true) {
                                        log("inverter: " + config.name + " - first start, battery is floating, good to run");
                                        solar.power(x, true);
                                    }
                                }
                                inverter.boot = true;
                            } else {
                                if (entity[config.transfer.switchOn[0].entity] == null) {
                                    log("inverter: " + config.name + " - operational entity is offline or unavailable - inverter auto is going offline", 3);
                                    solar.power(x, false, true);
                                    send(cfg.solar.inverterAuto, false);
                                }
                                if (inverter.state == "faulted") {
                                    if (inverterVolts <= config.voltsFloatStop) {
                                        log("inverter: " + config.name + " - inverter was faulted but now resetting because charger is no longer floating", 2);
                                        inverter.state = false;
                                    }
                                    if (cfg.solar.watts.inverterPower != undefined
                                        && entity[cfg.solar.watts.inverterPower].state >= config.welderWatts) {
                                        log("inverter: " + config.name + " - inverter was faulted but now resetting because welding is detected", 2);
                                        inverter.state = false;
                                    }
                                }
                            }
                        }
                    },
                    on: function (x) {
                        let { voltsBat, inverterVolts, ampsBat, sun, inverterWatts, config, inverter } = solar.pointers(x);
                        if (cfg.inverter[x].enable == true && inverter.state != "faulted" && inverter.state == true) {
                            if (solar.nightMode(x) == true) {
                                if (voltsBat < config.nightMode.startVoltageMin) {
                                    log("inverter: " + config.name + " - Battery is too low to make it through the night: "
                                        + voltsBat + ", switching off");
                                    solar.power(x, false);
                                    return;
                                }
                            } else if (state.grid.state !== false) {
                                if (inverter.nightMode != true) {
                                    if (config.sunStop != undefined) {
                                        if (sun <= config.sunStop) {
                                            trigger(false, "Sun is low: " + sun + "  voltsBat: " + voltsBat + ", switching to grid ");
                                        } else inverter.delayStep = false;
                                    } else if (config.ampsStop != undefined) {
                                        if (nv.battery[config.battery].floating == false || config.ampsStopFloat == undefined) {
                                            if (ampsBat <= config.ampsStop) {
                                                // console.log("amps below: " + ampsBat + " - floating: " + nv.battery[config.battery].floating + " - stop float: " + inverter.ampsStopFloat)
                                                if (config.ampsStopVoltsMin != undefined) {
                                                    if (voltsBat < config.ampsStopVoltsMin) ampStop();
                                                } else ampStop();
                                            } else inverter.delayStep = false;
                                        } else {
                                            if (ampsBat <= config.ampsStopFloat) {
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
                                            + sun + "v  Watts: " + inverterWatts + ", switching to grid ");
                                        inverter.switchWatts = inverterWatts;
                                        inverter.switchSun = sun;
                                    }
                                }
                            }
                            if (voltsBat <= config.voltsStop) {
                                if (inverter.delayVoltsStep == false && !checkPriority()) {
                                    inverter.delayVoltsTimer = time.epoch;
                                    inverter.delayVoltsStep = true;
                                } else if (time.epoch - inverter.delayVoltsTimer >= 60) {
                                    log("inverter: " + config.name + " - Battery is low: " + voltsBat + "v, is switching to grid ");
                                    solar.power(x, false);
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
                                } else solar.changing(x, false); // inverter only exits night mode only when there is sufficient charging
                            }
                            if (inverterVolts < 20) {
                                log("inverter: " + config.name + " - FAULT - no output - Inverter is going offline", 3);
                                solar.power(x, false, true);
                            }
                            else inverter.delayFaultStep = false;
                        }
                        function checkPriority() {
                            if (config.priorityWait && entity[cfg.solar.priority.entityAuto]?.state == true) {
                                for (let y = 0; y < cfg.solar.priority.queue.length; y++)
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
                                    } else if (time.epoch - inverter.delayTimer >= config.delaySwitchOff) toggle();
                                }
                                function toggle() {
                                    log("inverter: " + config.name + " - " + message, level);
                                    solar.power(x, newState, (level == 3 ? true : undefined));
                                    return;
                                }
                            }
                            if (config.inverterWattsSwitch) {
                                clearTimeout(inverter.switchWattsTimer);
                                inverter.switchWattsTimer = setTimeout(() => {
                                    if (inverter.switchWatts != null) {
                                        log("inverter: " + config.name + " SwitchWatts timeout (10min) - clearing lasSwitch Watts reading");
                                        clearTimeout(inverter.switchWattsTimer);
                                        inverter.switchWatts = null;
                                    }
                                }, 500e3);
                            }
                        }

                    },
                    off: function (x) {
                        if (cfg.inverter[x].enable == true) {

                            let { voltsBat, inverterVolts, battery, config, inverter } = solar.pointers(x);
                            //   console.log(inverter.state)
                            if (battery.sensorVolt != undefined) {
                                if (inverter.state != "faulted" && inverter.state === false) {
                                    solar.changing(x, true);
                                    // console.log("checking...")
                                    if (solar.nightMode(x) == true) {
                                        if (voltsBat >= config.nightMode.startVoltageMin) {
                                            log("Battery is enough to make it through the night: " + voltsBat + ", " + config.name + " switching on");
                                            solar.power(x, true);
                                        } else log("Battery is too low to make it through the night: " + voltsBat + ", " + config.name + " staying off");
                                    }
                                    if (config.blackout == true && state.grid.state == false && voltsBat >= config.blackoutVoltMin) {
                                        log("Blackout detected, volts is enough to run: " + voltsBat + ", " + config.name + " switching on", 2);
                                        solar.power(x, true);
                                    }
                                    if (config.power.entity != undefined && entity[config.power.entity].state == false && inverter.delayOffTimer == null
                                        && time.epoch - inverter.timeShutdown > 10 && inverter.warn.manualPowerOn == false && inverterVolts > 20.0) {
                                        log("inverter: " + config.name + " is still on but should be off - manual power on??", 2);
                                        inverter.warn.manualPowerOn = true;
                                    }
                                }
                            }
                        }

                    },
                    changing: function (x, power) {
                        let { voltsBat, ampsBat, gridWatts, wattsSolar, sun, config, inverter } = solar.pointers(x);
                        if (config.voltsRun != undefined) {
                            if (voltsBat >= config.voltsRun) checkConditions();
                            else inverter.delayStep = false;
                        } else checkConditions();
                        function checkConditions() {
                            if (sun >= config.sunRun) {     // sunlight detection 
                                trigger(power, "battery is charging, sun is high: " + sun + ", switching on", true);
                            } else if (sun < config.sunRun) inverter.delayStepSun = false;
                            if (sun >= config.sunRunFloat && nv.battery[config.battery].floating == true) {     // sunlight detection 
                                trigger(power, "battery is floating, sun is high: " + sun + ", switching on", true);
                            } else if (sun < config.sunRunFloat) inverter.delayStepSun = false;
                            if (config.gridWatt != undefined) {
                                // console.log("checking watts for: " + x + "  gridWatts: " + gridWatts, " wattsSolar: " + wattsSolar)
                                if (wattsSolar > (gridWatts * config.gridWattMultiplier)) {
                                    trigger(power, "charge current is higher than grid power: " + wattsSolar + "w  " + voltsBat + "v, switching on");
                                }
                                if (wattsSolar <= (gridWatts * config.gridWattMultiplier)) { inverter.delayStep = false; }
                            } else if (config.inverterWattsSwitch && inverter.switchWatts) {
                                if (wattsSolar > inverter.switchWatts) {
                                    trigger(power, "charge watts (" + wattsSolar + "w) is higher than last switch watts: "
                                        + inverter.switchWatts + "w  " + voltsBat + "v, switching on");
                                } else inverter.delayStep = false;
                            } else if (config.ampsRun != undefined) {
                                //  console.log("checking amps for: " + x + "  ampsBat: " + ampsBat, " voltsBat: " + voltsBat)
                                if (ampsBat >= config.ampsRun) {   // current detection 
                                    trigger(power, "battery is charging, current is high: " + ampsBat + "a  " + voltsBat + "v, switching on");
                                } else if (ampsBat < config.ampsRun) inverter.delayStep = false;
                            }
                        }
                        function trigger(power, message, sunRun) {
                            if (sunRun) {
                                if (inverter.delayStepSun == false) {
                                    inverter.delayTimerSun = time.epoch;
                                    inverter.delayStepSun = true;
                                    return;
                                } else if (time.epoch - inverter.delayTimerSun >= config.delaySwitchOn) action();
                            } else {
                                if (inverter.delayStep == false) {
                                    // console.log("charge checking is being reset")
                                    inverter.delayTimer = time.epoch;
                                    inverter.delayStep = true;
                                    return;
                                } else if (time.epoch - inverter.delayTimer >= config.delaySwitchOn) action();
                            }
                            function action() {
                                if (inverter.nightMode == true) {
                                    log("inverter: " + config.name + " - exiting night mode");
                                    inverter.nightMode = false;
                                }
                                log("inverter: " + config.name + " - " + message);
                                if (power == true) solar.power(x, true);
                                clearTimeout(inverter.switchWattsTimer);
                                inverter.switchWatts = null;
                                cfg.solar.priority.queue.forEach((_, y) => {
                                    state.priority.queue[y].delayStep = false;
                                    state.priority.queue[y].delayStepSun = false;
                                });
                            }
                        }
                    },
                    power: function (x, run, faulted) {
                        let config = cfg.inverter[x];
                        if (run == true) {
                            if (time.epoch - state.inverter[x].step >= cfg.solar.cycleError) {
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
                                        clearTimeout(state.inverter[x].delayOffTimer);
                                        state.inverter[x].delayOffTimer = null;
                                        //  log("inverter: " + config.name + " - transferring switches to inverter - wait");
                                        toggle(run);
                                    }
                                }
                                state.inverter[x].state = true;
                                state.inverter[x].delayFaultStep = false;
                                setTimeout(() => { state.inverter[x].delayFaultStep = false }, 5e3);
                            } else {
                                log("inverter: " + config.name + " - cycling too frequently, epoch: "
                                    + time.epoch + " step:" + state.inverter[x].step + " - inverter auto shutting down", 3);
                                // state.inverter[x].state = false;
                                entity[cfg.inverter[x].entity].state = false;
                                send(cfg.solar.inverterAuto, false);
                                solar.power(x, false);
                            }
                        } else {
                            if (config.power.entity == undefined) {
                                //  log("inverter: " + config.name + " - transferring switches to grid - wait");
                                toggle(run);
                            } else {
                                // log("inverter: " + config.name + " - transferring switches to grid - wait");
                                toggle(run);
                                if (config.power.delayOff == undefined || faulted) {
                                    log("inverter: " + config.name + ", power off");
                                    state.inverter[x].delayOffTimer = setTimeout(() => {
                                        send(config.power.entity, false);
                                        state.inverter[x].delayOffTimer = null;
                                    }, 10e3);
                                } else {
                                    log("inverter: " + config.name + " - shutdown will delay by:" + config.power.delayOff + " seconds");
                                    state.inverter[x].delayOffTimer = setTimeout(() => {
                                        log("inverter: " + config.name + " - shutdown was delayed, now powering off");
                                        send(config.power.entity, false);
                                        state.inverter[x].delayOffTimer = null;
                                        state.inverter[x].timeShutdown = time.epoch;
                                    }, config.power.delayOff * 1000);
                                }
                            }
                            if (!faulted) state.inverter[x].state = false;
                            else state.inverter[x].state = "faulted";
                            state.inverter[x].step = time.epoch;
                        }
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
                        state.inverter[x].delayStep = false;
                        state.inverter[x].delayVoltsStep = false;
                        state.inverter[x].delayFaultStep = false;
                        state.inverter[x].delaySunStep = false;
                        cfg.inverter.forEach((_, y) => { state.inverter[y].delayStep = false });
                        cfg.solar.priority.queue.forEach((_, y) => { state.priority.queue[y].delayStep = false });
                    },
                    nightMode: function (x) {
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
                            if (state.inverter[x].nightMode == false) {
                                log("inverter: " + config.name + " - activating night mode");
                                state.inverter[x].nightMode = true;
                                return true;
                            } else return false;
                        } else return false;

                    },
                    welder: function () {    // needs to be rewritten for  cfg.inverter.sensorAmps or esp direct
                        if (entity[cfg.inverter[0].espPower].state >= cfg.inverter[0].welderWatts ||  // check inverter meter
                            entity[cfg.grid.espPower].state >= cfg.inverter[0].welderWatts) {           // check grid meter
                            state.welderStep = time.epoch;                   // extend welter timeout if still heavy loads
                            if (state.welder == false) {
                                log("welder detected: " + entity[cfg.inverter[0].espPower].state + "w - shutting down all pumps", 2);
                                state.welder = true;
                                state.priority[0] = false;
                                send("input_boolean.auto_compressor", false);
                                send("input_boolean.auto_pump_transfer", false);
                                //    send("uth-relay1", false);
                                // turn on fan
                            }
                        } else {
                            if (state.welder == true && time.epoch - state.welderStep >= cfg.inverter[0].welderTimeout) {
                                log("welder not detected: " + entity[cfg.inverter[0].espPower].state + "w");
                                state.welder = false;
                            }
                        }
                    },
                    pointers: function (x) {
                        let voltsBat, inverterVolts, ampsBat, sun, inverterWatts, gridWatts, wattsSolar, battery, config = cfg.inverter[x];
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
                        if (config.gridWatt != undefined)
                            gridWatts = entity[config.gridWatt].state;
                        if (config.inverterVolts != undefined)
                            inverterVolts = ~~parseFloat(entity[config.inverterVolts].state);
                        if (config.inverterWatts != undefined)
                            inverterWatts = ~~parseFloat(entity[config.inverterWatts].state);
                        if (cfg.solar.sunlight != undefined)
                            sun = Math.round(entity[cfg.solar.sunlight].state * 100) / 100;
                        return { voltsBat, inverterVolts, ampsBat, sun, inverterWatts, gridWatts, wattsSolar, battery, config, inverter: state.inverter[x] };
                    },
                }
                let priority = {
                    auto: function () {
                        ({ st, cfg, nv } = _pointers(_name));
                        if (!state.priority.boot) {
                            log("priority queue - system is going ONLINE");
                            state.priority.boot = true;
                        }
                        for (let x = cfg.solar.priority.queue.length - 1; x > -1; x--) priority.on(x);
                        for (let x = 0; x < cfg.solar.priority.queue.length; x++) priority.off(x);
                    },
                    on: function (x) {
                        let { battery, volts, amps, sun } = priority.pointers();
                        let member = state.priority.queue[x]; member.cfg = cfg.solar.priority.queue[x];
                        /*
                        if (member.state == null) {
                            log("priority queue - " + member.cfg.name + " - member is unavailable - priority going offline", 3);
                            //  entity[cfg.solar.priority.entityAuto]?.state = false;
                            send(entity[cfg.solar.priority.entityAuto]?.state, false);
                            return;
                        }
                        */
                        if (member.state == true) {
                            //  console.log("checking x:" + x + " amps: " + amps);
                            if (member.cfg.enable == true) {
                                if (member.cfg.offVolts != undefined) {
                                    if (volts <= member.cfg.offVolts) {
                                        priority.trigger(x, "battery voltage is low (" + volts + "v) - stopping ", false);
                                        return;
                                    }
                                } else checkConditions();
                            }
                            function checkConditions() {
                                if (sun != undefined && member.cfg.offSun != undefined) {
                                    if (sun <= member.cfg.offSun) {
                                        priority.trigger(x, "sun is low (" + sun + "v) - stopping ", false);
                                        return;
                                    } else member.delayStep = false;
                                } else if (member.cfg.offAmps != undefined) {
                                    if (cfg.solar.priority.battery == undefined || member.cfg.offAmpsFloat == undefined
                                        || nv.battery[cfg.solar.priority.battery].floating == false) {
                                        if (amps <= member.cfg.offAmps) {
                                            priority.trigger(x, "charge amps is too low (" + amps + "a) - stopping ", false);
                                            return;
                                        } else member.delayStep = false;
                                    } else if (amps <= member.cfg.offAmpsFloat) {
                                        priority.trigger(x, "(floating) discharge amps is high (" + amps + "a) - stopping ", false);
                                        return;
                                    } else member.delayStep = false;
                                } else member.delayStep = false;
                            }
                        }
                    },
                    off: function (x) {
                        let { battery, volts, amps, sun } = priority.pointers();
                        let member = state.priority.queue[x]; member.cfg = cfg.solar.priority.queue[x];
                        if (member.cfg.entityAuto == undefined
                            || member.cfg.entityAuto != undefined && entity[member.cfg.entityAuto].state == true) {
                            if (member.state == false) {
                                if (member.cfg.enable == true) {
                                    if (member.cfg.inverter == undefined) {
                                        if (cfg.inverter[0]?.enable == true) {
                                            if (state.inverter[0].state == true) checkVolts();
                                        } else checkVolts();
                                    } else if (state.inverter[member.cfg.inverter].state == true) checkVolts();
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
                                    && nv.battery[cfg.solar.priority.battery].floating == true) {
                                    if (sun >= member.cfg.onSun) {
                                        // console.log("checking sun: " + sun + " floating:" + nv.battery[config.battery].floating)
                                        if (member.delayStepSun == false) {
                                            member.delayTimerSun = time.epoch;
                                            member.delayStepSun = true;
                                            return;
                                        } else if (time.epoch - member.delayTimerSun >= cfg.solar.priority.delaySwitchOn) {
                                            log("priority queue - " + member.cfg.name + " - sun is high (" + sun + "v) - starting ");
                                            priority.send(x, true);
                                            return;
                                        }
                                    } else member.delayStepSun = false;
                                }
                            }
                            if (member.cfg.onAmps != undefined) {
                                if (amps >= member.cfg.onAmps) {
                                    priority.trigger(x, "charge amps is high (" + amps + "a) volts: " + volts + " on-volts: "
                                        + member.cfg.onVolts + " - starting ", true);
                                    return;
                                } else if (amps < member.cfg.onAmps) member.delayStep = false;
                            } else if (member.cfg.onVolts != undefined) {
                                priority.trigger(x, "battery volts is enough (" + volts + "v) - starting ", true);
                                return;
                            }
                        }
                    },
                    trigger: function (x, message, newState, isSun) {
                        let member = state.priority.queue[x]; member.cfg = cfg.solar.priority.queue[x];
                        if (cfg.inverter.length > 0) {
                            if (checkInverter()) proceed();
                        } else proceed();
                        function checkInverter() {
                            for (let y = 0; y < cfg.inverter.length; y++) {
                                if (cfg.inverter[y].enable) {
                                    if (newState == false) {
                                        if (member.inverter != undefined) {
                                            if (member.inverter === y) state.inverter[y].delayStep = false;
                                        } else state.inverter[y].delayStep = false;
                                    }
                                    if (entity[cfg.inverter[y].entity]?.state == false) return false;
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
                                ? ((member.cfg.delayOn != null) ? member.cfg.delayOn : cfg.solar.priority.delaySwitchOn)
                                : ((member.cfg.delayOff != null) ? member.cfg.delayOff : cfg.solar.priority.delaySwitchOff))) {
                                log("priority queue - " + member.cfg.name + " - " + message);
                                priority.send(x, newState);
                                return;
                            }
                        }
                    },
                    send: function (x, newState) {
                        let member = state.priority.queue[x]; member.cfg = cfg.solar.priority.queue[x];
                        for (let y = 0; y < member.cfg.entities.length; y++) {
                            state.priority.skipLog = true;
                            send(member.cfg.entities[y], newState);
                        }
                        cfg.inverter.forEach((_, y) => { state.inverter[y].delayStep = false });
                        cfg.solar.priority.queue.forEach((_, y) => { state.priority.queue[y].delayStep = false; member.delayStepSun = false; });
                        member.state = newState;
                        state.priority.step = time.epoch;
                    },
                    pointers: function () {
                        let battery = cfg.battery[cfg.battery.findIndex(battery => battery.name === cfg.solar.priority.battery)];
                        let volts = Math.round(entity[battery.sensorVolt].state * 10) / 10;
                        let sun = Math.round(entity[cfg.solar.sunlight]?.state * 100) / 100;
                        let amps;
                        if (cfg.solar.priority.battery != undefined) {
                            if (Array.isArray(battery.sensorAmp)) {
                                let temp = 0;
                                for (let y = 0; y < battery.sensorAmp.length; y++) {
                                    temp += Math.round(entity[battery.sensorAmp[y]].state * 10) / 10;
                                    amps = temp;
                                }
                            } else amps = Math.round(entity[battery.sensorAmp].state * 10) / 10;
                        }
                        return { battery, volts, sun, amps }
                    },
                }
                let check = {
                    temp: function () {
                        let config = cfg.fan, fan = state.fan, wattsBat,
                            wattsInv = Math.round(state.sensor.watt[config.sensor.watt.inverter]), temp = 0,
                            tempUnit = cfg.sensor.temp[config.sensor.temp].unit;
                        if (Math.sign(state.sensor.watt[config.sensor.watt.battery]) == -1)
                            wattsBat = (Math.round(state.sensor.watt[config.sensor.watt.battery]) * -1);
                        else wattsBat = Math.round(state.sensor.watt[config.sensor.watt.battery]);
                        if (cfg.sensor.temp[config.sensor.temp].CtoF) {
                            temp = (Math.round((9 / 5 * state.sensor.temp[config.sensor.temp] + 32) * 10) / 10)
                        }
                        else temp = Math.round(state.sensor.temp[config.sensor.temp] * 10) / 10
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
                                    if (config.watts.night != undefined && state.inverter[0].nightMode == true) {
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
                                    if (config.watts.night != undefined && state.inverter[0].nightMode == true) {
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
                    },
                    grid: function () {
                        // global function to give h m s?
                        // log grid blackout statistics
                        // log sunlight daily name
                        // grid statistics , save to nv
                        if (cfg.grid.espVoltage) {
                            let volts = ~~parseFloat(entity[cfg.grid.espVoltage].state), config = cfg.grid, grid = state.grid;
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
                        for (let x = 0; x < cfg.battery.length; x++) {
                            let config = cfg.battery[x], bat = state.battery[x], name = cfg.battery[x].name,
                                amps = entity[config.sensorAmp]?.state;
                            if (nv.battery[name] == undefined) {
                                log("initializing NV memory for - Battery: " + name);
                                nv.battery[name] = {
                                    cycles: 0, floating: null, dischargeReset: false,
                                    charge: { total: 0, today: 0 }, discharge: { total: 0, today: 0 }
                                };
                            }
                            if (entity[config.sensorVolt]) {
                                volts = Math.round(entity[config.sensorVolt].state * 100) / 100;
                                if (nv.battery[name].floating == null) {
                                    if (volts <= config.voltsFullCharge && volts > config.voltsFloatStop) {
                                        log("battery - " + config.name + " - init - charger is floating: " + volts + "v");
                                        //  nv.battery[name].dischargeReset = true;
                                        nv.battery[name].charge.today = 0;
                                        nv.battery[name].cycles++;
                                        nv.battery[name].floating = true;
                                    }
                                    else nv.battery[name].floating = false
                                }
                                if (nv.battery[name].floating == false && volts >= config.voltsFullCharge) {
                                    log("battery - " + config.name + " - charger is floating: " + volts + "v");
                                    nv.battery[name].cycles++;
                                    nv.battery[name].floating = true;
                                }
                                if (nv.battery[name].floating == true) {       // consider blocking this until nighttime or some other criteria 
                                    if (volts <= config.voltsFloatStop) {
                                        if (bat.floatStep == false) {
                                            bat.floatTimer = time.epoch;
                                            bat.floatStep = true;
                                        } else if (time.epoch - bat.floatTimer >= 30) {
                                            log("battery - " + config.name + " - charger no longer floating: " + volts + "v");
                                            nv.battery[name].floating = false;
                                        }
                                    } else bat.floatStep = false;
                                }
                                bat.percent = Math.round(voltPercent(volts, config));
                                // console.log("bat percent: " + bat.percent)
                                send("battery_" + config.name, bat.percent, "%");

                                if (config.sensorAmp) {
                                    if (amps >= config.ampsResetDischarge) {
                                        if (nv.battery[name].dischargeReset == true) {
                                            log("battery - " + config.name + " - resetting discharge meter - amps: " + amps);
                                            nv.battery[name].dischargeReset = false;
                                            nv.battery[name].discharge.today = 0;
                                        }
                                    }
                                }

                                if (config.sensorWatt) {
                                    let watts = entity[config.sensorWatt].state;

                                    if (Number.isFinite(watts)) {
                                        if (Math.sign(watts) == -1) bat.whNeg += watts;
                                        else bat.whPos += watts;
                                    }
                                    if (bat.min == null) {
                                        log("battery - " + config.name + " - starting recorder");
                                        bat.min = time.min;
                                    }
                                    if (time.min != bat.min) {
                                        let charge = (bat.whPos / 60 / 60), discharge = (bat.whNeg / 60 / 60) * -1;
                                        if (time.hour == 3 && time.min == 0) {
                                            log("battery - " + config.name + " - resetting discharge meter");
                                            nv.battery[name].dischargeReset = true;
                                            nv.battery[name].charge.today = 0;
                                        }
                                        if (!config.sensorAmp && time.hour == 10 && time.min == 0) {
                                            if (nv.battery[name].dischargeReset == true) {
                                                log("battery - " + config.name + " - resetting discharge meter");
                                                nv.battery[name].dischargeReset = false;
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
                                        for (let y = 0; y < nv.battery[name].charge.month.length; y++)
                                            ceff += nv.battery[name].charge.month[y] ?? 0;
                                        for (let y = 0; y < nv.battery[name].discharge.month.length; y++)
                                            deff += nv.battery[name].discharge.month[y] ?? 0;
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
                    },
                }
                if (_push === "init") {
                    global.state[_name] = {               // initialize automation volatile memory
                        priority: { step: time.epoch, queue: [], skipLog: false },
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
                    ({ state, cfg, nv, push } = _pointers(_name));
                    cfg.inverter.forEach(_ => {
                        state.inverter.push({
                            state: null, boot: false, step: time.epoch - 20, nightMode: true, delayOffTimer: undefined, switchWatts: 0,
                            switchSun: 0, switchWattsTimer: time.epoch, delayTimer: time.epoch, delayStep: false, delayVoltsTimer: time.epoch,
                            delayVoltsStep: false, delaySunTimer: time.epoch, delaySunStep: false, delayFaultStep: false,
                            delayFaultTimer: time.epoch, timeShutdown: null,
                            warn: { manualPowerOn: false, }
                        });
                    });
                    cfg.solar.priority.queue.forEach(_ => {
                        state.priority.queue.push({
                            state: null, delayStep: false, delayStepSun: false, delayTimer: time.epoch, delayTimerSun: time.epoch,
                            boot: false,
                        })
                    });
                    cfg.battery.forEach(_ => {
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
                    setTimeout(() => {
                        state.timer.second = setInterval(() => {
                            calcSensor(); check.battery(); check.grid();
                            if (cfg.solar.inverterAuto != undefined && entity[cfg.solar.inverterAuto]?.state == true) {
                                solar.auto();
                                // if  (state.welder.detect == false) 
                            }
                            if (cfg.fan != undefined && cfg.fan.sensor.temp != undefined) check.temp();
                        }, 1e3);      // set minimum rerun time, otherwise this automation function will only be called on ESP and HA events
                        setTimeout(() => {
                            state.timer.priority = setInterval(() => {
                                if (entity[cfg.solar.priority.entityAuto]?.state == true) priority.auto();
                            }, 1e3);
                        }, 3e3);
                    }, 3e3);
                    state.timer.minute = setInterval(() => { timer(); }, 60e3);
                    state.timer.write = setInterval(() => { write(); }, 30e3);
                    if (cfg.solar.inverterAuto != undefined
                        && entity[cfg.solar.inverterAuto]?.state == true) log("inverter automation is on");
                    else log("inverter automation is off");
                    write();
                    return;
                } else {
                   // console.log(_push)
                    for (let x = 0; x < cfg.sensor.amp.length; x++) {
                        const config = cfg.sensor.amp[x];
                        if (config.entity && config.entity[0] === _push.name) {
                            let amps = entity[config.name] ||= {};
                            let data = _push.state;
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
                            let data = _push.state;
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
                            let data = _push.state;
                            let newData;
                            if (config.multiplier != undefined) newData = parseFloat(data) * config.multiplier;
                            else newData = parseFloat(data);
                            if (Number.isFinite(watts.state)) {
                                watts.state = newData;
                                send("watt_" + config.name, ~~watts.state, "W");
                            } else watts.state = 0.0;
                            watts.update = time.epoch;
                            return;
                        }
                    }
                    for (let x = 0; x < cfg.sensor.kwh.length; x++) {
                        const config = cfg.sensor.kwh[x];
                        if (!Array.isArray(config.entity) && config.entity === _push.name) {
                            if (!nv.sensor.kwh[config.name]) {
                                log("initializing NV memory for - kWh sensor: " + config.name);
                                nv.sensor.kwh[config.name] = { total: 0, min: [], hour: [], day: [], month: [], };
                            }
                            let kwh = nv.sensor.kwh[config.name];
                            let data = _push.state;
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
                            let data = _push.state;
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
                    if (cfg.solar?.inverterAuto == _push.name) {
                        let newState = _push.state;
                        if (newState == true) log("inverter auto going online");
                        else log("inverter auto going offline");
                        for (let x = 0; x < cfg.inverter.length; x++) {
                            if (entity[cfg.inverter[x].entity].state) {
                                log("inverter: " + cfg.inverter[x].name + " - inverter ON - syncing ATS with inverter state");
                                syncInverter(x, true);
                            } else {
                                log("inverter: " + cfg.inverter[x].name + " - inverter OFF - syncing ATS with inverter state");
                                syncInverter(x, false);
                                if (newState == true) state.inverter[x].step = time.epoch - cfg.solar.cycleError - 5;
                            }
                        }
                        return;
                    }
                    for (let x = 0; x < cfg.inverter.length; x++) {
                        if (cfg.inverter[x].entity == _push.name) {
                            let newState = _push.state;
                            if (cfg.inverter[x].enable) {
                                if (state.inverter[x].state != "faulted" && state.inverter[x].state != newState) {
                                    log("inverter: " + cfg.inverter[x].name + " - operational state entity switching to - syncing power/switches: " + newState);
                                    syncInverter(x, newState);
                                }
                            }
                            return;
                        }
                    }
                    if (cfg.solar?.priority?.entityAuto == _push.name) {
                        let newState = _push.state;
                        if (newState == true) log("priority queue - auto going ONLINE");
                        else log("priority queue - auto going offline");
                        state.priority.step = time.epoch;
                        return;
                    }
                    for (let x = 0; x < cfg.solar.priority.queue.length; x++) {
                        let queue = cfg.solar.priority.queue[x];
                        if (queue.entityAuto != undefined && queue.entityAuto == _push.name) {
                            let newState = _push.state;
                            if (newState == true) log("priority queue member" + queue.name + " going online");
                            else log("priority queue member " + queue.name + " going offline");
                            return;
                        }
                        for (let y = 0; y < queue.entities.length; y++) {
                            const element = queue.entities[y];
                            if (element == _push.name) {
                                let newState = _push.state;
                                if (!state.priority.skipLog)
                                    log("syncing priority queue: " + queue.name + "  with entity: " + element + " - new state: " + newState);
                                state.priority.queue[x].state = newState;
                                state.priority.step = time.epoch;
                                state.priority.skipLog = false;
                                return;
                            }
                        }
                    }
                    function syncInverter(x, newState) {
                        state.inverter[x].state = newState;
                        solar.nightMode(x);
                        solar.power(x, newState);
                        state.inverter[x].warn.manualPowerOn = false;
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
                        state.recorder.watt[config.name] ||= { min: null, wh: 0 };
                        entity[config.name] ||= {};
                        let watts = entity[config.name];
                        let whFinal = 0;
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
                        } else if (config.sensorAmp != undefined && config.sensorVolt != undefined) { // for volt/amp calc
                            let amps = entity[config.sensorAmp].state, volts = entity[config.sensorVolt]?.state;
                            if (Number.isFinite(volts * amps)) watts.state = volts * amps;
                            else (watts.state = 0.0);
                            send("watt_" + config.name, (watts.state / 1000).toFixed(2), "kW");
                        }

                        if (Number.isFinite(watts.state) && Math.sign(watts.state) != -1)
                            state.recorder.watt[config.name].wh += watts.state;
                        if (state.recorder.watt[config.name].min == null) {
                            if (config.record) log("starting recorder for watt sensor - " + config.name);
                            state.recorder.watt[config.name].min = time.min;
                        } else if (time.min != state.recorder.watt[config.name].min) {
                            whFinal = ((state.recorder.watt[config.name].wh / 60) / 60);
                            nv.sensor.watt[config.name].total += whFinal;
                            if (config.record !== false) {
                                if (!nv.sensor.watt[config.name]) {
                                    log("initializing NV memory for - watt sensor: " + config.name);
                                    nv.sensor.watt[config.name] = { total: 0, today: 0, min: [], hour: [], day: [], month: [] };
                                }
                                recorder(nv.sensor.watt[config.name], whFinal, config.name);
                            }


                            if (state.recorder.watt[config.name].todayReset) {
                                log("resetting daily watt meter for: " + config.name);
                                nv.sensor.watt[config.name].today = 0;
                                state.recorder.watt[config.name].todayReset = false;
                            }
                            nv.sensor.watt[config.name].today += whFinal;
                            send("kwh_" + config.name + "_today", (nv.sensor.watt[config.name].today / 1000).toFixed(2), "kWh");
                            // console.log("watts today:" + nv.sensor.watt[config.name].today)

                            state.recorder.watt[config.name].wh = 0;
                            state.recorder.watt[config.name].min = time.min;
                        }

                        watts.update = time.epoch;
                    }
                }
                function calcSolarPower() {
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
                        log("resetting daily watt meters")
                        cfg.sensor.watt.forEach(config => { state.recorder.watt[config.name].todayReset = true; })
                    }
                }
            } catch (error) { console.trace(error) }
        }
    }
};
let _pointers = (_name) => {
    push[_name] ||= {}
    return {
        state: state[_name] ?? undefined,
        cfg: config[_name] ?? undefined,
        nv: nv[_name] ?? undefined,
        push: push[_name] ?? undefined,
        log: (m, l) => slog(m, l, _name),
        write: () => writeNV(_name),
        send: (name, state, unit, address) => { core("state", { name, state, unit, address }, _name) },
    }
}
