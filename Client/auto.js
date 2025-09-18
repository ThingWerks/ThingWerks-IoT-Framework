#!/usr/bin/node
hotReload = {};
module.exports = {
    ha: {
        subscribe: [],
        sync: []
    },
    esp: {
        subscribe: [],
        heartbeat: []
    },
    automation: {
        example: function (_name, push) {
            let st, cfg, nv;
            if (!push) {
                config[_name] = {};     // initialize automation's configurations
                state[_name] = {};      // initialize automation's volatile memory
                pointers();
                /*

                    initialization logic goes here

                */
            } else {
                pointers();
                /*

                    event based logic goes here

                */
            }
            /*

                    common functions (for initialization and event shared functions) go here

            */
            if (!hotReload[_name]) {
                log("hot reload initiated");
                //clear event timers clearInterval(st.timer.second);
                state[_name] = undefined;
                config[_name] = undefined;
            }
            function pointers() {
                log = (m, l) => slog(m, l, _name);
                hotReload[_name] ||= true;
                nvMem[_name] ||= {};
                nv = nvMem[_name];
                cfg = config[_name];
                st = state[_name];
            }
        },
    }
}
