#!/usr/bin/node
let twit = require("./twit.js").framework;
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
        "---automation name here----": {}, // the name here must match automation name below
        "---another automation name here----": {}
    },


    automation: {

        // choose any name for automation 
        "---automation name here----": function (_name, _push, _reload) {
            let { state, config, nv, log, write, push, send, tool } = twit(_name);


            /*  common functions and those called by push events or the init function need to go in this area. 
            ie. before   if (_push === "init"){}
 
            generally automation functions need to be declared before initialization sequences 
 
 
            */


            // example functions showing standard methods
            function myFunction(newState, name) {
                // logging  log("message", severityNumber)  0 - debug, 1 - notification (assumed), 2 - warning, 3 - error 
                log("thing 2 entity " + name + ": is setting state to: " + newState);
                log("thing 2 entity " + name + ": is setting state to: " + newState, 2);

                // write some NV data and save
                nv.myData = newState;
                write();


            }

            function myAuto() {

                // entities can be read on an interval 
                log("my sensor now is: " + entity["my_sensor_name".state]);

                // set the state of an any entity   
                log("setting entity TEST's state to false");
                send("test", false);

                log("setting Home Assistant entity input_boolean.test state to 20psi");
                send("input_number.test", 20, "psi"); // telemetry sensor example
                send("input_number.test", 20, "psi", "10.10.0.1"); // telemetry sensor example multiple Home Assistant Servers

                log("setting ESPHome entity testLED state to true");
                send("testLED", true);
            }

            // example check timer function
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

            // you initialization sequence begins here

            if (_push === "init") { // ran only once
                global.config[_name] = {    // initialize automation's configurations
                    // static configuration can be put here for simplicity 
                    // or can be specified above in module.exports.config 
                    // or ca be put into an external config file and specified  with  client.js -n autoName -a autoFile.js -c configFile.js
                    // see documentation for external config.js/.json file example 

                    mySensors: [ // for factory function example
                        { name: "my sensor 1", entity: "Home_Assistant_Entity1" },
                        { name: "my sensor 2", entity: "Home_Assistant_Entity2" }
                    ]

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

                // you must call pointers directly after config, push,.state and or NV declarations in order to update pointer references 
                ({ state, config, nv, push } = _pointers(_name));


                //      PUSH METHOD 2: post declaration assignment:  
                push["input_boolean.test"] = (newState, name) => {
                    log("entity " + name + ": is setting state to: " + newState);
                }


                //      PUSH METHOD 3: use a factory function    \\ 
                factory.init();  // call the factory init

                let factory = { // push method/logic factory 
                    init: function () {
                        config.mySensors.forEach(mySensor => { // see config declaration above
                            push[mySensor.entity] = this.sensor(mySensor);
                        });
                    },
                    sensor: function (mySensor) { // pass whatever data is needed for the factory to create a method
                        return (newState, name) => {
                            // reference config. state or nv data directly inside your push logic
                            log("sensor: " + mySensor.name + " - entity: " + name + " - is setting state to: " + newState);
                            myFunction(newState, name);
                        }
                    },
                }





                // run my automation in some interval:
                state.timer.myAuto = setInterval(() => { myAuto(); }, 1e3);
                // your automation can use both push logic and interval logic
                // for example a sensor can be read in an interval via the "entity" object, see  myAuto() function example




                state.timer.minute = setTimeout(() => {  // start minute timer aligned with system minute
                    timer();
                    st.timer.minute = setInterval(() => { timer(); }, 60e3);
                }, (60e3 - ((time.sec * 1e3) + time.mil))); // sync this minute with this PC's clock minute

                // any other initialization sequence here


            }
            else if (_push) push[_push.name]?.(_push.state, _push.name);
            else if (_reload) {   // called after modification/reload of this automation file
                if (push) push.forIn((name) => {  // destroy all push calls 
                    log("deleting constructor for: " + name, 0);
                    delete push[name];
                }) 
                if (_reload == "config") {
                    log("config hot reload initiated");

                    // re-initialize/call your constructor function here  -  for example   factory.init();
                    // _push === "init" is not called after a config file reload

                } else {
                    log("automation hot reload initiated");
                    ({ state, config, nv } = _pointers(_name));
                    // clear you event timers/intervals here.  ie. clearInterval(state.timer.second);
                    // _push === "init" will be automatically called again to reinitialize your automation after this reload function

                    // clearing  timers/intervals previously made in the INIT process - see above
                    clearInterval(state.timer.myAuto);
                    clearTimeout(state.timer.minute);
                }
                return;
            }
        },




        // create another automation if needed - same logic applies
        "---another automation name here----": function (_name, _push, _reload) {
            try {
                let { state, config, nv, log, write, push, send, tool } = twit(_name);


                // your program functions here


                if (_push === "init") { // ran only once - your initialization procedure
                    global.config[_name] = {};  // initialize automation's configurations or from -c config File or from config object above
                    global.state[_name] = {};   // initialize automation's volatile memory
                    global.nv[_name] ||= {};    // initialize automation's non-volatile memory
                    global.push[_name] = {};    // initialize push functions 
                    ({ state, config, nv, push } = _pointers(_name)); // call pointers directly after config and state initialization 

                    // your init logic here

                    return;
                }
                else if (_push) push[_push.name]?.(_push.state, _push.name);    // called with every incoming push event
                else if (_reload) {   // called after modification/reload of this automation file
                    if (push) push.forIn((name) => {  // destroy all push calls 
                        log("deleting constructor for: " + name, 1);
                        delete push[name];
                    })
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
            } catch (error) { console.trace(error); process.exit(1); }
        },
    },
}
