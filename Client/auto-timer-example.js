#!/usr/bin/node
let state, config, nv, log, write, push, send, tool, twit = require("./twit.js").framework;
module.exports = {
    entity: {
        subscribe: [],
        heartbeat: {},
        sync: {
            house_stairs: ["switch.switch_test", "input_boolean.lights_stairs",],
            house_patio: ["switch.lights_outside_bedroom", "input_boolean.lights_bedroom_outside"],
            house_entrance: ["switch.lights_outside_entrance", "input_boolean.lights_house_entrance"],
        }
    },
    automation: {
        Compound: function (_name, _push, _reload) {
            try {
                ({ state, config, nv, log, write, push, send, tool } = twit(_name));
                function timer() {
                    if (time.hour == 5 && time.min == 15) {
                        log("Lights - Outside Lights - Turning OFF");
                        send("input_boolean.lights_stairs", false);
                        send("switch.relay_bodega_hall", false);
                        send("switch.relay_bodega_freezer_fujidenzo", false);
                        send("switch.relay_bodega_outside", false);
                        send("switch.relay_shed", false);
                        send("solar-relay6-lights", false);
                        send("switch.lights_bodega_front_1", false);
                        send("switch.lights_bodega_front_2", false);
                        send("switch.lights_outside_entrance", false);
                    }
                    if (time.hour == 5 && time.min == 30) {
                        log("Auto Bubon - Turning ON");
                        send("clear-oneShot", 0);
                        send("input_boolean.auto_bubon", true);
                    }
                    if (time.hour == 17 && time.min == 45) {
                        log("Lights - Outside Lights - Turning ON");
                        send("input_boolean.lights_stairs", true);
                        send("switch.lights_bodega_front_2", true);
                        send("switch.lights_outside_bedroom", true);
                        send("switch.lights_outside_entrance", true);
                        send("switch.relay_bodega_hall", true);
                        send("switch.relay_bodega_freezer_fujidenzo", true);
                        send("switch.relay_bodega_outside", true);
                        send("switch.relay_shed", true);
                        send("solar-relay6-lights", true);
                    }
                    if (time.hour == 21 && time.min == 0) {
                        send("input_boolean.auto_bubon", false);
                    }
                    if (time.hour == 20 && time.min == 30) {
                        send("switch.lights_outside_bedroom", false);
                    }
                }
                if (_push === "init") {
                    global._state[_name] = { boot: false, timer: null };
                    global._config[_name] ||= {};
                    ({ state, config, nv, push } = twit(_name));
                    log("automation is starting");
                    setTimeout(() => {  // start minute timer aligned with system minute
                        timer();
                        state.timer = setInterval(() => { timer(); }, 60e3);
                    }, (60e3 - ((time.sec * 1e3) + time.mil)));
                    return;
                }
                else if (_push) push[_push.name]?.(_push.state, _push.name);
                else if (_reload) {
                    if (push) push.forIn((name) => { delete push[name]; })
                    if (_reload == "config") { }
                    else {
                        log("hot reload initiated");
                        clearInterval(state.timer);
                    }
                    return;
                }

            } catch (error) { console.trace(error); process.exit(1); }
        },
    },
}
