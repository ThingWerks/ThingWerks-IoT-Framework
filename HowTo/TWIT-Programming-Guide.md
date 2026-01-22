## Automation Template Recap
Follow the [auto-example.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/auto-example.jsc) guidelines. Its extremely straight forward and it gives very basic instruction on where to put to code

- consult the auto-example file for general layout and use, compare with [auto.js](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/auto.js) so you can the difference between example code and the bare minimum template
- specify entity subscriptions, sync groups, heartbeat or locally created ones in auto file or externally (stating client with -a and -c flag together)
- write your "init" logic for state, nv and push 
- make constructors for incoming "push" state updates
- dont forget to call your automation in an interval if needed

### Objects for each Automation 
- `state` - object for all volatile memory. This is a local pointer to global.state["nameOfAuto"]. Access other automation states via global.state["nameOfAuto"]. 
- `config` - object for configurational data
  - can be stored in automation config file
- `nv` - object for all non-volatile memory, 
  - file is saved relative path of `client.js` file 
  - filename appended with name used in `config.js -n` flag
- `push[]` - object holds each automations event logic and methods
  - each entity that causes a logical process needs to be constructed 
  - must be a member function call, has two parameters 
  - `push[]` object members names must match entity names
  - function call has two parameters: entity state/value, the entities name

### Standard Global Objects
`entity[]` - every entity subscribed within a client 
  - `entity[nameOfEneity].state` contains the state 
  - `entity[nameOfEneity].update` contains the last time of update, epoch millis 

`Time`:
- `time.mil`        -  current time milliseconds 
- `time.min`        - current minute
- `time.sec`        - current second
- `time.hour`       - current hour
- `time.day`        - current day of the month (ie 1-30)
- `time.dow`        - current day of the week (ie 1-7)
- `time.boot`       - time elapsed from first boot in seconds
- `time.epoch`      - unix epoch time in seconds
- `time.epochMin`   - unix epoch time in minutes
- `time.epochMil`   - unix epoch time in milliseconds
- `time.stamp`      - current time in string format ie. 2025-10-16 11:07:18.560

### Command Reference
- `write()`         - write NV data to hard disk
  - this has automatic flood control, just call it when you need it
- `send()`          - set any entity state
  - `send(entityName, value, unit, haIpAddress)`  
  - normal TWIT, HA, ESP: `send("testLED", true)` or `send("testLED", 122,12)`
  - HA Sensor (uses REST API): `send("input_number.test", 20, "psi", "10.10.0.1")`
  - HA Sensor but core has multiple HA Servers: `send("input_number.test", 20, "psi", "10.10.0.1")`
- `log()`           - logging function 
  - `log("message", severityLevel)` or `log("message")`
  - 0 debug, 1 event (default), 2 warning, 3 error
### Home Assistant Helpers
- Create Helpers in Home Assistant to control or manage your automations or processes.
- "Toggle" or `input_boolean` is useful to control operational states of your automations.
- "Number" or `input_number` is useful to set or adjust automation parameters.
- "Button" or `input_button` is useful to for initiating processes inside your automation.
### Debugging
- you can view all automation states, HA and ESP entities using the web debugger. You must use FireFox for pretty JSON.
- 127.0.0.1 or the IP of TWIT Core
- http://127.0.0.1:20000/client/nameOfClient -----show all volatile and non-volatile memory of a specific TWIT client
- http://127.0.0.1:20000/entity ------show all entities registered with the Core
