#!/usr/bin/node
module.exports = {
    ha: {
        subscribe: [],
        sync: []
    },
    esp: {
        subscribe: [],
        heartbeat: []
    },
    config: {
        yourAutomationsName: {
            entities: [
                //   "input_boolean.test_switch"
            ],
           // configTest: "testing123"
        }
    },
    automation: {
        yourAutomationsName: function (_name, _push, _reload) {
            try {
                let { st, cfg, nv, log, writeNV } = _pointers(_name);
                if (_reload) {   // called after modification/reload of this automation file
                    if (_reload != "config") {
                        log("hot reload initiated");
                        //clear event timers clearInterval(st.timer.second);
                    } else ({ st, cfg, nv } = _pointers(_name));
                    return;
                }
                if (_push === "init") { // ran only once - your initialization procedure
                    config[_name] = {};     // initialize automation's configurations or from -c config File
                    state[_name] = {};      // initialize automation's volatile memory
                    nvMem[_name] ||= {};    // initialize automation's non-volatile memory
                    ({ st, cfg, nv } = _pointers(_name)); // call pointers directly after config and state initialization 

                    /*
        
                        initialization logic goes here
        
                    */

                    return;
                } else {    // called with every incoming push event

                    /*
        
                        event based logic goes here
        
                    */

                }

                /*
        
                        common functions (initialization and push events) go here
        
                */

            } catch (error) { console.trace(error) }
        },
        example2: function (_name, _push, _reload) {     // add another automation 
            try {
                let { st, cfg, nv, log, writeNV } = _pointers(_name);
                if (_reload) {   // called after modification/reload of this automation file
                    if (_reload != "config") { 
                        log("hot reload initiated");
                    } else ({ st, cfg, nv } = _pointers(_name)); // called after modification/reload of this automations config file
                    return;
                }
                if (_push === "init") { // ran only once
                    config[_name] = {};     // initialize automation's configurations
                    state[_name] = {};      // initialize automation's volatile memory
                    nvMem[_name] ||= {};    // initialize automation's non-volatile memory
                    ({ st, cfg, nv } = _pointers(_name)); // you must call pointers directly after config, state and or NV initialization 
                    // init sequence here
                    return;
                } else { }  // event based logic goes here
                /* common functions (for initialization and event shared functions) go here */
            } catch (error) { console.trace(error) }
        },
    },
}
let _pointers = (_name) => {
    return {
        st: state[_name] ?? undefined,
        cfg: config[_name] ?? undefined,
        nv: nvMem[_name] ?? undefined,
        log: (m, l) => slog(m, l, _name),
        write: () => file.write.nv(_name),
        send: (name, state, unit, address) => { core("state", { name, state, unit, address }, _name) },
    }
}
