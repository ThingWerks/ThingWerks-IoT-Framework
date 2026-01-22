#!/usr/bin/node
module.exports = { // exports added to clean up layout
    automation: {
        Pumper: function (_name, _push, _reload) {
            let { st, cfg, nv, log, write, send, push } = _pointers(_name);
            if (_reload) {
                if (_reload == "config") ({ st, cfg, nv } = _pointers(_name));
                else {
                    log("hot reload initiated");
                    clearInterval(st.timer.hour);
                    clearInterval(st.timer.minute);
                    clearInterval(st.timer.second);
                    st.dd.forEach(element => {
                        clearTimeout(element.state.flowTimerRestart);
                        clearTimeout(element.state.flowTimerCheck);
                        clearTimeout(element.state.oneShot);
                        clearInterval(element.state.flowTimerInterval);
                    });
                    if (global.push) push.forIn((name, value) => { delete global.push[name]; })
                }
                return;
            }
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
                        let value = [nv.flow[flowName].total, entity[flowNameEntity].hour, entity[flowNameEntity].day, entity[flowNameEntity].lm, nv.flow[flowName].today];
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
                auto: function (x) {
                    ({ st, cfg, nv } = _pointers(_name));
                    let dd = st.dd[x];
                    dd.cfg = cfg.dd[x];
                    delivery.shared(x);
                    switch (dd.auto.state) {
                        case true:                  // when Auto System is ONLINE
                            switch (dd.state.run) {
                                case false:     // when pump is STOPPED (local perspective)
                                    switch (dd.fault.flow) {
                                        case false: // when pump is STOPPED and not flow faulted
                                            if (dd.cfg.enable) {
                                                if (dd.press.out.cfg.unit == "m") {
                                                    if (dd.press.out.state.meters <= dd.cfg.press.start) {
                                                        log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.meters.toFixed(2)
                                                            + "m) - pump is starting");
                                                        delivery.start(dd, x);
                                                        return;
                                                    }
                                                } else if (dd.state.turbo) {
                                                    //  console.log("turbo ", dd.press.out.state.psi)
                                                    if (dd.press.out.state.psi <= dd.cfg.press.turbo.start) {
                                                        log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.psi.toFixed(0)
                                                            + "psi) - pump turbo is starting");
                                                        delivery.start(dd, x);
                                                        return;
                                                    }
                                                } else if (dd.state.profile != null) {
                                                    //  console.log("profile pressure: ", dd.press.out.state.psi, " - starting pressure: "
                                                    //     + dd.cfg.press.output.profile[dd.state.profile].start)
                                                    if (dd.press.out.state.psi <= dd.cfg.press.output.profile[dd.state.profile].start) {
                                                        log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.psi.toFixed(0)
                                                            + "psi) - pump is starting with profile: " + dd.state.profile);
                                                        delivery.start(dd, x);
                                                        return;
                                                    }
                                                } else if (dd.press.out.state.psi <= dd.cfg.press.start) {
                                                    //  console.log("current pressure: ", dd.press.out.state.psi)
                                                    log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is low (" + dd.press.out.state.psi.toFixed(0)
                                                        + "psi) - pump is starting");
                                                    delivery.start(dd, x);
                                                    return;
                                                }
                                                if (dd.state.timeoutOff == true) {  // after pump has been off for a while
                                                    if (dd.pump[dd.state.pump].state === true && dd.sharedPump.run == false) {
                                                        log(dd.cfg.name + " - pump running in HA/ESP but not here - switching pump ON");
                                                        delivery.start(dd, x);
                                                        return;
                                                    } else {
                                                        if (dd.flow != undefined && dd.flow[dd.state.pump].lm > dd.cfg.pump[dd.state.pump].flow.startError
                                                            && dd.warn.flowFlush == false && dd.sharedPump.shared == false) {
                                                            log(dd.cfg.name + " - flow is detected (" + dd.flow[dd.state.pump].lm.toFixed(0) + "lpm) possible sensor damage or flush operation", 2);
                                                            dd.warn.flowFlush = true;
                                                            log(dd.cfg.name + " - shutting down auto system");
                                                            send(dd.auto.name, false);
                                                            dd.auto.state = false;
                                                            delivery.stop(x, true);
                                                            return;
                                                        }
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
                                                    delivery.stop(x, true);
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
                                            delivery.stop(x);
                                            return;
                                        }
                                    } else if (dd.state.turbo) {
                                        if (dd.press.out.state.psi >= dd.cfg.press.turbo.stop) {
                                            log(dd.cfg.name + " - " + dd.press.out.cfg.name + " turbo shutoff pressure reached - pump is stopping");
                                            delivery.stop(x);
                                            return;
                                        }
                                    } else if (dd.state.profile != null) {
                                        // if (dd.cfg.pump[dd.state.pump].flow?.runStop != undefined) return; // ether dont specify stop pressure or set it high
                                        if (dd.press.out.state.psi >= dd.cfg.press.output.profile[dd.state.profile].stop) {
                                            log(dd.cfg.name + " - " + dd.press.out.cfg.name + " pump profile: " + dd.state.profile + " pressure reached: "
                                                + dd.press.out.state.psi.toFixed(0) + " psi - pump is stopping");
                                            delivery.stop(x);
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
                                        delivery.stop(x);
                                        return;
                                    }
                                    if (time.epoch - dd.state.timerRun >= dd.cfg.fault.runLongError * 60) {
                                        log(dd.cfg.name + " - pump: " + dd.pump[dd.state.pump].name + " - max runtime exceeded - DD system shutting down", 3);
                                        delivery.stop(x);
                                        send(dd.auto.name, false);
                                        dd.auto.state = false;
                                        return;
                                    }
                                    if (dd.flow == undefined && dd.state.timeoutOn == true && dd.pump[dd.state.pump].state === false) {
                                        log(dd.cfg.name + " - is out of sync - auto is on, system is RUN but pump is off", 2);
                                        delivery.start(dd, x);
                                        return;
                                    }
                                    if (dd.press.in != undefined && dd.press.in.state.meters <= dd.cfg.press.input.minError) {
                                        log(dd.cfg.name + " - input tank level is too low - DD system shutting down", 3);
                                        send(dd.auto.name, false);
                                        dd.auto.state = false;
                                        return;
                                    }


                                    if (dd.cfg.press.output.riseTime != undefined) delivery.check.press(dd);
                                    if (dd.flow != undefined) {
                                        if (dd.cfg.pump[dd.state.pump].flow.stopFlow != undefined && dd.flow[dd.state.pump].lm <= dd.cfg.pump[dd.state.pump].flow.stopFlow) {
                                            log(dd.cfg.name + " - stop flow rate reached - pump is stopping");
                                            delivery.stop(x);
                                            return;
                                        }
                                        delivery.check.flow(dd, x);
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
                                    delivery.start(dd, x, false);
                                    return;
                                }
                                if (dd.flow != undefined && dd.flow[dd.state.pump].lm > dd.cfg.pump[dd.state.pump].flow.startError
                                    && dd.warn.flowFlush == false && dd.cfg.fault.flushWarning != false && dd.sharedPump.shared == false) {
                                    dd.warn.flowFlush = true;
                                    log(dd.cfg.name + " - Auto is off but flow is detected (" + dd.flow[dd.state.pump].lm.toFixed(1) + ") possible sensor damage or flush operation", 2);
                                    if (dd.pump[dd.state.pump].state === null || dd.pump[dd.state.pump].state == true) delivery.stop(x, true);
                                    return;
                                }
                            }
                            break;
                    }
                    if (dd.press.out.state.meters >= (dd.cfg.press.stop + .12) && dd.fault.flowOver == false) {
                        log(dd.cfg.name + " - " + dd.press.out.cfg.name + " is overflowing (" + dd.press.out.state.meters
                            + dd.press.out.cfg.unit + ") - possible SSR or hardware failure", 3);
                        delivery.stop(x);
                        dd.fault.flowOver = true;
                    }
                },
                start: function (dd, x, sendOut) {
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
                        if (entity[dd.cfg.ha.reserve].state == true) {
                            let pumpSelect = dd.cfg.pump.findIndex(obj => obj.class === "reserve");
                            if (pumpSelect == -1) {
                                log(dd.cfg.name + " - no reserve pump found - selecting pump 0 instead", 2);
                            } else log(dd.cfg.name + " - selecting reserve pump: " + dd.cfg.pump[pumpSelect].name);
                        }
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


                    if (dd.state.oneShot !== false) {
                        dd.state.oneShotCount += 1;
                        if (dd.cfg.oneShot.interrupt) {
                            log(dd.cfg.name + " - terminating OneShot timer");/////////////////////////////////////////////////////////////////////////////////////
                            clearTimeout(dd.state.oneShot);
                        } else if (dd.cfg.oneShot.extend) {
                            log(dd.cfg.name + " - pausing OneShot timer");
                            clearTimeout(dd.state.oneShot);
                        }
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
                        dd.state.flowTimerCheck = setTimeout(() => {
                            log(dd.cfg.name + " - checking pump flow");
                            dd.state.flowCheck = true;
                            //automation[_name](_name, slog, send, file, nvMem, entity, state, config);
                            delivery.check.flow(dd, x);
                            dd.state.flowTimerInterval = setInterval(() => {
                                delivery.check.flow(dd, x);
                            }, 1e3);
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
                },
                stop: function (x, fault) {
                    let dd = st.dd[x], runTime = time.epoch - dd.state.timerRun,
                        hours = Math.floor(runTime / 60 / 60),
                        minutes = Math.floor(runTime / 60),
                        extraSeconds = runTime % 60, lbuf, tFlow;
                    dd.cfg = cfg.dd[x];
                    dd.state.run = false;
                    dd.state.timeoutOff = false;
                    dd.pump[dd.state.pump].state = false;

                    delivery.shared(x);
                    if (dd.sharedPump.run == false) {
                        lbuf = dd.cfg.name + " - stopping pump: " + dd.pump[dd.state.pump].cfg.name + " - Runtime: " + hours + "h:" + minutes + "m:" + extraSeconds + "s";
                        send(dd.pump[dd.state.pump].cfg.entity, false);
                    } else {
                        lbuf = dd.cfg.name + " - stopping " + dd.pump[dd.state.pump].cfg.name + " but pump still in use by "
                            + cfg.dd[dd.sharedPump.num].name + " - Runtime: " + hours + "h:" + minutes + "m:" + extraSeconds + "s";
                    }

                    if (fault == true) {
                        if (dd.cfg.ha.solar != undefined) {
                            log(dd.cfg.name + " faulted - solar pump automation: " + dd.cfg.ha.solar + " - is going offline", 2);
                            send(dd.cfg.ha.solar, false);
                        }
                    }

                    if (dd.cfg.solenoid != undefined) {
                        setTimeout(() => {
                            log(dd.cfg.name + " - closing solenoid");
                            send(dd.cfg.solenoid.entity, false);
                        }, 4e3);
                    }

                    if (dd.flow != undefined) {
                        dd.state.flowCheck = false;
                        clearInterval(dd.state.flowTimerInterval);
                        tFlow = nv.flow[dd.cfg.pump[dd.state.pump].flow.sensor].total
                            - dd.flow[dd.state.pump].batch;
                        log(lbuf + " - pumped "
                            + ((tFlow < 2.0) ? ((tFlow * 1000).toFixed(1) + "L") : (tFlow.toFixed(2) + "m3"))
                            + " - Average: "
                            + ((tFlow * 1000) / (time.epoch - dd.state.timerRun) * 60).toFixed(1) + "lm");
                    } else log(lbuf);

                    setTimeout(() => { dd.state.timeoutOff = true }, 10e3);

                    if (dd.state.oneShot !== false && dd.cfg.oneShot.extend) {
                        let duration;
                        if (dd.cfg.oneShot.extendLiterMin) {
                            if ((tFlow * 1000) < dd.cfg.oneShot.extendLiterMin) {
                                if (dd.cfg.oneShot.extendRetry) {
                                    if (dd.state.oneShotCount < dd.cfg.oneShot.extendRetry) {
                                        log(dd.cfg.name + " - OneShot minimum (" + dd.cfg.oneShot.extendLiterMin
                                            + "L) batch flow: " + ~~(tFlow * 1000) + " not reached - attempt: " + dd.state.oneShotCount, 1);
                                        clearTimeout(dd.state.oneShot);
                                    } else {
                                        log(dd.cfg.name + " - OneShot minimum batch flow retries exceeded ("
                                            + dd.state.oneShotCount + ") - terminating OneShot and auto shutdown", 1);
                                        send(dd.cfg.ha.auto, false);
                                        clearTimeout(dd.state.oneShot);
                                        return;
                                    }
                                } else {
                                    log(dd.cfg.name + " - OneShot minimum batch flow not reached - terminating OneShot and auto shutdown", 1);
                                    send(dd.cfg.ha.auto, false);
                                    clearTimeout(dd.state.oneShot);
                                    return;
                                }
                            } else {
                                if (dd.cfg.oneShot.extendRetry) {
                                    log(dd.cfg.name + " - OneShot minimum batch flow reached - resetting retry counter", 1);
                                    dd.state.oneShotCount = 0;
                                } else {
                                    log(dd.cfg.name + " - OneShot minimum batch flow reached", 1);
                                }
                                clearTimeout(dd.state.oneShot);
                            }
                        }

                        log(dd.cfg.name + " - extending OneShot timer", 1);
                        clearTimeout(dd.state.oneShot);
                        if (dd.cfg.oneShot.durationEntity) duration = Math.trunc(entity[dd.cfg.oneShot.durationEntity].state);
                        else if (dd.cfg.oneShot.duration) duration = dd.cfg.oneShot.duration;
                        dd.state.oneShot = setTimeout(() => {
                            log(dd.cfg.name + " - stopping OneShot operation after " + duration + " minutes of inactivity");
                            send(dd.cfg.ha.auto, false);
                            dd.state.oneShot = false;
                            dd.state.oneShotCount = false;
                        }, (duration * 60 * 1e3));
                    }
                },
                check: {
                    flow: function (dd, x) {
                        let flow = dd.flow[dd.state.pump].lm, pumpConfig = dd.cfg.pump[dd.state.pump].flow, press = dd.press.out.state.psi.toFixed(0);
                        if (dd.state.flowCheck == true) {
                            if (dd.state.flowCheckPassed == false) {
                                if (flow < pumpConfig.startError) {
                                    dd.fault.flow = true;
                                    if (dd.cfg.fault.retryCount && dd.cfg.fault.retryCount > 0) {
                                        if (dd.fault.flowRestarts < dd.cfg.fault.retryCount) {
                                            log(dd.cfg.name + " - flow check FAILED!! (" + flow.toFixed(1) + "lm) - " + press + " psi - HA Pump State: "
                                                + dd.pump[dd.state.pump].state + " - waiting for retry " + (dd.fault.flowRestarts + 1), 2);
                                            dd.fault.flowRestarts++;
                                            clearTimeout(dd.state.flowTimerRestart);
                                            dd.state.flowTimerRestart = setTimeout(() => {
                                                log(dd.cfg.name + " - no flow retry wait complete, pump reenabled");
                                                dd.fault.flow = false;
                                            }, dd.cfg.fault.retryWait * 1000);
                                        } else if (dd.fault.flowRestarts == dd.cfg.fault.retryCount && dd.cfg.fault.retryFinal) {
                                            log(dd.cfg.name + " - low flow (" + flow.toFixed(1) + "lm) HA State: "
                                                + dd.pump[dd.state.pump].state + " - retries exceeded - going offline for " + dd.cfg.fault.retryFinal + "m", 3);
                                            dd.fault.flowRestarts++;
                                            clearTimeout(dd.state.flowTimerRestart);
                                            dd.state.flowTimerRestart = setTimeout(() => {
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
                                    // theres an issues here. when delivery.stop os called, it should clear the flock check interval instantly but after 1 second
                                    // if dd.state.flowCheck = false;  isnt set, interval still calls flock check function throwing multiple retry/errors. why?
                                    // even if setting/clearing global.stat[_name].dd[x].state.flowTimerInterval doesnt not take effect. 
                                    // dd.state.flowCheck = false;   // moving this to delivery.stop
                                    delivery.stop(x, true);
                                } else if (flow < pumpConfig.startWarn && dd.warn.flowDaily == false) {
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








                                // this should not be a run else chain, make runWarn 











                                if (pumpConfig.runStop != undefined) {
                                    if (flow <= pumpConfig.runStop) {
                                        trigger((" - RUN flow stop (" + flow.toFixed(1) + "lm) - pump stopping - " + press + " psi"), false);
                                    } else dd.state.flowCheckRunDelay = false;
                                } else if (pumpConfig.runError != undefined) {
                                    if (flow < pumpConfig.runError) {
                                        trigger((" - RUN low flow (" + flow.toFixed(1) + "lm) HA State: "
                                            + dd.pump[dd.state.pump].state + " - going OFFLINE permanently"), true);
                                    } else dd.state.flowCheckRunDelay = false;
                                } else if (pumpConfig.runError == undefined) {
                                    if (flow < pumpConfig.startError) {
                                        trigger((" - RUN low flow (" + flow.toFixed(1) + "lm) HA State: "
                                            + dd.pump[dd.state.pump].state + " - going OFFLINE permanently"), true);
                                    } else dd.state.flowCheckRunDelay = false;
                                }



                                function trigger(msg, error) {
                                    if (dd.state.flowCheckRunDelay == false) {
                                        dd.state.timerFlow = time.epoch;
                                        dd.state.flowCheckRunDelay = true;
                                        return;
                                    } else if (time.epoch - dd.state.timerFlow >= 3) {
                                        if (error) {
                                            log(dd.cfg.name + msg, 3);
                                            send(dd.auto.name, false);
                                            dd.auto.state = false;
                                            delivery.stop(x, true);
                                        } else {
                                            log(dd.cfg.name + msg, 1);
                                            delivery.stop(x);
                                        }
                                    }
                                }
                            }
                        }
                    },
                    press: function (dd) {
                        if (time.epoch - dd.state.timerRise >= dd.cfg.press.output.riseTime) {
                            if (dd.press.out.cfg.unit == "m") {
                                log("checking pressure rise, starting: " + dd.state.pressStart + "  current: " + dd.press.out.state.percent
                                    + "  difference: " + (dd.press.out.state.percent - dd.state.pressStart) + "%", 0);
                                if (!(dd.press.out.state.percent - dd.state.pressStart) > dd.cfg.press.outputRiseError) {
                                    if (type == 0) log(dd.cfg.name + " - tank level not rising - DD system shutting down", 3);
                                    send(dd.auto.name, false);
                                    dd.auto.state = false;
                                    delivery.stop(x, true)
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
                                    delivery.stop(x, true)
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
                },
                shared: function (x) {  // discovers if other systems are currently using this same pump
                    let dd = st.dd[x];
                    dd.sharedPump = { shared: null, run: false, num: null };
                    for (let y = 0; y < cfg.dd[x].pump.length; y++) {
                        try { dd.pump[y].state = entity[cfg.dd[x].pump[y].entity]?.state; }
                        catch (error) {
                            console.trace("shared pump lookup error: ", error);
                            console.log("pump: ", dd.pump[y]);
                            console.log("entity: " + cfg.dd[x].pump[y].entity, entity[cfg.dd[x].pump[y].entity]);
                        }
                    }
                    for (let y = 0; y < cfg.dd.length; y++) {
                        if (y != x && dd.pump[dd.state.pump].cfg.entity == cfg.dd[y].pump[st.dd[y].state.pump].entity) {
                            if (st.dd[y].state.run == true) dd.sharedPump.run = true;
                            else { setTimeout(() => { dd.sharedPump.run = false; }, 10e3); }
                            dd.sharedPump.shared = true;
                            dd.sharedPump.num = y;
                            break;
                        }
                    }
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
                    if (fount.state.flowCheck) {
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
            }
            let push_constructor = {
                auto: function (dd, index, config) {
                    return (state) => {
                        if (state) {
                            if (!config.enable) {
                                log(config.name + " - system disabled - cannot go online", 2);
                                send(dd.auto.name, false);
                                return;
                            }
                            log(config.name + " - is going ONLINE");
                            dd.auto.state = true;
                            dd.fault.flow = false;
                            dd.fault.flowRestarts = 0;
                            dd.fault.inputLevel = false;
                            dd.warn.tankLow = false;
                            dd.warn.inputLevel = false;
                            dd.state.cycleTimer = time.epoch;
                            dd.state.cycleCount = 0;
                            clearTimeout(dd.state.flowTimerRestart);
                        } else {
                            log(config.name + " - is going OFFLINE - pump is stopping");
                            clearTimeout(dd.state.flowTimerRestart);
                            clearTimeout(dd.state.flowTimerCheck);
                            clearInterval(dd.state.flowTimerInterval);
                            dd.auto.state = false;
                            clearTimeout(dd.state.oneShot);
                            dd.state.oneShot = false;
                            dd.state.oneShotCount = false;
                            delivery.stop(index);
                        }
                    };
                },
                oneShot: function (dd, index, config) {
                    return (state, name) => {
                        let duration;
                        clearTimeout(dd.state.oneShot);
                        if (config.oneShot.durationEntity) duration = Math.trunc(entity[config.oneShot.durationEntity].state);
                        else if (config.oneShot.duration) duration = config.oneShot.duration;
                        else { log(config.name + " - no duration entity or global value set - ignoring", 2); return; }
                        if (!dd.state.oneShotCount) dd.state.oneShotCount = 0;

                        if (state?.includes("remote_button_")) {  // for zigbee buttons
                            if (state?.includes("remote_button_short_press")) {
                                if (!config.enable) {
                                    log(config.name + " - system disabled - cannot perform one-shot - trigger: " + name, 2);
                                    return;
                                }
                                if (entity[config.ha.auto].state) {
                                    log(config.name + " - auto already online - ignoring one-shot request - trigger: " + name, 2);
                                    if (config.oneShot.pumpUp) {
                                        log(config.name + " - starting Pump Up - trigger: " + name, 2);
                                        delivery.start(dd, index);
                                    }
                                    return;
                                }
                                log(config.name + " - starting one shot operation - " + "trigger: "
                                    + name + " - stopping in " + duration + " min");
                                timeout();
                                send(config.ha.auto, true);
                                if (config.oneShot.pumpUp) delivery.start(dd, index);
                            } else if (state?.includes("remote_button_double_press")) {
                                if (!config.enable) {
                                    log(config.name + " - system disabled - cannot start system", 2);
                                    return;
                                }
                                log(config.name + " - starting system - " + "triggered by: " + name);
                                dd.state.oneShot = false;
                                send(config.ha.auto, true);
                            } else if (state?.includes("remote_button_long_press")) {
                                log(config.name + " - STOPPING system - " + "triggered by: " + name);
                                send(config.ha.auto, false);
                            }
                        } else {    // for home assistant buttons
                            if (!config.enable) {
                                log(config.name + " - system disabled - cannot perform one-shot - trigger: " + name, 2);
                                return;
                            }
                            if (entity[config.ha.auto].state) {
                                log(config.name + " - auto already online - ignoring one-shot request - trigger: " + name, 2);
                                if (config.oneShot.pumpUp) {
                                    log(config.name + " - starting Pump Up - trigger: " + name, 2);
                                    delivery.start(dd, index);
                                }
                                return;
                            }
                            log(config.name + " - starting one shot operation - " + "triggered by: "
                                + name + " - stopping in " + duration + " min");
                            timeout();
                            send(config.ha.auto, true);
                            if (config.oneShot.pumpUp) delivery.start(dd, index);
                        }
                        function timeout() {
                            dd.state.oneShot = setTimeout(() => {
                                log(config.name + " - stopping OneShot operation after " + duration + " minutes");
                                send(config.ha.auto, false);
                                dd.state.oneShot = false;
                                dd.state.oneShotCount = false;
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
                        log(config.name + " - pump profile change triggered by: " + name);
                        log(config.name + " - pump profile changing to mode: " + ~~state);
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
                        cfg: config,
                        state: {
                            run: false,
                            oneShot: false,
                            turbo: false,
                            profile: null,
                            pump: 0,
                            flow: {
                                check: false,
                                checkPassed: false,
                                checkRunDelay: false,
                                timerCheck: null,
                                timerRestart: null,
                                timerInterval: null,
                            },
                            flowCheck: false,
                            flowCheckPassed: false,
                            flowCheckRunDelay: false,
                            flowTimerCheck: null,
                            flowTimerRestart: null,
                            flowTimerInterval: null,
                            timer: {
                                timeoutOff: true,
                                timeoutOn: false,
                                timerFlow: null, // for run flow fault delay
                                timerRun: null,
                                timerRise: null,
                            },
                            timeoutOff: true,
                            timeoutOn: false,
                            timerFlow: null, // for run flow fault delay
                            timerRun: null,
                            timerRise: null,
                            cycleCount: 0,
                            pressStart: null,
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
                        auto: { get state() { return entity[config.ha.auto]?.state }, name: config.ha.auto },
                        press: {
                            in: (config.press.input != undefined && config.press.input.sensor) ? {
                                cfg: cfg.sensor.press.find(obj => obj.name === config.press.input.sensor),
                                get state() { return entity[("press_" + config.press.input.sensor)] }
                            } : undefined,
                            out: (config.press.output != undefined && config.press.output.sensor) ? {
                                cfg: cfg.sensor.press.find(obj => obj.name === config.press.output.sensor),
                                get state() { return entity[("press_" + config.press.output.sensor)] },
                            } : undefined,
                        },
                        pump: [],
                    })
                    let dd = st.dd[x];
                    for (let y = 0; y < config.pump.length; y++) {
                        dd.pump.push({
                            cfg: config.pump[y],
                            get state() { return entity[config.pump[y].entity]?.state; },
                            name: config.pump[y].entity
                        });
                        if (config.pump[y].flow != undefined & config.pump[y].flow.sensor != undefined) {
                            dd.flow ||= [];
                            dd.flow.push(entity[("flow_" + config.pump[y].flow.sensor)])
                        }
                    }
                    if (config.press != undefined && config.press.output != undefined
                        && config.press.output.profile != undefined) {
                        if (config.ha.profile != undefined && config.press.output.profile.length > 0) {
                            log(config.name + " - profile selector enabled");
                            dd.state.profile = parseInt(entity[config.ha.profile]?.state);
                        } else {
                            log(config.name + " - no profile entity - selecting profile 0");
                            dd.state.profile = 0;
                        }
                    }
                    if (config.ha.turbo != undefined) {
                        dd.state.turbo = entity[config.ha.turbo].state;
                    }
                });

                sensor.flow.calc();
                sensor.flow.meter();
                sensor.ha_push();

                st.timer.second = setInterval(() => {     // called every second  -  rerun this automation every second
                    sensor.flow.calc();
                    sensor.ha_push(state);
                    for (let x = 0; x < cfg.dd.length; x++) if (cfg.dd[x].enable) delivery.auto(x);
                }, 1e3);
                setTimeout(() => {  // start minute timer aligned with system minute
                    timer(); sensor.flow.meter(); write();
                    st.timer.minute = setInterval(() => { timer(); sensor.flow.meter(); write(); }, 60e3);
                }, (60e3 - ((time.sec * 1e3) + time.mil)));
                st.timer.hour = setInterval(() => {     // called every hour  -  reset hourly notifications
                    cfg.dd.forEach((_, x) => {
                        let dd = st.dd[x];
                        dd.fault.flowOver = false;
                        dd.warn.tankLow = false;
                    });
                }, 3600e3);

                log("loading constructors");
                push["clear-oneShot"] = (number) => {
                    log(cfg.dd[number].name + " - clearing oneShot");
                    clearTimeout(st.dd[number].oneShot);
                    st.dd[number].oneShot = false;
                }
                cfg.dd.forEach((config, x) => {
                    let dd = st.dd[x];
                    push[dd.auto.name] = push_constructor.auto(dd, x, config);
                    push[config.ha.turbo] = push_constructor.turbo(dd, x, config);
                    push[config.ha.profile] = push_constructor.profile(dd, x, config);
                    if (config.oneShot?.buttons) {
                        for (const key of config.oneShot.buttons) {
                            // log("loading constructor for oneshot entity: " + key)
                            push[key] = push_constructor.oneShot(dd, x, config);
                        }
                    }
                });
                cfg.fountain.forEach(config => {
                    push[config.haAuto] = push_constructor.fountain();
                });

            } else push[_push.name]?.(_push.state, _push.name);
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
