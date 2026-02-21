#!/usr/bin/node
module.exports = { // exports added to clean up layout
    automation: {
        Pumper: function (_name, _push, _reload) {
            let { st, cfg, nv, log, write, send, push } = _pointers(_name);
            let sensor = {
                ha_push: function () {
                    ({ st, cfg, nv } = _pointers(_name));
                    let sendDelay = 0;
                    let list = ["_total", "_hour", "_day", "_lm", "_today"];
                    for (let x = 0; x < cfg.sensor.flow.length; x++) {
                        //   entity[cfg.sensor.flow[x].name] ||= { lm: 0, temp: undefined, hour: 0, day: 0, batch: 0 };
                        let flowName = cfg.sensor.flow[x].name;
                        let flowNameEntity = "flow_" + cfg.sensor.flow[x].name;
                        let unit = [cfg.sensor.flow[x].unit, cfg.sensor.flow[x].unit, cfg.sensor.flow[x].unit, "L/m", "L"]
                        let value = [nv.flow[flowName].total, entity[flowNameEntity].hour, entity[flowNameEntity].day
                            , entity[flowNameEntity].lm, nv.flow[flowName].today];
                        for (let y = 0; y < 5; y++)
                            HAsend(flowNameEntity + list[y], Number(value[y]).toFixed(((unit[y] == "m3") ? 2 : 0)), unit[y]);
                    }
                    for (let x = 0; x < cfg.sensor.press.length; x++) {
                        let calc = { percent: [], sum: 0 },
                            name = "press_" + cfg.sensor.press[x].name,
                            config = cfg.sensor.press[x],
                            raw = entity[cfg.sensor.press[x].entity]?.state,
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
                        if (config.zero == 0.5) log("sensor ID: " + x + " is uncalibrated - Average Volts: "
                            + calc.average.toFixed(3) + "  - WAIT " + config.average + " seconds");
                        calc.psi = (config.pressureRating / 4) * (calc.average - config.zero);
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
                        /*  
                      send("cdata", {
                          name: config.name,
                          state: {
                              percent: entity[name].percent.toFixed(0),
                              meters: entity[name].meters.toFixed(2),
                              psi: entity[name].psi.toFixed(0)
                          }
                      });
                      */
                    }
                    function HAsend(name, value, unit) { setTimeout(() => { send(name, value, unit) }, sendDelay); sendDelay += 25; };
                },
                flow: {
                    calc: function () {
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
                    },
                    meter: function () {
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
                }
            }
            let delivery = {
                auto: {
                    control: function (x) {
                        delivery.shared(x); // should be removed if all is synced in DD start/stop, not needed here
                        let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                        if (auto.state) {
                            if (!state.run) {
                                if (!fault.flow) {
                                    if (config.enable) {
                                        if (!delivery.auto.online.idle.not_faulted.conditions(x))
                                            delivery.auto.online.idle.not_faulted.faults(x);
                                    }
                                } else { delivery.auto.online.idle.faulted(x); }
                            } else {
                                if (!delivery.auto.online.run.conditions(x))
                                    delivery.auto.online.run.faults(x);
                            }
                            delivery.auto.online.always(x);
                        } else delivery.auto.offline(x);
                    },
                    online: {
                        always: function (x) {
                            let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                            if (!warn.tankLow && press.out.state.meters <= (press.out.cfg.warn)) {
                                log(config.name + " - " + press.out.cfg.name + " is lower than expected (" + press.out.state.meters.toFixed(2)
                                    + press.out.cfg.unit + ") - possible hardware failure or low performance", 2);
                                warn.tankLow = true;
                            }
                        },
                        run: {
                            conditions: function (x) {
                                let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                                if (press.out.cfg.unit == "m") {
                                    if (press.out.state.meters >= config.press.stop) {
                                        log(config.name + " - " + press.out.cfg.name + " is full - pump is stopping");
                                        delivery.stop(x);
                                        return true;
                                    }
                                } else if (state.turbo) {
                                    if (press.out.state.psi >= config.press.turbo.stop) {
                                        log(config.name + " - " + press.out.cfg.name + " turbo shutoff pressure reached - pump is stopping");
                                        delivery.stop(x);
                                        return true;
                                    }
                                } else if (state.profile != null) {
                                    // if (config.pump[state.pump].flow?.runStop != undefined) return; // ether dont specify stop pressure or set it high
                                    if (press.out?.state?.psi >= config.press?.output?.profile?.[state.profile]?.stop) {
                                        log(config.name + " - " + press.out.cfg.name + " pump profile: " + state.profile
                                            + " pressure reached: " + press.out.state.psi.toFixed(0) + " psi - pump is stopping");
                                        delivery.stop(x);
                                        return true;
                                    }
                                } else if (press.out.state.psi >= config.press?.output?.stop) {
                                    log(config.name + " - " + press.out.cfg.name + " shutoff pressure reached - pump is stopping");
                                    delivery.stop(x);
                                    return true;
                                }

                                // faults were here before

                                if (config.press.output.riseTime != undefined) delivery.check.press(x);

                                if (flow != undefined) {
                                    if (config.pump[state.pump].flow.stopFlow != undefined
                                        && flow[state.pump].lm <= config.pump[state.pump].flow.stopFlow) {
                                        log(config.name + " - stop flow rate reached - pump is stopping");
                                        delivery.stop(x);
                                        return true;
                                    }
                                    delivery.check.flow(x);
                                }
                            },
                            faults: function (x) {
                                let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                                if (config.pump[state.pump].press?.input?.sensor) {
                                    if (entity[config.pump[state.pump].press?.input.sensor]
                                        <= config.pump[state.pump].press?.input.minError) {
                                        log(config.name + " - input tank level is too low " + press.in.state.meters
                                            + "m - DD system shutting down", 3);
                                        delivery.stop(x, true, "faulted");
                                        return;
                                    } else if (warn.inputLevel == false && entity[config.pump[state.pump].press?.input.sensor]
                                        <= config.pump[state.pump].press?.input.minWarn) {
                                        log(config.name + " - input tank level is getting low " + press.in.state.meters
                                            + "m", 2);
                                        warn.inputLevel = true;
                                        return;
                                    }
                                }

                                if (!flow && state.timer.timeoutOn == true && pump[state.pump].state === false) {
                                    log(config.name + " - is out of sync - auto is on, system is RUN but pump is off", 2);
                                    delivery.start(x);
                                    return;
                                }
                                if (time.epoch - state.timer.run >= config.fault?.runLongError * 60) {
                                    log(config.name + " - pump: " + pump[state.pump].name
                                        + " - max runtime exceeded - DD system shutting down", 3);
                                    delivery.stop(x, true, "faulted");
                                    return;
                                }
                                if (!fault.runLong && time.epoch - state.timer.run >= config.fault?.runLongWarn * 60) {
                                    log(config.name + " - pump: " + pump[state.pump].name
                                        + " - runtime warning - current runtime: " + (time.epoch - state.timer.run), 2);
                                    fault.runLong = true;
                                    return;
                                }
                                if (press.in != undefined && press.in.state.meters <= config.press.input.minError) {
                                    log(config.name + " - input tank level is too low - auto is shutting down", 3);
                                    delivery.stop(x, true, "faulted");
                                    return;
                                }
                            }
                        },
                        idle: {
                            not_faulted: {
                                conditions: function (x) {
                                    let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                                    if (press.out.cfg.unit == "m") {
                                        if (press.out.state.meters <= config.press.start) {
                                            log(config.name + " - " + press.out.cfg.name + " is low (" + press.out.state.meters.toFixed(2)
                                                + "m) - pump is starting");
                                            delivery.start(x);
                                            return true;
                                        }
                                    } else if (state.turbo) {
                                        //  console.log("turbo ", press.out.state.psi)
                                        if (press.out.state.psi <= config.press.turbo.start) {
                                            log(config.name + " - " + press.out.cfg.name + " is low (" + press.out.state.psi.toFixed(0)
                                                + "psi) - pump turbo is starting");
                                            delivery.start(x);
                                            return true;
                                        }
                                    } else if (state.profile != null) {
                                        //  console.log("profile pressure: ", press.out.state.psi, " - starting pressure: "
                                        //     + config.press.output.profile[state.profile].start)
                                        if (press.out.state.psi <= config.press?.output?.profile?.[state.profile]?.start) {
                                            log(config.name + " - " + press.out.cfg.name + " is low (" + press.out.state.psi.toFixed(0)
                                                + "psi) - pump is starting with profile: " + state.profile);
                                            delivery.start(x);
                                            return true;
                                        }
                                    } else if (press.out.state.psi <= config.press.start) {
                                        //  console.log("current pressure: ", press.out.state.psi)
                                        log(config.name + " - " + press.out.cfg.name + " is low (" + press.out.state.psi.toFixed(0)
                                            + "psi) - pump is starting");
                                        delivery.start(x);
                                        return true;
                                    }
                                },
                                faults: function (x) {
                                    let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                                    if (state.timer.timeoutOff == true) {  // after pump has been off for a while
                                        if (pump[state.pump].state === true && state.sharedPump.run == false) {
                                            log(config.name + " - pump running in HA/ESP but not here - switching pump ON", 2);
                                            delivery.start(x, false);
                                            return;
                                        } else {
                                            if (flow?.[state.pump]?.lm > config.pump[state.pump].flow.startError
                                                && warn.flowFlush == false && state.sharedPump.shared == false) {
                                                log(config.name + " - flow is detected (" + flow[state.pump].lm.toFixed(0)
                                                    + "lpm) possible sensor damage or flush operation", 2);
                                                warn.flowFlush = true;
                                                delivery.stop(x, true, "faulted");
                                                return;
                                            }
                                        }
                                    }
                                }
                            },
                            faulted: function (x) {
                                let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                                if (state.timer.timeoutOff == true) {
                                    if (pump[state.pump].state === true
                                        || flow?.[state.pump]?.lm > config.pump[state.pump].flow.startError) {
                                        log(config.name + " - pump is flow faulted but pump is still ON, stopping again", 3);
                                        delivery.stop(x, true, "faulted");
                                        return;
                                    }
                                }
                            }
                        },
                    },
                    offline: function (x) { // only faults
                        let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                        if (state.timer.timeoutOff == true) {
                            if (pump[state.pump].state === true && state.sharedPump.run == false) {        // this is mainly to sync the state of pump after a service restart
                                log(config.name + " - is out of sync - auto is off but pump is on - switching auto ON", 2);
                                send(auto.name, true);
                                auto.state = true;
                                delivery.start(x, false);
                                return;
                            }
                            if (flow?.[state.pump]?.lm > config.pump[state.pump].flow.startError
                                && warn.flowFlush == false && config.fault.flushWarning != false && state.sharedPump.shared == false) {
                                warn.flowFlush = true;
                                log(config.name + " - Auto is off but flow is detected (" + flow[state.pump].lm.toFixed(1)
                                    + ") possible sensor damage or flush operation", 2);
                                if (pump[state.pump].state === null || pump[state.pump].state == true) delivery.stop(x, true);
                                return;
                            }
                        }
                    },
                },
                auto_old: function (x) {
                    delivery.shared(x); // should be removed if all is synced in DD start/stop, not needed here
                    let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                    switch (auto.state) {
                        case true:                  // when Auto System is ONLINE
                            switch (state.run) {
                                case false:     // when pump is STOPPED (local perspective)
                                    switch (fault.flow) {
                                        case false: // when pump is STOPPED and not flow faulted
                                            if (config.enable) {
                                                if (press.out.cfg.unit == "m") {
                                                    if (press.out.state.meters <= config.press.start) {
                                                        log(config.name + " - " + press.out.cfg.name + " is low (" + press.out.state.meters.toFixed(2)
                                                            + "m) - pump is starting");
                                                        delivery.start(x);
                                                        return;
                                                    }
                                                } else if (state.turbo) {
                                                    //  console.log("turbo ", press.out.state.psi)
                                                    if (press.out.state.psi <= config.press.turbo.start) {
                                                        log(config.name + " - " + press.out.cfg.name + " is low (" + press.out.state.psi.toFixed(0)
                                                            + "psi) - pump turbo is starting");
                                                        delivery.start(x);
                                                        return;
                                                    }
                                                } else if (state.profile != null) {
                                                    //  console.log("profile pressure: ", press.out.state.psi, " - starting pressure: "
                                                    //     + config.press.output.profile[state.profile].start)
                                                    if (press.out.state.psi <= config.press?.output?.profile?.[state.profile]?.start) {
                                                        log(config.name + " - " + press.out.cfg.name + " is low (" + press.out.state.psi.toFixed(0)
                                                            + "psi) - pump is starting with profile: " + state.profile);
                                                        delivery.start(x);
                                                        return;
                                                    }
                                                } else if (press.out.state.psi <= config.press.start) {
                                                    //  console.log("current pressure: ", press.out.state.psi)
                                                    log(config.name + " - " + press.out.cfg.name + " is low (" + press.out.state.psi.toFixed(0)
                                                        + "psi) - pump is starting");
                                                    delivery.start(x);
                                                    return;
                                                }

                                                (function __faults__() {
                                                    if (state.timer.timeoutOff == true) {  // after pump has been off for a while
                                                        if (pump[state.pump].state === true && state.sharedPump.run == false) {
                                                            log(config.name + " - pump running in HA/ESP but not here - switching pump ON", 2);
                                                            delivery.start(x, false);
                                                            return;
                                                        } else {
                                                            if (flow?.[state.pump]?.lm > config.pump[state.pump].flow.startError
                                                                && warn.flowFlush == false && state.sharedPump.shared == false) {
                                                                log(config.name + " - flow is detected (" + flow[state.pump].lm.toFixed(0)
                                                                    + "lpm) possible sensor damage or flush operation", 2);
                                                                warn.flowFlush = true;
                                                                delivery.stop(x, true, "faulted");
                                                                return;
                                                            }
                                                        }
                                                    }
                                                })();

                                            }
                                            break;
                                        case true:  // when pump is STOPPED and flow faulted but HA/ESP home report as still running
                                            (function __faults__() {
                                                if (state.timer.timeoutOff == true) {
                                                    if (pump[state.pump].state === true
                                                        || flow?.[state.pump]?.lm > config.pump[state.pump].flow.startError) {
                                                        log(config.name + " - pump is flow faulted but pump is still ON, stopping again", 3);
                                                        delivery.stop(x, true, "faulted");
                                                        return;
                                                    }
                                                }
                                            })();
                                            break;
                                    }
                                    break;
                                case true:      // when pump is RUNNING
                                    if (press.out.cfg.unit == "m") {
                                        if (press.out.state.meters >= config.press.stop) {
                                            log(config.name + " - " + press.out.cfg.name + " is full - pump is stopping");
                                            delivery.stop(x);
                                            return;
                                        }
                                    } else if (state.turbo) {
                                        if (press.out.state.psi >= config.press.turbo.stop) {
                                            log(config.name + " - " + press.out.cfg.name + " turbo shutoff pressure reached - pump is stopping");
                                            delivery.stop(x);
                                            return;
                                        }
                                    } else if (state.profile != null) {
                                        // if (config.pump[state.pump].flow?.runStop != undefined) return; // ether dont specify stop pressure or set it high
                                        if (press.out?.state?.psi >= config.press?.output?.profile?.[state.profile]?.stop) {
                                            log(config.name + " - " + press.out.cfg.name + " pump profile: " + state.profile
                                                + " pressure reached: " + press.out.state.psi.toFixed(0) + " psi - pump is stopping");
                                            delivery.stop(x);
                                            return;
                                        }
                                    } else if (press.out.state.psi >= config.press?.output?.stop) {
                                        log(config.name + " - " + press.out.cfg.name + " shutoff pressure reached - pump is stopping");
                                        delivery.stop(x);
                                        return;
                                    }

                                    (function __faults__() {

                                        if (config.pump[state.pump].press?.input?.sensor) {
                                            if (entity[config.pump[state.pump].press?.input.sensor]
                                                <= config.pump[state.pump].press?.input.minError) {
                                                log(config.name + " - input tank level is too low " + press.in.state.meters
                                                    + "m - DD system shutting down", 3);
                                                delivery.stop(x, true, "faulted");
                                                return;
                                            } else if (warn.inputLevel == false && entity[config.pump[state.pump].press?.input.sensor]
                                                <= config.pump[state.pump].press?.input.minWarn) {
                                                log(config.name + " - input tank level is getting low " + press.in.state.meters
                                                    + "m", 2);
                                                warn.inputLevel = true;
                                                return;
                                            }
                                        }

                                        if (!flow && state.timer.timeoutOn == true && pump[state.pump].state === false) {
                                            log(config.name + " - is out of sync - auto is on, system is RUN but pump is off", 2);
                                            delivery.start(x);
                                            return;
                                        }
                                        if (time.epoch - state.timer.run >= config.fault?.runLongError * 60) {
                                            log(config.name + " - pump: " + pump[state.pump].name
                                                + " - max runtime exceeded - DD system shutting down", 3);
                                            delivery.stop(x, true, "faulted");
                                            return;
                                        }
                                        if (!fault.runLong && time.epoch - state.timer.run >= config.fault?.runLongWarn * 60) {
                                            log(config.name + " - pump: " + pump[state.pump].name
                                                + " - runtime warning - current runtime: " + (time.epoch - state.timer.run), 2);
                                            fault.runLong = true;
                                            return;
                                        }
                                        if (press.in != undefined && press.in.state.meters <= config.press.input.minError) {
                                            log(config.name + " - input tank level is too low - auto is shutting down", 3);
                                            delivery.stop(x, true, "faulted");
                                            return;
                                        }
                                    })();

                                    if (config.press.output.riseTime != undefined) delivery.check.press(x);

                                    if (flow != undefined) {
                                        if (config.pump[state.pump].flow.stopFlow != undefined
                                            && flow[state.pump].lm <= config.pump[state.pump].flow.stopFlow) {
                                            log(config.name + " - stop flow rate reached - pump is stopping");
                                            delivery.stop(x);
                                            return;
                                        }
                                        delivery.check.flow(x);
                                    }
                                    break;
                            }

                            (function __faults__() {
                                if (!warn.tankLow && press.out.state.meters <= (press.out.cfg.warn)) {
                                    log(config.name + " - " + press.out.cfg.name + " is lower than expected (" + press.out.state.meters.toFixed(2)
                                        + press.out.cfg.unit + ") - possible hardware failure or low performance", 2);
                                    warn.tankLow = true;
                                }
                            })();
                            break;
                        case false:  // when auto is OFFLINE
                            (function __faults__() {
                                if (state.timer.timeoutOff == true) {
                                    if (pump[state.pump].state === true && state.sharedPump.run == false) {        // this is mainly to sync the state of pump after a service restart
                                        log(config.name + " - is out of sync - auto is off but pump is on - switching auto ON", 2);
                                        send(auto.name, true);
                                        auto.state = true;
                                        delivery.start(x, false);
                                        return;
                                    }
                                    if (flow?.[state.pump]?.lm > config.pump[state.pump].flow.startError
                                        && warn.flowFlush == false && config.fault.flushWarning != false && state.sharedPump.shared == false) {
                                        warn.flowFlush = true;
                                        log(config.name + " - Auto is off but flow is detected (" + flow[state.pump].lm.toFixed(1)
                                            + ") possible sensor damage or flush operation", 2);
                                        if (pump[state.pump].state === null || pump[state.pump].state == true) delivery.stop(x, true);
                                        return;
                                    }
                                }
                            })();
                            break;
                    }
                },
                start: function (x, sendOut) {
                    let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                    delivery.check.start_conditions(x);

                    if (config.ha.reserve != undefined) {
                        if (entity[config.ha.reserve].state == true) {
                            let pumpSelect = config.pump.findIndex(obj => obj.class === "reserve");
                            if (pumpSelect == -1) {
                                log(config.name + " - no reserve pump found - selecting pump 0 instead", 2);
                            } else log(config.name + " - selecting reserve pump: " + config.pump[pumpSelect].name);
                        }
                        else state.pump = 0;
                    } else state.pump = 0;

                    if (press.out != undefined) {
                        if (press.out.cfg.unit == "m") state.pressStart = press.out.state.percent;
                        if (press.out.cfg.unit == "psi") state.pressStart = press.out.state.psi;
                    }
                    state.cycleCount++;

                    if (flow != undefined && config.pump[state.pump].flow != undefined)
                        flow[state.pump].batch = nv.flow[config.pump[state.pump].flow.sensor].total;


                    if (state.oneShot !== false) {
                        state.oneShotCount += 1;
                        if (config.oneShot.interrupt) {
                            log(config.name + " - terminating OneShot timer");
                            clearTimeout(state.oneShot);
                        } else if (config.oneShot.extend) {
                            log(config.name + " - pausing OneShot timer");
                            clearTimeout(state.oneShot);
                        }
                    }

                    fault.flow = false;
                    warn.runLong = false;
                    state.run = true;
                    state.flow.check = false;
                    state.flow.checkPassed = false;
                    state.flow.checkRunDelay = false;
                    state.timer.run = time.epoch;
                    state.timer.timeoutOn = false;

                    setTimeout(() => { state.timer.timeoutOn = true }, 10e3);
                    if (config.pump[state.pump].flow.sensor != undefined) {
                        state.flow.timerCheck = setTimeout(() => {
                            log(config.name + " - checking pump flow");
                            state.flow.check = true;
                            //automation[_name](_name, slog, send, file, nvMem, entity, state, config);
                            delivery.check.flow(x);
                            state.flow.timerInterval = setInterval(() => {
                                delivery.check.flow(x);
                            }, 1e3);
                        }, config.pump[state.pump].flow.startWait * 1000);
                    }
                    state.sendRetries = 0;
                    if (sendOut !== false) {
                        if (config.solenoid != undefined) {
                            log(config.name + " - opening solenoid");
                            send(config.solenoid.entity, true);
                            setTimeout(() => { startMotor(); }, 2e3);
                        } else startMotor();
                        function startMotor() {
                            log(config.name + " - starting pump: " + pump[state.pump].cfg.name + " - cycle count: "
                                + state.cycleCount + "  Time: " + (time.epoch - state.cycleTimer));
                            send(pump[state.pump].cfg.entity, true);
                        }
                    }
                },
                stop: function (x, faulted) {
                    let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                    let runTime = time.epoch - state.timer.run,
                        hours = Math.floor(runTime / 60 / 60),
                        minutes = Math.floor(runTime / 60),
                        extraSeconds = runTime % 60, lbuf, tFlow;


                    state.run = false;
                    state.timer.timeoutOff = false;
                    pump[state.pump].state = false;

                    delivery.shared(x);
                    if (state.sharedPump.run == false) {
                        lbuf = config.name + " - stopping pump: " + pump[state.pump].cfg.name + " - Runtime: "
                            + hours + "h:" + minutes + "m:" + extraSeconds + "s";
                        send(pump[state.pump].cfg.entity, false);
                    } else {
                        lbuf = config.name + " - stopping " + pump[state.pump].cfg.name + " but pump still in use by "
                            + cfg.dd[state.sharedPump.num].name + " - Runtime: " + hours + "h:" + minutes + "m:" + extraSeconds + "s";
                    }

                    if (config.solenoid != undefined) {
                        setTimeout(() => {
                            log(config.name + " - closing solenoid");
                            send(config.solenoid.entity, false);
                        }, 4e3);
                    }

                    if (flow != undefined) {
                        state.flow.check = false;
                        clearInterval(state.flow.timerInterval);
                        tFlow = nv.flow[config.pump[state.pump].flow.sensor].total - flow[state.pump].batch;
                        log(lbuf + " - pumped "
                            + ((tFlow < 2.0) ? ((tFlow * 1000).toFixed(1) + "L") : (tFlow.toFixed(2) + "m3"))
                            + " - Average: "
                            + ((tFlow * 1000) / (time.epoch - state.timer.run) * 60).toFixed(1) + "lm");
                    } else log(lbuf);

                    setTimeout(() => { state.timer.timeoutOff = true }, 10e3);




                    if (faulted) {
                        log(config.name + " - " + color("red", "FAULTED") + " - Auto is going " + color("red", "OFFLINE"));
                        auto.state = false;
                        send(auto.name, false);

                        if (config.ha.solar != undefined) {
                            log(config.name + " faulted - solar pump automation: " + config.ha.solar + " - is going offline", 2);
                            send(config.ha.solar, false);
                        }

                        clearTimeout(state.oneShot);
                        return;
                    }


                    if (state.oneShot !== false && config.oneShot?.extend) {
                        let duration;
                        if (config.oneShot.extendLiterMin) {
                            if ((tFlow * 1000) < config.oneShot.extendLiterMin) {
                                if (config.oneShot.extendRetry) {
                                    if (state.oneShotCount < config.oneShot.extendRetry) {
                                        log(config.name + " - OneShot minimum (" + config.oneShot.extendLiterMin
                                            + "L) batch flow not reached - attempt: " + state.oneShotCount);
                                        clearTimeout(state.oneShot);
                                    } else {
                                        log(config.name + " - OneShot minimum batch flow retries exceeded ("
                                            + state.oneShotCount + "L) - terminating OneShot and auto shutdown");
                                        send(auto.name, false);
                                        clearTimeout(state.oneShot);
                                        return;
                                    }
                                } else {
                                    log(config.name + " - OneShot minimum batch flow not reached - terminating OneShot and auto shutdown");
                                    send(auto.name, false);
                                    clearTimeout(state.oneShot);
                                    return;
                                }
                            } else {
                                if (config.oneShot.extendRetry) {
                                    log(config.name + " - OneShot minimum batch flow reached - resetting retry counter");
                                    state.oneShotCount = 0;
                                } else {
                                    log(config.name + " - OneShot minimum batch flow reached");
                                }
                                clearTimeout(state.oneShot);
                            }
                        }

                        log(config.name + " - extending OneShot timer");
                        clearTimeout(state.oneShot);
                        if (config.oneShot.durationEntity) duration = Math.trunc(entity[config.oneShot.durationEntity].state);
                        else if (config.oneShot.duration) duration = config.oneShot.duration;
                        state.oneShot = setTimeout(() => {
                            log(config.name + " - stopping OneShot operation after " + duration + " minutes of inactivity");
                            send(auto.name, false);
                            state.oneShot = false;
                        }, (duration * 60 * 1e3));
                    }
                },
                check: {
                    flow: function (x) {
                        let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                        let flowLM = flow[state.pump].lm, pumpConfig = config.pump[state.pump].flow, psi = press.out.state.psi.toFixed(0);
                        if (state.flow.check == true) {
                            if (state.flow.checkPassed == false) {
                                if (flowLM < pumpConfig.startError) {
                                    fault.flow = true;
                                    if (config.fault.retryCount && config.fault.retryCount > 0) {
                                        if (fault.flowRestarts < config.fault.retryCount) {
                                            log(config.name + " - " + color("red", "flow check FAILED") + " (" + flowLM.toFixed(1)
                                                + "lm) - " + psi + " psi - HA Pump State: "
                                                + pump[state.pump].state + " - waiting for retry " + (fault.flowRestarts + 1), 2);
                                            fault.flowRestarts++;
                                            clearTimeout(state.flow.timerRestart);
                                            state.flow.timerRestart = setTimeout(() => {
                                                log(config.name + " - no flow retry wait complete, pump reenabled");
                                                fault.flow = false;
                                            }, config.fault.retryWait * 1000);
                                        } else if (fault.flowRestarts == config.fault.retryCount && config.fault.retryFinal) {
                                            log(config.name + " - " + color("red", "low flow") + " (" + flowLM.toFixed(1) + "lm) HA State: "
                                                + pump[state.pump].state + " - retries exceeded - going offline for " + config.fault.retryFinal + "m", 3);
                                            fault.flowRestarts++;
                                            clearTimeout(state.flow.timerRestart);
                                            state.flow.timerRestart = setTimeout(() => {
                                                log(config.name + " - no flow retry extended wait complete, pump reenabled", 2);
                                                fault.flow = false;
                                            }, config.fault.retryFinal * 60 * 1000);
                                        } else {
                                            fault.flowRestarts++;
                                            log(config.name + " - " + color("red", "low flow") + " (" + flowLM.toFixed(1) + "lm) HA State: "
                                                + pump[state.pump].state + " - all retries failed - going OFFLINE permanently", 3);
                                            delivery.stop(x, true, "faulted");
                                            return;
                                        }
                                    } else {
                                        log(config.name + " - " + color("red", "low flow") + " (" + flowLM.toFixed(1) + "lm) HA State: "
                                            + pump[state.pump].state + " - pump retry not enabled - going OFFLINE permanently", 3);
                                        delivery.stop(x, true, "faulted");
                                        return;
                                    }
                                    // theres an issues here. when delivery.stop os called, it should clear the flock check interval instantly but after 1 second
                                    // if state.flow.check = false;  isnt set, interval still calls flock check function throwing multiple retry/errors. why?
                                    // even if setting/clearing global.stat[_name].dd[x].state.flow.timerInterval doesnt not take effect. 
                                    // state.flow.check = false;   // moving this to delivery.stop
                                    delivery.stop(x, true);
                                } else if (flowLM < pumpConfig.startWarn && warn.flowDaily == false) {
                                    log(config.name + " - pump flow is lower than optimal (" + flowLM.toFixed(1) + "lm) - clean filter", 2);
                                    state.flow.checkPassed = true;
                                    fault.flowRestarts = 0;
                                    warn.flowDaily = true;
                                } else {
                                    log(config.name + " - pump flow check " + color("green", "PASSED") + " (" + flowLM.toFixed(1) + "lm)");
                                    state.flow.checkPassed = true;
                                    fault.flowRestarts = 0;
                                }
                            } else {








                                // this should not be a run else chain, make runWarn 











                                if (pumpConfig.runStop != undefined) {
                                    if (flowLM <= pumpConfig.runStop) {
                                        trigger((" - RUN flow stop (" + flowLM.toFixed(1) + "lm) - pump stopping - " + psi + " psi"), false);
                                    } else state.flow.checkRunDelay = false;
                                } else if (pumpConfig.runError != undefined) {
                                    if (flowLM < pumpConfig.runError) {
                                        trigger((" - RUN low flow (" + flowLM.toFixed(1) + "lm) HA State: "
                                            + pump[state.pump].state + " - going OFFLINE permanently"), true);
                                    } else state.flow.checkRunDelay = false;
                                } else if (pumpConfig.runError == undefined) {
                                    if (flowLM < pumpConfig.startError) {
                                        trigger((" - RUN low flow (" + flowLM.toFixed(1) + "lm) HA State: "
                                            + pump[state.pump].state + " - going OFFLINE permanently"), true);
                                    } else state.flow.checkRunDelay = false;
                                }



                                function trigger(msg, error) {
                                    if (state.flow.checkRunDelay == false) {
                                        state.timer.flow = time.epoch;
                                        state.flow.checkRunDelay = true;
                                        return;
                                    } else if (time.epoch - state.timer.flow >= 3) {
                                        if (error) {
                                            log(config.name + msg, 3);
                                            delivery.stop(x, true, "faulted");
                                        } else {
                                            log(config.name + msg, 1);
                                            delivery.stop(x);
                                        }
                                    }
                                }
                            }
                        }
                    },
                    press: function (x) { // not yet in use

                        let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);

                        if (time.epoch - state.timer.rise >= config.press.output.riseTime) {
                            if (press.out.cfg.unit == "m") {
                                log("checking pressure rise, starting: " + state.pressStart + "  current: " + press.out.state.percent
                                    + "  difference: " + (press.out.state.percent - state.pressStart) + "%", 0);
                                if (!(press.out.state.percent - state.pressStart) > config.press.outputRiseError) {
                                    if (type == 0) log(config.name + " - tank level not rising - DD system shutting down", 3);
                                    delivery.stop(x, true, "faulted");
                                    return;
                                }
                                else if (!(press.out.state.percent - state.pressStart) > config.press.outputRiseWarn) {
                                    if (type == 0) log(config.name + " - tank level not rising", 2);
                                }
                                state.pressStart = press.out.state.percent;
                            }
                            if (press.out.cfg.unit == "psi") {
                                log("checking pressure rise, starting: " + state.pressStart + "  current: " + press.out.state.percent
                                    + "  difference: " + (press.out.state.percent - state.pressStart) + "psi", 0);
                                if (!(press.out.state.psi - state.pressStart) > config.press.outputRiseError) {
                                    if (type == 0) log(config.name + " - tank level not rising - DD system shutting down", 3);
                                    delivery.stop(x, true, "faulted");
                                    return;
                                }
                                else if (!(press.out.state.psi - state.pressStart) > config.press.outputRiseWarn) {
                                    if (type == 0) log(config.name + " - tank level not rising", 2);
                                }
                                state.pressStart = press.out.state.psi;
                            }
                            state.timer.rise = time.epoch;
                        }
                    },
                    start_conditions: function (x) { // check start requirements
                        let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x);

                        // check that both press and flow stop are both not configured 
                        if (config.pump[state.pump].flow.runStop == null
                            && config.press?.output?.profile?.[state.profile].stop == null) {
                            log(config.name + " - config error - you must configure ether 'Flow runStop' or 'Press output profile stop'", 3);
                            send(auto.name, false);
                            auto.state = false;
                            return;
                        }

                        if (state.cycleCount == 0) {
                            state.cycleTimer = time.epoch;
                            state.timer.rise = time.epoch;
                        } else if (state.cycleCount > config.fault.cycleCount) {
                            if (time.epoch - state.cycleTimer < config.fault.cycleTime) {
                                log(config.name + " - pump is cycling to frequently - DD system shutting down", 3);
                                send(auto.name, false);
                                auto.state = false;
                                return;
                            } else { state.cycleTimer = time.epoch; state.cycleCount = 0; }
                        }


                        warn.inputLevel = false;
                        if (config.pump[state.pump].press?.input?.sensor) {
                            if (entity[config.pump[state.pump].press?.input.sensor]
                                <= config.pump[state.pump].press?.input.minError) {
                                log(config.name + " - pump specific input tank level is too low "
                                    + press.in.state.meters + "m - DD shutting down", 3);
                                send(auto.name, false);
                                auto.state = false;
                                fault.inputLevel = true;
                                return;
                            } else if (warn.inputLevel == false && entity[config.pump[state.pump].press?.input?.sensor]
                                <= config.pump[state.pump].press?.input?.minWarn) {
                                log(config.name + " - DD input tank level is getting low " + press.in.state.meters
                                    + "m", 2);
                                warn.inputLevel = true;
                                return;
                            }
                        } else if (press?.in?.state?.meters <= entity[config.pump[state.pump].press?.input?.sensor]) {
                            log(config.name + " - input tank level is too low - DD system shutting down", 3);
                            send(auto.name, false);
                            auto.state = false;
                            return;
                        }

                    },
                },
                shared: function (x) {  // discovers if other systems are currently using this same pump
                    let { state, config, auto, press, flow, pump, fault, warn } = delivery.pointers(x)
                    state.sharedPump = { shared: null, run: false, num: null };
                    for (let y = 0; y < cfg.dd[x].pump.length; y++) {
                        try { pump[y].state = entity[cfg.dd[x].pump[y].entity]?.state; } // sync pump entity state with local state
                        catch (error) {
                            console.trace("shared pump lookup error: ", error);
                            console.log("pump: ", pump[y]);
                            console.log("entity: " + cfg.dd[x].pump[y].entity, entity[cfg.dd[x].pump[y].entity]);
                        }
                    }
                    for (let y = 0; y < cfg.dd.length; y++) {
                        if (y != x && pump[state.pump].cfg.entity
                            == cfg.dd[y].pump[st.dd[y].state.pump].entity) { // if DD is not this DD and matches this DD's pump - its shared 
                            if (st.dd[y].state.run == true) state.sharedPump.run = true; // the other DD is still using the pump
                            else { setTimeout(() => { state.sharedPump.run = false; }, 10e3); }
                            state.sharedPump.shared = true;
                            state.sharedPump.num = y;
                            break;
                        }
                    }
                },
                pointers: function (x) {
                    ({ st, cfg, nv } = _pointers(_name));
                    let state = st.dd[x].state, config = cfg.dd[x], press = {}, flow = [],
                        fault = st.dd[x].fault, warn = st.dd[x].warn, pump = [];
                    let auto = {
                        get state() { return entity[config.ha.auto]?.state },
                        set state(value) { entity[config.ha.auto].state = value; },
                        name: config.ha.auto
                    }

                    if (config.pump[state.pump].press?.input?.sensor)
                        press.in = {
                            cfg: cfg.sensor.press.find(obj => obj.name === config.pump[state.pump].press?.input?.sensor),
                            get state() { return entity[("press_" + config.pump[state.pump].press?.input?.sensor)] }
                        }
                    else if (config.press?.input?.sensor)
                        press.in = {
                            cfg: cfg.sensor.press.find(obj => obj.name === config.press.input.sensor),
                            get state() { return entity[("press_" + config.press.input.sensor)] }
                        }
                    if (config.press?.output?.sensor)
                        press.out = {
                            cfg: cfg.sensor.press.find(obj => obj.name === config.press.output.sensor),
                            get state() { return entity[("press_" + config.press.output.sensor)] },
                        }

                    config.pump.forEach(element => {
                        pump.push({
                            cfg: element,
                            get state() { return entity[element.entity]?.state; },
                            name: element.name
                        });
                        if (element.flow?.sensor != undefined)
                            flow.push(entity[("flow_" + element.flow.sensor)]);
                    });
                    return { state, config, auto, press, flow, pump, fault, warn };
                },
            }
            let fountain = {
                /*
                    fountain advanced time window - coordinate with solar power profile - fault run time 
                    solar fountain controls auto, when low sun, auto fountain resumes with pump stopped (fail safe)
                */
                auto: function fountain(x) {
                    let fount = { st: st.fountain[x], cfg: cfg.fountain[x] }
                    if (entity[fount.cfg.haAuto].state == true) {
                        if (fount.state.step == null) pumpFountain(x, true);
                        if (entity[fount.cfg.pump] == true) {
                            if (time.epochMin - fount.state.step >= fount.cfg.intervalOn) pumpFountain(x, false);
                        } else {
                            if (time.epochMin - fount.state.step >= fount.cfg.intervalOff) pumpFountain(x, true);
                        }
                    }
                    if (fount.state.flow.check) {
                        let flow = (entity[cfg.sensor.flow[fount.cfg.sensor.flow.entity].entity].state / 60).toFixed(0);
                        if (flow <= fount.cfg.sensor.flow.startError) {
                            log(fount.cfg.name + " - flow check FAILED: " + flow + "lpm - auto will shut down", 3);
                            send(fount.cfg.haAuto, false);
                            pumpFountain(x, false);
                            return;
                        }
                    }
                },
                pump: function (x, power) {
                    let fount = { st: st.fountain[x], cfg: cfg.fountain[x] }
                    fount.state.step = time.epochMin;
                    if (power) {
                        log(fount.cfg.name + " - is turning on");
                        send(cfg.esp[fount.cfg.pump], true);
                        if (fount.cfg.flow != undefined && fount.cfg.flow.entity != undefined) {
                            fount.state.timer.flow = setTimeout(() => {
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
                                    fount.state.flow.check = true;
                                }
                            }, (fount.cfg.flow.startWait * 1e3));
                        }
                    } else {
                        log(fount.cfg.name + " - is turning off");
                        send(cfg.esp[fount.cfg.pump], false);
                        clearTimeout(fount.state.timer.flow);
                        fount.state.flow.check = false;
                    }
                }
            }
            let constructor = {
                init: function () {
                    log("loading constructors");
                    push["clear-oneShot"] = (number) => {
                        log(cfg.dd[number].name + " - clearing oneShot for DD: " + number);
                        clearTimeout(st.dd[number].state.oneShot);
                        st.dd[number].state.oneShot = false;
                    }
                    push["Button-eWeLink"] = (state) => {
                        log(" - TEST BUTTON - State:" + state);
                    }
                    cfg.dd.forEach((config, x) => {
                        push[config.ha.auto] = constructor.auto(st.dd[x], x, config);
                        push[config.ha.turbo] = constructor.turbo(st.dd[x], x, config);
                        push[config.ha.profile] = constructor.profile(st.dd[x], x, config);
                        if (config.oneShot?.buttons) {
                            config.oneShot.buttons.forIn((name, value) => {
                                log("loading constructor for oneshot entity: " + name, 0);
                                push[name] = constructor.oneShot(st.dd[x], x, config, value);
                            })
                        }
                    });
                },
                auto: function (dd, index, config) {
                    return (state) => {
                        if (state) {
                            if (!config.enable) {
                                log(config.name + " - system disabled - cannot go online", 2);
                                send(dd.auto.name, false);
                                entity[config.ha?.auto] && (entity[config.ha.auto].state = false);
                                return;
                            }
                            log(config.name + " - is going ONLINE");
                            // some fault/warn are reset in delivery.start
                            dd.fault.flow = false;
                            dd.fault.flowRestarts = 0;
                            dd.fault.inputLevel = false;
                            dd.warn.tankLow = false;
                            dd.warn.inputLevel = false;
                            dd.state.cycleTimer = time.epoch;
                            dd.state.cycleCount = 0;
                            clearTimeout(dd.state.flow.timerRestart);
                        } else {
                            log(config.name + " - is going OFFLINE");
                            clearTimeout(dd.state.flow.timerRestart);
                            clearTimeout(dd.state.flow.timerCheck);
                            clearInterval(dd.state.flow.timerInterval);
                            clearTimeout(dd.state.oneShot);
                            dd.state.oneShot = false;
                            dd.state.oneShotCount = false;
                            if (dd.state.run) delivery.stop(index);
                        }
                    };
                },
                oneShot: function (dd, index, config, button) {
                    return (state, name) => {
                        let action = null,
                            duration = null;
                        // =====================================
                        // Resolve Action From Button Definition
                        // =====================================
                        if ("duration" in button)
                            duration = button["duration"];

                        for (const key in button) {
                            if (key === "duration") continue; // skip non-action keys
                            let trigger = button[key];
                            // Normalize primitive → array
                            if (!Array.isArray(trigger)) trigger = [trigger];
                            for (const t of trigger) {
                                // Match ANY state
                                if (t === "any") { action = key; break; }
                                // Direct match (string, boolean, number, etc.)
                                if (t === state) { action = key; break; }
                            }
                            if (action) break;
                        }

                        if (!action) return;

                        dd.state.button = name;
                        clearTimeout(dd.state.oneShot);

                        if (duration == null) {
                            if (config.oneShot.durationEntity && entity[config.oneShot.durationEntity]?.state)
                                duration = Math.trunc(entity[config.oneShot.durationEntity].state);
                            else if (config.oneShot.duration)
                                duration = config.oneShot.duration;
                            else {
                                log(config.name + " - no duration in entity or global - ignoring button press from: "
                                    + name + " - state: " + state, 2);
                                return;
                            }
                        }

                        // =====================================
                        // ACTION EXECUTION
                        // =====================================

                        if (action === "oneShot") {
                            if (!config.enable) {
                                log(config.name + " - system disabled - cannot perform one-shot - trigger: "
                                    + name + " - state: " + state, 2);
                                return;
                            }
                            if (entity[config.ha.auto].state) {
                                log(config.name + " - auto already online - ignoring one-shot request - trigger: "
                                    + name + " - state: " + state, 2);
                                pumpUp();
                                return;
                            }
                            log(config.name + " - one shot operation - trigger: "
                                + name + " - state: " + state + " - stopping in " + duration + " min");
                            timeout();
                            send(config.ha.auto, true);
                            pumpUp();
                        }

                        else if (action === "start") {
                            if (!config.enable) {
                                log(config.name + " - system disabled - cannot start system - trigger: " + name, 2);
                                return;
                            }
                            log(config.name + " - starting system - triggered by: " + name + " - state: " + state);
                            dd.state.oneShot = false;
                            send(config.ha.auto, true);
                        }

                        else if (action === "stop") {
                            log(config.name + " - STOPPING system - triggered by: " + name + " - state: " + state);
                            send(config.ha.auto, false);
                        }

                        // =====================================
                        // HELPERS
                        // =====================================
                        function pumpUp() {
                            if (config.oneShot.pumpUp) {
                                if (!dd.state.run) {
                                    log(config.name + " - starting Pump Up - trigger: " + name + " - state: " + state, 1);
                                    delivery.start(index);
                                } else {
                                    log(config.name + " - pump already running");
                                }
                            }
                        }
                        function timeout() {
                            dd.state.oneShot = setTimeout(() => {
                                log(config.name + " - stopping OneShot operation after " + duration + " minutes");
                                send(config.ha.auto, false);
                                dd.state.oneShot = false;
                            }, (duration * 60 * 1e3));
                        }
                    };
                },
                turbo: function (dd, index, config) {
                    return (state, name) => {
                        log(config.name + " - Turbo operation triggered by: " + name);
                        if (state == true) {
                            log(config.name + " - enabling pump turbo mode");
                            dd.state.turbo = true;
                        } else {
                            log(config.name + " - disabling pump turbo mode");
                            dd.state.turbo = false;
                        }
                        return;
                    };
                },
                profile: function (dd, index, config) {
                    return (state, name) => {
                        log(config.name + " - pump profile change triggered by: " + name + " - new state: " + ~~state);
                        dd.state.profile = parseInt(state);
                        return;
                    };
                },
                fountain: function () {
                    return (state, name) => {
                        log(cfg.fountain[x].name + " - automation triggered by: " + name);
                        if (state == true) {
                            log(cfg.fountain[x].name + " auto is starting");
                            pumpFountain(x, true);
                        } else {
                            log(cfg.fountain[x].name + " auto is stopping");
                            pumpFountain(x, false);
                        }
                    };
                },
                example: function (dd, index, config) {
                    return (state, name) => {


                    };
                },
            }
            function timer() {    // called every minute
                for (let x = 0; x < cfg.dd.length; x++) { st.dd[x].warn.flowFlush = false; }
                if (time.hour == 4 && time.min == 0) {
                    for (let x = 0; x < cfg.dd.length; x++) { st.dd[x].warn.flowDaily = false; } // reset low flow daily warning
                }
                if (time.hour == 0 && time.min == 0) {
                    log("resetting daily flow meters")
                    for (const name in nv.flow) { nv.flow[name].today = 0; }  // reset daily low meters
                }
            }
            if (_push === "init") {
                log("initializing pumper config and state")
                global.state[_name] = { init: true, dd: [], fountain: [], timer: {}, pump: {} };
                global.nv[_name] ||= {};
                ({ st, cfg, nv, push } = _pointers(_name));
                if (cfg.sensor.flow) { // initialize NV data
                    nv.flow ||= {};
                    let found = false;
                    for (let x = 0; x < cfg.sensor.flow.length; x++) {
                        let flowName = cfg.sensor.flow[x].name;
                        if (!nv.flow[flowName]) {
                            log("initializing NV data for flowmeter: " + flowName);
                            nv.flow[flowName] = {
                                total: 0, today: 0,
                                min: new Array(60).fill(0),
                                hour: new Array(24).fill(0),
                                day: new Array(30).fill(0)
                            }
                            found = true;
                        }
                    }
                    if (found) {
                        log("writing NV data to disk...");
                        write();
                    }
                }

                cfg.sensor.press.forEach(element => {
                    entity[("press_" + element.name)] ||= { average: [], step: 0, meters: null, psi: null, percent: null, volts: null, };
                });
                cfg.sensor.flow.forEach(element => {
                    entity[("flow_" + element.name)] ||= { lm: 0, temp: undefined, hour: 0, day: 0, batch: 0 };
                });
                cfg.fountain.forEach(element => {
                    st.fountain.push({ step: null, timerFlow: null, flowCheck: false, })
                });
                cfg.dd.forEach((config, x) => {
                    if (!config.enable) log(config.name + " - initializing - " + color("yellow", "DISABLED"));
                    else log(config.name + " - initializing");
                    st.dd.push({     // initialize volatile memory for each Demand Delivery system
                        state: {
                            run: false,
                            oneShot: false,
                            button: null,
                            turbo: false,
                            profile: null,
                            pump: 0,
                            cycleCount: 0,
                            pressStart: null,
                            heartbeat: false,
                            sharedPump: {},
                            flow: {
                                check: false,
                                checkPassed: false,
                                checkRunDelay: false,
                                timerCheck: null,
                                timerRestart: null,
                                timerInterval: null,
                            },
                            timer: {
                                timeoutOff: true,
                                timeoutOn: false,
                                flow: null, // for run flow fault delay
                                run: time.epoch,
                                rise: time.epoch,
                            },

                        },
                        fault: {
                            flow: false,
                            flowRestarts: 0,
                            overFlow: false, // tank is overflowing
                            inputLevel: false,
                        },
                        warn: {
                            flow: false,
                            flowDaily: false,
                            flowFlush: false,
                            runLong: false, // DD has ran too long
                            haLag: false,
                            tankLow: false,
                            inputLevel: false,
                        },
                    })
                    if (config.press != undefined && config.press.output != undefined
                        && config.press.output.profile != undefined) {
                        if (config.ha.profile != undefined && config.press.output.profile.length > 0) {
                            log(config.name + " - profile selector enabled");
                            st.dd[x].state.profile = parseInt(entity[config.ha.profile]?.state);
                        } else {
                            log(config.name + " - no profile entity - selecting profile 0");
                            st.dd[x].state.profile = 0;
                        }
                    }
                    if (config.ha.turbo != undefined) {
                        st.dd[x].state.turbo = entity[config.ha.turbo].state;
                    }
                });

                sensor.flow.calc();
                sensor.flow.meter();
                sensor.ha_push();

                st.timer.second = setInterval(() => {     // called every second  -  rerun this automation every second
                    sensor.flow.calc();
                    sensor.ha_push(state);
                    for (let x = 0; x < cfg.dd.length; x++) if (cfg.dd[x].enable) delivery.auto.control(x)  // delivery.auto_old(x);
                }, 1e3);
                setTimeout(() => {  // start minute timer aligned with system minute
                    timer(); sensor.flow.meter(); write();
                    st.timer.minute = setInterval(() => { timer(); sensor.flow.meter(); write(); }, 60e3);
                }, (60e3 - ((time.sec * 1e3) + time.mil)));
                st.timer.hour = setInterval(() => {     // called every hour  -  reset hourly notifications
                    cfg.dd.forEach((_, x) => {
                        st.dd[x].fault.overFlow = false;
                        st.dd[x].warn.tankLow = false;
                    });
                }, 3600e3);

                constructor.init();
                cfg.fountain.forEach(config => {
                    push[config.haAuto] = constructor.fountain();
                });

            }
            else if (_push) push[_push.name]?.(_push.state, _push.name);
            else if (_reload) {
                if (push) push.forIn((name) => {
                    log("deleting constructor for: " + name);
                    delete push[name];
                })
                if (_reload == "config") {
                    ({ st, cfg, nv } = _pointers(_name));
                    constructor.init();
                }
                else {
                    log("hot reload initiated");
                    clearInterval(st.timer.hour);
                    clearInterval(st.timer.minute);
                    clearInterval(st.timer.second);
                    st.dd.forEach(element => {
                        clearInterval(element.state.flow.timerInterval);
                        clearTimeout(element.state.flow.timerRestart);
                        clearTimeout(element.state.flow.timerCheck);
                        clearTimeout(element.state.oneShot);
                    });
                }
                return;
            }
        },
    }
};
let _pointers = (_name) => { // don't touch 
    return {
        st: state[_name] ?? undefined,
        cfg: config[_name] ?? undefined,
        nv: nv[_name] ?? undefined,
        push: push[_name] ||= {},
        log: (m, l) => slog(m, l, _name),
        write: () => writeNV(_name),
        send: (name, state, unit, address) => { core("state", { name, state, unit, address }, _name) },
    }
}
