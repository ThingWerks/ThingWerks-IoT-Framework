#!/usr/bin/node
module.exports = {
    sync: [],
    heartbeat: [],
    automation: {
        yourAutomationsName: function (_name, _push, _reload) {
            try {
                let { state, config, nv, log, save, send, push } = _pointers(_name);
                if (_reload) {   // called after modification/reload of this automation file
                    if (_reload != "config") {
                        log("hot reload initiated");
                        //clear event timers clearInterval(state.timer.second);
                        if (push) push.forIn((name, value) => { delete push[name]; })
                        push = {}; // clean up push initialization 
                    } else ({ state, config, nv } = _pointers(_name));
                    return;
                }
                if (_push === "init") { // ran only once - your initialization procedure
                    global.config[_name] = {};  // initialize automation's configurations or from -c config File
                    global.state[_name] = {};   // initialize automation's volatile memory
                    global.nv[_name] ||= {};    // initialize automation's non-volatile memory
                    global.push[_name] = {};    // initialize push functions 
                    ({ state, config, nv, push } = _pointers(_name)); // call pointers directly after config and state initialization 

                    /*
        
                        initialization logic goes here
        
                    */
                    //  example push
                    //  push["input_boolean.test"] = (pushState, pushName) => { test2() }

                    return;
                } else push[_push.name]?.(_push.state, _push.name);    // called with every incoming push event

                /*
        
                        common functions (for initialization and push events) go here
        
                */

            } catch (error) { console.trace(error) }
        },
        example2: function (_name, _push, _reload) {     // add another automation 
            try {
                let { state, config, nv, log, save, send, push } = _pointers(_name);
                if (_reload) {   // called after modification/reload of this automation file
                    if (_reload != "config") {
                        log("hot reload initiated");
                        if (push) push.forIn((name, value) => { delete push[name]; })
                        push = {};  // clean up push initialization 
                    } else ({ state, config, nv } = _pointers(_name));// called after modification/reload of this automations config file
                    return;
                }
                if (_push === "init") { // ran only once
                    global.config[_name] = {};     // initialize automation's configurations
                    global.state[_name] = {};      // initialize automation's volatile memory
                    global.nv[_name] ||= {};    // initialize automation's non-volatile memory
                    global.push[_name] = {};    // initialize push functions 
                    ({ state, config, nv, push } = _pointers(_name)); // you must call pointers directly after config, state and or NV initialization 
                    // init sequence here
                    return;
                } else push[_push.name]?.(_push.state, _push.name);
                /* common functions (for initialization and event shared functions) go here */
            } catch (error) { console.trace(error) }
        },
    },
}
let _pointers = (_name) => {
    push[_name] ||= {}
    return {
        state: state[_name] ?? undefined,
        config: config[_name] ?? undefined,
        nv: nv[_name] ?? undefined,
        push: push[_name] ?? undefined,
        log: (m, l) => slog(m, l, _name),
        save: () => writeNV(_name),
        send: (name, state, unit, address) => { core("state", { name, state, unit, address }, _name) },
    }
}
