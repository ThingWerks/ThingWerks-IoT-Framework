## TWIT Client Programming Guide

### Automation Template Setup
- Configure module name, Home Assistant and ESPHome entities within the `cfg` object.
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
- create an object inside the `cfg` object to store non-volatile configuration data for your automations. Reference from inside your automation via `cfg.myAutomationConfigData.params` etc.
  - ```
    let
    cfg = {
        moduleName: "NewClientModule",      // give this NodeJS Client a name for notification
        myAutomationConfigData: {      // create your own area for non-volatile config data for each function if needed
            test: "a test string",
            params: true
        },
    },
    ```
- call `init()` function and assign `st` for volatile memory for each automation.
  - the `init()` function is called once at the first start of each automation by the `if (!state.auto[index]) init();` call.
  - you must use `state.auto.push({ })` inside the `init()` function to store all the volatile memory or variables needed for this automation.
  - inside the `state.auto.push({ })` you must have at least the `name:` property, the rest is up to your design.
  - later in your automation, you will access your volatile variables by using `st` ie `st.example.started`
  - `st` and `state` are not the same
    - "st" is local volatile memory unique to each automation function - to store your automation volatile or state data
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
- every automation is called with each incoming HA or ESP event. If your TWIT Client has no HA or ESP entities or you want to additionally call your automation at a specific interval, call `setInterval(() => { automation[index](index); }, 1e3);` inside the `init()` function.
### Non-Volatile Memory
- `nv` is the global object for non-V memory
- the physical location of this JSON file is `/apps/twit/nv-nameOfClient.json`,
- the NV JSON file is read once when the TWIT Client Boots. If it doesn't exist, its created automatically.
- the NV JSON file must be in the same folder as the TWIT Client
- create any objects you want inside the `nv` object like `nv.myAutomationData = {data: 100.2}`
- write this data with `file.write.nv();`
- data uses safe write method, a backup of the existing data is always created like `/apps/twit/nv-nameOfClient-bak.json` in the `/apps/twit` folder.
-  is non-volatile data that is read once during first boot of script and saved whenever you call file.write.nv();
### Interacting with Home Assistant and ESPHome Entities
- specifying the Home Assistant or ESP entity names in `cfg` object means this TWIT Client will receive events for these entities.
  - ```
        cfg = {
        moduleName: "test",      // give this NodeJS Client a name for notification
        telegram: {                         // delete this object if you don't use Telegram
            password: "password",           // password for telegram registration
        },
        ha: [
            "input_boolean.test",                    // add all your home assistant entities here
            "input_number.test2",
            "input_button.test3",
            "input_boolean.test4"
        ],
        esp: [
          "myESPentity",
        ],
        },
    ```
- when an incoming even arrives, it will update the `state.ha[element]` or `state.esp[element]` with the incoming data from HA or ESPHome device.
- the `element` number corresponds with the array position of that same entity in `cfg.ha` or `cfg.esp`
- you must still create an emitter for each HA or ESP entity if you need specific core to execute upon arrival of an event update.
  - call function and access state via `state.ha[number]` or `state.esp[number]` with `em.on("input_button.test", () => myFunc.test());`
  - or call a function and directly pass the new state
  - ```
      em.on("power1-relay1", (newState) => {
        log("my esp toggle function, new state: " + newState, index, 1);
      });
    ```
- you can check all available HA and ESPHome entities available to the core here:
  - use Firefox to show in pretty JSON
  - 127.0.0.1 or the ip address of the system running TWIT Core
  - http://127.0,0.1:20000/esp
  - http://127.0.0.1:20000/ha
- send output to ESP or HA entity with
  - identifying with `cfg.ha` or `cfg.esp` array position: `ha.send(0, false);` or `esp.send(0, true);`
  - identifying with entity name `ha.send("switch.fan_exhaust_switch", false);` or `esp.send("myEspEntity", true);`
  - send sensor data or float to Home Assistant
   - `ha.send("volts_dc_Battery", parseFloat(st.voltsDC).toFixed(2), "v");`
   - use array position or entity name
   - if the sensor doesn't exist in HA, its will be created with first send
   - `ha.send("entityName",floatOrValue, "unitOfMeasurement")`
### Home Assistant Helpers
- Create Helpers in Home Assistant to control or manage your automations or process.
- "Toggle" or `input_boolean` is useful with emitters (example given) to control operational states of your automations.
- "Number" or `input_number` is useful to set or adjust automation parameters.
- "Button" or `input_button` is useful to for initiating processes inside your automation, use emiters or read states.
### System Logging
- to generate a log event, call the log function `log("system started", index, 1);`
 - `index` must not be changed
 - the number after `index` is the logging level. 0 = debug, 1 = event, 2 = warning, 3 = error
 - this will be logged to the console, to the TWIT Core console/log and to Telegram if configured in the Core
### Debugging
- you can view all automation, HA and ESP entity and Core states using the web debugger. You must use FireFox for pretty JSON.
- 127.0.0.1 or the IP of TWIT Core
- http://127.0.0.1:20000/client/nameOfClient -----show all volatile and non-volatile memory of a specific TWIT client
- http://127.0.0.1:20000/ha ------show all entities available from Home Assistant
- http://127.0.0.1:20000/esp -----show all discovered ESP Home modules
- http://127.0.0.1:20000/tg ------last 100 received Telegram messages
- http://127.0.0.1:20000/nv ------show all core non-volatile memory
- http://127.0.0.1:20000/state ---show all core volatile memory
- http://127.0.0.1:20000/cfg -----show all core configuration
- http://127.0.0.1:20000/log -----last 500 log messages
### User / Telegram Code Block:
- remove the entire `user.telegram` object if you do not use Telegram for TWIT Client automation remote control, this will not effect Telegram notification of Core if you use that.
- refer to the TWIT Client Telegram guide if you want to use Telegram for TWIT Client remote control.
- [Client Telegram guide](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/HowTo/TWIT-Client-Telegram-Guide.md) 
