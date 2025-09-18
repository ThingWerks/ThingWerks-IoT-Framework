global.bot = function (id, data, obj) {
    core.send(JSON.stringify({ type: "telegram", obj: { class: "send", id, data, obj } }), 65432, '127.0.0.1');
};
global.send = function (name, newState, unit, id) {
    for (let x = 0; x < config.esp?.subscribe?.length; x++) {
        if (name == config.esp.subscribe[x]) {
            core.send(JSON.stringify({
                type: "espState",
                obj: { name: name, state: newState }
            }), 65432, '127.0.0.1')
            return;
        }
    }
    if (name == "cdata") {
        core.send(JSON.stringify({
            type: "coreData",
            obj: newState
        }), 65432, '127.0.0.1')
    } else {
        // if (!unit) console.log("sending to HA - name: " + name + " - state: ", newState)
        core.send(JSON.stringify({
            type: "haState",
            obj: { name, state: newState, unit, haID: id }  // ID is used to send sensor to HA on core other than ID 0
        }), 65432, '127.0.0.1')
    }
};
global.slog = function (message, level, system) {
    try { moduleName ||= moduleName } catch {
        console.log(a.color("red", "you must specify a module name with -n"));
        process.exit();
    }
    if (level == undefined) level = 1;
    if (!system) {
        core.send(JSON.stringify({
            type: "log",
            obj: { message: message, mod: (moduleName + "-System"), level: level }
        }), 65432, '127.0.0.1');
    } else core.send(JSON.stringify({
        type: "log",
        obj: { message: message, mod: system, level: level }
    }), 65432, '127.0.0.1');
};
global.file = {
    write: {
        nv: function () {  // write non-volatile memory to the disk
            timer.fileWriteLast ||= time.epoch;
            clearTimeout(timer.fileWrite);
            if (time.epoch - timer.fileWriteLast > 9) writeFile();
            else timer.fileWrite = setTimeout(() => { writeFile(); }, 10e3);
            function writeFile() {
                // slog("writing NV data...");
                timer.fileWriteLast = time.epoch;
                fs.writeFile(workingDir + "/nv-" + moduleName + "-bak.json", JSON.stringify(nvMem, null, 2), function () {
                    fs.copyFile(workingDir + "/nv-" + moduleName + "-bak.json", workingDir + "/nv-" + moduleName + ".json", (err) => {
                        if (err) throw err;
                    });
                });
            }
        }
    },
};

let
    checkArgs = function () {
        const args = process.argv.slice(2);
        const map = {};
        const execStartArgs = [];
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith("-")) {
                let value = true;
                if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
                    value = args[i + 1];
                    i++;
                }
                map[arg] = value;
                if (arg === "-a" || arg === "-c" || arg === "-n") {
                    execStartArgs.push(arg);
                    if (value !== true) {
                        execStartArgs.push(`"${value}"`);
                    }
                }
            }
        }
        const argsString = execStartArgs.join(" ");
        for (let i = 0; i < args.length; i++) {
            const option = args[i];
            const value = args[i + 1];
            switch (option) {
                case "-n":
                    if (value) {
                        moduleName = value.toLowerCase();
                        console.log(`Setting client name to: ${moduleName}`);
                        i++;
                    } else {
                        console.error("Missing value for -n flag.");
                    }
                    break;
                case "--install":
                    console.log(a.color("yellow", "installing TWIT-Client-" + moduleName + " service..."));
                    if (map["-j"]) {
                        console.log("Extra function triggered because -j was provided:", map["-j"]);
                        process.exit();
                    }
                    const execStartCommand = `nodemon "${workingDir}client.js" -w "${workingDir}client.js" --exitcrash ${argsString}`;
                    console.log("service command: " + execStartCommand);
                    let service = [
                        "[Unit]",
                        "Description=",
                        "After=network-online.target",
                        "Wants=network-online.target\n",
                        "[Install]",
                        "WantedBy=multi-user.target\n",
                        "[Service]",
                        "ExecStartPre=/bin/bash -c 'uptime=$(awk \\'{print int($1)}\\' /proc/uptime); if [ $uptime -lt 300 ]; then sleep 70; fi'",
                        `ExecStart=${execStartCommand}`,
                        "Type=simple",
                        "User=root",
                        "Group=root",
                        "WorkingDirectory=" + workingDir,
                        "Restart=on-failure",
                        "RestartSec=10\n",
                    ];
                    fs.writeFileSync("/etc/systemd/system/twit-client-" + moduleName + ".service", service.join("\n"));
                    execSync("systemctl daemon-reload");
                    execSync("systemctl enable twit-client-" + moduleName + ".service");
                    execSync("systemctl start twit-client-" + moduleName);
                    execSync("service twit-client-" + moduleName + " status");
                    slog("service installed and started");
                    console.log("type: journalctl -fu twit-client-" + moduleName);
                    process.exit();
                case "--uninstall":
                    console.log(a.color("yellow", "uninstalling TWIT-Client-" + moduleName + " service..."));
                    try { execSync("systemctl stop twit-client-" + moduleName); } catch { }
                    try { execSync("systemctl disable twit-client-" + moduleName + ".service"); } catch { }
                    try { fs.unlinkSync("/etc/systemd/system/twit-client-" + moduleName + ".service"); } catch { }
                    execSync("systemctl daemon-reload");
                    console.log("TWIT-Client-" + moduleName + " service uninstalled");
                    process.exit();
                case "-a":
                    try { moduleName ||= moduleName } catch {
                        console.log(a.color("red", "you must specify a module name with -n"));
                        process.exit();
                    }
                    const automationFile = value;
                    let configLoaded = false;
                    let configPath = null;
                    if (args[i + 2] === "-c" && args[i + 3]) {
                        const configFile = args[i + 3];
                        configPath = path.resolve(configFile);
                        const fileExtension = path.extname(configPath).toLowerCase();
                        try {
                            let externalCfg = {};
                            if (fileExtension === '.json') {
                                externalCfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                                console.log(externalCfg)
                                console.log(`Loaded external JSON config from: ${configFile}`);
                                if (externalCfg.ha) Object.assign(config.ha ||= {}, externalCfg.ha);
                                if (externalCfg.esp) Object.assign(config.esp ||= {}, externalCfg.esp);
                                for (const name in externalCfg.config) {
                                    config[name] ||= {};
                                    console.log(`Loaded external JSON config for automation: ${name}`);
                                    Object.assign(config[name], externalCfg.config[name])
                                }
                            } else if (fileExtension === '.js') {
                                externalCfg = require(configPath);
                                console.log(`Loaded external JS config from: ${configFile}`);
                                if (externalCfg.ha) Object.assign(config.ha ||= {}, externalCfg.ha);
                                if (externalCfg.esp) Object.assign(config.esp ||= {}, externalCfg.esp);
                                for (const name in externalCfg.config) {
                                    console.log(`Loaded external JSON config for automation: ${name}`);
                                    Object.assign(config[name] ||= {}, externalCfg.config[name])
                                }
                            } else {
                                console.error(`Error: Unsupported config file type "${fileExtension}". Only .json or .js are supported.`);
                                continue;
                            }
                            configLoaded = true;
                            // Use the new generic watcher for the config file
                            auto.watcher(configPath, auto.reload);
                        } catch (error) {
                            console.error(`Error loading external config file "${configFile}":`, error.message);
                        }
                        i += 2;
                    }
                    const clientModule = auto.load(automationFile);
                    if (clientModule) {
                        if (!configLoaded) {
                            loadConfig(clientModule);
                            console.log(`Loaded internal config from: ${automationFile}`);
                        }
                        auto.watcher(automationFile, auto.reload);
                        // Store the config path for this automation
                        auto.paths[automationFile] = configPath;
                        function loadConfig() {
                            if (clientModule.ha) {
                                slog("importing home assistant entities from automation client")
                                config.ha ||= {};
                                Object.assign(config.ha, clientModule.ha);
                            }
                            if (clientModule.esp) {
                                slog("importing ESP entities from automation client")
                                config.esp ||= {};
                                Object.assign(config.esp, clientModule.esp);
                            }
                        }
                    }
                    i++;
                    break;
                default:
                    if (option.startsWith("-")) {
                        console.log(`Unknown or unhandled flag: ${option}`);
                    }
                    break;
            }
        }
    },
    auto = {
        call: function (data) {
            for (const name in automation) { try { automation[name](name, data) } catch (e) { console.error(e) } }
        },
        load: function (automationFile) {
            try {
                const automationPath = path.resolve(automationFile);
                // console.log("State of 'automation' before Object.assign():", automation);
                const clientModule = require(automationPath);
                //console.log(clientModule)
                if (!clientModule.automation) throw new Error("Module does not export an 'automation' object.");
                const automationName = path.parse(automationPath).name;
                Object.assign(automation, clientModule.automation);
                console.log(`Successfully processed automation: ${automationFile}`);
                // console.log(automation)
                return clientModule;
            } catch (error) {
                console.error(`Error processing automation file "${automationFile}":`, error.message);
                return null;
            }
        },
        reload: function (automationFilePath) {
            try {
                const oldName = path.parse(automationFilePath).name;
                const reloadedModule = auto.clear(automationFilePath);
                const newModuleExports = auto.load(automationFilePath);
                auto.call();
                // auto.call();
                state.cache = {};
                auto.watcher(automationFilePath, auto.reload);
                const configPath = auto.paths[automationFilePath];
                if (configPath) {
                    auto.watcher(configPath, auto.reload);
                }
                slog(`Successfully reloaded and restarted automation: ${oldName}`);
                sys.register();
                if (config.ha?.subscribe) core.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1');
                if (config.esp?.subscribe) core.send(JSON.stringify({ type: "espFetch" }), 65432, '127.0.0.1');
            } catch (error) {
                console.error(`Failed to reload automation file "${automationFilePath}":`, error.message);
                slog(`Failed to reload automation: ${automationFilePath}. Error: ${error.message}`, 3, "HOT-RELOAD-FAIL");
            }
        },
        watcher: function (filePath, reloadCallback) {
            if (fileWatchers[filePath]) {
                fileWatchers[filePath].close();
                delete fileWatchers[filePath];
            }
            const watcher = fs.watch(filePath, (eventType, filename) => {
                if (eventType === 'change') {
                    const timerKey = `timer_${filePath}`;
                    timer[timerKey] ||= null;
                    if (timer[timerKey]) clearTimeout(timer[timerKey]);

                    timer[timerKey] = setTimeout(() => {
                        slog(`File change event debounced. Reloading ${filePath}...`, 1, 'HOT-RELOAD');
                        reloadCallback(filePath);
                        delete timer[timerKey];
                    }, 200);
                }
            });
            fileWatchers[filePath] = watcher;
        },
        clear: function (modulePath) {
            const resolvedPath = require.resolve(modulePath);
            if (require.cache[resolvedPath]) delete require.cache[resolvedPath];
            return require(resolvedPath);
        },
    },
    user = {        // user configurable block - Telegram 
        telegram: { // enter a case matching your desirable input 
            agent: function (msg) {
                //  log("incoming telegram message: " + msg,  0);
                //  console.log("incoming telegram message: ", msg);
                if (telegram.auth(msg)) {
                    switch (msg.text) {
                        case "?": console.log("test help menu"); break;
                        case "/start": bot(msg.chat.id, "you are already registered"); break;
                        case "R":   // to include uppercase letter in case match, we put no break between upper and lower cases
                        case "r":
                            bot(msg.from.id, "Test Menu:");
                            setTimeout(() => {      // delay to ensure menu Title gets presented first in Bot channel
                                telegram.buttonToggle(msg, "TestToggle", "Test Button");
                                setTimeout(() => {      // delay to ensure menu Title gets presented first in Bot channel
                                    telegram.buttonMulti(msg, "TestMenu", "Test Choices", ["test1", "test2", "test3"]);
                                }, 200);
                            }, 200);
                            break;
                        default:
                            log("incoming telegram message - unknown command - " + JSON.stringify(msg.text), 0);
                            break;
                    }
                }
                else if (msg.text == config.telegram.password) telegram.sub(msg);
                else if (msg.text == "/start") bot(msg.chat.id, "give me the passcode");
                else bot(msg.chat.id, "i don't know you, go away");

            },
            callback: function (msg) {  // enter a two character code to identify your callback "case" 
                let code = msg.data.slice(0, 2);
                let data = msg.data.slice(2);
                switch (code) {
                    case "TestToggle":  // read button input and toggle corresponding function
                        if (data == "true") { myFunction(true); break; }
                        if (data == "false") { myFunction(false); break; }
                        break;
                    case "TestMenu":  // read button input and perform actions
                        switch (data) {
                            case "test1": bot(msg.from.id, "Telegram " + data); log("Telegram test1", 0); break;
                            case "test2": bot(msg.from.id, "Telegram " + data); log("Telegram test2", 0); break;
                            case "test3": bot(msg.from.id, "Telegram " + data); log("Telegram test3", 0); break;
                        }
                        break;
                }       // create a function for use with your callback
                function myFunction(newState) {    // function that reads the callback input and toggles corresponding boolean in Home Assistant
                    bot(msg.from.id, "Test State: " + newState);
                }
            },
        },
    },
    telegram = {
        sub: function (msg) {
            let buf = { user: msg.from.first_name + " " + msg.from.last_name, id: msg.from.id }
            if (!telegram.auth(msg)) {
                slog("telegram - user just joined the group - " + msg.from.first_name + " " + msg.from.last_name + " ID: " + msg.from.id, 0, 2);
                nvMem.telegram.push(buf);
                bot(msg.chat.id, 'registered');
                core.send(JSON.stringify({ type: "telegram", obj: { class: "sub", id: msg.from.id } }), 65432, '127.0.0.1');
                file.write.nv();
            } else bot(msg.chat.id, 'already registered');
        },
        auth: function (msg) {
            let exist = false;
            for (let x = 0; x < nvMem.telegram.length; x++)
                if (nvMem.telegram[x].id == msg.from.id) { exist = true; break; };
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
        buttonMulti: function (msg, auto, array) {
            buf = { reply_markup: { inline_keyboard: [[]] } };
            array.forEach(element => {
                buf.reply_markup.inline_keyboard[0].push({ text: element, callback_data: (auto + element) })
            });
            bot(msg.from.id, buf);
        },
    },
    sys = {         // ______________________system area, don't need to touch anything below this line__________________________________
        com: function () {
            core.on('message', function (data, info) {
                let buf = JSON.parse(data);
                //  console.log(buf);
                switch (buf.type) {
                    case "espState":            // incoming state change (from ESP)
                        // console.log("receiving esp data, name: " + buf.obj.name + " state: " + buf.obj.state);
                        state.cache[buf.obj.name] ||= {};
                        if (state.cache[buf.obj.name].state != buf.obj.state) {
                            state.cache[buf.obj.name].state = buf.obj.state;
                            state.cache[buf.obj.name].update = time.epoch;
                            state.cache[buf.obj.name].stamp = time.stamp;
                            if (online == true) auto.call({ name: buf.obj.name, newState: buf.obj.state });
                            // console.log(buf.obj)
                        } else if (online == true) auto.call({ name: buf.obj.name, newState: buf.obj.state });
                        entity[buf.obj.name] ||= {}; // If state.esp[buf.obj.name] is falsy (undefined, null, 0, '', false), assign it an empty object.
                        entity[buf.obj.name].state = buf.obj.state;
                        entity[buf.obj.name].update = time.epoch;

                        break;
                    case "haStateUpdate":       // incoming state change (from HA websocket service)
                        slog("receiving HA state data, entity: " + buf.obj.name + " value: " + buf.obj.state, 0);
                        // console.log(buf);
                        entity[buf.obj.name] ||= {};
                        entity[buf.obj.name].update = time.epoch;
                        try { entity[buf.obj.name].state = buf.obj.state; } catch { }
                        if (online == true) {
                            auto.call({ name: buf.obj.name, newState: buf.obj.state });
                            if (config.ha.sync && config.ha.sync.length > 0) {
                                config.ha.sync.forEach(element => {
                                    // console.log("partners: ", element[0], "  -  ", element[1]);
                                    if (buf.obj.name == element[0]) send(element[1], buf.obj.state);
                                    if (buf.obj.name == element[1]) send(element[0], buf.obj.state);
                                });
                            }
                        }// else auto.call({ name: buf.obj.name, newState: buf.obj.state, only: true });
                        break;
                    case "haFetchReply":        // Incoming HA Fetch result
                        // console.log(buf.obj)
                        Object.assign(entity, buf.obj);
                        slog("receiving fetch data...");
                        if (onlineHA == false) sys.boot(4);
                        break;
                    case "haFetchAgain":        // Core is has reconnected to HA, so do a refetch
                        slog("Core has reconnected to HA, fetching again");
                        core.send(JSON.stringify({ type: "espFetch" }), 65432, '127.0.0.1');
                        core.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1');
                        break;
                    case "haQueryReply":        // HA device queryHA fetch is failing
                        console.log("Available HA Devices: " + buf.obj);
                        break;
                    case "udpReRegister":       // reregister request from server
                        if (online == true) {
                            slog("server lost sync, reregistering...");
                            setTimeout(() => {
                                sys.register();
                            }, 1e3);
                        }
                        break;
                    case "coreData":
                        // console.log("received coreData: ", buf.obj);
                        if (buf.obj.name && buf.obj.state) {
                            if (!entity[buf.obj.name]) entity[buf.obj.name] = {};
                            entity[buf.obj.name].state = buf.obj.state;
                            entity[buf.obj.name].update = time.epoch;
                            auto.call({ name: buf.obj.name, newState: buf.obj.state });
                        }
                        break;
                    case "diag":                // incoming diag refresh request, then reply object
                        function safeStringify(obj) {
                            const seen = new WeakSet();
                            return JSON.stringify(obj, (key, value) => {
                                if (typeof value === "object" && value !== null) {
                                    if (seen.has(value)) return "[Circular]";
                                    seen.add(value);
                                    // Node.js Timeout objects usually have _idleNext/_idlePrev
                                    if (value._idleNext !== undefined && value._idlePrev !== undefined) {
                                        return "[Timeout]";
                                    }
                                }
                                return value;
                            }, 2);
                        }
                        core.send(safeStringify({
                            type: "diag",
                            obj: { state, nv: nvMem, config }
                        }), 65432, '127.0.0.1');
                        // console.log(state)
                        //core.send(JSON.stringify({ type: "diag", obj: { state, nv: nvMem, config } }), 65432, '127.0.0.1');
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
                    case "proceed": if (online == false) setTimeout(() => { sys.boot(3); }, 1e3); break;
                    case "log": console.log(buf.obj); break;
                }
            });
        },
        register: function () {
            let obj = {};
            if (config.ha != undefined) obj.ha = config.ha;
            if (config.esp) {
                if (config.esp.subscribe) obj.esp = config.esp.subscribe;
                if (config.esp.heartbeat != undefined && config.esp.heartbeat.length > 0) {
                    config.esp.heartbeat.forEach((e, x) => {
                        slog("registering heartbeat for ESP: " + e.name);
                        if (heartbeat.timer[x]) clearInterval(heartbeat.timer[x]);
                        heartbeat.timer[x] = setInterval(() => {
                            if (heartbeat.state[x]) {
                                core.send(JSON.stringify({
                                    type: "espState",
                                    obj: { name: e.name, state: false }
                                }), 65432, '127.0.0.1')
                                heartbeat.state[x] = false;
                            }
                            else {
                                core.send(JSON.stringify({
                                    type: "espState",
                                    obj: { name: e.name, state: true }
                                }), 65432, '127.0.0.1')
                                heartbeat.state[x] = true;
                            }
                        }, e.interval * 1e3);
                    });
                }

            }
            if (config.telegram != undefined) obj.telegram = true;
            core.send(JSON.stringify({ type: "register", obj, name: moduleName }), 65432, '127.0.0.1');
            if (config.telegram != undefined) {
                if (nv.telegram == undefined) nv.telegram = [];
                else for (let x = 0; x < nv.telegram.length; x++) {
                    core.send(JSON.stringify({ type: "telegram", obj: { class: "sub", id: nv.telegram[x].id } }), 65432, '127.0.0.1');
                }
            }
            if (config.coreData && config.coreData.length > 0) {
                send("cdata", { register: true, name: config.coreData });
            }
        },
        init: function () {
            automation = {};
            nvMem = {};
            config = { ha: {}, esp: {}, udp: {} };
            state = { cache: {}, args: "" };
            heartbeat = { timer: [], state: [] };
            logName = null;
            entity = {};
            onlineHA = false;
            online = false;
            timer = { fileWriteLast: null };
            fileWatchers = {};
            auto.paths = {};
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
            a = {
                color: function (color, input, ...option) {   //  ascii color function for terminal colors
                    if (input == undefined) input = '';
                    let c, op = "", bold = ';1m', vbuf = "";
                    for (let x = 0; x < option.length; x++) {
                        if (option[x] == 0) bold = 'm';         // Unbold
                        if (option[x] == 1) op = '\x1b[5m';     // blink
                        if (option[x] == 2) op = '\u001b[4m';   // underline
                    }
                    switch (color) {
                        case 'black': c = 0; break;
                        case 'red': c = 1; break;
                        case 'green': c = 2; break;
                        case 'yellow': c = 3; break;
                        case 'blue': c = 4; break;
                        case 'purple': c = 5; break;
                        case 'cyan': c = 6; break;
                        case 'cyan': c = 7; break;
                    }
                    if (input === true) return '\x1b[3' + c + bold;     // begin color without end
                    if (input === false) return '\x1b[37;m';            // end color
                    vbuf = op + '\x1b[3' + c + bold + input + '\x1b[37;m';
                    return vbuf;
                }
            };
            time.startTime();
            ha = { getEntities: function () { send("haQuery") }, };
            fs = require('fs');
            // events = require('events');
            // em = new events.EventEmitter();
            exec = require('child_process').exec;
            execSync = require('child_process').execSync;
            workingDir = require('path').dirname(require.main.filename) + "/";
            path = require('path');
            scriptName = path.basename(__filename).slice(0, -3);
            udpClient = require('dgram');
            core = udpClient.createSocket('udp4');
            sys.boot(0);
        },
        boot: function (step) {
            switch (step) {
                case 0:
                    checkArgs();
                    console.log("starting arguments: " + state.args)
                    setTimeout(() => { time.sync(); time.boot++ }, 1e3);
                    console.log("Loading non-volatile data...");
                    fs.readFile(workingDir + "/nv-" + moduleName + ".json", function (err, data) {
                        if (err) {
                            slog("\x1b[33;1mNon-Volatile Storage does not exist\x1b[37;m"
                                + ", nv-" + moduleName + ".json file should be in same folder as client.js file (" + workingDir + ")");
                            nvMem = { telegram: [] };
                        }
                        else { nvMem = JSON.parse(data); }
                        sys.boot(2);
                    });
                    break;
                case 1:
                    console.log("Loading config data...");
                    // fs.writeFileSync(workingDir + "/config-" + scriptName + ".json", JSON.stringify(cfg, null, 2), 'utf-8')
                    //process.exit();
                    fs.readFile(workingDir + "/config-" + scriptName + ".json", function (err, data) {
                        if (err) {
                            slog("\x1b[33;1mconfig file does not exist\x1b[37;m"
                                + ", config-" + scriptName + ".json file should be in same folder as client-" + scriptName + ".js file (" + workingDir + ")");
                            process.exit();
                        }
                        else { cfg = JSON.parse(data); }
                        sys.boot(2);
                    });
                    break;
                case 2:
                    sys.com();
                    slog("trying to register with TWIT Core");
                    sys.register();
                    bootWait = setInterval(() => { sys.register(); }, 10e3);
                    break;
                case 3:
                    clearInterval(bootWait);
                    slog("registered with TWIT Core");
                    if (config.ha) {
                        slog("fetching Home Assistant entities");
                        core.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1');
                        bootWait = setInterval(() => {
                            slog("HA fetch is failing, retrying...", 2);
                            core.send(JSON.stringify({ type: "haFetch" }), 65432, '127.0.0.1');
                        }, 10e3);
                    } else sys.boot(4);
                    break;
                case 4:
                    clearInterval(bootWait);
                    if (config.ha) {
                        slog("Home Assistant fetch complete");
                        onlineHA = true;
                    }
                    if (config.esp && config.esp.subscribe && config.esp.subscribe.length > 0) {
                        slog("fetching esp entities");
                        core.send(JSON.stringify({ type: "espFetch" }), 65432, '127.0.0.1');
                        setTimeout(() => { sys.boot(5); }, 1e3);
                    } else sys.boot(5);
                    auto.call();
                    break;
                case 5:
                    if (config.esp && config.esp.subscribe && config.esp.subscribe.length > 0)
                        slog("ESP fetch complete");
                    online = true;
                    for (const name in automation) {
                        slog(name + " automation initializing...");
                    }
                    setInterval(() => { core.send(JSON.stringify({ type: "heartbeat" }), 65432, '127.0.0.1'); time.boot++; }, 1e3);
                    break;
            }
        },
    };
setTimeout(() => { sys.init(); }, 1e3);
