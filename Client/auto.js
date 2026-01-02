#!/usr/bin/node
module.exports = {
    entity: {
        subscribe: [],
        create: [],
        sync: {},
        heartbeat: [],
    },
    config: { // this can be removed if loading externally or upon each global.config[_name] declaration 
        // if using this for automation config, create an object for each below
        "---automation name here----": {},
        "---another automation name here----": {}
    },
    automation: {
        "---automation name here----": function (_name, _push, _reload) {
            try {
                let { state, config, nv, log, save, send, push } = _pointers(_name);
                if (_reload) {   // called after modification/reload of this automation file
                    if (_reload != "config") {
                        log("hot reload initiated");
                        //clear event timers clearInterval(state.timer.second);
                        if (push) push.forIn(name => { delete push[name]; })
                        push = {}; // clean up push initialization 
                    } else ({ state, config, nv } = _pointers(_name));
                    return;
                }

                /*
        
                        common functions (for initialization and push events) go here
        
                */


                if (_push === "init") { // ran only once - your initialization procedure
                    global.config[_name] = {};  // initialize automation's configurations here or from -c config File or from config object above
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
