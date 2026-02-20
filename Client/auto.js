#!/usr/bin/node
module.exports(_shared) = {
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

                /*
        
                        your automation functions go here (below pointer call and above _push==init)
        
                */

                if (_push === "init") { // ran only once - your initialization procedure
                    global.config[_name] = {};  // initialize automation's configurations here or from -c config File or from config object above
                    global.state[_name] = {};   // initialize automation's volatile memory
                    global.nv[_name] ||= {};    // initialize automation's non-volatile memory
                    global.push[_name] = { "myEntity": () => { console.log("test") } };    // initialize push functions 
                    ({ state, config, nv, push } = _pointers(_name)); // call pointers directly after global declarations

                    /*
        
                        your initialization logic goes here
                        also initialize or call constructor functions from here here 
        
                    */
                    //  example push
                    //  push["input_boolean.test"] = (pushState, pushName) => { test2() }

                    return;
                }
                else if (_push) push[_push.name]?.(_push.state, _push.name);
                else if (_reload) {   // called after modification/reload of this automation file
                    if (push) push.forIn((name) => { delete push[name]; }) // destroy all push calls 
                    if (_reload == "config") {
                        log("config hot reload initiated");

                        // re-initialize/call your constructor function here
                        // _push === "init" is not called on a config file reload

                    } else {
                        log("automation hot reload initiated");
                        ({ state, config, nv } = _pointers(_name));

                        // clear you event timers/intervals here.  ie. clearInterval(state.timer.second);
                        // _push === "init" will be called again

                    }
                    return;
                }
            } catch (error) { console.trace(error); process.exit(1); } // quite the process on error is usually safer than continue running 
        },
    },
}
let _pointers = (_name) => {
    return {
        state: state[_name] ?? undefined,
        config: config[_name] ?? undefined,
        nv: nv[_name] ?? undefined,
        push: push[_name] ||= {},
        log: (m, l) => slog(m, l, _name),
        write: () => writeNV(_name),
        send: (name, state, unit, address) => { core("state", { name, state, unit, address }, _name) },
    }
}
