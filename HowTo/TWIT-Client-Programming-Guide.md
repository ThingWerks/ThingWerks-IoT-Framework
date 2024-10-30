## TWIT Client Programming Guide

### Automation Template Setup
- Configure module name, Home Assistant and ESPHome entities.
  - ```
    let
    cfg = {
        moduleName: "NewClientModule",      // give this NodeJS Client a name for notification
        ha: [                               // add all your home assistant entities here
            "myHaEntity",                   // this index order is used for incoming state events and output calls as well (ie state.ha[0] etc...)
        ],
        esp: [                              // add all your ESP entities here
            "myEspEntity",                  // this index order is used for incoming state events and output calls as well (ie state.esp[0] etc...)
        ],
    },
    ```
- Create a `(index) => { }` for each individual automation inside the `automation = [ ]` array.
- multiple automations would look as follows.
  - ```
        automation = [
        (index) => { }, // automation 1
        (index) => { }  // automation 2
        ]
    ```
- call `init()` function and assign `st` for volitile memory for each automation.
  - the `init()` function i called once at the first start of each automation by the `if (!state.auto[index]) init();` call.
  - you must use `state.auto.push({ })` inside the `init()` function to create all the V mem/varialbes needed for this automation.
  - inside the `state.auto.push({ })` you must have at leat the `name:` property, the rest is up to your design.
  - later in your autmation, you will access your variable by using `st` ie `st.example.started`
  - `st` and `state` are not the same
    - "st" is local volatile memory unique to each automation function - to store your automation data
    - "state" is global volatile memory that stores incoming data from ESPHome or Home Assistant Entity states
  - ```
        automation = [                                                         
        (index) => {                                                        
            if (!state.auto[index]) init();                                 
            let st = state.auto[index];                                  
            function init() {    
              state.auto.push({                                           // create object for this automation in local state
                name: "My-Auto-System1",                                // give this automation a name 
                example: { started: false, step: time.sec }             // initialize an object for each of this automation's devices or features (volatile data) 
              });                                 
            }
        }
    ]
    ```
### Interracting with Home Assistant and ESPHome Entities
- specifying the Home Assistant of ESP entity names in `cfg` object means this TWIT Client will receive events for these entities.
- when an incoming even arrives, it will update the `state.ha[element]` or `state.esp[element]` with the incoming data from HA or ESPHome device.
- the `element` number corrisponds with the array position of that same entity in `cfg.ha` or `cfg.esp`
- you must still create an emitter for each HA or ESP enitity if you need specific core to execute upon arrival of an event update. `em.on("input_button.test", () => myFunc.test());`
- you can check all available HA and ESPHome entities available to the core here:
  - use Firefox to show in pretty JSON
  - 127.0.0.1 or the ip address of the syustem running TWIT Core
  - http://127.0,0.1:20000/esp
  - http://127.0.0.1:20000/ha
- send output to ESP or HA entity with
  - identifying with `cfg.ha` or `cfg.esp` array position: `ha.send(0, false);` or `esp.send(0, true);`

