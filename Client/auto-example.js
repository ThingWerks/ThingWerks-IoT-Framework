#!/usr/bin/node


module.exports = {
    entity: {
        subscribe: [    // entities to subscribe to 
            "input_boolean.test",
            //  "sunlight",
            //  "wifi_signal",
        ],
        create: [       // entities to create
            // any string you put here creates an entity that others can subscribe to. entity state is non-volatile.
            // starting this automation with name/string removed is considered a removal/deletion
            // "test-local-sensor",
            // "test-local-sensor2",
        ],
        sync: {         // entities to sync - any type of binary output can be synced. TWIT, ESP or even Toggles on different HA servers 
            // string is any group name you want, followed by array of entities, any entity change is parroted to all others
            // "testGroup": ["input_boolean.test_switch", "input_boolean.test", "test-led", "test-local-sensor"],
        },
        heartbeat: {    // entities to use for heartbeats
            // string is the entities name, value is heartbeat interval in milliseconds. Method is true/false toggle
            // "test-led": 500
        },
    },
    config: { // this can be removed if loading externally or upon each global.config[_name] declaration 
        // if using this for automation config, create an object for each below
        "---automation name here----": {},
        "---another automation name here----": {}
    },


    automation: {

        // choose any name for automation 
        "---automation name here----": function (_name, _push, _reload) {
            let { state, config, nv, log, write, push } = _pointers(_name);
            if (_reload) {   // called after modification/reload of this automation file
                if (_reload != "config") {
                    log("hot reload initiated");
                    /*
                    automation reload logic

                    // clear automation timers and intervals or another other logic you need for a hot reload
                    clearInterval(state.timer);

                    */
                    //clear event timers clearInterval(state.timer.second);
                    if (push) push.forIn(name => { delete push[name]; })
                    push = {}; // clean up push initialization 
                } else ({ state, config, nv } = _pointers(_name));
                return;
            }



            /*  common functions (initialization and event) go here 
 
            generally automation functions need to be declared before initialization sequences 
 
 
            */

            function myFunction(newState, name) {
                // logging  log("message", severityNumber)  0 - debug, 1 - notification (assumed), 2 - warning, 3 - error 
                log("thing 2 entity " + name + ": is setting state to: " + newState);
                log("thing 2 entity " + name + ": is setting state to: " + newState, 2);

                // write some NV data and save
                nv.myData = newState;
                write();


            }

            function myAuto() {

                // check the current state of an entity
                log("my entity TEST has a state of: " + entity["test"].state);

                // set the state of an any entity   
                log("setting entity TEST's state to false");
                send("test", false);

                log("setting Home Assistant entity input_boolean.test state to 20psi");
                send("input_number.test", 20, "psi"); // telemetry sensor example
                send("input_number.test", 20, "psi", "10.10.0.1"); // telemetry sensor example multiple Home Assistant Servers

                log("setting ESPHome entity testLED state to true");
                send("testLED", true);
            }


            // initialization sequence begins here

            if (_push === "init") { // ran only once
                global.config[_name] = {    // initialize automation's configurations
                    // static configuration can be put here for simplicity or
                    // can be specified above on module.exports.config 
                    // places into an external config file and specified  
                };
                global.state[_name] = {     // initialize automation's volatile memory
                    timer: {},
                    // generally state initialization would have its own function after this declaration 
                };
                global.nv[_name] ||= {      // initialize automation's non-volatile memory
                    // generally NV initialization would have its own function after this declaration 
                    // write(); // wite non-volatile memory after your initialization logic
                };
                global.push[_name] = {      // initialize incoming push function logic

                    // the push object is called using the entities name as subscribed above in module.exports entities, subscribed 
                    // the call includes, first the "state or value" and seconds "the entities name itself"

                    //  PUSH METHOD 1: specify methods within the global.push declaration.
                    "input_boolean.test": (newState, name) => {
                        log("entity " + name + ": is setting state to: " + newState);
                    }

                };

                // you must call pointers directly after config, state and or NV initializations 
                ({ state, config, nv, push } = _pointers(_name));

                //      PUSH METHOD 2: post declaration assignment:  
                push["input_boolean.test"] = (newState, name) => {
                    log("entity " + name + ": is setting state to: " + newState);
                }

                //      PUSH METHOD 3: make constructor factory
                someArray.forEach(element => {
                    push[element] = factory.thing1(element, config,);
                });
                someArray2.forEach(element => {
                    push[element] = factory.thing2(element, config, nv,);
                });

                let factory = {
                    thing1: function (element, config,) { // pass whatever data is needed for the factory
                        return (newState, name) => {
                            // reference config. state or nv data directly in your push logic
                            log("thing 1 entity " + name + ": is setting state to: " + newState);
                        }
                    },
                    thing2: function (element, config, nv,) { // 
                        return (newState, name) => {
                            log("thing 2 entity " + name + ": is setting state to: " + newState);
                            myFunction(newState, name);
                        }
                    },
                }


                // run my automation in some interval:
                state.timer.myAuto = setInterval(() => { myAuto(); }, 1e3);

                // run the timer function once per minute
                state.timer.minute = setInterval(() => { timer(); }, 60e3);



                // any other initialization sequence here



            } else push[_push.name]?.(_push.state, _push.name);


            function timer() { // called once per minute   
                if (time.hour == 18 && time.min == 0) {  // set events to run at a specific time using clock function. match hour and minute of day, etc
                    log("turning on outside lights", 1);
                    send("switch.light_outside_switch", true);
                }
                if (time.hour == 22 && time.min == 0) {
                    log("turning off outside lights", 1);
                    send("switch.light_outside_switch", false);
                }
            };



        },




        // create another automation if needed - same logic applies
        "---another automation name here----": function (_name, _push, _reload) {
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
                if (_push === "init") { // ran only once - your initialization procedure
                    global.config[_name] = {};  // initialize automation's configurations or from -c config File or from config object above
                    global.state[_name] = {};   // initialize automation's volatile memory
                    global.nv[_name] ||= {};    // initialize automation's non-volatile memory
                    global.push[_name] = {};    // initialize push functions 
                    ({ state, config, nv, push } = _pointers(_name)); // call pointers directly after config and state initialization 
                    return;
                } else push[_push.name]?.(_push.state, _push.name);    // called with every incoming push event
            } catch (error) { console.trace(error) }

        },
    },



}
let _pointers = (_name) => { // don't touch 
    push[_name] ||= {}
    return {
        state: state[_name] ?? undefined,
        config: config[_name] ?? undefined,
        nv: nv[_name] ?? undefined,
        push: push[_name] ?? undefined,
        log: (m, l) => slog(m, l, _name),
        write: () => file.write.nv(_name),
        send: (name, state, unit, address) => { core("state", { name, state, unit, address }, _name) },
    }
}
