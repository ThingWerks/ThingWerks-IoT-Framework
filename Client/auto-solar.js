#!/usr/bin/node
module.exports = {
    automation: {
        Solar: function (_name, _push, _reload) {
            try {
                let { st, cfg, nv, log, writeNV } = _pointers(_name);
                if (_reload) {
                    if (_reload == "config") ({ st, cfg, nv } = _pointers(_name));
                    else {
                        log("hot reload initiated");
                        st.inverter.forEach(inverter => {
                            clearTimeout(inverter.switchWattsTimer);
                        });
                        clearInterval(st.timer.minute);
                        clearInterval(st.timer.second);
                        clearInterval(st.timer.priority);
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
                    on: function (x) {
                        let { voltsBat, inverterVolts, ampsBat, sun, inverterWatts, configs, inverter } = solar.pointers(x);
                        if (cfg.inverter[x].enable == true && inverter.state != "faulted" && inverter.state == true) {
                            if (solar.nightMode(x) == true) {
                                if (voltsBat < configs.nightMode.startVoltageMin) {
                                    log("inverter: " + configs.name + " - Battery is too low to make it through the night: "
                                        + voltsBat + ", switching off");
                                    solar.power(x, false);
                                    return;
                                }
                            } else if (st.grid.state !== false) {
                                if (inverter.nightMode != true) {
                                    if (configs.sunStop != undefined) {
                                        if (sun <= configs.sunStop) {
                                            trigger(false, "Sun is low: " + sun + "  voltsBat: " + voltsBat + ", switching to grid ");
                                        } else inverter.delayStep = false;
                                    } else if (configs.ampsStop != undefined) {
                                        if (nv.battery[configs.battery].floating == false || configs.ampsStopFloat == undefined) {
                                            if (ampsBat <= configs.ampsStop) {
                                                // console.log("amps below: " + ampsBat + " - floating: " + nv.battery[configs.battery].floating + " - stop float: " + inverter.ampsStopFloat)
                                                if (configs.ampsStopVoltsMin != undefined) {
                                                    if (voltsBat < configs.ampsStopVoltsMin) ampStop();
                                                } else ampStop();
                                            } else inverter.delayStep = false;
                                        } else {
                                            if (ampsBat <= configs.ampsStopFloat) {
                                                if (configs.ampsStopVoltsMin != undefined) {
                                                    if (voltsBat < configs.ampsStopVoltsMin) ampStop();
                                                } else ampStop();
                                            }
                                            else inverter.delayStep = false;
                                        }
                                    }
                                    function ampStop() {
                                        trigger(false, "solar power too low: " + ampsBat + "a  voltsBat: " + voltsBat
                                            + "v  Floating: " + nv.battery[configs.battery].floating + " Sun: "
                                            + sun + "v  Watts: " + inverterWatts + ", switching to grid ");
                                        inverter.switchWatts = inverterWatts;
                                        inverter.switchSun = sun;
                                    }
                                }
                            }
                            if (voltsBat <= configs.voltsStop) {
                                if (inverter.delayVoltsStep == false && !checkPriority()) {
                                    inverter.delayVoltsTimer = time.epoch;
                                    inverter.delayVoltsStep = true;
                                } else if (time.epoch - inverter.delayVoltsTimer >= 60) {
                                    log("inverter: " + configs.name + " - Battery is low: " + voltsBat + ", is switching to grid ");
                                    solar.power(x, false);
                                }
                            } else inverter.delayVoltsStep = false;
                            if (inverter.nightMode == true && time.hour >= configs.nightMode.endHour
                                && time.hour < configs.nightMode.startHour) {
                                if (configs.nightMode.endAmps != undefined) {
                                    if (ampsBat >= configs.nightMode.endAmps) {
                                        log("inverter: " + configs.name + " - Battery is charging, current is high: " + ampsBat
                                            + "a  " + voltsBat + "v, exiting night mode");
                                        inverter.nightMode = false;
                                    }
                                } else solar.changing(x, false); // inverter only exits night mode only when there is sufficient charging
                            }
                            if (inverterVolts < 20) {
                                log("inverter: " + configs.name + " - FAULT - no output - Inverter is going offline", 3);
                                solar.power(x, false, true);
                            }
                            else inverter.delayFaultStep = false;
                        }
                        function checkPriority() {
                            if (configs.priorityWait && entity[cfg.solar.priority.entityAuto]?.state == true) {
                                for (let y = 0; y < cfg.solar.priority.queue.length; y++)
                                    if (st.priority.queue[y].state) return true;
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
                                    } else if (time.epoch - inverter.delayTimer >= configs.delaySwitchOff) toggle();
                                }
                                function toggle() {
                                    log("inverter: " + configs.name + " - " + message, level);
                                    solar.power(x, newState, (level == 3 ? true : undefined));
                                    return;
                                }
                            }
                            if (configs.inverterWattsSwitch) {
                                clearTimeout(inverter.switchWattsTimer);
                                inverter.switchWattsTimer = setTimeout(() => {
                                    if (inverter.switchWatts != null) {
                                        log("inverter: " + configs.name + " SwitchWatts timeout (10min) - clearing lasSwitch Watts reading");
                                        clearTimeout(inverter.switchWattsTimer);
                                        inverter.switchWatts = null;
                                    }
                                }, 500e3);
                            }
                        }

                    },
                    off: function (x) {
                        if (cfg.inverter[x].enable == true) {
                            let { voltsBat, inverterVolts, battery, configs, inverter } = solar.pointers(x);
                            if (battery.sensorVolt != undefined) {
                                if (inverter.state != "faulted" && inverter.state === false) {
                                    solar.changing(x, true);
                                    if (solar.nightMode(x) == true) {
                                        if (voltsBat >= configs.nightMode.startVoltageMin) {
                                            log("Battery is enough to make it through the night: " + voltsBat + ", " + configs.name + " switching on");
                                            solar.power(x, true);
                                        } else log("Battery is too low to make it through the night: " + voltsBat + ", " + configs.name + " staying off");
                                    }
                                    if (configs.blackout == true && st.grid.state == false && voltsBat >= configs.blackoutVoltMin) {
                                        log("Blackout detected, volts is enough to run: " + voltsBat + ", " + configs.name + " switching on", 2);
                                        solar.power(x, true);
                                    }
                                    if (configs.power.entity != undefined && entity[configs.power.entity].state == false && inverter.delayOffTimer == null
                                        && time.epoch - inverter.timeShutdown > 10 && inverter.warn.manualPowerOn == false && inverterVolts > 20.0) {
                                        log("inverter: " + configs.name + " is still on but should be off - manual power on??", 2);
                                        inverter.warn.manualPowerOn = true;
                                    }
                                }
                            }
                        }

                    },
                    init: function (x) {
                        if (cfg.inverter[x].enable == true) {
                            let { voltsBat, configs, inverter, inverterVolts } = solar.pointers(x) || undefined;
                            if (inverter.state == null || inverter.boot == false) {
                                if (cfg.inverter[x].entity != undefined) {
                                    log("inverter: " + cfg.inverter[x].name + " - syncing operation entity - state: " + entity[cfg.inverter[x].entity]?.state);
                                    if (entity[configs.transfer.switchOn[0].entity] != null) {
                                        if (entity[cfg.inverter[x].entity].state == true) {
                                            if (entity[configs.transfer.switchOn[0].entity].state != configs.transfer.switchOn[0].state) {
                                                log("inverter: " + cfg.inverter[x].name + " - primary ATS state OFF (" + entity[configs.transfer.switchOn[0].entity]?.state
                                                    + ") is not expected - HA says its ON", 2);
                                                solar.power(x, true);
                                                // inverter.state = true;
                                            } else inverter.state = true;
                                        } else {
                                            if (entity[configs.transfer.switchOff[0].entity].state != configs.transfer.switchOff[0].state) {
                                                log("inverter: " + cfg.inverter[x].name + " - primary ATS state ON (" + entity[configs.transfer.switchOff[0].entity]?.state
                                                    + ") is not expected - HA says its OFF", 2);
                                                inverter.state = false;
                                            } else inverter.state = false;
                                        }
                                    } else {
                                        log("inverter: " + configs.name + " - operational entity is offline or unavailable - inverter auto is going offline", 3);
                                        solar.power(x, false, true);
                                        send(cfg.solar.inverterAuto, false);
                                    }
                                } else {
                                    log("inverter: " + configs.name + " - configs error, you must configs inverter operation entity - Inverter auto is going offline", 3);
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
                                    if (configs.power.startAuto == true) {
                                        if (voltsBat > configs.voltsStop) {
                                            log("inverter: " + configs.name + " - first start, volts (" + voltsBat + ") is greater than stop volts (" + configs.voltsStop + "), good to run");
                                            solar.power(x, true);
                                        }
                                    } else if (nv.battery[configs.battery].floating == true) {
                                        log("inverter: " + configs.name + " - first start, battery is floating, good to run");
                                        solar.power(x, true);
                                    }
                                }
                                inverter.boot = true;
                            } else {
                                if (entity[configs.transfer.switchOn[0].entity] == null) {
                                    log("inverter: " + configs.name + " - operational entity is offline or unavailable - inverter auto is going offline", 3);
                                    solar.power(x, false, true);
                                    send(cfg.solar.inverterAuto, false);
                                }
                                if (inverter.state == "faulted") {
                                    if (inverterVolts <= configs.voltsFloatStop) {
                                        log("inverter: " + configs.name + " - inverter was faulted but now resetting because charger is no longer floating", 2);
                                        inverter.state = false;
                                    }
                                    if (cfg.solar.watts.inverterPower != undefined
                                        && entity[cfg.solar.watts.inverterPower].state >= configs.welderWatts) {
                                        log("inverter: " + configs.name + " - inverter was faulted but now resetting because welding is detected", 2);
                                        inverter.state = false;
                                    }
                                }
                            }
                        }
                    },
                    power: function (x, run, faulted) {
                        let configs = cfg.inverter[x];
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
                            else st.inverter[x].state = "faulted";
                            st.inverter[x].step = time.epoch;
                        }
                        st.inverter[x].delayStep = false;
                        st.inverter[x].delayVoltsStep = false;
                        st.inverter[x].delayFaultStep = false;
                        st.inverter[x].delaySunStep = false;
                        cfg.inverter.forEach((_, y) => { st.inverter[y].delayStep = false });
                        cfg.solar.priority.queue.forEach((_, y) => { st.priority.queue[y].delayStep = false });
                    },
                    changing: function (x, power) {
                        let { voltsBat, ampsBat, gridWatts, wattsSolar, sun, configs, inverter } = solar.pointers(x);
                        if (configs.voltsRun != undefined) {
                            if (voltsBat >= configs.voltsRun) checkConditions();
                            else inverter.delayStep = false;
                        } else checkConditions();
                        function checkConditions() {
                            if (sun >= configs.sunRun) {     // sunlight detection 
                                trigger(power, "battery is charging, sun is high: " + sun + ", switching on", true);
                            } else if (sun < configs.sunRun) inverter.delayStepSun = false;
                            if (sun >= configs.sunRunFloat && nv.battery[configs.battery].floating == true) {     // sunlight detection 
                                trigger(power, "battery is floating, sun is high: " + sun + ", switching on", true);
                            } else if (sun < configs.sunRunFloat) inverter.delayStepSun = false;
                            if (configs.gridWatt != undefined) {
                                // console.log("checking watts for: " + x + "  gridWatts: " + gridWatts, " wattsSolar: " + wattsSolar)
                                if (wattsSolar > (gridWatts * configs.gridWattMultiplier)) {
                                    trigger(power, "charge current is higher than grid power: " + wattsSolar + "w  " + voltsBat + "v, switching on");
                                }
                                if (wattsSolar <= (gridWatts + (gridWatts * configs.gridWattMultiplier))) { inverter.delayStep = false; }
                            } else if (configs.inverterWattsSwitch && inverter.switchWatts) {
                                if (wattsSolar > inverter.switchWatts) {
                                    trigger(power, "charge watts (" + wattsSolar + "w) is higher than last switch watts: "
                                        + inverter.switchWatts + "w  " + voltsBat + "v, switching on");
                                } else inverter.delayStep = false;
                            } else if (configs.ampsRun != undefined) {
                                //  console.log("checking amps for: " + x + "  ampsBat: " + ampsBat, " voltsBat: " + voltsBat)
                                if (ampsBat >= configs.ampsRun) {   // current detection 
                                    trigger(power, "battery is charging, current is high: " + ampsBat + "a  " + voltsBat + "v, switching on");
                                } else if (ampsBat < configs.ampsRun) inverter.delayStep = false;
                            }
                            if (configs.sunRun == undefined && configs.ampsRun == undefined && configs.gridWatt == undefined)
                                trigger(power, "battery is charging (volts trigger): " + voltsBat + ", switching on");
                        }
                        function trigger(power, message, sunRun) {
                            if (sunRun) {
                                if (inverter.delayStepSun == false) {
                                    inverter.delayTimerSun = time.epoch;
                                    inverter.delayStepSun = true;
                                    return;
                                } else if (time.epoch - inverter.delayTimerSun >= configs.delaySwitchOn) action();
                            } else {
                                if (inverter.delayStep == false) {
                                    inverter.delayTimer = time.epoch;
                                    inverter.delayStep = true;
                                    return;
                                } else if (time.epoch - inverter.delayTimer >= configs.delaySwitchOn) action();
                            }
                            function action() {
                                if (inverter.nightMode == true) {
                                    log("inverter: " + configs.name + " - exiting night mode");
                                    inverter.nightMode = false;
                                }
                                log("inverter: " + configs.name + " - " + message);
                                if (power == true) solar.power(x, true);
                                clearTimeout(inverter.switchWattsTimer);
                                inverter.switchWatts = null;
                                cfg.solar.priority.queue.forEach((_, y) => {
                                    st.priority.queue[y].delayStep = false;
                                    st.priority.queue[y].delayStepSun = false;
                                });
                            }
                        }
                    },
                    nightMode: function (x) {
                        let nightMode = null, configs = cfg.inverter[x];
                        if (configs.nightMode != undefined && configs.nightMode.enable == true) {                     // undefined configs returns false
                            if (time.hour == configs.nightMode.startHour) {   // if nightMode match
                                if (configs.nightMode.startMin != undefined) {
                                    if (time.min >= configs.nightMode.startMin) { nightMode = true; }
                                } else { nightMode = true; }
                            } else if (time.hour > configs.nightMode.startHour
                                || time.hour < configs.nightMode.endHour) { nightMode = true; }
                            else nightMode = false;
                        } else nightMode = false;
                        if (nightMode == true) {
                            if (st.inverter[x].nightMode == false) {
                                log("inverter: " + configs.name + " - activating night mode");
                                st.inverter[x].nightMode = true;
                                return true;
                            } else return false;
                        } else return false;

                    },
                    welder: function () {    // needs to be rewritten for  cfg.inverter.sensorAmps or esp direct
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
                    },
                    pointers: function (x) {
                        let voltsBat, inverterVolts, ampsBat, sun, inverterWatts, gridWatts, wattsSolar, battery, configs = cfg.inverter[x];
                        if (configs.battery != undefined) {
                            battery = cfg.battery[cfg.battery.findIndex(battery => battery.name === configs.battery)];
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
                        if (configs.gridWatt != undefined)
                            gridWatts = entity[configs.gridWatt].state;
                        if (configs.inverterVolts != undefined)
                            inverterVolts = ~~parseFloat(entity[configs.inverterVolts].state);
                        if (configs.inverterWatts != undefined)
                            inverterWatts = ~~parseFloat(entity[configs.inverterWatts].state);
                        if (cfg.solar.sunlight != undefined)
                            sun = Math.round(entity[cfg.solar.sunlight].state * 100) / 100;
                        return { voltsBat, inverterVolts, ampsBat, sun, inverterWatts, gridWatts, wattsSolar, battery, configs, inverter: st.inverter[x] };
                    },
                }
                let priority = {
                    auto: function () {
                        ({ st, cfg, nv } = _pointers(_name));
                        if (!st.priority.boot) {
                            log("priority queue - system is going ONLINE");
                            st.priority.boot = true;
                        }
                        for (let x = cfg.solar.priority.queue.length - 1; x > -1; x--) priority.on(x);
                        for (let x = 0; x < cfg.solar.priority.queue.length; x++) priority.off(x);
                    },
                    on: function (x) {
                        let { battery, volts, amps, sun } = priority.pointers();
                        let member = st.priority.queue[x]; member.cfg = cfg.solar.priority.queue[x];
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
                        let member = st.priority.queue[x]; member.cfg = cfg.solar.priority.queue[x];
                        if (member.cfg.entityAuto == undefined
                            || member.cfg.entityAuto != undefined && entity[member.cfg.entityAuto].state == true) {
                            if (member.state == false) {
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
                                    && nv.battery[cfg.solar.priority.battery].floating == true) {
                                    if (sun >= member.cfg.onSun) {
                                        // console.log("checking sun: " + sun + " floating:" + nv.battery[configs.battery].floating)
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
                        let member = st.priority.queue[x]; member.cfg = cfg.solar.priority.queue[x];
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
                        let member = st.priority.queue[x]; member.cfg = cfg.solar.priority.queue[x];
                        for (let y = 0; y < member.cfg.entities.length; y++) {
                            st.priority.skipLog = true;
                            send(member.cfg.entities[y], newState);
                        }
                        cfg.inverter.forEach((_, y) => { st.inverter[y].delayStep = false });
                        cfg.solar.priority.queue.forEach((_, y) => { st.priority.queue[y].delayStep = false; member.delayStepSun = false; });
                        member.state = newState;
                        st.priority.step = time.epoch;
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
                        let configs = cfg.fan, fan = st.fan, wattsBat,
                            wattsInv = Math.round(st.sensor.watt[configs.sensor.watt.inverter]), temp = 0,
                            tempUnit = cfg.sensor.temp[configs.sensor.temp].unit;
                        if (Math.sign(st.sensor.watt[configs.sensor.watt.battery]) == -1)
                            wattsBat = (Math.round(st.sensor.watt[configs.sensor.watt.battery]) * -1);
                        else wattsBat = Math.round(st.sensor.watt[configs.sensor.watt.battery]);
                        if (cfg.sensor.temp[configs.sensor.temp].CtoF) {
                            temp = (Math.round((9 / 5 * st.sensor.temp[configs.sensor.temp] + 32) * 10) / 10)
                        }
                        else temp = Math.round(st.sensor.temp[configs.sensor.temp] * 10) / 10
                        switch (fan.run) {
                            case false:
                                if (temp >= configs.temp.on) {
                                    log("room temp is rising, fan turning on: " + temp + tempUnit);
                                    fanSwitchNow();
                                    fan.warn = true;
                                    return;
                                }
                                if (configs.sun != undefined) {
                                    if (entity[cfg.solar.espSunlight].state >= configs.sun.on) {
                                        if (fanSwitch(true)) {
                                            log("sun is high: " + entity[cfg.solar.espSunlight].state + ", fan turning on: " + temp + tempUnit);
                                            return;
                                        }
                                    } else fan.delayStep = false;
                                } else if (configs.watts != undefined) {
                                    if (configs.watts.night != undefined && st.inverter[0].nightMode == true) {
                                        if (wattsBat >= configs.watts.night.on) {
                                            if (fanSwitch(true)) {
                                                log("(nightmode) battery power is rising: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                                return;
                                            }
                                        }
                                        if (wattsInv >= configs.watts.night.on) {
                                            if (fanSwitch(true)) {
                                                log("(nightmode) inverter power is rising: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                                return;
                                            }
                                        }
                                        if (wattsBat < configs.watts.night.on && wattsInv < configs.watts.night.on) fan.delayStep = false;
                                    } else {
                                        if (wattsBat >= configs.watts.on) {
                                            if (fanSwitch(true)) {
                                                log("battery power is rising: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                                return;
                                            }
                                        }
                                        if (wattsInv >= configs.watts.on) {
                                            if (fanSwitch(true)) {
                                                log("inverter power is rising: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning on ");
                                                return;
                                            }
                                        }
                                        if (wattsBat < configs.watts.on && wattsInv < configs.watts.on) fan.delayStep = false;
                                    }
                                }
                                if (temp < configs.temp.on) fan.delayStep = false;
                                break;
                            case true:
                                if (configs.sun != undefined) {
                                    if (entity[cfg.solar.espSunlight].state <= configs.sun.off) {
                                        if (fanSwitch(false)) {
                                            log("room has cooled down and sun is low, fan turning off: " + temp + tempUnit);
                                            return;
                                        }
                                    } else fan.delayStep = false;
                                } else if (configs.watts != undefined && temp <= configs.temp.off) {
                                    if (configs.watts.night != undefined && st.inverter[0].nightMode == true) {
                                        if (wattsBat <= configs.watts.night.off) {
                                            if (fanSwitch(false)) {
                                                log("(nightmode) battery power has lowered: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                                return;
                                            }
                                        }
                                        if (wattsInv <= configs.watts.night.off) {
                                            if (fanSwitch(false)) {
                                                log("(nightmode) inverter power has lowered: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                                return;
                                            }
                                        }
                                        if (wattsBat > configs.watts.night.off && wattsInv > configs.watts.night.off) fan.delayStep = false;
                                    } else {
                                        if (wattsBat <= configs.watts.off) {
                                            if (fanSwitch(false)) {
                                                log("battery power has lowered: " + wattsBat + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                                return;
                                            }
                                        }
                                        if (wattsInv <= configs.watts.off) {
                                            if (fanSwitch(false)) {
                                                log("inverter power has lowered: " + wattsInv + "w - temp: " + temp + tempUnit + ", fan turning off ");
                                                return;
                                            }
                                        }
                                        if (wattsBat > configs.watts.off && wattsBat > configs.watts.off) fan.delayStep = false;
                                    }
                                } else {
                                    if (temp <= configs.temp.off) {
                                        if (fanSwitch(false)) {
                                            log("room has cooled, fan turning off: " + temp + tempUnit);
                                            return;
                                        }
                                    } else fan.delayStep = false;
                                }
                                break;
                            case null:
                                fan.run = entity[configs.espPower].state;
                                log("syncing fan state: " + fan.run);
                                break;
                        }
                        if (temp >= configs.temp.warn && fan.warn == false) {
                            if (temp >= configs.temp.error && fan.error == false) {
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

                        if (time.epochMin - fan.faultStep >= configs.refaultMin) {
                            fan.error = false;
                            fan.warn = false;
                            fan.faultStep = time.epochMin;
                        }
                        function fanSwitchNow() {
                            send(configs.espPower, true);
                            fan.run = true;
                            fan.faultStep = time.epochMin;
                        }
                        function fanSwitch(newState) {
                            if (fan.delayStep == false) {
                                fan.delayTimer = time.epoch;
                                fan.delayStep = true;
                            } else if (newState == true) {
                                if (time.epoch - fan.delayTimer >= configs.delayOn) {
                                    fan.run = newState;
                                    send(configs.espPower, newState);
                                    fan.delayStep = false;
                                    return true;
                                }
                            } else if (time.epoch - fan.delayTimer >= configs.delayOff) {
                                fan.run = newState;
                                send(configs.espPower, newState);
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
                            let volts = ~~parseFloat(entity[cfg.grid.espVoltage].state), configs = cfg.grid, grid = st.grid;
                            if (time.boot > 10) {
                                if (volts >= configs.voltMax) {
                                    if (grid.state != false) {
                                        log("grid over-voltage: " + volts + "v", 2);
                                        blackout();
                                    } else grid.delayOn = time.epoch;
                                } else if (volts < configs.voltMin && volts > 20.0) {
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
                                    if (time.epoch - grid.delayOn >= configs.delayRecover) {
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
                    },
                    battery: function () {
                        for (let x = 0; x < cfg.battery.length; x++) {
                            let configs = cfg.battery[x], bat = st.battery[x], name = cfg.battery[x].name,
                                amps = entity[configs.sensorAmp]?.state;
                            if (entity[configs.sensorVolt]) {
                                volts = Math.round(entity[configs.sensorVolt].state * 100) / 100;
                                if (nv.battery[name].floating == null) {
                                    if (volts <= configs.voltsFullCharge && volts > configs.voltsFloatStop) {
                                        log("battery - " + configs.name + " - init - charger is floating: " + volts + "v");
                                        //  nv.battery[name].dischargeReset = true;
                                        nv.battery[name].charge.today = 0;
                                        nv.battery[name].cycles++;
                                        nv.battery[name].floating = true;
                                    }
                                    else nv.battery[name].floating = false
                                }
                                if (nv.battery[name].floating == false && volts >= configs.voltsFullCharge) {
                                    log("battery - " + configs.name + " - charger is floating: " + volts + "v");
                                    nv.battery[name].cycles++;
                                    nv.battery[name].floating = true;
                                }
                                if (nv.battery[name].floating == true) {       // consider blocking this until nighttime or some other criteria 
                                    if (volts <= configs.voltsFloatStop) {
                                        if (bat.floatStep == false) {
                                            bat.floatTimer = time.epoch;
                                            bat.floatStep = true;
                                        } else if (time.epoch - bat.floatTimer >= 30) {
                                            log("battery - " + configs.name + " - charger no longer floating: " + volts + "v");
                                            nv.battery[name].floating = false;
                                        }
                                    } else bat.floatStep = false;
                                }
                                bat.percent = Math.round(voltPercent(volts, configs));
                                // console.log("bat percent: " + bat.percent)
                                send("battery_" + configs.name, bat.percent, "%");

                                if (configs.sensorAmp) {
                                    if (amps >= configs.ampsResetDischarge) {
                                        if (nv.battery[name].dischargeReset == true) {
                                            log("battery - " + configs.name + " - resetting discharge meter - amps: " + amps);
                                            nv.battery[name].dischargeReset = false;
                                            nv.battery[name].discharge.today = 0;
                                        }
                                    }
                                }

                                if (configs.sensorWatt) {
                                    let watts = entity[configs.sensorWatt].state;

                                    if (Number.isFinite(watts)) {
                                        if (Math.sign(watts) == -1) bat.whNeg += watts;
                                        else bat.whPos += watts;
                                    }
                                    if (bat.min == null) {
                                        log("battery - " + configs.name + " - starting recorder");
                                        bat.min = time.min;
                                    }
                                    if (time.min != bat.min) {
                                        let charge = (bat.whPos / 60 / 60), discharge = (bat.whNeg / 60 / 60) * -1;
                                        if (time.hour == 3 && time.min == 0) {
                                            log("battery - " + configs.name + " - resetting discharge meter");
                                            nv.battery[name].dischargeReset = true;
                                            nv.battery[name].charge.today = 0;
                                        }
                                        if (!configs.sensorAmp && time.hour == 10 && time.min == 0) {
                                            if (nv.battery[name].dischargeReset == true) {
                                                log("battery - " + configs.name + " - resetting discharge meter");
                                                nv.battery[name].dischargeReset = false;
                                                nv.battery[name].discharge.today = 0;
                                            }
                                        }
                                        recorder(nv.battery[name].charge, charge, "battery_" + configs.name + "_charge");
                                        recorder(nv.battery[name].discharge, discharge, "battery_" + configs.name + "_discharge");
                                        nv.battery[name].charge.today += charge;
                                        nv.battery[name].discharge.today += discharge;
                                        nv.battery[name].charge.total += charge;
                                        nv.battery[name].discharge.total += discharge;
                                        send("kwh_battery_" + configs.name + "_charge_today", (Math.round((nv.battery[name].charge.today / 1000) * 10) / 10), "KWh");
                                        send("kwh_battery_" + configs.name + "_discharge_today", (Math.round((nv.battery[name].discharge.today / 1000) * 10) / 10), "KWh");
                                        //send("battery_" + configs.name + "_charge_total", Math.round(nv.battery[name].charge.total / 1000), "KWh");
                                        //send("battery_" + configs.name + "_discharge_total", Math.round(nv.battery[name].discharge.total / 1000), "KWh");
                                        send("battery_" + configs.name + "_cycles", nv.battery[name].cycles, "x");
                                        bat.whPos = 0;
                                        bat.whNeg = 0;
                                        bat.min = time.min;

                                        let ceff = 0, deff = 0;
                                        for (let y = 0; y < nv.battery[name].charge.month.length; y++)
                                            ceff += nv.battery[name].charge.month[y] ?? 0;
                                        for (let y = 0; y < nv.battery[name].discharge.month.length; y++)
                                            deff += nv.battery[name].discharge.month[y] ?? 0;
                                        send("battery_" + configs.name + "_efficiency", Math.round(((deff / ceff) * 100) * 10) / 10, "%");
                                    }
                                }

                            }
                        }
                        function voltPercent(voltage, configs) {
                            let percent = null;
                            if (voltage >= cfg.soc[configs.socTable][0]) return 100;
                            if (voltage <= cfg.soc[configs.socTable].length - 1) return 0;
                            for (let i = 0; i < cfg.soc[configs.socTable].length - 1; i++) {
                                const current = cfg.soc[configs.socTable][i];
                                const next = cfg.soc[configs.socTable][i + 1];
                                if (voltage <= current.voltage && voltage > next.voltage) {
                                    percent = next.percent + (voltage - next.voltage) * (current.percent - next.percent) / (current.voltage - next.voltage);
                                    return Math.round(percent * 10) / 10;
                                }
                            }
                        }
                    },
                }
                if (_push === "init") {
                    state[_name] = {               // initialize automation volatile memory
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
                    nvMem[_name] ||= {};
                    ({ st, cfg, nv } = _pointers(_name));
                    cfg.inverter.forEach(_ => {
                        st.inverter.push({
                            state: null, boot: false, step: time.epoch - 20, nightMode: false, delayOffTimer: undefined, switchWatts: 0,
                            switchSun: 0, switchWattsTimer: time.epoch, delayTimer: time.epoch, delayStep: false, delayVoltsTimer: time.epoch,
                            delayVoltsStep: false, delaySunTimer: time.epoch, delaySunStep: false, delayFaultStep: false,
                            delayFaultTimer: time.epoch, timeShutdown: null,
                            warn: { manualPowerOn: false, }
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
                    (function initNV() {
                        log("initializing NV data");
                        nv.sensor ||= { watt: {}, kwh: {} };
                        // if (nv.solar == undefined) nv.solar = {};
                        nv.grid ||= { power: false, blackout: [], sec: 0 };
                        nv.battery ||= {};
                        nv.sensor.watt ||= {};
                        cfg.sensor.watt.forEach(configs => {
                            if (nv.sensor.watt[configs.name] == undefined) {
                                log("initializing NV memory for - watt sensor: " + configs.name);
                                nv.sensor.watt[configs.name] = { total: 0, today: 0, min: [], hour: [], day: [], month: [] };
                            }
                            st.recorder.watt[configs.name] = { min: null, wh: 0 };
                        });
                        nv.sensor.kwh ||= {};
                        cfg.sensor.kwh.forEach(configs => {
                            if (nv.sensor.kwh[configs.name] == undefined) {
                                log("initializing NV memory for - kwh meter: " + configs.name);
                                nv.sensor.kwh[configs.name] = { total: 0, min: [], hour: [], day: [], month: [], };
                            }
                            st.recorder.kwh[configs.name] = { last: 0, todayReset: false };
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
                    setTimeout(() => {
                        st.timer.second = setInterval(() => {
                            calcSensor(); check.battery(); check.grid();
                            if (cfg.solar.inverterAuto != undefined && entity[cfg.solar.inverterAuto]?.state == true) {
                                solar.auto();
                                // if  (st.welder.detect == false) 
                            }
                            if (cfg.fan != undefined && cfg.fan.sensor.temp != undefined) check.temp();
                        }, 1e3);      // set minimum rerun time, otherwise this automation function will only be called on ESP and HA events
                        setTimeout(() => {
                            st.timer.priority = setInterval(() => {
                                if (entity[cfg.solar.priority.entityAuto]?.state == true) priority.auto();
                            }, 1e3);
                        }, 3e3);
                    }, 3e3);
                    st.timer.minute = setInterval(() => { timer(); }, 60e3);
                    st.timer.writeNV = setInterval(() => { writeNV(); }, 30e3);
                    if (cfg.solar.inverterAuto != undefined
                        && entity[cfg.solar.inverterAuto].state == true) log("inverter automation is on");
                    else log("inverter automation is off");
                    writeNV();
                    return;
                } else {
                    for (let x = 0; x < cfg.sensor.amp.length; x++) {
                        const configs = cfg.sensor.amp[x];
                        if (configs.entity && configs.entity[0] === _push.name) {
                            let amps = entity[configs.name] ||= {};
                            let data = _push.newState;
                            let factor = 0, corrected = 0, final = 0;
                            if (configs.multiplier != undefined) {
                                amps.state = parseFloat(data) * configs.multiplier;
                            } else if (configs.scale != undefined) {
                                factor = configs.rating / (configs.scale / 2);
                                corrected = parseFloat(data) - configs.zero;
                                final = corrected * factor;
                                if (configs.inverted == true) amps.state = (final * -1);
                                else amps.state = final;
                            } else amps.state = parseFloat(data);
                            if (amps.state != null && Number.isFinite(amps.state)) {
                                send("amp_" + configs.name, Math.round(amps.state * 10) / 10, "A");
                            }
                            amps.update = time.epoch;
                            return;
                        }
                    }
                    for (let x = 0; x < cfg.sensor.volt.length; x++) {
                        const configs = cfg.sensor.volt[x];
                        if (configs.entity === _push.name) {
                            let volts = entity[configs.name] ||= {};
                            let data = _push.newState;
                            let final = null, voltage = parseFloat(data);
                            const table = configs.table;
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
                                    send("volt_" + configs.name, Math.round(final * 10) / 10, "V");
                            } else if (configs.multiplier != undefined) {
                                volts.state = voltage * configs.multiplier;
                                if (volts.state != null && Number.isFinite(volts.state))
                                    send("volt_" + configs.name, Math.round(volts.state * 10) / 10, "V");
                            } else volts.state = voltage;
                            volts.update = time.epoch;
                            return;
                        }
                    }
                    for (let x = 0; x < cfg.sensor.watt.length; x++) {
                        const configs = cfg.sensor.watt[x];
                        if (configs.entity && configs.entity.length == 1 && !configs.solarPower && configs.entity[0] === _push.name) {
                            let watts = entity[configs.name] ||= {};
                            let data = _push.newState;
                            let newData;
                            if (configs.multiplier != undefined) newData = parseFloat(data) * configs.multiplier;
                            else newData = parseFloat(data);
                            if (Number.isFinite(watts.state)) {
                                watts.state = newData;
                                send("watt_" + configs.name, ~~watts.state, "W");
                            } else {
                                watts.state = 0.0;
                            }
                            watts.update = time.epoch;
                            return;
                        }
                    }
                    for (let x = 0; x < cfg.sensor.kwh.length; x++) {
                        const configs = cfg.sensor.kwh[x];
                        if (!Array.isArray(configs.entity) && configs.entity === _push.name) {
                            let kwh = nv.sensor.kwh[configs.name] ||= {};
                            let data = _push.newState;
                            let newData = parseInt(data);
                            if (Number.isFinite(newData)) {
                                if (newData < 0) return;
                                if (newData > 0) {
                                    if (kwh.total == 0) {
                                        log("sensor: " + configs.name + " first time recording");
                                        kwh.total = newData;
                                    }
                                    if (kwh.last == 0) {
                                        log("starting recorder for PZEM Meter - " + configs.name);
                                        recorder(kwh, 0, configs.name);
                                        kwh.last = newData;
                                    } else {
                                        let diff = newData - kwh.last;
                                        if (diff < 0) {
                                            diff = (10000000 - kwh.last) + newData;
                                            log("PZEM rollover detected: " + configs.name + " last=" + kwh.last + " new=" + newData + " diff=" + diff);
                                        }
                                        kwh.last = newData;
                                        if (diff > 0) {
                                            recorder(kwh, diff, configs.name);
                                            kwh.total += diff;
                                        }
                                    }
                                }
                            }
                            return;
                        }
                    }
                    for (let x = 0; x < cfg.sensor.temp.length; x++) {
                        const configs = cfg.sensor.temp[x];
                        if (configs.entity === _push.name) {
                            let temp = entity[configs.name] ||= {};
                            let data = _push.newState;
                            if (configs.multiplier != undefined) {
                                temp.state = parseFloat(data) * configs.multiplier;
                                if (temp.state != null && Number.isFinite(temp.state))
                                    send("temp_" + configs.name, Math.round(temp.state * 10) / 10, configs.unit);
                            } else {
                                temp.state = parseFloat(data);
                            }
                            return;
                        }
                    }
                    if (cfg.solar?.inverterAuto == _push.name) {
                        let newState = _push.newState;
                        if (newState == true) log("inverter auto going online");
                        else log("inverter auto going offline");
                        for (let x = 0; x < cfg.inverter.length; x++) {
                            if (entity[cfg.inverter[x].entity].state) {
                                log("inverter: " + cfg.inverter[x].name + " - inverter ON - syncing ATS with inverter state");
                                syncInverter(x, true);
                            } else {
                                log("inverter: " + cfg.inverter[x].name + " - inverter OFF - syncing ATS with inverter state");
                                syncInverter(x, false);
                                if (newState == true) st.inverter[x].step = time.epoch - cfg.solar.cycleError - 5;
                            }
                        }
                        return;
                    }
                    for (let x = 0; x < cfg.inverter.length; x++) {
                        if (cfg.inverter[x].entity == _push.name) {
                            let newState = _push.newState;
                            if (cfg.inverter[x].enable) {
                                if (st.inverter[x].state != "faulted" && st.inverter[x].state != newState) {
                                    log("inverter: " + cfg.inverter[x].name + " - operational state entity switching to - syncing power/switches: " + newState);
                                    syncInverter(x, newState);
                                }
                            }
                            return;
                        }
                    }
                    if (cfg.solar?.priority?.entityAuto == _push.name) {
                        let newState = _push.newState;
                        if (newState == true) log("priority queue - auto going ONLINE");
                        else log("priority queue - auto going offline");
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
                                let newState = _push.newState;
                                if (!st.priority.skipLog)
                                    log("syncing priority queue: " + queue.name + "  with entity: " + element + " - new state: " + newState);
                                st.priority.queue[x].state = newState;
                                st.priority.step = time.epoch;
                                st.priority.skipLog = false;
                                return;
                            }
                        }
                    }
                    function syncInverter(x, newState) {
                        st.inverter[x].state = newState;
                        solar.nightMode(x);
                        solar.power(x, newState);
                        st.inverter[x].warn.manualPowerOn = false;
                    }
                }
                function calcSensor() {     // calc watts based on amp/volt sensors 
                    for (let x = 0; x < cfg.sensor.amp.length; x++) {
                        let configs = cfg.sensor.amp[x], sum = 0;
                        entity[configs.name] ||= {};
                        let amps = entity[configs.name];
                        if (configs.entity > 1) {
                            for (let y = 0; y < configs.entity.length; y++) {
                                let value = parseFloat(entity[configs.entity[y]].state)
                                if (Number.isFinite(value)) {
                                    if (configs.combineNegative === true) { sum += entity[configs.entity[y]].state }
                                    else if (Math.sign(value) != -1) { sum += entity[configs.entity[y]].state }
                                    //   else sum += (entity[configs.entity[y]].state * -1)
                                }
                            }
                            amps.state = (Math.round(sum * 10) / 10);
                            amps.update = time.epoch;
                            // console.log("entity: " + configs.name + " -  state: " + amps.state)
                            send("amp_" + configs.name, amps.state, "A");
                        }
                    }
                    for (let x = 0; x < cfg.sensor.watt.length; x++) {
                        let sum = 0, configs = cfg.sensor.watt[x];
                        entity[configs.name] ||= {};
                        let watts = entity[configs.name];
                        let whFinal = 0;
                        if (configs.entity != undefined) {
                            if (configs.entity.length > 1 || configs.solarPower == true) {
                                for (let y = 0; y < configs.entity.length; y++) {
                                    let value = parseFloat(entity[configs.entity[y]]?.state)
                                    if (Number.isFinite(value)) {
                                        if (configs.combineNegative === true) { sum += entity[configs.entity[y]].state }
                                        else if (Math.sign(value) != -1) { sum += entity[configs.entity[y]].state }
                                        //   else sum += (entity[configs.entity[y]].state * -1)
                                    }
                                }
                                //  console.log("testing entity: "+ configs.name + " - sum: " + sum)
                                if (configs.solarPower == true) {
                                    let batWatts = entity[configs.batteryWatt].state;
                                    if (Math.sign(batWatts) == -1 && batWatts <= ((sum) * -1)) {
                                        send("watt_" + configs.name, 0, "kW");
                                    } else {
                                        if (Number.isFinite(batWatts))
                                            watts.state = batWatts + sum;
                                        send("watt_" + configs.name, ((batWatts + sum) / 1000).toFixed(2), "kW");
                                    }
                                } else {
                                    watts.state = ~~sum;
                                    send("watt_" + configs.name, (sum / 1000).toFixed(2), "kW");
                                }
                            }
                        } else if (configs.sensorAmp != undefined && configs.sensorVolt != undefined) { // for volt/amp calc
                            let amps = entity[configs.sensorAmp].state, volts = entity[configs.sensorVolt]?.state;
                            if (Number.isFinite(volts * amps)) watts.state = volts * amps;
                            else (watts.state = 0.0);
                            send("watt_" + configs.name, (watts.state / 1000).toFixed(2), "kW");
                        }

                        if (Number.isFinite(watts.state) && Math.sign(watts.state) != -1)
                            st.recorder.watt[configs.name].wh += watts.state;
                        if (st.recorder.watt[configs.name].min == null) {
                            if (configs.record) log("starting recorder for watt sensor - " + configs.name);
                            st.recorder.watt[configs.name].min = time.min;
                        } else if (time.min != st.recorder.watt[configs.name].min) {
                            whFinal = ((st.recorder.watt[configs.name].wh / 60) / 60);
                            nv.sensor.watt[configs.name].total += whFinal;
                            if (configs.record) recorder(nv.sensor.watt[configs.name], whFinal, configs.name);

                            if (st.recorder.watt[configs.name].todayReset) {
                                log("resetting daily watt meter for: " + configs.name);
                                nv.sensor.watt[configs.name].today = 0;
                                st.recorder.watt[configs.name].todayReset = false;
                            }
                            nv.sensor.watt[configs.name].today += whFinal;
                            send("kwh_" + configs.name + "_today", (nv.sensor.watt[configs.name].today / 1000).toFixed(2), "kWh");
                            // console.log("watts today:" + nv.sensor.watt[configs.name].today)

                            st.recorder.watt[configs.name].wh = 0;
                            st.recorder.watt[configs.name].min = time.min;
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
                function timer() {    // called every minute
                    if (time.hour == 3 && time.min == 0) {
                        log("resetting daily watt meters")
                        cfg.sensor.watt.forEach(configs => { st.recorder.watt[configs.name].todayReset = true; })
                    }
                }

            } catch (error) { console.trace(error) }
        }
    }
};
let _pointers = (_name) => {
    return {
        st: state[_name] ?? undefined,
        cfg: config[_name] ?? undefined,
        nv: nvMem[_name] ?? undefined,
        log: (m, l) => slog(m, l, _name),
        writeNV: () => file.write.nv(_name)
    }
}
