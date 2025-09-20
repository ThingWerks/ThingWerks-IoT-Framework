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
    automation: {
        example: function (_name, push, _reload) {
            let st, cfg, nv, log; _pointers();
            if (_reload) {   // called after modification/reload of this automation file
                log("hot reload initiated");
                //clear event timers clearInterval(st.timer.second);
                return;
            }
            if (!push) { // ran only once
                config[_name] = {};     // initialize automation's configurations
                state[_name] = {};      // initialize automation's volatile memory
                _pointers();             // call pointers directly after config and state initialization 
                /*
    
                    initialization logic goes here
    
                */
            } else {

                /*
    
                    event based logic goes here
    
                */
            }
            /*
    
                    common functions (for initialization and event shared functions) go here
    
            */
            function _pointers() {  // dont modify anything here
                log = (m, l) => slog(m, l, _name);
                nvMem[_name] ||= {};
                nv = nvMem[_name];
                if (config[_name]) cfg = config[_name];
                if (state[_name]) st = state[_name];
            }
        },
        example2: function (_name, push, _reload) {     // add another automation 
            let st, cfg, nv, log; _pointers();
            if (_reload) {   // called after modification/reload of this automation file
                log("hot reload initiated");
                return;
            }
            if (!push) { // ran only once
                config[_name] = {};     // initialize automation's configurations
                state[_name] = {};      // initialize automation's volatile memory
                _pointers();            // call pointers directly after config and state initialization 
            } else { }  // event based logic goes here
            /* common functions (for initialization and event shared functions) go here */
            function _pointers() {  // dont modify anything here
                log = (m, l) => slog(m, l, _name);
                nvMem[_name] ||= {};
                nv = nvMem[_name];
                if (config[_name]) cfg = config[_name];
                if (state[_name]) st = state[_name];
            }
        },
    },
}
