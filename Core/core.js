#!/usr/bin/node
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads'), thread = {};
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
if (isMainThread) {
    let
        sys = {
            udp: function (data, info) {
                let buf = null, port = info.port; prep();
                // if (obj.type == "haState" && buf.obj?.unit == undefined) console.log(buf)
                //  console.log(buf)
                switch (buf.type) {
                    case "heartbeat": try { state.client[buf.name].heartbeat = true; } catch (e) { console.log(e) } break; // start heartbeat 
                    case "state":
                        //console.log(buf)
                        // console.log(entity)
                        if (buf.data.name in entity || buf.data.unit) {
                            // console.log(entity[buf.data.name])
                            let ent = entity[buf.data.name] ?? undefined, packet;
                            if (buf.data.unit) {
                                if (!entity[buf.data.name]) {
                                    log("client - " + color("purple", buf.name)
                                        + " - is registering new HA sensor: " + buf.data.name, 3);
                                    entity[buf.data.name] = {
                                        client: {}, //to prevent crash
                                        owner: { type: "automation", client: buf.name, auto: buf.auto },
                                    }
                                }
                                entity[buf.data.name].state = buf.data.state;
                                entity[buf.data.name].unit = buf.data.unit;
                                entity[buf.data.name].update = time.epochMil;
                                entity[buf.data.name].stamp = time.stamp;
                                if (!buf.data.address)
                                    packet = { address: cfg.homeAssistant[0].address, unit: buf.data.unit };
                                else packet = { address: buf.data.address, unit: buf.data.unit };
                                sendPacket("HA");
                            } else {
                                packet = { address: ent.owner.name }
                                if (ent.owner.type.includes("ha")) {
                                    if (ent.zha) packet.zha = ent.zha.regID;
                                    sendPacket("HA");
                                } else {
                                    packet.esp_entity_id = ent.esp_entity_id;
                                    sendPacket("ESP");
                                }
                            }
                            function sendPacket(type) {
                                if (packet) {
                                    packet.type = "state";
                                    packet.entity = buf.data.name;
                                    packet.state = buf.data.state;
                                    //  console.log(packet)
                                    if (type == "HA") thread.ha.postMessage(packet);

                                    if (type == "ESP") thread.esp[entity[buf.data.name].owner.thread].postMessage(packet);
                                } else log("client - " + color("purple", buf.name)
                                    + " - is sending invalid " + type + " state update: " + buf.data.name, 3);

                                // console.log(packet)
                            }
                        }
                        break;
                    case "register":    // incoming registrations
                        //  log("client - " + color("purple", buf.name) + " - is initiating new registration", 3);
                        //  console.log(buf)
                        buf.data?.entities?.forIn((name, value) => {
                            if (name in entity) {
                                log("client - " + color("purple", buf.name) + " - is registering entity: " + name, 3, 0);
                            } else {
                                log("client - " + color("purple", buf.name) + " - is registering an UNKNOWN entity: " + name, 3, 2);
                                entity[name] ||= { client: {} };
                                // console.log(entity[name].client)
                            }
                            entity[name].client[buf.name] = { port };
                            //  console.log( entity[name])
                        })
                        if (buf.data.telegram) {
                            log("client - " + color("purple", buf.name) + " - is registering as telegram agent", 3);
                            state.client[id].telegram = true;
                            // state.telegram.port = info.port;
                        }
                        client("proceed", null, port);
                        break;
                    case "fetch":
                        log("client - " + color("purple", buf.name) + " - requesting fetch - port: " + port, 3);
                        if (cfg.homeAssistant?.length > 0) thread.ha.postMessage({ type: "fetch", name: buf.name, port });
                        else {
                            for (const name in entity) {
                                if (buf.name in entity[name].client) {
                                    log("local entities fetch reply: " + name, 1, 0);
                                    client("state", { name, state: entity[name].state }, port);
                                }
                            }
                            client("fetchReply", null, port);
                        }
                        break;
                    case "prune":
                        if (buf.data in entity) {
                            log("client - " + color("cyan", buf.name) + " - requesting prune of: " + buf.data + " - unregistering", 3, 1);
                            delete entity[buf.data].client[buf.name];
                            if (Object.keys(entity[buf.data].client).length === 0) {
                                log("client - " + color("cyan", buf.name) + " - entity: " + buf.data + " has no more associations - deleting", 3, 1);
                                delete entity[buf.data];
                            }
                        }
                        break;
                    case "log":         // incoming log messages from UDP clients
                        log(buf.data.message, buf.data.mod, buf.data.level, port);
                        break;
                    case "telegram":
                        log("receiving telegram data: " + buf.obj, 4, 0);
                        switch (buf.obj.class) {
                            case "send":
                                bot.sendMessage(buf.obj.id, buf.obj.data, buf.obj.obj).catch(error => { log("telegram sending error") })
                                break;
                        }
                        break;
                    default:            // default to heartbeat
                        break;
                }
                function prep() {
                    try { buf = JSON.parse(data); }
                    catch (error) { log("A UDP client (" + info.address + ") is sending invalid JSON data: " + error, 3, 3); return; }
                    //   console.log(buf)
                    try {
                        if (!(buf.name in state.client)) {
                            if (buf.type == "register") {
                                log("client - " + color("purple", buf.name) + " - creating new registration", 3);
                                state.client[buf.name] = { address: info.address, port: info.port, entities: [] };
                            } else if (buf.type != "log") {
                                log("client - " + color("purple", buf.name) + " - is unrecognized - requesting ReRegistrion", 3);
                                // console.log("buf type: " + buf.type)
                                state.client[buf.name] = { address: info.address, port: info.port, entities: [] };
                                client("reRegister", null, port);
                            }
                        } else if (buf.type == "register") {
                            log("client - " + color("purple", buf.name) + " - is ReRegistring", 3);
                        } else if (state.client[buf.name].port != info.port) {
                            log("client - " + color("purple", buf.name) + " - is unrecognized - updating", 3);
                            state.client[buf.name] = { address: info.address, port: info.port };
                        }
                        if (state.client[buf.name]) state.client[buf.name].update = time.epoch;
                        if (state.client[buf.name]) state.client[buf.name].stamp = time.stamp;
                    } catch (error) { log("A UDP client (" + info.address + ") is sending invalid data: " + error, 3, 3); return; }
                }
            },
            watchDog: function () {
                for (const name in state.client) {
                    if (state.client[name].heartbeat && time.epoch - state.client[name].update >= 5) {
                        log("client - " + color("purple", name) + " - has crashed!!", 3, cfg.logging.clientCrash ? 3 : 0);
                        delete state.client[name];
                    } else if (time.epoch - state.client[name].update >= 10) {
                        log("client - " + color("purple", name) + " - is a zombie, killing client", 3, cfg.logging.clientCrash ? 3 : 0);
                        delete state.client[name];
                    }
                }
            },
            ipc: function (data) {      // Incoming inter process communication 
                // console.log(data.type)
                switch (data.type) {
                    case "esp":
                        switch (data.class) {
                            case "newEntity":
                                if (!(data.obj.name in entity)) {
                                    // console.log("new device:", data);
                                    log("ESP Home - " + color("cyan", data.esp) + " - registering new entity: " + data.obj.name, 2, 0);
                                    entity[data.obj.name] ||= {
                                        client: {},
                                        owner: { type: "esp", name: data.esp },
                                    };
                                } else {
                                    log("ESP Home - " + color("cyan", data.esp) + " - registering existing entity: " + data.obj.name, 2, 0);

                                }
                                // entity[data.obj.name].owner = { type: "esp", name: data.esp };
                                entity[data.obj.name].update = time.epochMil;
                                entity[data.obj.name].stamp = time.stamp;
                                entity[data.obj.name].state = null;
                                entity[data.obj.name].esp_entity_id = data.obj.esp_entity_id;
                                entity[data.obj.name].owner.name = data.esp;
                                entity[data.obj.name].owner.thread = data.thread;
                                // console.log("new entity:", entity[data.obj.name]);
                                break;
                            case "reset":
                                log("ESP Home - " + color("cyan", data.esp) + " - resetting entity array for ESP: - DOING NOTHING HERE", 2, 0);
                                //  if (state.esp[data.esp] != undefined) state.esp[data.esp].entity = [];
                                break;
                            case "state":
                                //  console.log("incoming state change: ", state.esp[data.esp].entity[data.obj.io]);
                                //  console.log(data);
                                entity[data.obj.name] ||= {
                                    client: {},
                                    owner: { type: "esp", name: data.esp },
                                    update: time.epochMil,
                                    stamp: time.stamp,
                                    state: null,
                                };
                                try {
                                    entity[data.obj.name].update = time.epoch;
                                    entity[data.obj.name].stamp = time.stamp;
                                    entity[data.obj.name].state = data.obj.state;
                                    entity[data.obj.name].esp_entity_id = data.obj.esp_entity_id;
                                    entity[data.obj.name].owner.name = data.esp;
                                    entity[data.obj.name].owner.thread = data.thread;
                                    for (const name in entity[data.obj.name].client) {
                                        // console.log("sending esp state update to client: ", name);
                                        if (entity[data.obj.name].client[name].port)
                                            client("state", { name: data.obj.name, state: data.obj.state }, entity[data.obj.name].client[name].port);
                                    }
                                    //   console.log(entity[data.obj.name]);
                                } catch (e) {
                                    log("ESP Home - " + color("cyan", data.esp) + " - IPC state update error\n" + e, 2, 3);
                                    console.trace(entity[data.obj.name])
                                }
                                break;
                        }
                        break;
                    case "ha":
                        switch (data.class) {
                            case "state":
                                //   console.log(data);
                                if (data.name in entity) {
                                    // console.log(entity[data.name])
                                    try {
                                        for (const name in entity[data.name].client) {
                                            log("Websocket (" + color("cyan", data.address) + ") - state update for: "
                                                + data.name + " - to client: " + name, 1, 0);
                                            //  console.log(entity[data.name])
                                            entity[data.name].owner ||= { type: "ha", name: data.address };
                                            entity[data.name].state = data.state;
                                            entity[data.name].update = time.epochMil;
                                            entity[data.name].stamp = time.stamp;
                                            client("state", { name: data.name, state: data.state }, state.client[name].port);
                                        }
                                    } catch (error) { console.log("error sending HA State update to client: ", error) }
                                }
                                break;
                            case "result":
                                if (!(data.name in entity)) {
                                    entity[data.name] = { client: {} };
                                    // console.log("adding new entity: " + data.name);
                                    log("Websocket (" + color("cyan", data.address) + ") - adding new entity: "
                                        + color("cyan", data.name, false), 1, 0);
                                } else log("Websocket (" + color("cyan", data.address) + ") - adding existing entity: "
                                    + color("cyan", data.name, false), 1, 0);
                                entity[data.name].owner ||= { type: "ha", name: data.address };
                                entity[data.name].state = data.state;
                                entity[data.name].update = time.epochMil;
                                entity[data.name].stamp = time.stamp;
                                break;
                            case "result_zha":
                                if (!(data.name in entity)) {
                                    entity[data.name] = {
                                        client: {},
                                        zha: {
                                            regID: data.dev.device_reg_id,
                                            deviceName: data.dev.name
                                        }
                                    };
                                    log("Websocket (" + color("cyan", data.address) + ") - adding new ZHA device: "
                                        + color("cyan", data.name, false), 1, 0);
                                    // console.log("adding new entity: " + name);
                                } else log("Websocket (" + color("cyan", data.address) + ") - adding existing ZHA device: "
                                    + color("cyan", data.name, false), 1, 0);
                                entity[data.name].owner ||= { type: "ha_zha", name: data.address };
                                entity[data.name].state = null;
                                entity[data.name].update = time.epochMil;
                                entity[data.name].stamp = time.stamp;
                                break;
                            case "fetch":
                                for (const name in entity) {
                                    //  console.log(entity[name])
                                    try {
                                        if (data.name in entity[name].client) {
                                            log("Websocket (" + color("cyan", data.address) + ") - fetch reply to client: "
                                                + color("purple", data.name) + " - entity: " + name, 1, 0);
                                            client("state", { name, state: entity[name].state }, data.port);
                                        }
                                    } catch (error) { console.trace("fetch crash: ", entity[name]) }
                                }
                                client("fetchReply", null, data.port);
                                break;
                        }
                        break;
                    case "log":
                        //  console.log(data)
                        log(data.msg, data.module, data.level); break;
                    case "udpSend":
                        break;
                }
            },
            boot: function (step) {
                switch (step) {
                    case 0:     // read config.json file
                        fs = require('fs')
                        workingDir = require('path').dirname(require.main.filename);
                        console.log("Loading config data...");
                        fs.readFile(workingDir + "/config.json", function (err, data) {
                            if (err) {
                                console.log("\x1b[31;1mCannot find config file, exiting\x1b[37;m"
                                    + "\nconfig.json file should be in same folder as core.js file");
                                process.exit();
                            }
                            else { cfg = JSON.parse(data); sys.boot(1); }
                        });
                        exec = require('child_process').exec;
                        execSync = require('child_process').execSync;
                        break;
                    case 1:     // read nv.json file
                        console.log("checking args");
                        sys.checkArgs();
                        sys.lib();
                        sys.init();
                        log("initializing system states done");
                        log("Loading non-volatile data...");
                        fs.readFile(workingDir + "/nv-core.json", function (err, data) {
                            if (err) {
                                log("\x1b[33;1mNon-Volatile Storage does not exist\x1b[37;m"
                                    + "\nnv.json file should be in same folder as core.js file");
                                nv = { coreData: {}, telegram: [] };
                                file.write.nv();
                                sys.boot(2);
                            } else {
                                nv = JSON.parse(data);
                                log("deep merging NV coreData into live state memory");
                                objMerge(state.coreData, nv.coreData);
                                sys.boot(2);
                            }
                        });
                        break;
                    case 2:     // state init and load modules and workers 
                        log("actual working directory: " + workingDir);

                        /*
                        thread.esp ||= {};
                        if (cfg.esp?.enable && cfg.esp.devices?.length > 0) { // load worker threads
                            cfg.esp.devices.forEach((esp, x) => { newWorker(esp, true); });
                            function newWorker(esp, boot) {
                                if (boot) log("initialing ESP thread: " + esp.name);
                                else log("re-initialing crashed ESP thread: " + esp.name);
                                thread.esp[esp.name] = (new Worker(__filename, { workerData: { class: "esp" } }));
                                thread.esp[esp.name].on('message', (data) => sys.ipc(data));
                                thread.esp[esp.name].on('error', (error) => {
                                    log("ESP worker: " + esp.name + " crashed", 0, 3); console.log(error); newWorker(esp);
                                });
                                //  thread.esp[x].on('exit', (code) => { log("ESP worker: " + x + " exited", 0, 3); newWorker(x, obj); });
                                thread.esp[esp.name].postMessage({ type: "config", esp });
                            }
                        }
                            */
                        if (cfg.webDiag) {
                            express.get("/el", function (request, response) { response.send(logs.esp); });
                            express.get("/log", function (request, response) { response.send(logs.sys); });
                            express.get("/tg", function (request, response) { response.send(logs.tg); });
                            express.get("/ws", function (request, response) { response.send(logs.ws); });
                            express.get("/nv", function (request, response) { response.send(nv); });
                            express.get("/state", function (request, response) { response.send(state); });
                            express.get("/cfg", function (request, response) { response.send(cfg); });
                            express.get("/perf", function (request, response) { response.send(state.perf); });
                            express.get("/esp", function (request, response) { response.send(state.esp); });
                            express.get("/udp", function (request, response) { response.send(state.client); });
                            express.get("/ha", function (request, response) {
                                for (let x = 0; x < cfg.homeAssistant.length; x++) {
                                    logs.haInputs[x] = [];
                                    ///////////          em.emit('zhaQuery' + x);
                                    hass[x].states.list()
                                        .then(data => {
                                            data.forEach(element => { logs.haInputs[x].push(element.entity_id) });
                                            if (cfg.homeAssistant.length - 1 == x) setTimeout(() => {
                                                response.send({ ZHA: logs.zhaDevices, HA: logs.haInputs });
                                            }, 200);
                                        })
                                        .catch(err => { log("fetching failed", 0, 2); });
                                }
                            });
                            express.get("/client/:name", async function (request, response) {
                                const clientName = request.params.name;  // Extract client name from the URL
                                const client = state.client.find(c => c.name.toLowerCase() === clientName);  // Find the client by name
                                if (client == undefined) return response.status(404).send({ error: `Client with name "${clientName}" not found` });
                                try {
                                    const result = await sendDiagCommand(client, 1000);  // Timeout of 1000ms
                                    if (result.error) return response.status(408).send(result);
                                    response.send(result);
                                } catch (error) {
                                    response.status(500).send({ error: `Error collecting diagnostic data: ${error.message}` });
                                }
                            });
                            function sendDiagCommand(client, timeout = 1000) {
                                return new Promise((resolve) => {
                                    udp.send(JSON.stringify({ type: "diag" }), client.port);
                                    const timer = setTimeout(() => {
                                        resolve({ name: client.name, ip: client.ip, error: `Timeout for client: ${client.name}` });
                                    }, timeout);
                                    const onDiagResponse = (msg) => {
                                        let buf = JSON.parse(msg);
                                        if (buf.clientId === client.id) {
                                            clearTimeout(timer); // Clear the timeout if response received
                                            resolve({ client: client.name, config: buf.obj?.config, state: buf.obj?.state, nv: buf.obj?.nv });
                                            console.log(buf.obj?.state)
                                        }
                                    };
                                    udp.once("message", onDiagResponse); // Use `once` to only listen for one response per client
                                });
                            }
                            serverWeb = express.listen(cfg.webDiagPort, function () { log("diag web server starting on port " + cfg.webDiagPort, 0); });
                        }
                        if (cfg.telegram && cfg.telegram.enable == true) {
                            TelegramBot = require('node-telegram-bot-api');   // lib is here so it wont even be loaded unless enabled 
                            if (cfg.telegram.token != undefined && cfg.telegram.token.length < 40) {
                                log(color("red", "Telegram API Token is invalid", 3));
                            } else {
                                log("starting Telegram service...");
                                bot = new TelegramBot(cfg.telegram.token, { polling: true });
                                bot.on('message', (msg) => {
                                    if (logs.tg[logs.tgStep] == undefined) logs.tg.push(msg);
                                    else logs.tg[logs.tgStep] = msg;
                                    if (logs.tgStep < 100) logs.tgStep++; else logs.tgStep = 0;
                                    for (let x = 0; x < state.client.length; x++)
                                        if (state.client[x].telegram == true)
                                            udp.send(JSON.stringify({ type: "telegram", obj: { class: "agent", data: msg } }), state.client[x].port);

                                });
                                bot.on('callback_query', (msg) => {
                                    for (let x = 0; x < state.client.length; x++)
                                        if (state.client[x].telegram == true)
                                            udp.send(JSON.stringify({ type: "telegram", obj: { class: "callback", data: msg } }), state.client[x].port);
                                });
                                bot.on('polling_error', (error) => {
                                    //   log("telegram sending polling error")
                                });
                                bot.on('webhook_error', (error) => {
                                    log("telegram webhook error")
                                });
                                state.telegram.started = true;
                            }
                        }
                        sys.boot(3);
                        break;
                    case 3:     // connect to ESP and Home Assistant
                        thread.esp ||= [];
                        // const thread = { esp: [] };                // will be an array of Worker objects
                        threadAssignments = {};              // threadAssignments[threadID] = [ cfg, cfg, ... ]
                        const MAX_PER_THREAD = 10;
                        const WORKER_SCRIPT = __filename;          // assumes worker code (case "esp") lives in same file


                        function distributeESPDevices(devices) {
                            const count = Math.max(1, Math.ceil(devices.length / MAX_PER_THREAD));
                            // create empty assignment arrays and create workers
                            for (let tid = 0; tid < count; tid++) {
                                threadAssignments[tid] = [];
                                newWorkerThread(tid, true);
                            }

                            // assign devices to threads and send initial config
                            devices.forEach((cfg, idx) => {
                                const tid = Math.floor(idx / MAX_PER_THREAD);
                                threadAssignments[tid].push(cfg);
                                // post the config to that worker (worker expects { type: "config", esp: cfg, threadID })
                                if (!thread.esp[tid]) {
                                    // fallback: create worker if somehow missing
                                    newWorkerThread(tid, true);
                                }
                                thread.esp[tid].postMessage({ type: "config", esp: cfg, threadID: tid });
                            });
                        }

                        // admin helpers:
                        function addDeviceToThread(cfg, threadID) {
                            threadAssignments[threadID] = threadAssignments[threadID] || [];
                            threadAssignments[threadID].push(cfg);
                            thread.esp[threadID].postMessage({ type: "config", esp: cfg, threadID });
                        }
                        function removeDeviceFromThread(cfgName, threadID) {
                            // main thread signals worker to close (worker will fully cleanup)
                            if (thread.esp[threadID]) {
                                thread.esp[threadID].postMessage({ type: "close", esp: { name: cfgName }, threadID });
                            }
                            if (Array.isArray(threadAssignments[threadID])) {
                                threadAssignments[threadID] = threadAssignments[threadID].filter(c => c.name !== cfgName);
                            }
                        }

                        // USAGE (example):
                        distributeESPDevices(cfg.esp.devices);

                        function newWorkerThread(threadID, boot = true) {
                            if (boot) log("initializing ESP worker thread: " + threadID, 1);
                            else log("re-initializing crashed ESP worker thread: " + threadID, 0);

                            // create worker that will run the same file and enter worker branch via workerData.class === 'esp'
                            const w = new Worker(WORKER_SCRIPT, { workerData: { class: "esp", threadID } });

                            // store
                            thread.esp[threadID] = w;

                            // forward messages to your ipc routine (keeps your existing sys.ipc handling)
                            w.on('message', (data) => {
                                // data will already include .esp (name) and .threadID from worker send
                                try { sys.ipc(data); } catch (e) { console.error("sys.ipc error:", e); }
                            });

                            // log and allow exit to trigger restart
                            w.on('error', (err) => {
                                log("ESP worker thread " + threadID + " error: " + String(err), 3);
                                // don't restart here — 'exit' will handle restart to avoid double-restart races
                            });

                            // if a worker exits (crash or graceful) restart it and re-post configs
                            w.on('exit', (code) => {
                                log("ESP worker thread " + threadID + " exited with code " + code, 2);
                                // small delay to avoid restart storms
                                setTimeout(() => {
                                    // re-create thread
                                    newWorkerThread(threadID, false);

                                    // re-post assigned configs (if any) after new worker is created
                                    const assigned = threadAssignments[threadID] || [];
                                    if (assigned.length > 0) {
                                        assigned.forEach(cfg => {
                                            try {
                                                // check worker exists
                                                if (thread.esp[threadID]) thread.esp[threadID].postMessage({ type: "config", esp: cfg, threadID });
                                            } catch (e) {
                                                log("Failed to re-post config " + (cfg && cfg.name) + " to restarted thread " + threadID + ": " + String(e), 3);
                                            }
                                        });
                                    }
                                }, 2000);
                            });

                            return w;
                        }


                        if (cfg.comCache) log(color("yellow", "push caching is enabled"), 1);
                        process.on('unhandledRejection', (reason, promise) => { // to catch telegram errors
                            // console.error('Unhandled Rejection:', reason);
                        });
                        if (cfg.homeAssistant) {
                            //  ha.ws(x);
                            newWorker(true);
                            function newWorker(boot) {
                                if (boot) log("initialing HA thread");
                                else log("re-initialing crashed HA thread: ");
                                thread.ha = (new Worker(__filename, { workerData: { class: "ha" } }));
                                thread.ha.on('message', (data) => sys.ipc(data));
                                thread.ha.on('error', (error) => {
                                    log("HA worker: crashed", 0, 3);
                                    console.log(error);
                                    //  newWorker();
                                });
                                //  thread.ha.on('exit', (code) => { log("ESP worker: " + x + " exited", 0, 3); newWorker(x, obj); });
                                // log("connecting to Home Assistant: " + color("cyan", server.address), 1);
                                thread.ha.postMessage({ type: "config", cfg: cfg.homeAssistant, entity });
                            }
                        }
                        setTimeout(() => { sys.boot(4); }, 2e3);
                        break;
                    case 4:     // start system timer - starts when initial HA Fetch completes
                        udp.on('listening', () => {
                            log("starting UDP Server - Interface: "
                                + color("cyan", "127.0.0.1") + " Port: " + color("cyan", "65432"));
                        });
                        udp.on('error', (err) => { console.error(`udp server error:\n${err.stack}`); udp.close(); });
                        udp.on('message', (msg, info) => { sys.udp(msg, info); });
                        udp.bind(65432, "127.0.0.1");
                        setInterval(() => { sys.watchDog(); }, 1e3);
                        setTimeout(() => { log("TW Core just went online", 0, 2); }, 20e3);
                        break;
                }
            },
            init: function () { // initialize system volatile memory
                state = { client: {}, perf: { ha: [] }, };
                entity = {};
                ws = [];
                timer = { fileWrite: null, fileWriteLast: time.epoch };
                logs = { step: 0, sys: [], ws: [], tg: [], tgStep: 0, esp: [], zhaDevices: [] };
                state.telegram = { started: false };
            },
            lib: function () {
                util = require('util');
                // https = require("https");
                http = require("http");
                udpServer = require('dgram');
                udp = udpServer.createSocket('udp4');
                client = function (type, data, port) {
                    udp.send(JSON.stringify({ type, data }), port);
                };
                if (cfg.webDiag) express = require("express")();
                if (cfg.homeAssistant) {
                    WebSocketClient = require('websocket').client;
                }
                rocket = {
                    enable: false,
                    server: "10.21.0.1",
                    port: 3000,
                    user: "xBD2x76tdL8KYqXpe",
                    token: "lDwlkylzC9nQ1O95tAfnYY9VtG_xFUT8XaZC4t2NfCp",
                    channel: "TWIT-Mambaroto",
                };
                Object.defineProperty(Object.prototype, "forIn", {
                    value: function (callback) {
                        for (const key in this) {
                            //  if (Object.prototype.hasOwnProperty.call(this, key)) {
                            callback(key, this[key], this);
                            //  }
                        }
                    },
                    enumerable: false // so it won't show up in loops
                });
                color = function (color, input, ...option) {   //  ascii color function for terminal colors
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
                file = {
                    write: {
                        nv: function () {  // write non-volatile memory to the disk
                            clearTimeout(timer.fileWrite);
                            if (time.epoch - timer.fileWriteLast > 10) writeFile();
                            else timer.fileWrite = setTimeout(() => { writeFile(); }, 10e3);
                            function writeFile() {
                                log("writing NV data...");
                                timer.fileWriteLast = time.epoch;
                                fs.writeFile(workingDir + "/nv-core-bak.json", JSON.stringify(nv), function () {
                                    fs.copyFile(workingDir + "/nv-core-bak.json", workingDir + "/nv-core.json", (err) => {
                                        if (err) throw err;
                                    });
                                });
                            }
                        }
                    },
                };
                log = function (message, mod, level, port) {      // add a new case with the name of your automation function
                    let buf = time.stamp, cbuf = buf + "\x1b[3", lbuf = "", mbuf = "", ubuf = buf + "\x1b[3";
                    if (level == undefined) level = 1;
                    switch (level) {
                        case 0: ubuf += "6"; cbuf += "6"; lbuf += "|--debug--|"; break;
                        case 1: ubuf += "4"; cbuf += "7"; lbuf += "|  Event  |"; break;
                        case 2: ubuf += "3"; cbuf += "3"; lbuf += "|*Warning*|"; break;
                        case 3: ubuf += "1"; cbuf += "1"; lbuf += "|!!ERROR!!|"; break;
                        case 4: ubuf += "5"; cbuf += "5"; lbuf += "| Telegram|"; break;
                        default: ubuf += "4"; cbuf += "4"; lbuf += "|  Event  |"; break;
                    }
                    buf += lbuf;
                    cbuf += "m" + lbuf + "\x1b[37;m";
                    ubuf += ";1m" + lbuf + "\x1b[37;m";
                    switch (mod) {      // add a new case with the name of your automation function, starting at case 3
                        case 0: mbuf += " system | "; break;
                        case 1: mbuf += "     HA | "; break;
                        case 2: mbuf += "    ESP | "; break;
                        case 3: mbuf += "    UDP | "; break;
                        case 4: mbuf += "Telegram| "; break;
                        default:
                            if (mod != undefined) ubuf += color("green", mod) + " | ";
                            else mbuf += " system | ";
                            break;
                    }
                    buf += mbuf + message;
                    cbuf += mbuf + message;
                    ubuf += mbuf + message;
                    if (logs.sys[logs.step] == undefined) logs.sys.push(buf); else logs.sys[logs.step] = buf;
                    if (logs.step < 500) logs.step++; else logs.step = 0;
                    if (cfg.rocket.enable && level > 0) sendRocket(buf);
                    if (cfg.telegram != undefined && cfg.telegram.enable == true && state.telegram.started == true) {
                        if (level >= cfg.telegram.logLevel || level == 0 && cfg.telegram.logDebug == true) {
                            try {
                                for (let x = 0; x < cfg.telegram.users.length; x++) {
                                    if (cfg.telegram.logESPDisconnect == false) {
                                        if (!message.includes("ESP Home went offline, resetting ESP system:")
                                            && !message.includes("ESP Home is reconnected: ")
                                            && !message.includes("ESP Home has gone offline: ")) {
                                            bot.sendMessage(cfg.telegram.users[x], buf).catch(error => { log("telegram sending error") })
                                        }
                                    } else bot.sendMessage(cfg.telegram.users[x], buf).catch(error => { log("telegram sending error") })
                                }
                            } catch (error) { console.log(error, "\nmessage: " + message + "  - Mod: " + mod) }
                        }
                    }
                    if (port != undefined) {
                        if (level != 0) {
                            if (cfg.logging.client) console.log(ubuf);
                            client("log", ubuf, port);
                        } else if (cfg.logging.debug == true) client("log", ubuf, port);
                    } else if (level == 0 && cfg.logging.debug == true) console.log(cbuf);
                    else if (level != 0) console.log(cbuf);
                    return buf;
                };
                arrayAdd = function (dest, source, id) { // additive array merge
                    if (!Array.isArray(source) || source.length === 0) return;
                    dest ||= [];
                    for (const it of source) {
                        if (!it && it !== 0 && it !== false) continue; // skip null/undefined/'' but keep 0/false
                        // primitive
                        if (typeof it !== 'object') {
                            if (!dest.includes(it)) dest.push(it);
                            continue;
                        }
                        // object or array
                        if (id) {
                            // compare by a specific key (fast)
                            const key = id;
                            if (!dest.some(d => d && d[key] === it[key])) dest.push(it);
                        } else {
                            // fallback: structural compare (works for arrays or objects)
                            const sIt = JSON.stringify(it);
                            if (!dest.some(d => {
                                try { return JSON.stringify(d) === sIt; } catch (e) { return false; }
                            })) dest.push(it);
                        }
                    }
                    return dest;
                };
                objMerge = function (dest, source) { // object merge, potentially destructive if conflicting. good for top level merging  
                    for (const key in source) {
                        if (
                            source[key] &&
                            typeof source[key] === 'object' &&
                            !Array.isArray(source[key])
                        ) {
                            dest[key] = dest[key] || {};
                            objMerge(dest[key], source[key]);
                        } else {
                            dest[key] = source[key];
                        }
                    }
                };
                objAdd = function (dest, source) {
                    for (const key in source) {
                        const s = source[key];
                        const d = dest[key];
                        if (Array.isArray(s)) {
                            dest[key] = Array.isArray(d) ? arrayAdd(d, s) : [...s];
                        } else if (s && typeof s === 'object') {
                            dest[key] = d && typeof d === 'object' ? mergeSafe(d, s) : { ...s };
                        } else if (!(key in dest)) {
                            dest[key] = s;
                        }
                    }
                    return dest;
                };
                sendRocket = function (text) {
                    const postData = JSON.stringify({ channel: cfg.rocket.channel, text: text, });
                    const options = {
                        hostname: cfg.rocket.server,
                        port: cfg.rocket.port,
                        path: "/api/v1/chat.postMessage",
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Content-Length": Buffer.byteLength(postData),
                            "X-Auth-Token": cfg.rocket.token,
                            "X-User-Id": cfg.rocket.user,
                        },
                    };
                    const req = http.request(options, (res) => {
                        let data = "";
                        res.on("data", (chunk) => (data += chunk));
                        //   res.on("end", () => { console.log("Response:", data); });
                    });
                    req.on("error", (e) => { console.error("Rocket Error:", e.message); });
                    req.write(postData);
                    req.end();
                };
                time.startTime();
            },
            checkArgs: function () {
                let workingDir = require('path').dirname(require.main.filename);
                let journal = false;
                if (process.argv[3] == "-j") journal = true;
                if (process.argv[2] == "-p") {
                    console.log("installing APT packages...");
                    execSync("sudo apt install build-essential");
                    console.log("installing NPM packages...");
                    execSync("cd " + workingDir + " ; npm i express");
                    execSync("cd " + workingDir + " ; npm i websocket");
                    execSync("cd " + workingDir + " ; npm i nodemon -g");
                    if (cfg.telegram.enable) execSync("cd " + workingDir + " ; npm i node-telegram-bot-api");
                    if (cfg.esp.enable) execSync("cd " + workingDir + " ; npm i @2colors/esphome-native-api");
                    console.log("TWIT Core system prep complete");
                    process.exit();
                }
                if (process.argv[2] == "-i") {
                    log("installing ThingWerks-Core service...");
                    let exec = "ExecStart=nodemon " + workingDir + "/core.js -w " + workingDir + "/core.js -w " + workingDir + "/config.json --exitcrash --delay 5";
                    let service = [
                        "[Unit]",
                        "Description=",
                        "After=network-online.target",
                        "Wants=network-online.target\n",
                        "[Install]",
                        "WantedBy=multi-user.target\n",
                        "[Service]",
                        "ExecStartPre=/bin/bash -c 'uptime=$(awk \\'{print int($1)}\\' /proc/uptime); if [ $uptime -lt 300 ]; then sleep 45; fi'",
                        ((journal == false) ? "ExecStartPre=mv /apps/log-twit-core.txt /apps/log-twit-core-last.txt\n " + exec : exec),
                        ((journal == false) ? "StandardOutput=file:/apps/log-twit-core.txt\n Type=simple" : "Type=simple"),
                        "User=root",
                        "Group=root",
                        "WorkingDirectory=" + workingDir,
                        "Restart=on-failure",
                        "RestartSec=5\n",
                    ];
                    fs.writeFileSync("/etc/systemd/system/twit-core.service", service.join("\n"));
                    // execSync("mkdir /apps/ -p");
                    // execSync("cp " + process.argv[1] + " /apps/ha/");
                    execSync("systemctl daemon-reload");
                    execSync("systemctl enable twit-core.service");
                    execSync("systemctl start twit-core");
                    execSync("service twit-core status");
                    log("service installed and started");
                    console.log("type:  journalctl -f -u twit-core  or  tail -f /apps/log-twit-core.txt -n 500");
                    process.exit();
                }
                if (process.argv[2] == "-u") {
                    log("uninstalling TWIT-Core service...");
                    execSync("systemctl stop twit-core");
                    execSync("systemctl disable twit-core.service");
                    fs.unlinkSync("/etc/systemd/system/twit-core.service");
                    console.log("TWIT-Core service uninstalled");
                    process.exit();
                }
            },
        };
    sys.boot(0);
} else {
    color = function (color, input, ...option) {   //  ascii color function for terminal colors
        if (input == undefined) input = '';
        let c, op = "", bold = ';1m', vbuf = "";
        for (let x = 0; x < option.length; x++) {
            if (option[x] == 0) bold = 'm';         // bold
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
            case 'white': c = 7; break;
        }
        if (input === true) return '\x1b[3' + c + bold;     // begin color without end
        if (input === false) return '\x1b[37;m';            // end color
        vbuf = op + '\x1b[3' + c + bold + input + '\x1b[37;m';
        return vbuf;
    }
    switch (workerData.class) {
        case "esp": {
            const Events = require('events');
            Events.EventEmitter.defaultMaxListeners = 50;
            // per-connection maps
            const cfgs = {};         // cfgs[name] = cfg object
            const clients = {};      // clients[name] = client instance (mirror of local client)
            const state = {};       // state[name] = state object
            const emitters = {};     // emitters[name] = EventEmitter instance
            const _connectionsControl = {}; // map name => { restart, destroy }

            // single require of the client class
            const EspHomeClient = require('@2colors/esphome-native-api').Client;

            // small helper log (preserves your logging shape)
            function log(msg, level) { parentPort.postMessage({ type: "log", msg, module: 2, level }); }

            // helper for connection control map
            function connectionsMapSet(name, obj) { _connectionsControl[name] = obj; }
            function connectionsMapGet(name) { return _connectionsControl[name]; }
            function connectionsMapDelete(name) { delete _connectionsControl[name]; }

            // destroyed connection (public helper) — used by close messages & cleanup
            function destroyConnectionPublic(name) {
                const ctl = connectionsMapGet(name);
                if (ctl && ctl.destroy) ctl.destroy();
                connectionsMapDelete(name);
                // ensure we also remove stored maps
                try { delete cfgs[name]; } catch (e) { }
                try { delete clients[name]; } catch (e) { }
                try { delete state[name]; } catch (e) { }
                try { delete emitters[name]; } catch (e) { }
            }

            // create a single connection: each call installs an independent client + emitter + state
            function createConnection(cfg, threadID) {
                const name = cfg.name;
                if (!name) { log("ESP worker - received cfg without name", 1); return; }

                // if exists, destroy first for a clean reconfig
                if (cfgs[name]) {
                    log("ESP Home - " + name + " - reconfig requested, destroying existing connection first", 2);
                    destroyConnectionPublic(name);
                }

                cfgs[name] = cfg;
                emitters[name] = new Events.EventEmitter();
                emitters[name].setMaxListeners(50);
                state[name] = {
                    reconnect: false,
                    reconnectState: false,
                    boot: false,
                    errorResetTimeout: null,
                    checkTimer: null,
                    checkUpdate: Math.floor(Date.now() / 1000),
                    checkConnect: null,
                    connected: false,
                    keepaliveTimer: null,
                    resetInProgress: false
                };

                // LOCAL mutable client reference — important: handlers reference this variable
                let client = null;

                // ensure clients[name] mirror local client when assigned
                function createClient() {
                    try {
                        const c = new EspHomeClient({
                            host: cfg.ip,
                            port: 6053,
                            encryptionKey: cfg.key,
                            reconnect: false,
                            reconnectState: false,
                            // reconnectInterval: 5000,
                            pingInterval: 3000,
                            pingAttempts: 3,
                            tryReconnect: false,
                        });
                        client = c;
                        clients[name] = c;
                        return true;
                    } catch (e) {
                        log("ESP Home - " + name + " - client construction error: " + String(e), 3);
                        return false;
                    }
                }

                // setup/connect/reset functions

                function setup() {
                    // Always create a fresh client instance here (mirrors original single-conn flow)
                    if (!createClient()) {
                        // if creation failed retry after a delay
                        state[name].errorResetTimeout = setTimeout(() => setup(), 5000);
                        return;
                    }

                    try { connect(); } catch (error) { log("ESP Home - " + name + " - setup connect error: " + String(error), 3); }

                    state.checkConnect = setTimeout(() => {
                        if (!state.connected) {
                            if (state.reconnect == false) {
                                log("ESP Home - " + color("cyan", name) + " - failed to connect, trying to reconnect...", 2);
                                state.reconnect = true;
                            }
                            reset();
                        } else {
                            // checkTimer is an interval
                            state.checkTimer = setInterval(() => {
                                if ((Math.floor(Date.now() / 1000) - state.checkUpdate) >= 20) {
                                    if (state.reconnect == false) {
                                        log("ESP Home - " + color("cyan", name) + " - isnt communicating, trying to reconnect...", 2);
                                        state.reconnect = true;
                                    }
                                    reset();
                                }
                            }, 1e3);
                        }
                    }, 10e3);
                }

                // forceful clear-reset flow (prevents overlapping resets)
                function reset(reconnect) {
                    log("ESP Home - " + color("cyan", name) + " - resetting", 2);
                    if (reconnect) state.reconnect = true;
                    state.connected = false;
                    state.reconnectState = true;

                    try { if (client && client.disconnect) client.disconnect(); } catch (error) { log("ESP Home - " + color("cyan", name) + " - disconnect failed...", 2); }

                    clearTimeout(state.errorResetTimeout);
                    clearTimeout(state.keepaliveTimer);
                    clearTimeout(state.checkTimer);
                    clearTimeout(state.checkConnect);

                    // timed forced cleanup: remove listeners, drop client reference, and re-setup
                    state.errorResetTimeout = setTimeout(() => {
                        try { if (emitters[name] && emitters[name].removeAllListeners) emitters[name].removeAllListeners(); } catch (e) { }
                        try { if (client && client.removeAllListeners) client.removeAllListeners(); } catch (e) { }
                        // best-effort destroy underlying socket if present
                        try { if (client && client._socket && !client._socket.destroyed) client._socket.destroy(); } catch (e) { }
                        // drop both local and stored reference
                        client = null;
                        clients[name] = null;
                        // small delay, then re-setup (mirrors original timing)
                        setTimeout(() => { setup(); }, 1e3);
                    }, 5e3);
                }

                function connect() {
                    if (state.reconnect == true) {     // client connection function, ran for each ESP device
                        parentPort.postMessage({ type: "esp", class: "reset", esp: name });
                    } else log("ESP Home - " + color("cyan", name) + " - trying to connect...", 1);

                    // guard each callback to avoid throwing out of event handlers
                    client.on('error', (error) => {
                        try {
                            if (state.reconnect == false) {
                                log("ESP Home - " + color("cyan", name) + " - had a connection error, resetting connection...", 1);
                                reset(true);
                            }
                        } catch (e) {
                            log("ESP Home - " + color("cyan", name) + " - error handler threw: " + String(e), 3);
                            reset(true);
                        }
                    });

                    client.on('disconnected', () => {
                        try {
                            if (state.reconnect == false) {
                                log("ESP Home - " + color("cyan", name) + " - disconnected", 1);
                                reset(true);
                            }
                        } catch (e) {
                            log("ESP Home - " + color("cyan", name) + " - disconnected handler threw: " + String(e), 3);
                            reset(true);
                        }
                    });

                    client.on('newEntity', data => {
                        try {
                            state.reconnect = false;

                            parentPort.postMessage({
                                type: "esp", class: "newEntity", esp: name, thread: threadID,
                                obj: { name: data.config.objectId, type: data.type, esp_entity_id: data.id, }
                            });

                            if (data.type === "Switch") {
                                emitters[name].on(data.config.objectId, function (st) {
                                    try { data.connection.switchCommandService({ key: data.id, state: st }); }
                                    catch (e) {
                                        if (state.reconnect == false) {
                                            log("ESP Home - " + color("cyan", name) + " - error sending command - resetting...", 3);
                                            reset(true);
                                        }
                                    }
                                });
                            }
                            data.on('state', (update) => {
                                try {
                                    state.connected = true;
                                    state.reconnect = false;
                                    state.checkUpdate = Math.floor(Date.now() / 1000);
                                    if (state.boot == false) {
                                        if (data.config.objectId.includes("wifi"))
                                            setTimeout(() => {
                                                log("ESP Home - " + color("cyan", name) + " - connected: " + color("cyan", cfg.ip) + " - "
                                                    + color("green", data.config.objectId) + " - Signal: " + update.state);
                                            }, 10);
                                        setTimeout(() => { state.boot = true; }, 20);
                                    } else {
                                        if (state.reconnectState == true) {
                                            if (data.config.objectId.includes(["wifi_", "wifi-"])) {
                                                log("ESP Home - " + color("cyan", name) + " - reconnected: " + color("cyan", cfg.ip) + " - "
                                                    + color("green", data.config.objectId) + " - Signal: " + update.state
                                                    , ((cfg.telegram && cfg.telegram.logESPDisconnect == true) ? 2 : 1));
                                                state.reconnectState = false;
                                            }
                                        }
                                    }
                                    parentPort.postMessage({
                                        type: "esp", class: "state", esp: name, thread: threadID,
                                        obj: { name: data.config.objectId, state: update.state, esp_entity_id: data.id }
                                    });
                                } catch (e) {
                                    log("ESP Home - " + color("cyan", name) + " - state handler error: " + String(e), 3);
                                }
                            });
                        } catch (e) {
                            log("ESP Home - " + color("cyan", name) + " - newEntity handler error: " + String(e), 3);
                            reset(true);
                        }
                    });

                    try { client.connect(); } catch (error) { log("ESP Home - " + color("cyan", name) + " - client connect error: " + String(error)); }
                }

                // expose control methods for this connection
                connectionsMapSet(name, {
                    restart: () => reset(true),
                    destroy: () => {
                        // destroy: immediately clear timers and listeners and delete maps
                        try { if (clients[name] && clients[name].disconnect) clients[name].disconnect(); } catch (e) { }
                        try {
                            if (state[name]) {
                                clearTimeout(state[name].errorResetTimeout);
                                clearTimeout(state[name].keepaliveTimer);
                                if (state[name].checkTimer) clearInterval(state[name].checkTimer);
                                clearTimeout(state[name].checkConnect);
                            }
                        } catch (e) { }
                        try { if (emitters[name]) emitters[name].removeAllListeners(); } catch (e) { }
                        // delete stored objects
                        delete cfgs[name];
                        delete clients[name];
                        delete state[name];
                        delete emitters[name];
                        // clear control map entry
                        connectionsMapDelete(name);
                    }
                });

                // start the connection lifecycle
                setup();
            } // end createConnection

            // parentPort: handle messages
            parentPort.on('message', (data) => {
                try {
                    switch (data.type) {
                        case "config":
                            if (!data.esp || !data.esp.name) {
                                log("ESP worker - received config without esp.name", 1);
                                break;
                            }
                            createConnection(data.esp, data.threadID);
                            break;

                        case "state": {
                            let target = (data.esp && data.esp.name) || data.espName || data.name || data.esp;
                            if (!target) {
                                const keys = Object.keys(emitters);
                                if (keys.length === 1) target = keys[0];
                            }
                            if (!target) {
                                log("ESP worker - state message missing target esp name and multiple connections exist", 1);
                                break;
                            }
                            const e = emitters[target];
                            if (!e) {
                                log("ESP worker - state message for unknown esp: " + String(target), 1);
                                break;
                            }
                            e.emit(data.entity, data.state);
                            break;
                        }

                        case "close": {
                            const targetClose = (data.esp && data.esp.name) || data.espName || data.name || data.esp;
                            if (!targetClose) {
                                log("ESP worker - close message missing esp.name", 1);
                                break;
                            }
                            destroyConnectionPublic(targetClose);
                            break;
                        }

                        case "restart": {
                            const t = (data.esp && data.esp.name) || data.espName || data.name || data.esp;
                            if (!t) {
                                log("ESP worker - restart message missing esp.name", 1);
                                break;
                            }
                            const ctl = connectionsMapGet(t);
                            if (ctl && ctl.restart) ctl.restart();
                            else log("ESP worker - restart requested for unknown esp: " + t, 1);
                            break;
                        }

                        default:
                            break;
                    }
                } catch (e) {
                    log("ESP worker - error handling parent message: " + String(e), 3);
                }
            });

            // Graceful process-level handlers: attempt local cleanup before exiting so main thread can restart worker
            process.on('uncaughtException', (err) => {
                try {
                    log("ESP worker - uncaughtException: " + String(err), 3);
                    // attempt destroying all active connections
                    for (const nm of Object.keys(_connectionsControl)) {
                        try {
                            const ctl = _connectionsControl[nm];
                            if (ctl && ctl.destroy) ctl.destroy();
                        } catch (e) { /* swallow cleanup errors */ }
                    }
                } catch (e) {
                    // fallthrough
                } finally {
                    // allow main to restart this worker
                    setTimeout(() => process.exit(1), 100);
                }
            });

            process.on('unhandledRejection', (reason) => {
                try {
                    log("ESP worker - unhandledRejection: " + String(reason), 3);
                    for (const nm of Object.keys(_connectionsControl)) {
                        try {
                            const ctl = _connectionsControl[nm];
                            if (ctl && ctl.destroy) ctl.destroy();
                        } catch (e) { /* swallow */ }
                    }
                } finally {
                    setTimeout(() => process.exit(1), 100);
                }
            });
            break;
        }
        case "ha": {
            (function start() {
                cfg = {};
                ws = {};
                em = {};
                client = null;
                state = { ha: {}, perf: { ha: {} }, entityTotal: 0 };
                logs = { ws: [], zhaDevices: [] };
                lib();
            })();
            function lib() {
                require('events').EventEmitter.defaultMaxListeners = 50;
                http = require("http");
                http.Agent({ keepAlive: true });
                WebSocketClient = require('websocket').client;
            }
            function log(msg, level) { parentPort.postMessage({ type: "log", msg, module: 1, level }); }
            function init() {
                for (let x = 0; x < cfg.length; x++) {
                    let config = cfg[x];
                    em[config.address] = new (require('events').EventEmitter)();
                    logs ||= { ws: {}, zhaDevices: {} };
                    logs.ws[config.address] ||= [];
                    state[config.address] ||= {
                        entityTotal: 0, id: 0, logStep: 0,
                        zha: { queryReply: null },
                        timer: { reconnect: null },
                        log: { ws: [], zhaDevices: {} }
                    };
                    state[config.address].perf ||= {
                        best: 1000,
                        worst: 0,
                        average: 0,
                        start: 0,
                        wait: false,
                        last100Pos: 0,
                        last100: [],
                    };
                    ws[config.address] ||= new WebSocketClient();
                };
            }
            function api(config, address, state) {
                ws[address].connect("ws://" + address + ":" + config.port + "/api/websocket");
                ws[address].on('connectFailed', function (error) {
                    if (!state.error) {
                        //  log(error.toString(), 3);
                        state.error = true;
                        setTimeout(() => { haReconnect(error.toString()); }, 5e3);
                    }
                });
                ws[address].on('connect', function (socket) {
                    log("Websocket (" + color("cyan", address) + ") - starting connection", 0);
                    state.reply = true;
                    state.online = true;
                    state.error = false;
                    socket.on('error', function (error) {
                        if (!state.error) { log("websocket (" + color("cyan", address) + ") - " + error.toString(), 3); state.error = true; }
                        socket.close();
                    });
                    socket.on('message', function (message) {
                        let buf = JSON.parse(message.utf8Data);
                        // console.log(buf)
                        switch (buf.type) {
                            case "pong":
                                state.reply = true;
                                state.retry = false;  // to prevent repeated retry errors 
                                state.online = true;
                                state.pingsLost = 0;
                                let timeFinish = new Date().getMilliseconds();
                                let timeResult = timeFinish - state.timeStart;
                                if (timeResult > 1000) log("websocket (" + color("cyan", address) + ") ping is lagging - delay is: " + timeResult + "ms", 0);
                                break;
                            case "result":
                                let count = 0;
                                //    console.log(buf)
                                if (buf.id == state.query) {
                                    for (let x = 0; x < buf.result?.length; x++) {
                                        let name = buf.result[x].entity_id;
                                        if (/^(input|switch)/.test(name)) {
                                            // if (/test123|piggary/.test(name)) {
                                            count++;
                                            state.entityTotal++;
                                            parentPort.postMessage({
                                                type: "ha", class: "result",
                                                address: address,
                                                name,
                                                state: buf.result[x].state
                                            });
                                            //console.log(buf.result[x]);
                                            // console.log("adding new entity: " + name);
                                        }
                                    }
                                    log("Websocket (" + color("cyan", address)
                                        + ") - received fetch data, total: " + count + " entities", 1);
                                    if (address == (cfg[(cfg.length - 1)].address)) {
                                        log("Websocket (" + color("cyan", address)
                                            + ") - all fetches done  - total entities: "
                                            + buf.result?.length + " - using: " + state.entityTotal + " entities", 1);
                                        state.entityTotal = 0;
                                        if (state.clientFetch) {
                                            parentPort.postMessage({
                                                type: "ha", class: "fetch",
                                                address: address,
                                                name: state.clientFetch.name,
                                                port: state.clientFetch.port
                                            });
                                            state.clientFetch = null;
                                        }
                                    }
                                    // console.log(buf)
                                }
                                if (buf.id == state.zha.query) {
                                    state.zha.devices ||= {};
                                    if (Array.isArray(buf.result)) {
                                        buf.result.forEach(dev => {
                                            if (dev.user_given_name) {
                                                // logs.zhaDevices[address] ||= [];
                                                let name = dev.user_given_name;
                                                logs.zhaDevices[address].push(dev.name);
                                                state.zha.devices[dev.device_reg_id] = { userName: dev.name, name: dev.user_given_name };
                                                parentPort.postMessage({
                                                    type: "ha", class: "result_zha",
                                                    address: address,
                                                    name,
                                                    dev
                                                });
                                                //  if (dev.user_given_name.includes("Bedroom")) console.log("adding new entity: ", dev);
                                            }
                                        });
                                        // console.log("adding new entity: ", entity);
                                        //console.log(state.zha.devices)
                                        log("Websocket (" + color("cyan", address) + ") - received ZHA device list, items: "
                                            + buf.result.length);
                                        //console.log(state.zha.devices);
                                        clearTimeout(state.zha.queryReply);
                                    } else if (buf.error?.code == 'unknown_command') {
                                        log("Websocket (" + color("cyan", address) + ") - no ZHA devices - disabling");
                                        clearTimeout(state.zha.queryReply);
                                    } else if (buf.error?.code == 'unknown_error') {
                                        log("Websocket (" + color("cyan", address) + ") - ZHA not online (yet?) - wait for retry", 2);
                                    }
                                }
                                break;
                            case "auth_required":
                                log("Websocket (" + color("cyan", address) + ") - authenticating", 0);
                                send({ type: "auth", access_token: config.token });
                                break;
                            case "auth_ok":
                                log("Websocket (" + color("cyan", address) + ") - connection " + color("green", "OK"));

                                log("Websocket (" + color("cyan", address) + ") - subscribing HA to event listeners", 1);
                                state.id++;
                                send({ id: state.id++, type: "subscribe_events", event_type: "state_changed" });
                                send({ id: state.id++, type: "subscribe_events", event_type: "zha_event" });

                                zhaQuery();

                                log("Websocket (" + color("cyan", address) + ") - fetching entity states", 1);
                                state.query = state.id;
                                send({ id: state.id++, type: "get_states" });

                                state.timeStart = new Date().getMilliseconds();
                                send({ id: state.id++, type: "ping" });
                                setTimeout(() => { state.pingsLost = 0; send({ id: state.id++, type: "ping" }); state.reply = true; ping(); }, 10e3);
                                break;
                            case "event":
                                // console.log(buf.event)
                                switch (buf.event.event_type) {
                                    case "zha_event":
                                        // console.log(buf.event)
                                        if (state.zha.devices[buf.event.data.device_id] != undefined
                                            && buf.event.data.command != 'press_type') {
                                            let entity_name = state.zha.devices[buf.event.data.device_id].name;
                                            let newState = buf.event.data.command;
                                            parentPort.postMessage({
                                                type: "ha", class: "state",
                                                address: address,
                                                name: entity_name,
                                                state: newState
                                            });
                                            //console.log("ZHA device event: " + entity_name, " - action: " + buf.event.data.command);
                                        }
                                        break;
                                    case "state_changed":
                                        if (state.perf.wait == true) {
                                            let delay = perf(address); // Correct call: use 'ha.perf' and pass address
                                            log("ws delay was: " + delay, 0, 0)
                                        }
                                        let ibuf, obuf;
                                        if (state.log.ws[state.logStep] == undefined) state.log.ws.push(buf.event);
                                        else state.log.ws[state.logStep] = buf.event
                                        if (state.logStep < 200) state.logStep++; else state.logStep = 0;

                                        if (buf.event.data.new_state != null) ibuf = buf.event.data.new_state.state;
                                        if (ibuf === "on") { obuf = true; }
                                        else if (ibuf === "off") { obuf = false; }
                                        else if (ibuf == null) {
                                            log(`Websocket (${color("cyan", address)}) - sent null/undefined data: ${ibuf}`, 2);
                                        } else if (ibuf === "unavailable") {
                                            log(`Websocket (${color("cyan", address)}) - Entity unavailable/offline:
                                                         ${buf.event.data.new_state.entity_id}`, 2);
                                        } else if (!isNaN(ibuf) && isFinite(ibuf)) { obuf = Number(ibuf); }
                                        else if (ibuf.length === 32) { obuf = ibuf; }  // for button entity?
                                        else {
                                            //   log(`Websocket (${color("cyan", address)}) - bogus data: Entity=
                                            //              ${buf.event.data.new_state.entity_id}, Bytes=${ibuf.length}, Data=${ibuf}`, 2);
                                        }
                                        // console.log(obuf)
                                        if (obuf !== undefined) {
                                            let entity_id = buf.event.data.entity_id;
                                            parentPort.postMessage({
                                                type: "ha", class: "state",
                                                address: address,
                                                name: entity_id,
                                                state: obuf
                                            });
                                            break;
                                        }
                                }
                                break;
                        }
                    });
                    em[address].on('zhaQuery' + address, function () { zhaQuery(); });
                    em[address].on('state' + address, function (data) { send(data); });
                    em[address].on('fetch', function (data) {
                        //  console.log(data)
                        log("Websocket (" + color("cyan", address) + ") - fetching entities for client: "
                            + color("purple", data.name) + " - port: " + color("purple", data.port), 0);
                        state.clientFetch ||= {}
                        state.clientFetch.name = data.name;
                        state.clientFetch.port = data.port;
                        state.query = state.id;
                        send({ id: state.id++, type: "get_states" });
                        // state.queryReply = state.id;
                    });
                    function send(data) {
                        let packet;
                        //  console.log("incoming state: ", data);
                        if (data.type == "state") {
                            //  console.log("incoming state: ", data);
                            if (!data.unit) {
                                packet = {
                                    id: state.id++,
                                    type: "call_service",
                                    domain: (!data.zha) ? data.entity.split(".")[0] : "switch",
                                    service: data.state == false ? 'turn_off' : 'turn_on',
                                    target: (!data.zha) ? { entity_id: data.entity } : { device_id: (data.zha) }
                                }
                                // console.log(packet)
                                try { socket.sendUTF(JSON.stringify(packet)); }
                                catch (error) { log(error, 3) }
                            } else {
                                const packet = {
                                    state: data.state,
                                    attributes: {
                                        friendly_name: data.entity,
                                        unit_of_measurement: data.unit
                                    }
                                };
                                const options = {
                                    hostname: address,   // or your HA IP
                                    port: 8123,
                                    path: `/api/states/sensor.${data.entity}`,
                                    method: "POST",
                                    headers: {
                                        "Authorization": "Bearer " + config.token,
                                        "Content-Type": "application/json",
                                        "Content-Length": Buffer.byteLength(JSON.stringify(packet))
                                    }
                                };
                                const req = http.request(options, (res) => {
                                    //  let body = "";
                                    //    res.on("data", chunk => body += chunk);
                                    //  res.on("end", () => console.log("HA response:", body));
                                });
                                req.on("error", (err) => console.error("HA error:", err));
                                req.write(JSON.stringify(packet));
                                req.end();
                            }
                        } else {
                            packet = data;
                            try { socket.sendUTF(JSON.stringify(packet)); }
                            catch (error) { log(error, 3) }
                        }
                    }
                    function ping() {
                        if (state.reply == false) {
                            if (state.pingsLost < 2) {
                                if (!state.retry) {
                                    log("websocket (" + color("cyan", address) + ") - ping was never replied in 10 sec", 3);
                                    state.retry = true;
                                }
                                state.pingsLost++;
                            }
                            else { socket.close(); haReconnect("ping timeout"); return; }
                        }
                        state.reply = false;
                        state.timeStart = new Date().getMilliseconds();
                        send({ id: state.id++, type: "ping" });
                        setTimeout(() => { ping(); }, 10e3);
                    }
                    function zhaQuery() {
                        log("Websocket (" + color("cyan", address) + ") - querying ZHA device list... (id: " + state.id + ")");
                        logs.zhaDevices[address] = [];
                        state.zha.query = state.id;
                        send({ id: state.id++, type: "zha/devices" });
                        state.zha.queryReply = setTimeout(() => {
                            log("Websocket (" + color("cyan", address) + ") - never replied to ZHA Device query, retrying...");
                            zhaQuery();
                        }, 10e3);
                    }
                });
                function haReconnect(error) {
                    clearTimeout(state.timer.reconnect);
                    log("websocket (" + color("cyan", address) + ") - " + error.toString(), 3);
                    em[address].removeAllListeners();
                    ws[address].connect("ws://" + address + ":" + config.port + "/api/websocket");
                    state.timer.reconnect = setTimeout(() => { if (!state.reply) { haReconnect("retrying..."); } }, 3e3);
                }
            }
            parentPort.on('message', (data) => {
                switch (data.type) {
                    case "config":
                        cfg = data.cfg;
                        log("thread received configuration ");
                        init();
                        cfg.forEach((config) => { api(config, config.address, state[config.address]); });
                        break;
                    case "fetch":
                        cfg.forEach(element => { em[element.address].emit('fetch', data); });
                        break;
                    case "state":
                        cfg.forEach(element => { em[element.address].emit(('state' + data.address), data); });
                        break;
                }
            });
            break;
        }
        case "telegram": {

            break;
        }


    }
}
