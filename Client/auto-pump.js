#!/usr/bin/node
let twit = require("./twit.js").framework;
module.exports = { // exports added to clean up layout
    automation: {
        Pumper: function (_name, _push, _reload) {
            let { state, config, nv, log, write, send, push, tool } = twit(_name);
            let sensor = {
                ha_push: function () {
                    ({ state, config, nv } = twit(_name));
                    let sendDelay = 0;
                    let list = ["_total", "_hour", "_day", "_lm", "_today"];
                    for (let x = 0; x < config.sensor.flow.length; x++) {
                        //   entity[config.sensor.flow[x].name] ||= { lm: 0, temp: undefined, hour: 0, day: 0, batch: 0 };
                        let flowName = config.sensor.flow[x].name;
                        let flowNameEntity = "flow_" + config.sensor.flow[x].name;
                        let unit = [config.sensor.flow[x].unit, config.sensor.flow[x].unit, config.sensor.flow[x].unit, "L/m", "L"]
                        let value = [nv.flow[flowName].total, entity[flowNameEntity].hour, entity[flowNameEntity].day
                            , entity[flowNameEntity].lm, nv.flow[flowName].today];
                        for (let y = 0; y < 5; y++)
                            HAsend(flowNameEntity + list[y], Number(value[y]).toFixed(((unit[y] == "m3") ? 2 : 0)), unit[y]);
                    }
                    for (let x = 0; x < config.sensor.press.length; x++) {
                        let calc = { percent: [], sum: 0 },
                            name = "press_" + config.sensor.press[x].name,
                            cfg = config.sensor.press[x],
                            raw = entity[config.sensor.press[x].entity]?.state,
                            stopPressure = null;
                        for (let y = 0; y < config.dd.length; y++) {
                            if (config.dd[y].press.output == config.sensor.press[x].name) {
                                if (config.dd[y].press.profile != undefined) {
                                    stopPressure = config.dd[y].press.profile[state.dd[y].state.profile].stop;
                                    break;
                                } else {
                                    stopPressure = config.dd[y].press.stop;
                                    break;
                                }
                            }
                        }
                        if (stopPressure == null) stopPressure = cfg.levelFull;
                        if (entity[name].step < cfg.average) { entity[name].average[entity[name].step++] = raw; }
                        else { entity[name].step = 0; entity[name].average[entity[name].step++] = raw; }
                        for (let y = 0; y < entity[name].average.length; y++) calc.sum += entity[name].average[y];
                        calc.average = calc.sum / entity[name].average.length;
                        if (cfg.zero == 0.5) log("sensor ID: " + x + " is uncalibrated - Average Volts: "
                            + calc.average.toFixed(3) + "  - WAIT " + cfg.average + " seconds");
                        calc.psi = (cfg.pressureRating / 4) * (calc.average - cfg.zero);
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
                          name: cfg.name,
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
                        for (let x = 0; x < config.sensor.flow.length; x++) {
                            let flowName = config.sensor.flow[x].name;
                            let flowNameEntity = "flow_" + config.sensor.flow[x].name;
                            if (!nv.flow[flowName]) nv.flow[flowName] = {
                                total: 0, today: 0, min: new Array(60).fill(0), hour: new Array(24).fill(0), //day: new Array(31).fill(0)
                            }
                            if (config.sensor.flow[x].entity) {
                                entity[flowNameEntity].lm = entity[config.sensor.flow[x].entity]?.state / config.sensor.flow[x].pulse / 60;
                                // console.log("flow meter: " + entity.lm);
                                entity[flowNameEntity].update = time.epoch;
                                if (isFinite(entity[flowNameEntity].lm)) {
                                    nv.flow[flowName].total += entity[flowNameEntity].lm / 60 / 1000;
                                    nv.flow[flowName].today += entity[flowNameEntity].lm / 60;
                                }
                            }
                            if (config.sensor.flow[x].entityAdd) {
                                let tFlow = 0;
                                for (let y = 0; y < config.sensor.flow[x].entityAdd.length; y++) {
                                    //   console.log("tflow added: " + entity[("flow_" + config.sensor.flow[x].entityAdd[y])]?.lm)
                                    tFlow += entity[("flow_" + config.sensor.flow[x].entityAdd[y])]?.lm;
                                }
                                if (config.sensor.flow[x].entitySubtract)
                                    for (let z = 0; z < config.sensor.flow[x].entitySubtract.length; z++) {
                                        tFlow -= entity[("flow_" + config.sensor.flow[x].entitySubtract[z])]?.lm;
                                    }
                                if (isFinite(tFlow) == true) {
                                    entity[flowNameEntity].lm = tFlow;
                                    nv.flow[flowName].total += tFlow / 60 / 1000;
                                    nv.flow[flowName].today += tFlow / 60;
                                }
                            }
                            //  console.log("flow raw : ", entity[config.sensor.flow[x].entity].state, "  - Flow LM: ", entity[flowName].lm)
                        }
                    },
                    meter: function () {
                        for (let x = 0; x < config.sensor.flow.length; x++) {
                            let flowName = config.sensor.flow[x].name;
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
                        delivery.check.shared(x); // should be removed if all is synced in DD start/stop, not needed here
                        let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                        if (auto.state) {
                            if (!st.run) {
                                if (!fault.flow) {
                                    if (cfg.enable) {
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
                            let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                            if (!warn.tankLow && press.out.state.meters <= (press.out.config.warn)) {
                                log(cfg.name + " - " + press.out.config.name + " is lower than expected (" + press.out.state.meters.toFixed(2)
                                    + press.out.config.unit + ") - possible hardware failure or low performance", 2);
                                warn.tankLow = true;
                            }
                        },
                        idle: {
                            not_faulted: {
                                conditions: function (x) {
                                    let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                                    if (press.out.config.unit == "m") {
                                        if (press.out.state.meters <= cfg.press.start) {
                                            log(cfg.name + " - " + press.out.config.name + " is low (" + press.out.state.meters.toFixed(2)
                                                + "m) - pump is starting");
                                            delivery.start(x);
                                            return true;
                                        }
                                    } else if (st.turbo) {
                                        //  console.log("turbo ", press.out.state.psi)
                                        if (press.out.state.psi <= cfg.press.turbo.start) {
                                            log(cfg.name + " - " + press.out.config.name + " is low (" + press.out.state.psi.toFixed(0)
                                                + "psi) - pump turbo is starting");
                                            delivery.start(x);
                                            return true;
                                        }
                                    } else if (st.profile != null) {
                                        //  console.log("profile pressure: ", press.out.state.psi, " - starting pressure: "
                                        //     + cfg.press.output.profile[ st.profile].start)
                                        if (press.out.state.psi <= cfg.press?.output?.profile?.[st.profile]?.start) {
                                            log(cfg.name + " - " + press.out.config.name + " is low (" + press.out.state.psi.toFixed(0)
                                                + "psi) - pump is starting with profile: " + st.profile);
                                            delivery.start(x);
                                            return true;
                                        }
                                    } else if (press.out.state.psi <= cfg.press.start) {
                                        //  console.log("current pressure: ", press.out.state.psi)
                                        log(cfg.name + " - " + press.out.config.name + " is low (" + press.out.state.psi.toFixed(0)
                                            + "psi) - pump is starting");
                                        delivery.start(x);
                                        return true;
                                    }
                                },
                                faults: function (x) {
                                    let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                                    if (st.timer.timeoutOff && !st.sharedPump.shared) {  // after pump has been off for a while
                                        for (const [index, element] of cfg.pump.entries()) {
                                            if (entity[element.entity]?.state) {
                                                log(cfg.name + " - pump: " + index + " - " + element.name
                                                    + " running in HA/ESP but not here - syncing state", 2);
                                                delivery.start(x, true);
                                                return true;
                                            }
                                        }

                                        if (!warn.flowFlush && flow?.[st.pump]?.lm > cfg.pump[st.pump].flow.startError) {
                                            log(cfg.name + " - flow is detected (" + flow[st.pump].lm.toFixed(0)
                                                + "lpm) possible sensor damage or flush operation", 2);
                                            warn.flowFlush = true;
                                            delivery.stop(x, "faulted");
                                            return;
                                        }
                                    }
                                }
                            },
                            faulted: function (x) {
                                let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                                if (st.timer.timeoutOff == true) {
                                    if (pump[st.pump].state === true
                                        || flow?.[st.pump]?.lm > cfg.pump[st.pump].flow.startError) {
                                        log(cfg.name + " - pump is flow faulted but pump is still ON, stopping again", 3);
                                        delivery.stop(x, "faulted");
                                        return;
                                    }
                                }
                            }
                        },
                        run: {
                            conditions: function (x) {
                                let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                                if (press.out.config.unit == "m") {
                                    if (press.out.state.meters >= cfg.press.stop) {
                                        log(cfg.name + " - " + press.out.config.name + " is full - pump is stopping");
                                        delivery.stop(x);
                                        return true;
                                    }
                                } else if (st.turbo) {
                                    if (press.out.state.psi >= cfg.press.turbo.stop) {
                                        log(cfg.name + " - " + press.out.config.name + " turbo shutoff pressure reached - pump is stopping");
                                        delivery.stop(x);
                                        return true;
                                    }
                                } else if (st.profile != null) {
                                    // if (cfg.pump[ st.pump].flow?.runStop != undefined) return; // ether dont specify stop pressure or set it high
                                    if (press.out?.state?.psi >= cfg.press?.output?.profile?.[st.profile]?.stop) {
                                        log(cfg.name + " - " + press.out.config.name + " pump profile: " + st.profile
                                            + " pressure reached: " + press.out.state.psi.toFixed(0) + " psi - pump is stopping");
                                        delivery.stop(x);
                                        return true;
                                    }
                                } else if (press.out.state.psi >= cfg.press?.output?.stop) {
                                    log(cfg.name + " - " + press.out.config.name + " shutoff pressure reached - pump is stopping");
                                    delivery.stop(x);
                                    return true;
                                }

                                if (cfg.press.output.riseTime != undefined) delivery.check.press.rise(x);

                                if (st.flow.check) {
                                    if (!st.flow.checkPassed) {
                                        if (delivery.check.flow.start(x)) return true;
                                    }
                                    else if (delivery.check.flow.run(x)) return true;
                                }
                            },
                            faults: function (x) {
                                let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                                if (cfg.pump[st.pump].press?.input?.sensor) {
                                    if (entity[cfg.pump[st.pump].press?.input.sensor]
                                        <= cfg.pump[st.pump].press?.input.minError) {
                                        log(cfg.name + " - input tank level is too low " + press.in.state.meters
                                            + "m - DD system shutting down", 3);
                                        delivery.stop(x, "faulted");
                                        return;
                                    } else if (warn.inputLevel == false && entity[cfg.pump[st.pump].press?.input.sensor]
                                        <= cfg.pump[st.pump].press?.input.minWarn) {
                                        log(cfg.name + " - input tank level is getting low " + press.in.state.meters
                                            + "m", 2);
                                        warn.inputLevel = true;
                                        return;
                                    }
                                }

                                if (!flow && st.timer.timeoutOn == true && pump[st.pump].state === false) {
                                    log(cfg.name + " - is out of sync - auto is on, system is RUN but pump is off", 2);
                                    delivery.start(x);
                                    return;
                                }
                                if (time.epoch - st.timer.run >= cfg.fault?.runLongError * 60) {
                                    log(cfg.name + " - pump: " + pump[st.pump].name
                                        + " - max runtime exceeded - DD system shutting down", 3);
                                    delivery.stop(x, "faulted");
                                    return;
                                }
                                if (!fault.runLong && time.epoch - st.timer.run >= cfg.fault?.runLongWarn * 60) {
                                    log(cfg.name + " - pump: " + pump[st.pump].name
                                        + " - runtime warning - current runtime: " + (time.epoch - st.timer.run), 2);
                                    fault.runLong = true;
                                    return;
                                }
                                if (press.in != undefined && press.in.state.meters <= cfg.press.input.minError) {
                                    log(cfg.name + " - input tank level is too low - auto is shutting down", 3);
                                    delivery.stop(x, "faulted");
                                    return;
                                }
                            }
                        },
                    },
                    offline: function (x) { // only faults
                        let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                        if (st.timer.timeoutOff == true) {
                            if (pump[st.pump].state === true && st.sharedPump.run == false) {        // this is mainly to sync the state of pump after a service restart
                                log(cfg.name + " - is out of sync - auto is off but pump is on - switching auto ON", 2);
                                send(auto.name, true);
                                auto.state = true;
                                delivery.start(x, true);
                                return;
                            }
                            if (flow?.[st.pump]?.lm > cfg.pump[st.pump].flow.startError
                                && warn.flowFlush == false && cfg.fault.flushWarning != false && st.sharedPump.shared == false) {
                                warn.flowFlush = true;
                                log(cfg.name + " - Auto is off but flow is detected (" + flow[st.pump].lm.toFixed(1)
                                    + ") possible sensor damage or flush operation", 2);
                                if (pump[st.pump].state === null || pump[st.pump].state == true) delivery.stop(x, true);
                                return;
                            }
                        }
                    },
                },
                start: function (x, runAlready) {
                    let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                    delivery.check.start_conditions(x);
                    fault.flow = false;
                    warn.runLong = false;
                    warn.flow = false;
                    warn.rise = false;
                    st.run = true;
                    st.cycleCount++;
                    st.flow.check = false;
                    st.flow.checkPassed = false;
                    st.flow.checkRunDelay = false; // debounce reset trigger
                    st.timer.run = time.epoch;
                    st.timer.timeoutOn = false;

                    setTimeout(() => { st.timer.timeoutOn = true }, 10e3);

                    if (press.out != undefined) {
                        if (press.out.config.unit == "m") st.pressStart = press.out.state.percent;
                        if (press.out.config.unit == "psi") st.pressStart = press.out.state.psi;
                    }

                    if (st.oneShot !== false) {
                        st.oneShotCount += 1;
                        if (cfg.oneShot.interrupt) {
                            log(cfg.name + " - terminating OneShot timer");
                            clearTimeout(st.oneShot);
                        } else if (cfg.oneShot.extend) {
                            log(cfg.name + " - pausing OneShot timer");
                            clearTimeout(st.oneShot);
                        }
                    }


                    if (flow.length > 0) {  // least 1 pump has a flow sensor
                        flow[st.pump].batch = nv.flow[cfg.pump[st.pump].flow.sensor].total;
                        if (runAlready) {
                            log(cfg.name + " - flow meter reenabled");
                            st.flow.check = true;
                            st.flow.checkPassed = true;
                        } else {
                            st.flow.timerCheck = setTimeout(() => {
                                st.flow.check = true;
                            }, cfg.pump[st.pump].flow.startWait * 1000);
                        }
                    }


                    if (cfg.control.reserve != undefined) {
                        if (entity[cfg.control.reserve].state == true) {
                            let pumpSelect = cfg.pump.findIndex(obj => obj.class === "reserve");
                            if (pumpSelect == -1) {
                                log(cfg.name + " - no reserve pump found - selecting pump 0 instead", 2);
                            } else log(cfg.name + " - selecting reserve pump: " + cfg.pump[pumpSelect].name);
                        }
                        else st.pump = 0;
                    } else st.pump = 0;



                    if (!runAlready) {
                        if (cfg.solenoid != undefined) {
                            log(cfg.name + " - opening solenoid");
                            send(cfg.solenoid.entity, true);
                            setTimeout(() => { startMotor(); }, 2e3);
                        } else startMotor();
                        function startMotor() {
                            log(cfg.name + " - " + color("cyan", "starting pump") + ": " + pump[st.pump].config.name
                                + " - cycle count: " + st.cycleCount + "  Time: " + (time.epoch - st.cycleTimer));
                            send(pump[st.pump].config.entity, true);
                        }
                    }
                },
                stop: function (x, faulted) {
                    let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                    let runTime = time.epoch - st.timer.run,
                        hours = Math.floor(runTime / 60 / 60),
                        minutes = Math.floor(runTime / 60),
                        extraSeconds = runTime % 60, lbuf, tFlow;


                    st.run = false;
                    st.timer.timeoutOff = false;
                    pump[st.pump].state = false;

                    delivery.check.shared(x);
                    if (st.sharedPump.run == false) {
                        lbuf = cfg.name + " - " + color("cyan", "stopping pump") + ": " + pump[st.pump].config.name
                            + " - Runtime: " + hours + "h:" + minutes + "m:" + extraSeconds + "s";
                        send(pump[st.pump].config.entity, false);
                    } else {
                        lbuf = cfg.name + " - " + color("cyan", "stopping ") + pump[st.pump].config.name
                            + " but pump still in use by " + config.dd[st.sharedPump.num].name + " - Runtime: "
                            + hours + "h:" + minutes + "m:" + extraSeconds + "s";
                    }

                    if (cfg.solenoid != undefined) {
                        setTimeout(() => {
                            log(cfg.name + " - closing solenoid");
                            send(cfg.solenoid.entity, false);
                        }, 4e3);
                    }

                    if (flow != undefined) {
                        //  st.flow.check = false;
                        tFlow = nv.flow[cfg.pump[st.pump].flow.sensor].total - flow[st.pump].batch;
                        log(lbuf + " - pumped "
                            + ((tFlow < 2.0) ? ((tFlow * 1000).toFixed(1) + "L") : (tFlow.toFixed(2) + "m3"))
                            + " - Average: "
                            + ((tFlow * 1000) / (time.epoch - st.timer.run) * 60).toFixed(1) + "lm");
                    } else log(lbuf);

                    setTimeout(() => { st.timer.timeoutOff = true }, 10e3);




                    if (faulted) {
                        log(cfg.name + " - " + color("red", "FAULTED") + " - Auto is going " + color("red", "OFFLINE"));
                        auto.state = false;
                        send(auto.name, false);

                        if (cfg.control.solar != undefined) {
                            log(cfg.name + " faulted - solar pump automation: " + cfg.control.solar + " - is going offline", 2);
                            send(cfg.control.solar, false);
                        }

                        clearTimeout(st.oneShot);
                        return;
                    }


                    if (st.oneShot !== false && cfg.oneShot?.extend) {
                        let duration;
                        if (cfg.oneShot.extendLiterMin) {
                            if ((tFlow * 1000) < cfg.oneShot.extendLiterMin) {
                                if (cfg.oneShot.extendRetry) {
                                    if (st.oneShotCount < cfg.oneShot.extendRetry) {
                                        log(cfg.name + " - OneShot minimum (" + cfg.oneShot.extendLiterMin
                                            + "L) batch flow not reached - attempt: " + st.oneShotCount);
                                        clearTimeout(st.oneShot);
                                    } else {
                                        log(cfg.name + " - OneShot minimum batch flow retries exceeded ("
                                            + st.oneShotCount + "L) - terminating OneShot and auto shutdown");
                                        send(auto.name, false);
                                        clearTimeout(st.oneShot);
                                        return;
                                    }
                                } else {
                                    log(cfg.name + " - OneShot minimum batch flow not reached - terminating OneShot and auto shutdown");
                                    send(auto.name, false);
                                    clearTimeout(st.oneShot);
                                    return;
                                }
                            } else {
                                if (cfg.oneShot.extendRetry) {
                                    log(cfg.name + " - OneShot minimum batch flow reached - resetting retry counter");
                                    st.oneShotCount = 0;
                                } else {
                                    log(cfg.name + " - OneShot minimum batch flow reached");
                                }
                                clearTimeout(st.oneShot);
                            }
                        }

                        log(cfg.name + " - extending OneShot timer");
                        clearTimeout(st.oneShot);
                        if (cfg.oneShot.durationEntity) duration = Math.trunc(entity[cfg.oneShot.durationEntity].state);
                        else if (cfg.oneShot.duration) duration = cfg.oneShot.duration;
                        st.oneShot = setTimeout(() => {
                            log(cfg.name + " - stopping OneShot operation after " + duration + " minutes of inactivity");
                            send(auto.name, false);
                            st.oneShot = false;
                        }, (duration * 60 * 1e3));
                    }
                },
                check: {
                    flow: {
                        start: function (x) {
                            let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                            let flowLM = flow[st.pump].lm, pumpConfig = cfg.pump[st.pump].flow, psi = press.out.state.psi.toFixed(0);
                            log(cfg.name + " - checking pump flow");
                            if (flowLM < pumpConfig.startError) {
                                fault.flow = true;
                                if (cfg.fault.retryCount && cfg.fault.retryCount > 0) {
                                    if (fault.flowRestarts < cfg.fault.retryCount) {
                                        log(cfg.name + " - " + color("red", "flow check FAILED") + " (" + flowLM.toFixed(1)
                                            + "lm) - " + psi + " psi - waiting for retry: " + (fault.flowRestarts + 1)
                                            + " - HA Pump State: " + pump[st.pump].state, 2);
                                        fault.flowRestarts++;
                                        clearTimeout(st.flow.timerRestart);
                                        st.flow.timerRestart = setTimeout(() => {
                                            log(cfg.name + " - no flow retry wait complete, pump reenabled");
                                            fault.flow = false;
                                        }, cfg.fault.retryWait * 1000);
                                    } else if (fault.flowRestarts == cfg.fault.retryCount && cfg.fault.retryFinal) {
                                        log(cfg.name + " - " + color("red", "low flow") + " (" + flowLM.toFixed(1)
                                            + "lm) - retries exceeded - Auto State: " + pump[st.pump].state
                                            + " - going offline for " + cfg.fault.retryFinal + "m", 3);
                                        fault.flowRestarts++;
                                        clearTimeout(st.flow.timerRestart);
                                        st.flow.timerRestart = setTimeout(() => {
                                            log(cfg.name + " - no flow retry extended wait complete, pump reenabled", 2);
                                            fault.flow = false;
                                        }, cfg.fault.retryFinal * 60 * 1000);
                                    } else {
                                        fault.flowRestarts++;
                                        log(cfg.name + " - " + color("red", "low flow") + " (" + flowLM.toFixed(1)
                                            + "lm) - all retries failed - Auto State: " + pump[st.pump].state
                                            + " - going OFFLINE permanently", 3);
                                        delivery.stop(x, "faulted");
                                        return true;
                                    }
                                } else {
                                    log(cfg.name + " - " + color("red", "low flow") + " (" + flowLM.toFixed(1) + "lm) HA State: "
                                        + pump[st.pump].state + " - pump retry not enabled - going OFFLINE permanently", 3);
                                    delivery.stop(x, "faulted");
                                    return true;
                                }
                                delivery.stop(x);
                                return true;
                            } else if (flowLM < pumpConfig.startWarn && warn.flowDaily == false) {
                                log(cfg.name + " - pump flow check " + color("yellow", "WARN") + " - flow not optimal ("
                                    + flowLM.toFixed(1) + "lm) - clean filter", 2);
                                st.flow.checkPassed = true;
                                fault.flowRestarts = 0;
                                warn.flowDaily = true;
                            } else {
                                log(cfg.name + " - pump flow check " + color("green", "PASSED") + " (" + flowLM.toFixed(1) + "lm)");
                                st.flow.checkPassed = true;
                                fault.flowRestarts = 0;
                            }
                        },
                        run: function (x) {
                            let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                            let flowLM = flow[st.pump].lm, pumpConfig = cfg.pump[st.pump].flow, psi = press.out.state.psi.toFixed(0);

                            if (pumpConfig.runStop != undefined) {
                                if (flowLM <= pumpConfig.runStop) {
                                    if (press <= cfg.press?.output?.profile?.[st.profile]?.start) {
                                        log(" - RUN flow stop (" + flowLM.toFixed(1) + "lm) - but tank still low - " + psi + " psi", 3);
                                        delivery.stop(x, "faulted");
                                        return true;
                                    } else if (press <= cfg.pump[st.pump]?.pressStopMin) {
                                        log(" - RUN flow stop (" + flowLM.toFixed(1) + "lm) - but did not meet minimum pressure - " + psi + " psi", 3);
                                        delivery.stop(x, "faulted");
                                        return true;
                                    } else
                                        trigger((" - RUN flow stop (" + flowLM.toFixed(1) + "lm) - pump stopping - " + psi + " psi"), false);
                                } else st.flow.checkRunDelay = false;
                            } else if (pumpConfig.runWarn != undefined) {
                                if (flowLM < pumpConfig.runWarn && !warn.flow) {
                                    log(" - RUN low flow (" + flowLM.toFixed(1) + "lm) - clean filter?");
                                    warn.flow = true;
                                }
                            } else if (pumpConfig.runError != undefined) {
                                if (flowLM < pumpConfig.runError) {
                                    trigger((" - RUN low flow (" + flowLM.toFixed(1) + "lm) HA State: "
                                        + pump[st.pump].state + " - going OFFLINE permanently"), true);
                                } else st.flow.checkRunDelay = false;
                            } else if (pumpConfig.runError == undefined) {
                                if (flowLM < pumpConfig.startError) {
                                    trigger((" - RUN low flow (" + flowLM.toFixed(1) + "lm) HA State: "
                                        + pump[st.pump].state + " - going OFFLINE permanently"), true);
                                } else st.flow.checkRunDelay = false;
                            }

                            function trigger(msg, error) {
                                if (st.flow.checkRunDelay == false) {
                                    st.timer.flow = time.epoch;
                                    st.flow.checkRunDelay = true;
                                    return;
                                } else if (time.epoch - st.timer.flow >= 3) {
                                    if (error) {
                                        log(cfg.name + msg, 3);
                                        delivery.stop(x, "faulted");
                                        return true;
                                    } else {
                                        log(cfg.name + msg, 1);
                                        delivery.stop(x);
                                        return true;
                                    }
                                }
                            }
                        },
                    },
                    press: {
                        rise: function (x) { // not yet in use?
                            let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);
                            if (time.epoch - st.timer.rise >= cfg.press.output.riseTime) {
                                if (press.out.config.unit == "m") {
                                    log("checking tank level rise, starting: " + st.pressStart + "  current: " + press.out.state.percent
                                        + "  difference: " + (press.out.state.percent - st.pressStart) + "%", 0);
                                    if (!(press.out.state.percent - st.pressStart) > cfg.press.out.riseError) {
                                        log(cfg.name + " - tank level not rising - DD system shutting down", 3);
                                        delivery.stop(x, "faulted");
                                        return;
                                    } else if (!(press.out.state.percent - st.pressStart) > cfg.press.out.riseWarn) {
                                        if (!warn.rise) {
                                            log(cfg.name + " - tank level rising slowly", 2);
                                            warn.rise = true;
                                        }
                                    }
                                    st.pressStart = press.out.state.percent;
                                }
                                if (press.out.config.unit == "psi") {
                                    log("checking tank pressure rise, starting: " + st.pressStart + "  current: " + press.out.state.percent
                                        + "  difference: " + (press.out.state.percent - st.pressStart) + "psi", 0);
                                    if (!(press.out.state.psi - st.pressStart) > cfg.press.out.riseError) {
                                        log(cfg.name + " - tank level not rising - DD system shutting down", 3);
                                        delivery.stop(x, "faulted");
                                        return;
                                    } else if (!(press.out.state.psi - st.pressStart) > cfg.press.out.riseWarn) {
                                        if (!warn.rise) {
                                            log(cfg.name + " - tank pressure rising slowly", 2);
                                            warn.rise = true;
                                        }
                                    }
                                    st.pressStart = press.out.state.psi;
                                }
                                st.timer.rise = time.epoch;
                            }
                        },
                    },
                    start_conditions: function (x) { // check start requirements
                        let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x);

                        // check that both press and flow stop are both not configured 
                        if (cfg.pump[st.pump].flow.runStop == null
                            && cfg.press?.output?.profile?.[st.profile].stop == null) {
                            log(cfg.name + " - config error - you must configure ether 'Flow runStop' or 'Press output profile stop'", 3);
                            send(auto.name, false);
                            auto.state = false;
                            return;
                        }

                        if (st.cycleCount == 0) {
                            st.cycleTimer = time.epoch;
                            st.timer.rise = time.epoch;
                        } else if (st.cycleCount > cfg.fault.cycleCount) {
                            if (time.epoch - st.cycleTimer < cfg.fault.cycleTime) {
                                log(cfg.name + " - pump is cycling to frequently - DD system shutting down", 3);
                                send(auto.name, false);
                                auto.state = false;
                                return;
                            } else { st.cycleTimer = time.epoch; st.cycleCount = 0; }
                        }


                        warn.inputLevel = false;
                        if (cfg.pump[st.pump].press?.input?.sensor) {
                            if (entity[cfg.pump[st.pump].press?.input.sensor]
                                <= cfg.pump[st.pump].press?.input.minError) {
                                log(cfg.name + " - pump specific input tank level is too low "
                                    + press.in.state.meters + "m - DD shutting down", 3);
                                send(auto.name, false);
                                auto.state = false;
                                fault.inputLevel = true;
                                return;
                            } else if (warn.inputLevel == false && entity[cfg.pump[st.pump].press?.input?.sensor]
                                <= cfg.pump[st.pump].press?.input?.minWarn) {
                                log(cfg.name + " - DD input tank level is getting low " + press.in.state.meters
                                    + "m", 2);
                                warn.inputLevel = true;
                                return;
                            }
                        } else if (press?.in?.state?.meters <= entity[cfg.pump[st.pump].press?.input?.sensor]) {
                            log(cfg.name + " - input tank level is too low - DD system shutting down", 3);
                            send(auto.name, false);
                            auto.state = false;
                            return;
                        }

                    },
                    shared: function (x) {  // discovers if other systems are currently using this same pump
                        let { st, cfg, auto, press, flow, pump, fault, warn } = delivery.pointers(x)
                        st.sharedPump = { shared: null, run: false, num: null };
                        for (let y = 0; y < config.dd[x].pump.length; y++) {
                            try { pump[y].state = entity[config.dd[x].pump[y].entity]?.state; } // sync pump entity state with local state
                            catch (error) {
                                console.trace("shared pump lookup error: ", error);
                                console.log("pump: ", pump[y]);
                                console.log("entity: " + config.dd[x].pump[y].entity, entity[config.dd[x].pump[y].entity]);
                            }
                        }
                        for (let y = 0; y < config.dd.length; y++) {
                            if (y != x && pump[st.pump].config.entity
                                == config.dd[y].pump[state.dd[y].state.pump].entity) { // if DD is not this DD and matches this DD's pump - its shared 
                                if (state.dd[y].state.run == true) st.sharedPump.run = true; // the other DD is still using the pump
                                else { setTimeout(() => { st.sharedPump.run = false; }, 10e3); }
                                st.sharedPump.shared = true;
                                st.sharedPump.num = y;
                                break;
                            }
                        }
                    },
                },
                pointers: function (x) {
                    ({ state, config, nv } = twit(_name));
                    let st = state.dd[x].state, cfg = config.dd[x], press = {}, flow = [],
                        fault = state.dd[x].fault, warn = state.dd[x].warn, pump = [];
                    let auto = {
                        get state() { return entity[cfg.control.auto]?.state },
                        set state(value) { entity[cfg.control.auto].state = value; },
                        name: cfg.control.auto
                    }

                    if (cfg.pump[st.pump].press?.input?.sensor)
                        press.in = {
                            config: config.sensor.press.find(obj => obj.name === cfg.pump[st.pump].press?.input?.sensor),
                            get state() { return entity[("press_" + cfg.pump[st.pump].press?.input?.sensor)] }
                        }
                    else if (cfg.press?.input?.sensor)
                        press.in = {
                            config: config.sensor.press.find(obj => obj.name === cfg.press.input.sensor),
                            get state() { return entity[("press_" + cfg.press.input.sensor)] }
                        }
                    if (cfg.press?.output?.sensor)
                        press.out = {
                            config: config.sensor.press.find(obj => obj.name === cfg.press.output.sensor),
                            get state() { return entity[("press_" + cfg.press.output.sensor)] },
                        }

                    cfg.pump.forEach(element => {
                        pump.push({
                            config: element,
                            get state() { return entity[element.entity]?.state; },
                            name: element.name
                        });
                        if (element.flow?.sensor != undefined)
                            flow.push(entity[("flow_" + element.flow.sensor)]);
                    });
                    return { st, cfg, auto, press, flow, pump, fault, warn };
                },
            }
            let fountain = {
                /*
                    fountain advanced time window - coordinate with solar power profile - fault run time 
                    solar fountain controls auto, when low sun, auto fountain resumes with pump stopped (fail safe)
                */
                auto: function fountain(x) {
                    let fount = { st: state.fountain[x], config: config.fountain[x] }
                    if (entity[fount.config.haAuto].state == true) {
                        if (fount.state.step == null) pumpFountain(x, true);
                        if (entity[fount.config.pump] == true) {
                            if (time.epochMin - fount.state.step >= fount.config.intervalOn) pumpFountain(x, false);
                        } else {
                            if (time.epochMin - fount.state.step >= fount.config.intervalOff) pumpFountain(x, true);
                        }
                    }
                    if (fount.state.flow.check) {
                        let flow = (entity[config.sensor.flow[fount.config.sensor.flow.entity].entity].state / 60).toFixed(0);
                        if (flow <= fount.config.sensor.flow.startError) {
                            log(fount.config.name + " - flow check FAILED: " + flow + "lpm - auto will shut down", 3);
                            send(fount.config.haAuto, false);
                            pumpFountain(x, false);
                            return;
                        }
                    }
                },
                pump: function (x, power) {
                    let fount = { st: state.fountain[x], config: config.fountain[x] }
                    fount.state.step = time.epochMin;
                    if (power) {
                        log(fount.config.name + " - is turning on");
                        send(config.esp[fount.config.pump], true);
                        if (fount.config.flow != undefined && fount.config.flow.entity != undefined) {
                            fount.state.timer.flow = setTimeout(() => {
                                let flow = (entity[config.flow[fount.config.flow.entity].entity].state / 60).toFixed(0);
                                log(fount.config.name + " - checking flow");
                                if (flow < fount.config.flow.startError) {
                                    log(fount.config.name + " - flow check FAILED: " + flow + "lpm - auto will shut down", 3);
                                    send(fount.config.haAuto, false);
                                    pumpFountain(x, false);
                                    return;
                                } else if (flow < fount.config.flow.startWarn) {
                                    log(fount.config.name + " - starting flow less than normal: " + flow + "lpm", 2);
                                    send(fount.config.haAuto, false);
                                } else {
                                    log(fount.config.name + " - flow check PASSED: " + flow + "lpm");
                                    fount.state.flow.check = true;
                                }
                            }, (fount.config.flow.startWait * 1e3));
                        }
                    } else {
                        log(fount.config.name + " - is turning off");
                        send(config.esp[fount.config.pump], false);
                        clearTimeout(fount.state.timer.flow);
                        fount.state.flow.check = false;
                    }
                }
            }
            let constructor = {
                init: function () {
                    log("loading constructors");
                    push["clear-oneShot"] = (number) => {
                        log(config.dd[number].name + " - clearing oneShot for DD: " + number);
                        clearTimeout(state.dd[number].state.oneShot);
                        state.dd[number].state.oneShot = false;
                    }
                    config.dd.forEach((cfg, x) => {
                        if (cfg.control.auto)
                            push[cfg.control.auto] = constructor.auto(state.dd[x], x, cfg );
                        if (cfg.control.turbo)
                            push[cfg.control.turbo] = constructor.turbo(state.dd[x], x, cfg );
                        if (cfg.control.profile)
                            push[cfg.control.profile] = constructor.profile(state.dd[x], x, cfg );
                        if (cfg.oneShot?.buttons) {
                            cfg.oneShot.buttons.forIn((name, value) => {
                                log("loading constructor for oneShot entity: " + name, 0);
                                push[name] = constructor.oneShot(state.dd[x], x, cfg, value);
                            })
                        }
                    });
                },
                auto: function (dd, index, cfg ) {
                    return (st) => {
                        if (st) {
                            if (!cfg.enable) {
                                log(cfg.name + " - system disabled - cannot go online", 2);
                                send(dd.auto.name, false);
                                entity[cfg.ha?.auto] && (entity[cfg.control.auto].state = false);
                                return;
                            }
                            log(cfg.name + " - is going ONLINE");
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
                            log(cfg.name + " - is going OFFLINE");
                            clearTimeout(dd.state.flow.timerRestart);
                            clearTimeout(dd.state.flow.timerCheck);
                            clearTimeout(dd.state.oneShot);
                            dd.state.oneShot = false;
                            dd.state.oneShotCount = false;
                            if (dd.state.run) delivery.stop(index);
                        }
                    };
                },
                oneShot: function (dd, index, cfg, button) {
                    return (st, name) => {
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
                                if (t === st) { action = key; break; }
                            }
                            if (action) break;
                        }

                        if (!action) return;

                        dd.state.button = name;
                        clearTimeout(dd.state.oneShot);

                        if (duration == null) {
                            if (cfg.oneShot.durationEntity && entity[cfg.oneShot.durationEntity]?.state)
                                duration = Math.trunc(entity[cfg.oneShot.durationEntity].state);
                            else if (cfg.oneShot.duration)
                                duration = cfg.oneShot.duration;
                            else {
                                log(cfg.name + " - no duration in entity or global - ignoring button press from: "
                                    + name + " - state: " + st, 2);
                                return;
                            }
                        }

                        // =====================================
                        // ACTION EXECUTION
                        // =====================================

                        if (action === "oneShot") {
                            if (!cfg.enable) {
                                log(cfg.name + " - system disabled - cannot perform one-shot - trigger: "
                                    + name + " - state: " + st, 2);
                                return;
                            }
                            if (entity[cfg.control.auto].state) {
                                log(cfg.name + " - auto already online - ignoring one-shot request - trigger: "
                                    + name + " - state: " + st, 2);
                                pumpUp();
                                return;
                            }
                            log(cfg.name + " - one shot operation - trigger: "
                                + name + " - state: " + st + " - stopping in " + duration + " min");
                            timeout();
                            send(cfg.control.auto, true);
                            pumpUp();
                        }

                        else if (action === "start") {
                            if (!cfg.enable) {
                                log(cfg.name + " - system disabled - cannot start system - trigger: " + name, 2);
                                return;
                            }
                            log(cfg.name + " - starting system - triggered by: " + name + " - state: " + st);
                            dd.state.oneShot = false;
                            send(cfg.control.auto, true);
                        }

                        else if (action === "stop") {
                            log(cfg.name + " - STOPPING system - triggered by: " + name + " - state: " + st);
                            send(cfg.control.auto, false);
                        }

                        // =====================================
                        // HELPERS
                        // =====================================
                        function pumpUp() {
                            if (cfg.oneShot.pumpUp) {
                                if (!dd.state.run) {
                                    log(cfg.name + " - starting Pump Up - trigger: " + name + " - state: " + state, 1);
                                    delivery.start(index);
                                } else {
                                    log(cfg.name + " - pump already running");
                                }
                            }
                        }
                        function timeout() {
                            dd.state.oneShot = setTimeout(() => {
                                log(cfg.name + " - stopping OneShot operation after " + duration + " minutes");
                                send(cfg.control.auto, false);
                                dd.state.oneShot = false;
                            }, (duration * 60 * 1e3));
                        }
                    };
                },
                turbo: function (dd, index, cfg ) {
                    return (st, name) => {
                        log(cfg.name + " - Turbo operation triggered by: " + name);
                        if (st == true) {
                            log(cfg.name + " - enabling pump turbo mode");
                            dd.state.turbo = true;
                        } else {
                            log(cfg.name + " - disabling pump turbo mode");
                            dd.state.turbo = false;
                        }
                        return;
                    };
                },
                profile: function (dd, index, cfg ) {
                    return (st, name) => {
                        log(cfg.name + " - pump profile change triggered by: " + name + " - new state: " + ~~state);
                        dd.state.profile = parseInt(st);
                        return;
                    };
                },
                fountain: function () {
                    return (st, name) => {
                        log(config.fountain[x].name + " - automation triggered by: " + name);
                        if (st == true) {
                            log(config.fountain[x].name + " auto is starting");
                            pumpFountain(x, true);
                        } else {
                            log(config.fountain[x].name + " auto is stopping");
                            pumpFountain(x, false);
                        }
                    };
                },
                example: function (dd, index, cfg ) {
                    return (st, name) => {


                    };
                },
            }
            function timer() {    // called every minute
                for (let x = 0; x < config.dd.length; x++) { state.dd[x].warn.flowFlush = false; }
                if (time.hour == 4 && time.min == 0) {
                    for (let x = 0; x < config.dd.length; x++) { state.dd[x].warn.flowDaily = false; } // reset low flow daily warning
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
                ({ state, config, nv, push } = twit(_name));
                if (config.sensor.flow) { // initialize NV data
                    nv.flow ||= {};
                    let found = false;
                    for (let x = 0; x < config.sensor.flow.length; x++) {
                        let flowName = config.sensor.flow[x].name;
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

                config.sensor.press.forEach(element => {
                    entity[("press_" + element.name)] ||= { average: [], step: 0, meters: null, psi: null, percent: null, volts: null, };
                });
                config.sensor.flow.forEach(element => {
                    entity[("flow_" + element.name)] ||= { lm: 0, temp: undefined, hour: 0, day: 0, batch: 0 };
                });
                config.fountain.forEach(element => {
                    state.fountain.push({ step: null, timerFlow: null, flowCheck: false, })
                });
                config.dd.forEach((cfg, x) => {
                    if (!cfg.enable) log(cfg.name + " - initializing - " + color("yellow", "DISABLED"));
                    else log(cfg.name + " - initializing");
                    state.dd.push({     // initialize volatile memory for each Demand Delivery system
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
                            rise: false,    // low level/pressure rise
                        },
                    })




                    if (cfg.press?.output?.profile != undefined) {  // concerning since both pumps and global profiles can exist
                        if (cfg.control.profile != undefined && cfg.press.output.profile.length > 0) {
                            log(cfg.name + " - profile selector enabled");
                            state.dd[x].state.profile = parseInt(entity[cfg.control.profile]?.state);
                        } else {
                            log(cfg.name + " - no profile entity - selecting profile 0");
                            state.dd[x].state.profile = 0;
                        }
                    }


                    if (cfg.control.turbo != undefined) {
                        state.dd[x].state.turbo = entity[cfg.control.turbo].state;
                    }






                });

                sensor.flow.calc();
                sensor.flow.meter();
                sensor.ha_push();

                state.timer.second = setInterval(() => {     // called every second  -  rerun this automation every second
                    sensor.flow.calc();
                    sensor.ha_push();
                    for (let x = 0; x < config.dd.length; x++) if (config.dd[x].enable) delivery.auto.control(x)  // delivery.auto_old(x);
                }, 1e3);
                setTimeout(() => {  // start minute timer aligned with system minute
                    timer(); sensor.flow.meter(); write();
                    state.timer.minute = setInterval(() => { timer(); sensor.flow.meter(); write(); }, 60e3);
                }, (60e3 - ((time.sec * 1e3) + time.mil)));
                state.timer.hour = setInterval(() => {     // called every hour  -  reset hourly notifications
                    config.dd.forEach((_, x) => {
                        state.dd[x].fault.overFlow = false;
                        state.dd[x].warn.tankLow = false;
                    });
                }, 3600e3);

                constructor.init();
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
                }
                else {
                    log("hot reload initiated");
                    clearInterval(state.timer.hour);
                    clearInterval(state.timer.minute);
                    clearInterval(state.timer.second);
                    state.dd.forEach(element => {
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
