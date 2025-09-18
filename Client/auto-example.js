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
            if (push) {
                pointers();
                /*  event based logic starts here 
                
                
                
                */
            } else {
                config[_name] = {       // initialize automation's configurations
                    myConfig: "example",


                    
                };
                state[_name] = {        // initialize automation's volatile memory
                    systemBoot: false,



                };
                pointers();             // pointer function must go after config and state but before initialization 
                /*  initialization logic starts  here 
                
                
                */
                nv ||= { myAutomationData: { someData: "anything" } };  // initialize non-volatile data
                file.write.nv();        // write non-volatile data to hard disk,
            }
            /*  common functions (initialization and event) go here 
            
            
            
            
            */
            if (!hotReload[_name]) {
                log("hot reload initiated");
                //clear your event timers clearInterval(st.timer.second);
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
