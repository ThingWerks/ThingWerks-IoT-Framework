#!/usr/bin/node
let
    cfg = {
        moduleName: "NewClientModule",      // give this NodeJS Client a name for notification
        telegram: {                         // delete this object if you don't use Telegram
            password: "password",           // password for telegram registration
        },
        ha: [                               // add all your home assistant entities here
            "myHaEntity",                   // this index order is used for incoming state events and output calls as well (ie state.ha[0] etc...)
        ],
        esp: [                              // add all your ESP entities here
            "myEspEntity",                  // this index order is used for incoming state events and output calls as well (ie state.esp[0] etc...)
        ],
        udp: [                              // UDP API is under development
            "myUdpEntity",
        ],
        heartbeat: {
            esp: [
                { name: "lth-myEspEntity", interval: 3 }    // send a heartbeat to an ESP switch, interval in seconds 
            ]
        },
        myAutomationConfigData: {      // create your own area for non-volatile config data for each function if needed
            test: "a test string",
            params: true
        },
    },
    automation = [                                                          // create an (index) => {},  array member function for each automation you want to create
        (index) => {                                                        // each automation is ran with every incoming ESPHome or Home Assistant event  
            if (!state.auto[index]) init();                                 // initialize automation
            let st = state.auto[index];                                     // set automation state object's shorthand name to "st" (state) 

            function init() {                                               // the init() function is called only once at the start of each automation
                state.auto.push({                                           // create object for this automation in local state
                    name: "My-Auto-System1",                                // give this automation a name 
                    example: { started: false, step: time.sec }             // initialize an object for each of this automation's devices or features (volatile data) 
                });
                setInterval(() => { automation[index](index); }, 1e3);      // set minimum rerun time, otherwise this automation function will only run on ESP and HA push events
                setInterval(() => { timer(); }, 60e3);                      // run this automation timer function every 60 seconds (in addition to incoming ESP or Home Assistant events)
                log("system started", index, 1);                            // log automation start with index number and severity (0: debug, 1:event, 2: warning, 3: error)
                log(cfg.myAutomationConfigData.test)                        // log some string stored in your non-volatile data
                em.on("input_button.test", () => button.test());            // create an event emitter for HA or ESP entity that calls a function when data is received
                em.on("power1-relay1", (newState) => {                      // an event emitter for HA or ESP device that directly performs a function
                    log("my esp toggle function", index, 1);
                });
                send("coreData", { register: true, name: ["myObject1", "myObject2"] });     // optional - register with core to receive data from other clients

            }


            let button = {                                                  // example methods of toggling ESP or Home Assistant entities and sensors
                test: function () {                                         // example object member function called by emitter
                    ha.send("switch.fan_exhaust_switch", false);            // different methods to set state of HA and ESP entities
                    ha.send("input_boolean.fan_auto", true);
                    ha.send("switch.fan_bed_switch", false);
                    esp.send("myEspEntity", true);                          // call esp device by name
                    ha.send("volts_dc_Battery_turnicated", ~~parseFloat(st.voltsDC), "v");    // send sensor data to HA. your sensor name, value, unit of your choice
                    ha.send("volts_dc_Battery_rounded", Math.round(parseFloat(st.voltsDC) * 10) / 10, "v");    // send sensor data to HA. your sensor name, value, unit of your choice
                    ////////////////////////////////////////////////////////////////////////// first time data is sent, HA will create this sensor, find in entities list
                    send("coreData", { name: "coreDataName", data: { myData: "data" } });  // broadcast data to the Core for other clients to receive
                    nv.myAutomation = { myVar: "test" };                    // create non-volatile data structure           
                    log("writing NV data to disk...", index, 1);            // example log event
                    file.write.nv();       // write non-volatile data to hard disk, use any variable names you want. file is named nv-client-nameOfYouClient.json in the app directory
                }
            };

            // "cfg" is config data as specified above
            // "nv" is non-volatile data that is read once during first boot of script and saved whenever you call file.write.nv();
            // "state" is not "st". 
            //      "st" is local volatile memory unique to each automation function - to store your automation data
            //      "state" is global volatile memory that stores incoming data from ESPHome or Home Assistant Entity states
            //       state.ha[0]  is  where the incoming data of   cfg.ha[0] entity is stored
            //       state.esp[0]  is  where the incoming data of   cfg.esp[0] entity is stored

            if (state.ha[0] == true && st.example.started == false) {      // compare a Home Assistant entity with a value in your program - do something
                log("turning off outside lights", index, 1);                // log must contain "index" followed by logging level: 0 debug, 1 event, 2 warning, 3 error    
                st.example.step = time.sec;                                 // record time of now, time.sec and time.min are unix epoch time in seconds or minutes
                st.example.started = true;                                  // set automation state variable
            }

            if (state.esp[0] == true && st.example.started == false) {      // compare an ESPHome entity with a value in your program - do something
                log("turning off outside lights", index, 1);                // log must contain "index" followed by logging level: 0 debug, 1 event, 2 warning, 3 error    
                st.example.step = time.sec;                                 // record time of now, time.sec and time.min are unix epoch time in seconds or minutes
                st.example.started = true;                                  // set automation state variable
            }
            // coreData is optional, dont use it if you dont need it
            if (coreData("mySharedData").myData == "myValue")               // compare a variable from another TW Client using coreData (after register with coreData shown above), coreData returns "data" variable or object
                log("sensor on other client is a match", index, 1);         // see list of variables in coreData in  127.0.0.1:20000/diag client/state/coreData (use firefox)

            /*      Time Variables  
                time.mil            current time milliseconds 
                time.min            current minute
                time.sec            current second
                time.hour           current hour
                time.day            current day of the month (ie 1-30)
                time.dow            current day of the week (ie 1-7)
                time.boot           time elapsed from first boot in seconds
                time.epoch          unix epoch time in seconds
                time.epochMin       unix epoch time in minutes
                time.epochMil       unix epoch time in milliseconds
                time.stamp          current time in string format ie. 10-16 11:07:18.560
            */

            function timer() { // called once per minute   
                if (time.hour == 18 && time.min == 0) {  // set events to run at a specific time using clock function. match hour and minute of day, etc
                    log("turning on outside lights", index, 1);
                    ha.send("switch.light_outside_switch", true);
                }
                if (time.hour == 22 && time.min == 0) {
                    log("turning off outside lights", index, 1);
                    ha.send("switch.light_outside_switch", false);
                }
            };
            /*
                ---Debugging web server---
                http://127.0.0.1:20000/client/nameOfClient -----show all volatile and non-volatile memory of a specific TWIT client
                http://127.0.0.1:20000/ha ------show all entities available from Home Assistant
                http://127.0.0.1:20000/esp -----show all discovered ESP Home modules
                http://127.0.0.1:20000/tg ------last 100 received Telegram messages
                http://127.0.0.1:20000/nv ------show all core non-volatile memory
                http://127.0.0.1:20000/state ---show all core volatile memory
                http://127.0.0.1:20000/cfg -----show all core configuration
                http://127.0.0.1:20000/log -----last 500 log messages
         */
        },
        (index) => {    // add subsequent automations like this

        }
    ];
let
    sys = {         // ______________________system area, don't need to touch anything below this line__________________________________
        com: function () {
            udp.on('message', function (data, info) {
                let buf = JSON.parse(data);
                //  console.log(buf);
                switch (buf.type) {
                    case "espState":            // incoming state change (from ESP)
                        // console.log("receiving esp data, name: " + buf.obj.name + " state: " + buf.obj.state);
                        state.entity[buf.obj.name] ||= {}; // If state.esp[buf.obj.name] is falsy (undefined, null, 0, '', false), assign it an empty object.
                        state.entity[buf.obj.name].state = buf.obj.state;
                        state.entity[buf.obj.name].update = time.epoch;
                        if (state.online == true) {
                            em.emit(buf.obj.name, buf.obj.state);
                            automation.forEach((func, index) => { if (state.auto[index]) func(index); });
                        }
                        break;
                    case "haStateUpdate":       // incoming state change (from HA websocket service)
                        log("receiving HA state data, entity: " + buf.obj.name + " value: " + buf.obj.state, 0);
                        // console.log(buf);
                        state.entity[buf.obj.name] ||= {};
                        state.entity[buf.obj.name].update = time.epoch;
                        try { state.entity[buf.obj.name].state = buf.obj.state; } catch { }
                        if (state.online == true) {
                            em.emit(buf.obj.name, buf.obj.state);
                            automation.forEach((func, index) => { if (state.auto[index]) func(index) });
                        }
                        break;
                    case "haFetchReply":        // Incoming HA Fetch result
                        Object.assign(state.entity, buf.obj);
                        log("receiving fetch data...");
                        if (state.onlineHA == false) sys.boot(4);
                        break;
                    case "haFetchAgain":        // Core is has reconnected to HA, so do a refetch
                        log("Core has reconnected to HA, fetching again");
                        send("espFetch");
                        break;
                    case "haQueryReply":        // HA device query
                        console.log("Available HA Devices: " + buf.obj);
                        break;
                    case "udpReRegister":       // reregister request from server
                        if (state.online == true) {
                            log("server lost sync, reregistering...");
                            setTimeout(() => {
                                sys.register();
                                if (cfg.ha != undefined) { udp.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1'); }
                            }, 1e3);
                        }
                        break;
                    case "coreData":
                        exist = false;
                        coreDataNum = null;
                        for (let x = 0; x < state.coreData.length; x++) {
                            if (state.coreData[x].name == buf.obj.name) {
                                state.coreData[x].data = JSON.parse(data);
                                exist = true;
                                break;
                            }
                        }
                        if (exist == false) {
                            coreDataNum = state.coreData.push({ name: buf.obj.name, data: JSON.parse(data).data }) - 1;
                            log("coreData:" + coreDataNum + " - is registering: " + buf.obj.name + " - " + buf.obj.data);
                        }
                        break;
                    case "diag":                // incoming diag refresh request, then reply object
                        send("diag", { state, nv });
                        break;
                    case "telegram":
                        // console.log("receiving telegram message: " + buf.obj);
                        switch (buf.obj.class) {
                            case "agent":
                                user.telegram.agent(buf.obj.data);
                                break;
                            case "callback":
                                user.telegram.callback(buf.obj.data);
                                break;
                        }
                        break;
                    case "proceed": if (state.online == false) setTimeout(() => { sys.boot(3); }, 1e3); break;
                    case "log": console.log(buf.obj); break;
                }
            });
        },
        register: function () {
            let obj = {};
            if (cfg.ha != undefined) obj.ha = cfg.ha;
            if (cfg.esp != undefined) obj.esp = cfg.esp;
            if (cfg.heartbeat != undefined) {
                if (cfg.heartbeat.esp != undefined && cfg.heartbeat.esp.length > 0) {
                    cfg.heartbeat.esp.forEach((e, x) => {
                        clearInterval(heartbeat.timer[x]);
                        heartbeat.timer[x] = setInterval(() => {
                            if (heartbeat.state) { send(e.name, false); heartbeat.state = false; }
                            else { send(e.name, true); heartbeat.state = true; }
                        }, e.interval * 1e3);
                    });
                }
            }
            if (cfg.telegram != undefined) obj.telegram = true;
            udp.send(JSON.stringify({ type: "register", obj, name: cfg.moduleName }), 65432, '127.0.0.1');
            if (cfg.telegram != undefined) {
                if (nv.telegram == undefined) nv.telegram = [];
                else for (let x = 0; x < nv.telegram.length; x++) {
                    udp.send(JSON.stringify({ type: "telegram", obj: { class: "sub", id: nv.telegram[x].id } }), 65432, '127.0.0.1');
                }
            }
        },
        init: function () {
            nv = {};
            state = { auto: [], entity: {}, onlineHA: false, online: false };
            heartbeat = { state: false, timer: [] }
            time = {
                boot: null,
                get epochMil() { return Date.now(); },
                get mil() { return new Date().getMilliseconds(); },
                get stamp() {
                    return ("0" + this.month).slice(-2) + "-" + ("0" + this.day).slice(-2) + " "
                        + ("0" + this.hour).slice(-2) + ":" + ("0" + this.min).slice(-2) + ":"
                        + ("0" + this.sec).slice(-2) + "." + ("00" + this.mil).slice(-3);
                },
                sync: function () {
                    let date = new Date();
                    this.epoch = Math.floor(Date.now() / 1000);
                    this.epochMin = Math.floor(Date.now() / 1000 / 60);
                    this.month = date.getMonth() + 1;   // 0 based
                    this.day = date.getDate();          // not 0 based
                    this.dow = date.getDay() + 1;       // 0 based
                    this.hour = date.getHours();
                    this.min = date.getMinutes();
                    this.sec = date.getSeconds();
                },
                startTime: function () {
                    function syncAndSchedule() {
                        time.sync();
                        if (time.boot === null) time.boot = 0;
                        let now = Date.now(), nextInterval = 1000 - (now % 1000);
                        setTimeout(() => { syncAndSchedule(); time.boot++; }, nextInterval);
                    }
                    syncAndSchedule();
                },
            };
            time.startTime();
            ha = { getEntities: function () { send("haQuery") }, };
            fs = require('fs');
            events = require('events');
            em = new events.EventEmitter();
            exec = require('child_process').exec;
            execSync = require('child_process').execSync;
            workingDir = require('path').dirname(require.main.filename) + "/";
            path = require('path');
            scriptName = path.basename(__filename).slice(0, -3);
            udpClient = require('dgram');
            udp = udpClient.createSocket('udp4');
            if (process.argv[2] == "-i") {
                moduleName = cfg.moduleName.toLowerCase();
                log("installing TWIT-Client-" + cfg.moduleName + " service...");
                let service = [
                    "[Unit]",
                    "Description=",
                    "After=network-online.target",
                    "Wants=network-online.target\n",
                    "[Install]",
                    "WantedBy=multi-user.target\n",
                    "[Service]",
                    "ExecStartPre=/bin/bash -c 'uptime=$(awk \\'{print int($1)}\\' /proc/uptime); if [ $uptime -lt 300 ]; then sleep 70; fi'",
                    "ExecStart=nodemon " + workingDir + "client-" + moduleName + ".js -w " + workingDir + "client-" + moduleName + ".js --exitcrash",
                    "Type=simple",
                    "User=root",
                    "Group=root",
                    "WorkingDirectory=" + workingDir,
                    "Restart=on-failure",
                    "RestartSec=10\n",
                ];
                fs.writeFileSync("/etc/systemd/system/twit-client-" + moduleName + ".service", service.join("\n"));
                // execSync("mkdir /apps/ha -p");
                // execSync("cp " + process.argv[1] + " /apps/ha/");
                execSync("systemctl daemon-reload");
                execSync("systemctl enable twit-client-" + moduleName + ".service");
                execSync("systemctl start twit-client-" + moduleName);
                execSync("service twit-client-" + moduleName + " status");
                log("service installed and started");
                console.log("type: journalctl -fu twit-client-" + moduleName);
                process.exit();
            }
            if (process.argv[2] == "-u") {
                moduleName = cfg.moduleName.toLowerCase();
                log("uninstalling TWIT-Client-" + cfg.moduleName + " service...");
                execSync("systemctl stop twit-client-" + moduleName);
                execSync("systemctl disable twit-client-" + moduleName + ".service");
                fs.unlinkSync("/etc/systemd/system/twit-client-" + moduleName + ".service");
                console.log("TWIT-Client-" + cfg.moduleName + " service uninstalled");
                process.exit();
            }
            file = {
                write: {
                    nv: function () {  // write non-volatile memory to the disk
                        // log("writing NV data...")
                        fs.writeFile(workingDir + "/nv-" + scriptName + "-bak.json", JSON.stringify(nv, null, 2), function () {
                            fs.copyFile(workingDir + "/nv-" + scriptName + "-bak.json", workingDir + "/nv-" + scriptName + ".json", (err) => {
                                if (err) throw err;
                            });
                        });
                    }
                },
            };
            telegram = {
                sub: function (msg) {
                    let buf = { user: msg.from.first_name + " " + msg.from.last_name, id: msg.from.id }
                    if (!telegram.auth(msg)) {
                        log("telegram - user just joined the group - " + msg.from.first_name + " " + msg.from.last_name + " ID: " + msg.from.id, 0, 2);
                        nv.telegram.push(buf);
                        bot(msg.chat.id, 'registered');
                        udp.send(JSON.stringify({ type: "telegram", obj: { class: "sub", id: msg.from.id } }), 65432, '127.0.0.1');
                        file.write.nv();
                    } else bot(msg.chat.id, 'already registered');
                },
                auth: function (msg) {
                    let exist = false;
                    for (let x = 0; x < nv.telegram.length; x++)
                        if (nv.telegram[x].id == msg.from.id) { exist = true; break; };
                    if (exist) return true; else return false;
                },
                buttonToggle: function (msg, auto, name) {
                    bot(msg.from.id,
                        name, {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "on", callback_data: (auto + "true") },
                                    { text: "off", callback_data: (auto + "false") }
                                ]
                            ]
                        }
                    }
                    );
                },
                buttonMulti: function (msg, auto, name, array) {
                    buf = { reply_markup: { inline_keyboard: [[]] } };
                    array.forEach(element => {
                        buf.reply_markup.inline_keyboard[0].push({ text: element, callback_data: (auto + element) })
                    });
                    bot(msg.from.id, name, buf);
                },
            };
            bot = function (id, data, obj) {
                udp.send(JSON.stringify({ type: "telegram", obj: { class: "send", id, data, obj } }), 65432, '127.0.0.1');
            };
            send = function (name, state, unit, id) {
                for (let x = 0; x < cfg.esp.length; x++) {
                    if (name == cfg.esp[x]) {
                        udp.send(JSON.stringify({
                            type: "espState",
                            obj: { name: name, state: state }
                        }), 65432, '127.0.0.1')
                        return;
                    }
                }
                if (name != "coreData")
                    udp.send(JSON.stringify({
                        type: "haState",
                        obj: { name: name, state: state, unit: unit, haID: id }
                    }), 65432, '127.0.0.1')
                else udp.send(JSON.stringify({
                    type: "coreData",
                    obj: state
                }), 65432, '127.0.0.1')
            };
            coreData = function (name) {
                for (let x = 0; x < state.coreData.length; x++) if (state.coreData[x].name == name) return state.coreData[x].data;
                return {};
            };
            log = function (message, index, level) {
                if (level == undefined) {
                    udp.send(JSON.stringify({
                        type: "log",
                        obj: { message: message, mod: cfg.moduleName, level: index }
                    }), 65432, '127.0.0.1');
                }
                else udp.send(JSON.stringify({
                    type: "log",
                    obj: { message: message, mod: state.auto[index].name, level: level }
                }), 65432, '127.0.0.1');
            };
            sys.boot(0);
        },
        boot: function (step) {
            switch (step) {
                case 0:
                    setTimeout(() => { time.sync(); time.boot++ }, 1e3);
                    moduleName = cfg.moduleName.toLowerCase();
                    console.log("Loading non-volatile data...");
                    fs.readFile(workingDir + "/nv-" + scriptName + ".json", function (err, data) {
                        if (err) {
                            log("\x1b[33;1mNon-Volatile Storage does not exist\x1b[37;m"
                                + ", nv-" + scriptName + ".json file should be in same folder as client.js file (" + workingDir + ")");
                            nv = { telegram: [] };
                        }
                        else { nv = JSON.parse(data); }
                        sys.boot(2);
                    });
                    break;
                case 1:
                    console.log("Loading config data...");
                    // fs.writeFileSync(workingDir + "/config-" + scriptName + ".json", JSON.stringify(cfg, null, 2), 'utf-8')
                    //process.exit();
                    fs.readFile(workingDir + "/config-" + scriptName + ".json", function (err, data) {
                        if (err) {
                            log("\x1b[33;1mconfig file does not exist\x1b[37;m"
                                + ", config-" + scriptName + ".json file should be in same folder as client-" + scriptName + ".js file (" + workingDir + ")");
                            process.exit();
                        }
                        else { cfg = JSON.parse(data); }
                        sys.boot(2);
                    });
                    break;
                case 2:
                    sys.com();
                    log("trying to register with TWIT Core", 1);
                    sys.register();
                    bootWait = setInterval(() => { sys.register(); }, 10e3);
                    break;
                case 3:
                    clearInterval(bootWait);
                    log("registered with TWIT Core", 1);
                    if (cfg.ha != undefined && cfg.ha.length > 0) {
                        log("fetching Home Assistant entities", 1);
                        udp.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1');
                        bootWait = setInterval(() => {
                            log("HA fetch is failing, retrying...", 2);
                            udp.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1');
                        }, 10e3);
                    } else sys.boot(4);
                    break;
                case 4:
                    clearInterval(bootWait);
                    if (cfg.ha != undefined && cfg.ha.length > 0) {
                        log("Home Assistant fetch complete", 1);
                        state.onlineHA = true;
                    }
                    if (cfg.esp != undefined && cfg.esp.length > 0) {
                        log("fetching esp entities", 1);
                        udp.send(JSON.stringify({ type: "espFetch" }), 65432, '127.0.0.1');
                        setTimeout(() => { sys.boot(5); }, 1e3);
                    } else sys.boot(5);
                    break;
                case 5:
                    if (cfg.esp != undefined && cfg.esp.length > 0)
                        log("ESP fetch complete", 1);
                    state.online = true;
                    automation.forEach((func, index) => { func(index) });
                    setInterval(() => { udp.send(JSON.stringify({ type: "heartbeat" }), 65432, '127.0.0.1'); time.boot++; }, 1e3);
                    break;
            }
        },
    };
setTimeout(() => { sys.init(); }, 1e3);
