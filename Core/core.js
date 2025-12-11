#!/usr/bin/node
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
time = {
    boot: null,
    get epochMil() { return Date.now(); },
    get mil() { return new Date().getMilliseconds(); },
    get stamp() {
        return this.year + "-" +
            ("0" + this.month).slice(-2) + "-" +
            ("0" + this.day).slice(-2) + " " +
            ("0" + this.hour).slice(-2) + ":" +
            ("0" + this.min).slice(-2) + ":" +
            ("0" + this.sec).slice(-2) + "." +
            ("00" + this.mil).slice(-3);
    },
    sync: function () {
        const date = new Date();
        this.year = date.getFullYear();
        this.month = date.getMonth() + 1;   // 0-based
        this.day = date.getDate();          // 1-based
        this.dow = date.getDay() + 1;       // 0-based
        this.hour = date.getHours();
        this.min = date.getMinutes();
        this.sec = date.getSeconds();
        this.epoch = Math.floor(Date.now() / 1000);
        this.epochMin = Math.floor(Date.now() / 60000);
    },
    startTime: function () {
        function syncAndSchedule() {
            time.sync();
            if (time.boot === null) time.boot = 0;
            const now = Date.now();
            const nextInterval = 1000 - (now % 1000);
            setTimeout(() => { syncAndSchedule(); time.boot++; }, nextInterval);
        }
        syncAndSchedule();
    },
};
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
if (isMainThread) {
    let com = {
        udp: function (data, info) {
            let buf = null, port = info.port; prep();
            // console.log(buf)
            switch (buf.type) {
                case "heartbeat": try { state.client[buf.name].heartbeat = true; } catch (e) { console.log(e) } break; // start heartbeat 
                case "state":
                    let ent, packet;
                    // console.log(buf)
                    // console.log(entity)
                    // console.log(entity[buf.data.name])
                    if (buf.data.unit) { // for ha telemetry/sensors
                        if (!entity[buf.data.name]) {
                            log("client - " + color("purple", buf.name)
                                + " - is registering new HA sensor: " + buf.data.name, 3, 0);
                            entity[buf.data.name] = { client: {}, }
                        }
                        ent = entity[buf.data.name];
                        if (!buf.data.address)
                            packet = { address: cfg.homeAssistant[0].address, unit: buf.data.unit };
                        else packet = { address: buf.data.address, unit: buf.data.unit };

                        ent.owner = { type: "telemetry", client: buf.name, auto: buf.auto };

                        if (ent.state !== buf.data.state || (time.epochMil - ent.update) > 300000) {
                            // log("telemetry - updating HA sensor: " + buf.data.name);
                            ent.state = buf.data.state;
                            sendPacket("HA");
                        } else {
                            // log("telemetry - NOT updating HA sensor: " + buf.data.name);
                        }

                        ent.unit = buf.data.unit;
                        ent.update = time.epochMil;
                        ent.stamp = time.stamp;

                        ent.client.forIn((name, value) => { // send this sensor to other clients who've registered for it
                            if (value.port != port)
                                client("state", { name: buf.data.name, state: buf.data.state }, value.port);
                        })

                    } else if (buf.data.name in entity) { // for all other entities
                        try {
                            // console.log(buf);
                            // console.log(entity[buf.data.name]);
                            ent = entity[buf.data.name];
                            if (!ent.owner) {
                                log("client - " + color("purple", buf.name)
                                    + " - is setting the state for entity: " + color("cyan", buf.data.name)
                                    + " that " + color("red", "HAS NO OWNER"), 3, 3);
                                return;
                            }

                            log("client - " + color("purple", buf.name) + " - entity: " + color("cyan", buf.data.name)
                                + " - state update: " + color("blue", buf.data.state.toString()), 3, 0);

                            if (ent.owner?.type == "TWIT") { // for TWIT entities
                                //  ent = entity[buf.data.name] ?? undefined;
                                ent.state = buf.data.state;
                                ent.update = time.epochMil;
                                ent.stamp = time.stamp;
                                nv.entity[buf.data.name].state = buf.data.state;
                                nv.entity[buf.data.name].stamp = time.stamp;
                                nv.entity[buf.data.name].update = time.epochMil;
                                // console.log(ent)
                                // console.log(buf )
                                ent.client.forIn((name, value) => { // send this sensor to other clients who've registered for it
                                    if (value.port != port) // only reply if not the owner
                                        client("state", { name: buf.data.name, state: buf.data.state, owner: ent.owner }, value.port);
                                })

                                if (ent.syncGroup) {
                                    log("client - " + color("purple", buf.name) + " - entity: " + color("cyan", buf.data.name)
                                        + " - is a " + color("blue", "Sync Group member "), 3, 0);
                                    com.syncGroup(buf.data.name, buf.data.state);
                                }

                                file.write.nv();

                            } else if (ent.owner.type == "esp") {
                                packet = { address: ent.owner.name }
                                packet.esp_entity_id = ent.esp_entity_id;
                                sendPacket("ESP");
                            } else if (ent.owner.type.includes("ha")) {
                                packet = { address: ent.owner.name }
                                if (ent.zha) packet.zha = ent.zha.regID;
                                sendPacket("HA");
                            }
                        } catch (error) { console.log("state setting error - buf: ", buf.data, "selected entity: ", ent, " \nerror: ", error) }
                    } else {
                        log("client - " + color("purple", buf.name)
                            + " - is setting the state for entity: " + color("cyan", buf.data.name)
                            + " that " + color("red", "DOES NOT EXIST"), 3, 3);
                        return;
                    }
                    function sendPacket(type) {
                        if (packet) {
                            packet.type = "state";
                            packet.entity = buf.data.name;
                            packet.state = buf.data.state;
                            // console.log(packet)
                            if (type == "HA") thread.ha.postMessage(packet);
                            if (type == "ESP") thread.esp[entity[buf.data.name].owner.thread].postMessage(packet);
                        } else log("client - " + color("purple", buf.name)
                            + " - is sending invalid " + type + " state update: " + buf.data.name, 3);

                        // console.log(packet)
                    }

                    break;
                case "register":    // incoming registrations
                    //  log("client - " + color("purple", buf.name) + " - is initiating new registration", 3);
                    //  console.log(buf)
                    if (state.client[buf.name]) {

                        (function entity_subscribe() {
                            log("client - " + color("purple", buf.name) + " - updating registration", 3, 1);
                            state.client[buf.name].entities?.subscribe?.forIn((name, value) => {
                                if (!(name in buf.data?.entities?.subscribe)) {
                                    log("client - " + color("purple", buf.name) + " - found orphaned entity in core: " +
                                        color("cyan", name) + " -  deleting", 3, 1);
                                    //com.deleteReg()
                                }
                            })
                            // console.log(state.client[buf.name])
                            state.client[buf.name].entities.subscribe = structuredClone(buf.data?.entities?.subscribe) ?? undefined;
                            buf.data.entities?.subscribe?.forIn((name, value) => {
                                if (name in entity) {
                                    log("client - " + color("purple", buf.name) + " - is registering entity: " + color("cyan", name), 3, 0);
                                } else {
                                    log("client - " + color("purple", buf.name) + " - is registering an " + color("yellow", "UNKNOWN")
                                        + " entity: " + color("cyan", name), 3, 2);
                                    // console.log(entity[name].client)
                                }
                                entity[name] ||= {};
                                entity[name].client ||= {};
                                entity[name].client[buf.name] = { port };
                                // console.log(entity[name].client)
                            })
                        })();


                        (function entity_TWIT() {
                            entity.forIn((name, value) => {
                                if (value.owner?.type == "TWIT" && value.owner?.name == buf.name && !(name in buf.data?.entities?.create)) {
                                    log("client - " + color("purple", buf.name) + " - found orphaned TWIT entity: " +
                                        color("cyan", name) + " - " + color("yellow", "totally deleting"), 3, 2);
                                    delete entity[name];
                                    delete nv.entity[name];
                                    file.write.nv();
                                }
                            })
                            buf.data.entities?.create?.forIn((name, value) => {
                                if (name in entity) log("client - " + color("purple", buf.name) + " - updating " + color("green", "TWIT entity")
                                    + " in core: " + color("cyan", name), 3, 1);
                                else log("client - " + color("purple", buf.name) + " - creating " + color("green", "TWIT entity")
                                    + " in core: " + color("cyan", name), 3, 1);
                                entity[name] ||= {};
                                entity[name].client ||= {};
                                entity[name].client[buf.name] = { port };
                                entity[name].owner = { type: "TWIT", name: buf.name, port };
                                nv.entity ||= {};
                                nv.entity[name] = structuredClone(entity[name]);
                                delete nv.entity[name].owner.port;
                                delete nv.entity[name].client;
                                delete nv.entity[name].syncGroup;
                                file.write.nv();
                            })
                        })();


                        (function entity_sync() {
                            // console.log(state.sync)
                            state.sync?.forIn((name, value) => {
                                if (buf.name == value.owner) {
                                    if (!buf.data.entities.sync || !(name in buf.data.entities.sync)) deleteSync();
                                }
                                function deleteSync() {
                                    // console.log(value)
                                    log("client - " + color("purple", buf.name) + " - found orphaned Sync group: " +
                                        color("cyan", name) + " - " + color("yellow", "tearing down group"), 3, 2);
                                    value.members.forEach(element => {
                                        if (element in entity) {
                                            log("client - " + color("purple", buf.name) + " - removing orphaned Sync group: " +
                                                color("cyan", name) + "from member: " + color("cyan", element), 3, 0);
                                            delete entity[element].syncGroup;
                                        }
                                    });
                                    log("client - " + color("purple", buf.name) + " - removing orphaned Sync group: " +
                                        color("cyan", name), 3, 1);
                                    delete state.sync[name];
                                }
                            })
                            buf.data.entities?.sync?.forIn((name, value) => {
                                if (name in state.sync)
                                    log("client - " + color("purple", buf.name) + " - updating " + color("blue", "Sync Group: ")
                                        + color("cyan", name), 3, 1);
                                else {
                                    log("client - " + color("purple", buf.name) + " - creating " + color("blue", "Sync Group: ")
                                        + color("cyan", name), 3, 1);
                                }
                                state.sync[name] = { owner: buf.name, members: [] };
                                value.forEach(element => {
                                    state.sync[name].members.push(element);
                                    if (element in entity) {
                                        log("client - " + color("purple", buf.name) + color("blue", " - Sync Group: ") + color("cyan", name)
                                            + " - adding entity: " + color("cyan", element), 3, 1);
                                        entity[element].syncGroup = name;
                                        //  console.log("creating sensor here: ", element, "\n\n", entity[element])
                                    } else {
                                        log("client - " + color("purple", buf.name) + color("blue", " - Sync Group: ") + color("cyan", name)
                                            + " - UNKNOWN entity: " + color("cyan", element), 3, 3);
                                    }
                                });
                            })
                        })();
                    }


                    if (buf.data.telegram) {
                        log("client - " + color("purple", buf.name) + " - is registering as telegram agent", 3);
                        state.client[id].telegram = true;
                        // state.telegram.port = info.port;
                    }
                    client("proceed", null, port);
                    break;
                case "fetch":
                    log("client - " + color("purple", buf.name) + " - requesting fetch - port: " + port, 3);
                    // console.log("time now: " + time.epoch + " -  last fetch: " + (time.epoch - state.fetchLast))
                    if ((time.epoch - state.fetchLast) < 60) fetchReply()
                    else if (cfg.homeAssistant?.length > 0) {
                        thread.ha.postMessage({ type: "fetch", name: buf.name, port });
                        //  state.fetchLast = time.epoch;
                    } else fetchReply();
                    function fetchReply() {
                        for (const name in entity) {
                            if (buf.name in entity[name].client) {
                                if (entity[name].state != null) {
                                    if (typeof entity[name].state === "string" && entity[name].state.includes("remote_button_")) continue
                                    if (name.includes("input_button.")) continue
                                    log("cached entities fetch reply: " + name, 1, 0);
                                    client("state", { name, state: entity[name].state, owner: entity[name].owner }, port);
                                }
                            }
                        }
                        log("client - " + color("purple", buf.name) + " - replying with cached fetch - port: " + port, 3);
                        setTimeout(() => { client("fetchReply", null, port); }, 500);
                    }
                    break;
                case "log":         // incoming log messages from UDP clients
                    log(buf.data.message, buf.data.mod, buf.data.level, port);
                    break;
                case "telegram":
                    log("receiving telegram data: " + buf.obj, 4, 0);
                    switch (buf.obj.class) {
                        case "send":
                            bot.sendMessage(buf.obj.id, buf.obj.data, buf.obj.obj).catch(error => {
                                log("telegram sending error");
                                console.log(error)
                            })
                            break;
                    }
                    break;
                default:            // default to heartbeat
                    break;
            }
            function prep() {
                try { buf = JSON.parse(data); }
                catch (error) { log("A UDP client (" + info.address + ") is sending invalid JSON data: " + error, 3, 3); return; }
                // console.log(buf)
                try {
                    if (buf.type != "diag") {
                        if (!(buf.name in state.client)) {
                            if (buf.type == "register") {
                                log("client - " + color("purple", buf.name) + " - creating new registration", 3);
                                state.client[buf.name] = { address: info.address, port: info.port, entities: { subscribe: {}, create: {} } };
                            } else if (buf.type != "log") {
                                log("client - " + color("purple", buf.name) + " - is unrecognized - requesting ReRegistrion", 3);
                                // console.log("buf type: " + buf.type)
                                state.client[buf.name] = { address: info.address, port: info.port, entities: { subscribe: {}, create: {} } };
                                client("reRegister", null, port);
                            }
                        } else if (buf.type == "register") {
                            log("client - " + color("purple", buf.name) + " - is Re-Registring", 3);
                        } else if (state.client[buf.name].port != info.port) {
                            log("client - " + color("purple", buf.name) + " - is unrecognized - updating", 3);
                            state.client[buf.name] = { address: info.address, port: info.port, entities: [] };
                        }
                        if (state.client[buf.name]) state.client[buf.name].update = time.epoch;
                        if (state.client[buf.name]) state.client[buf.name].stamp = time.stamp;
                    }
                } catch (error) { log("A UDP client (" + info.address + ") is sending invalid data: " + error, 3, 3); return; }
            }
        },
        syncGroup: function (entityName, entityState) {
            ent = entity[entityName];
            // console.log(ent)
            // console.log(state.sync)

            if ((time.epochMil - state.sync[ent.syncGroup].update) > 200 || !state.sync[ent.syncGroup].update)
                state.sync[ent.syncGroup].members.forEach(element => {
                    if (element in entity && element != entityName) {
                        //  console.log("incoming sync entity: ", entityName, "  -  sensing to: ", element)
                        if (entity[element].owner.type == "TWIT") {
                            log("entity: " + color("cyan", entityName)
                                + " - sending to TWIT - " + color("blue", "Sync Group member: ") + element, 3, 0);
                            // console.log("sync updating state of TWIT partner")
                            //   console.log(entity[element])
                            client("state", { name: element, state: entityState, }, entity[element].owner.port);
                        }
                        if (entity[element].owner.type == "ha") {
                            log("entity: " + color("cyan", entityName)
                                + " - sending to HA - " + color("blue", "Sync Group member: ") + element, 3, 0);
                            // console.log("sync updating state of HA partner")
                            //   console.log(entity[element])
                            thread.ha.postMessage({
                                type: "state",
                                entity: element,
                                address: entity[element].owner.name,
                                state: entityState
                            });
                        }
                        if (entity[element].owner.type == "esp") {
                            log("entity: " + color("cyan", entityName)
                                + " - sending to ESP - " + color("blue", "Sync Group member: ") + element, 3, 0);
                            //console.log("sync updating state of ESP partner")
                            //  console.log(entity[element])
                            thread.esp[entity[element].owner.thread].postMessage({
                                type: "state",
                                entity: element,
                                address: entity[element].owner.name,
                                state: entityState
                            });
                        }
                    }
                    state.sync[ent.syncGroup].update = time.epochMil
                });
        },
        watchDog: function () {
            for (const clientName in state.client) {
                if (state.client[clientName].heartbeat && time.epoch - state.client[clientName].update >= 5) {
                    log("client - " + color("purple", clientName) + " - has crashed!!", 3, cfg.logging.clientCrash ? 3 : 0);
                    com.deleteReg();
                    delete state.client[clientName];
                } else if (time.epoch - state.client[clientName].update >= 10) {
                    log("client - " + color("purple", clientName) + " - is a zombie, killing client", 3, cfg.logging.clientCrash ? 3 : 0);
                    com.deleteReg()
                    delete state.client[clientName];
                }
            }
        },
        deleteReg: function (clientName) {
            entity.forIn((entityName, value) => {
                if (clientName in value.client) {
                    if (value.owner?.type == "TWIT" && value.owner.name == clientName) {
                        log("client - " + color("purple", clientName) + " - TWIT entity: " + entityName
                            + " - deleting client/port but leaving active on core", 3, 0);
                        delete value.client[clientName];
                    } else {
                        log("client - " + color("purple", clientName) + " - clearing client registration for entity: "
                            + entityName, 3, 0);
                        delete value.client[clientName];
                    }
                }
            })
        }
    }
    let services = {
        telegram: function () {
            (() => {
                try {
                    const Module = require('module');
                    const originalRequire = Module.prototype.require;

                    Module.prototype.require = function (id) {
                        const result = originalRequire.apply(this, arguments);
                        if (id === 'request-promise-core') {
                            try {
                                const origError = result.RequestError;
                                result.RequestError = function (...args) {
                                    const err = new origError(...args);
                                    err.silent = true;
                                    return err;
                                };
                            } catch (e) { }
                        }
                        return result;
                    };
                } catch (e) { }
            })();
            const rp = require('request-promise-core');
            const origError = rp.RequestError;

            rp.RequestError = function (...args) {
                const err = new origError(...args);
                // prevent auto console.error spam
                err.silent = true;
                return err;
            };
            process.on('unhandledRejection', (reason, promise) => {
                const msg = String(reason?.stack || reason);
                const firstLine = msg.split('\n')[0];
                log("GLOBAL unhandledRejection: " + firstLine, 3);
            });

            // --- TELEGRAM SETUP ---
            if (cfg.telegram?.enable) {
                const TelegramBot = require('node-telegram-bot-api');

                if (!cfg.telegram.token || cfg.telegram.token.length < 40) {
                    log(color("red", "Telegram API Token is invalid"), 3);
                } else {
                    log("starting Telegram service...");

                    bot = new TelegramBot(cfg.telegram.token, { polling: true });

                    // Catch polling-related errors
                    bot.on('polling_error', (error) => {
                        const msg = String(error?.stack || error);
                        log("Telegram polling_error: " + msg.split('\n')[0], 3);
                    });

                    // Catch webhook-related errors
                    bot.on('webhook_error', (error) => {
                        const msg = String(error?.stack || error);
                        log("Telegram webhook_error: " + msg.split('\n')[0], 3);
                    });

                    // Just in case: catch any 'error' event from the underlying stream
                    bot.on('error', (error) => {
                        const msg = String(error?.stack || error);
                        log("Telegram general error: " + msg.split('\n')[0], 3);
                    });

                    // --- Message Handlers ---
                    bot.on('message', (msg) => {
                        if (logs.tg[logs.tgStep] === undefined) logs.tg.push(msg);
                        else logs.tg[logs.tgStep] = msg;

                        logs.tgStep = (logs.tgStep + 1) % 101;

                        for (const client of state.client)
                            if (client.telegram)
                                udp.send(JSON.stringify({ type: "telegram", obj: { class: "agent", data: msg } }), client.port);
                    });

                    bot.on('callback_query', (msg) => {
                        for (const client of state.client)
                            if (client.telegram)
                                udp.send(JSON.stringify({ type: "telegram", obj: { class: "callback", data: msg } }), client.port);
                    });

                    state.telegram.started = true;
                }
            }

        },
        webserver: function () {
            if (cfg.webDiag) {
                express.get("/log", function (request, response) { response.send(logs.sys); });
                express.get("/tg", function (request, response) { response.send(logs.tg); });
                express.get("/ws", function (request, response) { response.send(logs.ws); });
                express.get("/nv", function (request, response) { response.send(nv); });
                express.get("/state", function (request, response) { response.send(state); });
                express.get("/thread", function (request, response) { response.send(thread); });
                express.get("/cfg", function (request, response) { response.send(cfg); });
                express.get("/perf", function (request, response) { response.send(state.perf); });
                express.get("/udp", function (request, response) { response.send(state.client); });
                express.get("/entity", function (request, response) {
                    let ha = {}, zha = {}, esp = {}, twit = {}, telemetry = {}, unknown = {};
                    if ((time.epoch - state.fetchLast) < 10) fetchReply();
                    else if (cfg.homeAssistant?.length > 0) {
                        thread.ha.postMessage({ type: "fetch" });
                        setTimeout(() => { fetchReply(); }, 1e3);
                    }
                    function fetchReply() {
                        entity.forIn((name, value) => {
                            const baseObj = {
                                state: value.state,
                                name: value.owner?.name,
                                deviceName: value.zha?.deviceName,
                                Updated: value.stamp,
                                clients: value.client,
                                syncGroup: value.syncGroup,
                                syncMembers: state.sync[value.syncGroup]?.members,
                                owner: value.owner

                            };
                            let targetCollection;
                            let uniqueProperties = {};
                            switch (value.owner?.type) {
                                case "ha_zha": targetCollection = zha; break;
                                case "ha": targetCollection = ha; break;
                                case "esp": targetCollection = esp; break;
                                case "telemetry": targetCollection = telemetry; break;
                                case "TWIT": targetCollection = twit; break;
                                default: targetCollection = unknown; break;
                            }
                            targetCollection[name] = Object.assign(baseObj, uniqueProperties);
                        });
                        response.send({ unknown, twit, telemetry, esp, zha, ha });
                    }
                });
                express.get("/client/:name", async function (request, response) {
                    const clientName = request.params.name;  // Extract client name from the URL
                    const client = state.client[clientName] ?? undefined  // Find the client by name
                    // console.log(state.client[clientName])
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
                            //  console.log(msg)
                            let buf = JSON.parse(msg);
                            // console.log(buf)
                            clearTimeout(timer); // Clear the timeout if response received
                            resolve({
                                client: buf.clientName,
                                syncGroup: buf.syncGroup,
                                state: buf.state,
                                config: buf.config,
                                entityTemp: buf.entityTemp,
                                entity: buf.entity,
                                owner: buf.owner,
                                nv: buf.nv
                            });


                        };
                        udp.once("message", onDiagResponse); // Use `once` to only listen for one response per client
                    });
                }
                serverWeb = express.listen(cfg.webDiagPort, function () { log("diag web server starting on port " + cfg.webDiagPort, 0); });
            }
        }
    }
    function ipc(data) {      // Incoming inter process communication 
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
                                state: null,
                                owner: { type: "esp", name: data.esp },
                            };
                        } else {
                            log("ESP Home - " + color("cyan", data.esp) + " - registering existing entity: " + data.obj.name, 2, 0);

                        }
                        // entity[data.obj.name].owner = { type: "esp", name: data.esp };
                        entity[data.obj.name].state = null;
                        entity[data.obj.name].client ||= {};
                        entity[data.obj.name].owner = { type: "esp", name: data.esp, thread: data.thread };
                        entity[data.obj.name].update = time.epochMil;
                        entity[data.obj.name].stamp = time.stamp;
                        entity[data.obj.name].esp_entity_id = data.obj.esp_entity_id;
                        // console.log("new entity:", entity[data.obj.name]);
                        break;
                    case "reset":
                        //   log("ESP Home - " + color("cyan", data.esp) + " - resetting entity array for ESP: - DOING NOTHING HERE", 2, 0);
                        //  if (state.esp[data.esp] != undefined) state.esp[data.esp].entity = [];
                        break;
                    case "state":
                        if (data.obj.name.includes("test-led"))
                            log("ESP Home - " + color("cyan", data.esp) + " - incoming state change: "
                                + data.obj.state + " - for entity: " + data.obj.name, 2, 0);
                        //  console.log(data);
                        entity[data.obj.name] ||= {
                            client: {},
                            state: null,
                            owner: { type: "esp", name: data.esp },
                            update: time.epochMil,
                            stamp: time.stamp,
                        };
                        try {
                            entity[data.obj.name].state = data.obj.state;
                            entity[data.obj.name].update = time.epoch;
                            entity[data.obj.name].stamp = time.stamp;
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
                            console.trace("incoming object:", data, "\n\nlocal entity: ", entity[data.obj.name])
                        }
                        if (entity[data.obj.name].syncGroup) com.syncGroup(data.obj.name, data.obj.state);
                        break;
                }
                break;
            case "ha":
                switch (data.class) {
                    case "state":
                        // console.log(data);
                        if (data.name in entity) {
                            // console.log(entity[data.name])
                            if (data.name == "input_boolean.debug_core") {
                                log("logging - TWIT core logging set to: " + data.state);
                                cfg.logging.debug = (data.state == "on") ? true : (data.state == "off") ? false : data.state;
                                return;
                            }
                            if (data.name == "input_boolean.debug_clients") {
                                log("logging - TWIT Client logging set to: " + data.state);
                                cfg.logging.clientDebug = (data.state == "on") ? true : (data.state == "off") ? false : data.state;
                                return;
                            }
                            try {
                                for (const name in entity[data.name].client) {
                                    log("Websocket (" + color("cyan", data.address) + ") - state: " + data.state + " - update for: "
                                        + data.name + " - to client: " + name, 1, 0);
                                    entity[data.name].state = (data.state == "on") ? true : (data.state == "off") ? false : data.state;
                                    entity[data.name].owner = { type: "ha", name: data.address };
                                    entity[data.name].update = time.epochMil;
                                    entity[data.name].stamp = time.stamp;
                                    // console.log("entity: ", data.name, entity[data.name])
                                    client("state", { name: data.name, state: entity[data.name].state }, state.client[name].port);
                                }
                            } catch (error) { console.log("error sending HA State update to client: ", error) }
                        } else if (!data.name.includes("sensor")) {
                            log("Websocket (" + color("cyan", data.address) + ") - state update for: "
                                + data.name + " - but this sensor in UNKNOWN", 1, 0);
                        }
                        if (entity[data.name]?.syncGroup) com.syncGroup(data.name, data.state);
                        break;
                    case "result":
                        state.fetchLast = time.epoch;
                        // console.log(data)
                        if (!(data.name in entity)) {
                            entity[data.name] = { client: {}, state: null, };
                            // console.log("adding new entity: " + data.name);
                            log("Websocket (" + color("cyan", data.address) + ") - adding new entity: "
                                + color("cyan", data.name, false), 1, 0);
                        } else {
                            // console.log("adding existing entity: " + data.name);
                            log("Websocket (" + color("cyan", data.address) + ") - adding existing entity: "
                                + color("cyan", data.name, false), 1, 0);
                        }
                        entity[data.name].state = (data.state == "on") ? true : (data.state == "off") ? false : data.state;
                        entity[data.name].owner = { type: "ha", name: data.address };
                        entity[data.name].update = time.epochMil;
                        entity[data.name].stamp = time.stamp;
                        break;
                    case "result_zha":
                        if (!(data.name in entity)) {
                            entity[data.name] = {
                                client: {},
                            };
                            log("Websocket (" + color("cyan", data.address) + ") - adding new ZHA device: "
                                + color("cyan", data.name, false), 1, 0);
                            // console.log("adding new entity: " + name);
                        } else log("Websocket (" + color("cyan", data.address) + ") - adding existing ZHA device: "
                            + color("cyan", data.name, false), 1, 0);
                        entity[data.name].owner = { type: "ha_zha", name: data.address };
                        entity[data.name].zha = { regID: data.dev.device_reg_id, deviceName: data.dev.name }
                        entity[data.name].state = data.state;
                        entity[data.name].update = time.epochMil;
                        entity[data.name].stamp = time.stamp;
                        break;
                    case "fetch":
                        for (const name in entity) {
                            //  console.log(entity[name])
                            try {
                                if (entity[name].state != null && data.name in entity[name].client) {
                                    if (typeof entity[name]?.state === "string" && entity[name].state.includes("remote_button_")) continue;
                                    if (name.includes("input_button.")) continue;
                                    log(
                                        "Websocket (" + color("cyan", data.address) + ") - fetch reply to client: "
                                        + color("purple", data.name) + " - entity: " + name + " - state: "
                                        + entity[name]?.state, 1, 0);

                                    client("state", { name, state: entity[name].state }, data.port);
                                }
                            } catch (error) { console.trace("fetch crash: ", entity[name]) }
                        }
                        client("fetchReply", null, data.port);
                        break;
                    case "reset":
                        state.client.forIn((name, value) => {
                            client("reRegister", null, value.port);
                        })

                        break;
                }
                break;
            case "log":
                //  console.log(data)
                log(data.msg, data.module, data.level); break;
        }
    }
    let workerThreads = {
        esp: function () {
            threadAssignments = {};              // threadAssignments[threadID] = { [name]: cfg, ... }
            const MAX_PER_THREAD = 10;
            const WORKER_SCRIPT = __filename;    // assumes worker code (case "esp") lives in same file

            function distributeESPDevices(devicesObj) {
                const devices = devicesObj || {};
                const deviceNames = Object.keys(devices);
                const deviceCount = deviceNames.length;
                const threadCount = Math.max(1, Math.ceil(deviceCount / cfg.esp.max_devices_per_thread));

                // create empty assignment objects and workers
                for (let tid = 0; tid < threadCount; tid++) {
                    threadAssignments[tid] = {}; // <-- now object, not array
                    newWorkerThread(tid, true);
                }

                // assign devices to threads and send initial config
                deviceNames.forEach((name, idx) => {
                    const config = devices[name];
                    if (!cfg) return;
                    config.name = name;

                    const tid = Math.floor(idx / cfg.esp.max_devices_per_thread);
                    threadAssignments[tid][name] = config; // store by name key

                    if (!thread.esp[tid]) newWorkerThread(tid, true);

                    thread.esp[tid].postMessage({ type: "config", esp: config, threadID: tid });
                });
            }

            // USAGE:
            distributeESPDevices(cfg.esp.devices);
            // console.log(threadAssignments)

            function newWorkerThread(threadID, boot = true) {
                if (boot) log("initializing ESP worker thread: " + threadID, 1);
                else log("re-initializing crashed ESP worker thread: " + threadID, 0);

                const w = new Worker(WORKER_SCRIPT, { workerData: { class: "esp", threadID } });
                thread.esp[threadID] = w;

                w.on('message', (data) => {
                    try { ipc(data); } catch (e) { console.error("ipc error:", e); }
                });

                w.on('error', (err) => {
                    log("ESP worker thread " + threadID + " error: " + String(err), 3);
                });

                w.on('exit', (code) => {
                    log("ESP worker thread " + threadID + " exited with code " + code, 2);
                    setTimeout(() => {
                        newWorkerThread(threadID, false);
                        const assigned = threadAssignments[threadID] || {};
                        for (const name in assigned) {
                            const cfg = assigned[name];
                            try {
                                if (thread.esp[threadID])
                                    thread.esp[threadID].postMessage({ type: "config", esp: cfg, threadID });
                            } catch (e) {
                                log(`Failed to re-post config ${name} to restarted thread ${threadID}: ${e}`, 3);
                            }
                        }
                    }, 2000);
                });

                return w;
            }
        },
        ha: function () {

            //  ha.ws(x);
            newWorker(true);
            function newWorker(boot) {
                if (boot) log("initializing HA worker thread");
                else log("re-initializing crashed HA thread: ");
                thread.ha = (new Worker(__filename, { workerData: { class: "ha" } }));
                thread.ha.on('message', (data) => ipc(data));
                thread.ha.on('error', (error) => {
                    log("HA worker: crashed", 0, 3);
                    console.log(error);
                    //  newWorker();
                });
                //  thread.ha.on('exit', (code) => { log("ESP worker: " + x + " exited", 0, 3); newWorker(x, obj); });
                // log("connecting to Home Assistant: " + color("cyan", server.address), 1);
                thread.ha.postMessage({ type: "config", cfg: cfg.homeAssistant });

            }
        },
        espAdd: function (cfg, name) {
            if (!name) {
                log("espAdd: missing device name", 3);
                return;
            }

            const MAX_PER_THREAD = cfg.esp?.max_devices_per_thread || 10;
            let targetThreadID = null;

            // Find a thread with available space
            for (const tid in threadAssignments) {
                const threadObj = threadAssignments[tid];
                if (!threadObj) continue;
                const currentCount = Object.keys(threadObj).length;
                if (currentCount < MAX_PER_THREAD) {
                    targetThreadID = Number(tid);
                    break;
                }
            }

            // If none found, create a new thread
            if (targetThreadID === null) {
                targetThreadID = Object.keys(threadAssignments).length;
                threadAssignments[targetThreadID] = {};
                newWorkerThread(targetThreadID, true);
                log(`espAdd: created new worker thread ${targetThreadID}`, 1);
            }

            // Assign the device
            const threadObj = threadAssignments[targetThreadID];
            cfg.name = name;
            threadObj[name] = cfg;

            // Ensure the thread exists
            if (!thread.esp[targetThreadID]) {
                newWorkerThread(targetThreadID, true);
            }

            // Send configuration to worker
            try {
                thread.esp[targetThreadID].postMessage({
                    type: "config",
                    esp: cfg,
                    threadID: targetThreadID
                });
                log(`espAdd: added '${name}' to thread ${targetThreadID}`, 1);
            } catch (e) {
                log(`espAdd: failed to send config for '${name}' to thread ${targetThreadID}: ${e}`, 3);
            }
        },
        espRemove: function (cfgName) {
            // find which thread has this device
            let foundThreadID = null;
            for (const tid in threadAssignments) {
                if (threadAssignments[tid] && threadAssignments[tid][cfgName]) {
                    foundThreadID = tid;
                    break;
                }
            }

            if (foundThreadID === null) {
                log("espRemove: device not found in any thread: " + cfgName, 2);
                return;
            }

            // tell the worker to close the device
            if (thread.esp[foundThreadID]) {
                thread.esp[foundThreadID].postMessage({
                    type: "close",
                    esp: { name: cfgName },
                    threadID: Number(foundThreadID)
                });
            }

            // remove from threadAssignments
            delete threadAssignments[foundThreadID][cfgName];

            log(`Removed ESP device '${cfgName}' from thread ${foundThreadID}`, 1);
        },
    }
    function watcher(filePath, reloadCallback) {
        log("creating watcher for: " + filePath);
        if (fileWatchers[filePath]) {
            fileWatchers[filePath].close();
            delete fileWatchers[filePath];
        }
        const filesWatcher = fs.watch(filePath, (eventType, filename) => {
            if (eventType === 'change') {
                const timerKey = `timer_${filePath}`;
                timer[timerKey] ||= null;
                if (timer[timerKey]) clearTimeout(timer[timerKey]);
                timer[timerKey] = setTimeout(() => {
                    log("File change event detected. Reloading: " + filePath);
                    reloadCallback(filePath);
                    delete timer[timerKey];
                    watcher(filePath, reloadCallback);
                }, 200);
            }
        });
        fileWatchers[filePath] = filesWatcher;
    }
    function reloadConfig() {
        fs.readFile(`${workingDir}/config.json`, (err, data) => {
            if (err) { console.error("Error reading config.json:", err); return; }
            try {
                const cfgTemp = JSON.parse(data);
                cfg.logging = cfgTemp.logging;
                if (JSON.stringify(cfg.esp) !== JSON.stringify(cfgTemp.esp)) {
                    cfgTemp.esp.devices.forIn((name, value) => {
                        if (!(name in cfg.esp.devices)) {
                            log("found new ESP: " + name);
                            workerThreads.espAdd(value, name)
                        } else if (value.ip !== cfg.esp.devices[name].ip ||
                            value.key !== cfg.esp.devices[name].key) {
                            cfg.esp.devices[name] = value;
                            workerThreads.espRemove(name)
                            workerThreads.espAdd(value, name)
                            log("found updated config for ESP: " + name);
                        }
                    })
                    cfg.esp.devices.forIn((name, value) => {
                        if (!(name in cfgTemp.esp.devices)) {
                            log("found orphaned ESP: " + name);
                            workerThreads.espRemove(name)
                        }
                    })
                    cfg.esp = cfgTemp.esp;
                    log("ESP config was changed");
                }
            } catch (e) {
                console.error("Error parsing config.json:", e);
            }
        });
    }
    function checkArgs() {
        const args = process.argv.slice(2);
        const map = {};
        let journal = true;
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
                if (arg === "-c" || arg === "-n") {
                    execStartArgs.push(arg);
                    if (value !== true) {
                        execStartArgs.push(`"${value}"`);
                    }
                }
            }
        }
        //state.args = execStartArgs.join(" ");
        //console.log("starting arguments: " + state.args)
        for (let i = 0; i < args.length; i++) {
            const option = args[i];
            const value = args[i + 1];
            switch (option) {
                case "--prep":
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
                    break;
                case "--install":
                    console.log("installing ThingWerks-Core service...");
                    //  let exec = "ExecStart=nodemon " + workingDir + "/core.js -w " + workingDir + "/core.js -w " + workingDir + "/config.json --exitcrash --delay 5";
                    let exec = "ExecStart=nodemon " + workingDir + "/core.js -w " + workingDir + "/core.js --exitcrash --delay 5";
                    let service = [
                        "[Unit]",
                        "Description=",
                        "After=network-online.target",
                        "Wants=network-online.target\n",
                        "[Install]",
                        "WantedBy=multi-user.target\n",
                        "[Service]",
                        "ExecStartPre=/bin/bash -c 'uptime=$(awk \\'{print int($1)}\\' /proc/uptime); if [ $uptime -lt 300 ]; then sleep 45; fi'",
                        ((!journal) ? "ExecStartPre=mv " + workingDir + "/log-twit-core.txt " + workingDir + "/log-twit-core-last.txt\n" + exec : exec),
                        ((!journal) ? "StandardOutput=file:" + workingDir + "/log-twit-core.txt\nType=simple" : "Type=simple"),
                        "User=root",
                        "Group=root",
                        "WorkingDirectory=" + workingDir,
                        "Restart=on-failure",
                        "RestartSec=5\n",
                    ];
                    try { fs.writeFileSync("/etc/systemd/system/twit-core.service", service.join("\n")); } catch { }
                    // execSync("mkdir /apps/ -p");
                    // execSync("cp " + process.argv[1] + " /apps/ha/");
                    try { execSync("systemctl daemon-reload"); } catch { }
                    try { execSync("systemctl enable twit-core.service"); } catch { }
                    try { execSync("systemctl start twit-core"); } catch { }
                    try { execSync("service twit-core status"); } catch { }
                    console.log("service installed and started");
                    console.log("type:  journalctl -f -u twit-core --output=cat");
                    //  console.log("or if not using journal:  tail -f /apps/log-twit-core.txt -n 500");
                    process.exit();
                case "--uninstall":
                    console.log("uninstalling TWIT-Core service...");
                    try { execSync("systemctl stop twit-core"); } catch { }
                    try { execSync("systemctl disable twit-core.service"); } catch { }
                    try { fs.unlinkSync("/etc/systemd/system/twit-core.service"); } catch { }
                    console.log("TWIT-Core service uninstalled");
                    process.exit();
                case "-d": debug = true; break;
            }
        }
    }
    function boot(step) {
        switch (step) {
            case 0:     // read config.json file
                fs = require('fs');
                exec = require('child_process').exec;
                execSync = require('child_process').execSync;
                workingDir = require('path').dirname(require.main.filename);
                console.log("Loading config data...");
                fs.readFile(workingDir + "/config.json", function (err, data) {
                    if (err) {
                        console.log("\x1b[31;1mCannot find config file, exiting\x1b[37;m"
                            + "\nconfig.json file should be in same folder as core.js file");
                        process.exit();
                    }
                    else { cfg = JSON.parse(data); boot(1); }
                });
                break;
            case 1:     // args, init, lib, load nv.json file (for local/core entities)
                console.log("checking args");
                checkArgs();
                lib();
                init();
                log("actual working directory: " + workingDir);
                log("initializing system states done");
                log("Loading non-volatile data...");

                let filePath = workingDir + "/nv-core.json";
                if (!fs.existsSync(filePath)) {
                    // Logic for NON-EXISTENT file (as in original 'if (err)' block)
                    log("\x1b[33;1mNon-Volatile Storage does not exist\x1b[37;m"
                        + "\nnv.json file should be in same folder as core.js file");
                    nv = { entity: {} };
                    file.write.nv();
                    boot(2);

                } else {
                    // 2. File EXISTS, now attempt to READ it
                    log("non-volatile data file exists, parsing...");
                    fs.readFile(filePath, function (err, data) {

                        // Check 2: Handle file READ error (e.g., permissions, corrupted disk)
                        if (err) {
                            // Error reading file, throw and quit.
                            console.error(`\x1b[31;1mFATAL ERROR:\x1b[37;m Could not read Non-Volatile Storage file at: ${filePath}`);
                            console.error(err.message);
                            process.exit(1); // Quit Node.js process
                        }

                        // Check 3: Attempt to PARSE the data
                        try {
                            nv = JSON.parse(data);
                            let count = 0;
                            // Original success logic
                            if (nv.entity) {
                                log("Loading entities from NV data");
                                nv.entity.forIn((name, value) => {
                                    entity[name] = value;
                                    entity[name].client = {};
                                    count++;
                                })
                            }
                            log("loaded " + count + " entities from NV data");
                            boot(2);

                        } catch (parseError) {
                            // Error parsing JSON, throw and quit.
                            console.error(`\x1b[31;1mFATAL ERROR:\x1b[37;m Non-Volatile Storage file exists but contains invalid JSON: ${filePath}`);
                            console.error(parseError.message);
                            process.exit(1); // Quit Node.js process
                        }
                    });
                }
                break;
            case 2: services.telegram(); services.webserver(); boot(3); break;
            case 3:     // connect to ESP and Home Assistant
                if (Object.keys(cfg.esp?.devices).length > 0) { workerThreads.esp() }
                if (cfg.homeAssistant) { workerThreads.ha() }
                setTimeout(() => { boot(4); }, 2e3);
                break;
            case 4:     // start system timer & UDP server
                udp.on('listening', () => {
                    log("starting UDP Server - Interface: "
                        + color("cyan", "127.0.0.1") + " Port: " + color("cyan", "65432"));
                });
                udp.on('error', (err) => { console.error(`udp server error:\n${err.stack}`); udp.close(); });
                udp.on('message', (msg, info) => { com.udp(msg, info); });
                udp.bind(65432, "127.0.0.1");
                setInterval(() => { com.watchDog(); }, 1e3);
                setTimeout(() => {
                    if (cfg.telegram?.enable)
                        cfg.telegram?.users?.forEach(user => {
                            bot.sendMessage(user, "ThingWerks Core just went ONLINE")
                                .catch(error => { console.log(error); })
                        });
                }, 4e3);
                watcher((workingDir + "/config.json"), reloadConfig);
                setTimeout(() => { log("TWIT Core is fully " + color("green", "ONLINE"), 0); }, 1e3);
                break;
        }
    }
    function init() { // initialize system volatile memory
        state = { client: {}, sync: {}, fetchLast: null };
        entity = {};
        thread = { ha: {}, esp: [], telegram: null };
        timer = { fileWrite: null, fileWriteLast: time.epoch };
        logs = { step: 0, sys: [], tg: [], tgStep: 0 };
        fileWatchers = {};
        state.telegram = { started: false };
    }
    function lib() {
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
        file = {
            write: {
                nv: function () {  // write non-volatile memory to the disk
                    clearTimeout(timer.fileWrite);
                    if (time.epoch - timer.fileWriteLast > 2) writeFile();
                    else timer.fileWrite = setTimeout(() => { writeFile(); }, 2e3);
                    function writeFile() {
                        log("writing NV data...", 0, 0);
                        timer.fileWriteLast = time.epoch;
                        fs.writeFile(workingDir + "/nv-core-bak.json", JSON.stringify(nv, null, 2), function () {
                            fs.copyFile(workingDir + "/nv-core-bak.json", workingDir + "/nv-core.json", (err) => {
                                if (err) throw err;
                            });
                        });
                    }
                }
            },
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
                    dest[key] = d && typeof d === 'object' ? objMerge(d, s) : { ...s };
                } else if (!(key in dest)) {
                    dest[key] = s;
                }
            }
            return dest;
        };
        objSelectiveCopy = function (type) {
            const temp = Object.entries(entity).reduce((accumulator, [key, value]) => {
                // key is the device name (e.g., "deviceA")
                // value is the inner device object
                // 1. SAFE CHECK for nested property:
                //    Ensure 'value' exists AND 'value.owner' exists AND the type matches.
                if (value && value.owner && value.owner.type === type) {
                    // 2. Condition met: copy the entire key-value pair 
                    //    (the name and the inner object) to the accumulator.
                    accumulator[key] = value;

                    // --- Optional: For a deep copy, use JSON.parse(JSON.stringify(value)) here ---
                    // accumulator[key] = JSON.parse(JSON.stringify(value));
                }
                return accumulator;
            }, {}); // Initialize the accumulator as an empty object {}
            return temp;
        }
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
    }
    function log(message, mod, level, port) {      // add a new case with the name of your automation function
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
        if (logs.sys[logs.step] && level > 0) logs.sys.push(buf); else logs.sys[logs.step] = buf;
        if (logs.step < 500) logs.step++; else logs.step = 0;
        if (cfg.rocket.enable && level > 1) sendRocket(buf);
        if (cfg.telegram?.enable && state.telegram.started && cfg.telegram.users) {
            if (level >= cfg.telegram.logLevel || level == 0 && cfg.telegram.logDebug == true) {
                try {
                    for (let x = 0; x < cfg.telegram.users.length; x++) {
                        if (cfg.telegram.logESPDisconnect == false) {
                            if (!message.includes("connection error, resetting...")
                                && !message.includes("failed to connect, trying to reconnect...")) {


                                bot.sendMessage(cfg.telegram.users[x], buf).catch(error => {
                                    log("telegram sending error"); console.log(error);
                                })
                            }
                        } else bot.sendMessage(cfg.telegram.users[x], buf).catch(error => { log("telegram sending error"); console.log(error) })
                    }
                } catch (error) { console.log(error, "\nmessage: " + message + "  - Mod: " + mod) }
            }
        }
        if (port != undefined) {
            if (level != 0) {
                if (cfg.logging.client || debug) console.log(ubuf);
                client("log", ubuf, port);
            } else if (cfg.logging.clientDebug) {
                client("log", ubuf, port);
                // console.log(ubuf);

            }
        } else if (level == 0 && cfg.logging.debug || debug) console.log(cbuf);
        else if (level != 0) console.log(cbuf);
        return buf;
    }
    boot(0);
    debug = false;
} else {
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
                    boot: 0,
                    errorResetTimeout: null,
                    reconnectTimeout: null,
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

                    state[name].checkConnect = setTimeout(() => {
                        if (!state[name].connected) {
                            if (state[name].reconnect == false) {
                                log("ESP Home - " + color("cyan", name) + " - failed to connect, trying to reconnect...", 2);
                                state[name].reconnect = true;
                            }
                            reset();
                        } else {
                            // checkTimer is an interval
                            state[name].checkTimer = setInterval(() => {
                                if ((Math.floor(Date.now() / 1000) - state[name].checkUpdate) >= 20) {
                                    if (state[name].reconnect == false) {
                                        log("ESP Home - " + color("cyan", name) + " - isnt communicating, trying to reconnect...", 2);
                                        state[name].reconnect = true;
                                    }
                                    reset();
                                }
                            }, 1e3);
                        }
                    }, 10e3);
                }

                // forceful clear-reset flow (prevents overlapping resets)
                function reset(reconnect) {
                    log("ESP Home - " + color("cyan", name) + " - disconnected: " + color("cyan", cfg.ip) + " - resetting", 0);
                    if (reconnect) state[name].reconnect = true;
                    state[name].connected = false;
                    state[name].reconnectState = true;

                    try { if (client && client.disconnect) client.disconnect(); } catch (error) { log("ESP Home - " + color("cyan", name) + " - disconnect failed...", 2); }

                    clearTimeout(state[name].errorResetTimeout);
                    clearTimeout(state[name].keepaliveTimer);
                    if (state[name].checkTimer) {
                        clearInterval(state[name].checkTimer);
                        state[name].checkTimer = null;
                    }
                    clearTimeout(state[name].checkConnect);

                    // timed forced cleanup: remove listeners, drop client reference, and re-setup
                    state[name].errorResetTimeout = setTimeout(() => {
                        try { if (emitters[name] && emitters[name].removeAllListeners) emitters[name].removeAllListeners(); } catch (e) { }
                        try { if (client && client.removeAllListeners) client.removeAllListeners(); } catch (e) { }
                        // best-effort destroy underlying socket if present
                        try { if (client && client._socket && !client._socket.destroyed) client._socket.destroy(); } catch (e) { }
                        // drop both local and stored reference
                        client = null;
                        clients[name] = null;
                        // small delay, then re-setup (mirrors original timing)
                        state[name].reconnectTimeout = setTimeout(() => {
                            state[name].reconnectTimeout = null;
                            setup();
                        }, 1e3);
                    }, 5e3);
                }



                function connect() {
                    if (state[name].reconnect === true) {
                        parentPort.postMessage({ type: "esp", class: "reset", esp: name });
                    } else {
                        log(
                            "ESP Home - " + color("cyan", name) +
                            " - connecting: " + color("cyan", cfg.ip) +
                            " - trying to connect...", 1
                        );
                    }

                    // guard each callback to avoid throwing out of event handlers
                    client.on('error', (error) => {
                        try {
                            if (state[name].reconnect === false) {
                                log("ESP Home - " + color("cyan", name) + " - disconnected: " +
                                    color("cyan", cfg.ip) + " - connection error, resetting...", 2);
                                reset(true);
                            }
                        } catch (e) {
                            log("ESP Home - " + color("cyan", name) +
                                " - error handler threw: " + String(e), 3);
                            reset(true);
                        }
                    });

                    client.on('disconnected', () => {
                        // 🟩 Step 1: Clear any old reconnect timer
                        try {
                            if (state[name].reconnectTimeout) {
                                clearTimeout(state[name].reconnectTimeout);
                                state[name].reconnectTimeout = null;
                            }
                        } catch (e) { }

                        // 🟨 Step 2: Delegate reconnect logic to reset()
                        try {
                            log("ESP Home - " + color("cyan", name) + " - disconnected", 1);
                            reset(true);  // This is your reconnect scheduler
                        } catch (e) {
                            log("ESP Home - " + color("cyan", name) +
                                " - disconnected handler threw: " + String(e), 3);
                        }
                    });



                    client.on('newEntity', data => {
                        try {
                            state[name].reconnect = false;

                            if (state[name].boot === 0) {
                                //   log("ESP Home - " + color("cyan", name) + " - connected: " +
                                //      color("cyan", cfg.ip) + " - " + color("green", "ONLINE"), 1);
                                state[name].boot = 1;
                            }

                            parentPort.postMessage({
                                type: "esp", class: "newEntity", esp: name, thread: threadID,
                                obj: { name: data.config.objectId, type: data.type, esp_entity_id: data.id }
                            });

                            if (data.type === "Switch") {
                                emitters[name].on(data.config.objectId, function (st) {
                                    try {
                                        if (!data.config.objectId.includes("heartbeat"))
                                            log("ESP Home - " + color("cyan", name) +
                                                " - sending state command: " + st +
                                                " - to switch: " + data.config.objectId, 0);
                                        data.connection.switchCommandService({ key: data.id, state: st });
                                    } catch (e) {
                                        if (state[name].reconnect === false) {
                                            log("ESP Home - " + color("cyan", name) +
                                                " - error sending command - resetting...", 3);
                                            reset(true);
                                        }
                                    }
                                });
                            }

                            data.on('state', (update) => {
                                try {
                                    state[name].connected = true;
                                    state[name].reconnect = false;
                                    state[name].checkUpdate = Math.floor(Date.now() / 1000);

                                    if (state[name].boot === 1) {
                                        if (data.config.objectId.includes("wifi_scan_results"))
                                            setTimeout(() => {
                                                log("ESP Home - " + color("cyan", name) +
                                                    " - connected: " + color("cyan", cfg.ip) +
                                                    " - " + color("green", data.config.objectId) +
                                                    " - List: \n" + update.state);
                                            }, 10);
                                        else if (data.config.objectId.includes("wifi"))
                                            setTimeout(() => {
                                                log("ESP Home - " + color("cyan", name) +
                                                    " - connected: " + color("cyan", cfg.ip) +
                                                    " - " + color("green", data.config.objectId) +
                                                    " - Signal: " + update.state);
                                            }, 10);
                                        setTimeout(() => { state[name].boot = 2; }, 20);
                                    } else if (state[name].reconnectState === true) {
                                        if (/wifi/.test(data.config.objectId)) {
                                            log("ESP Home - " + color("cyan", name) +
                                                " - reconnected: " + color("cyan", cfg.ip) +
                                                " - " + color("green", data.config.objectId) +
                                                " - Signal: " + update.state,
                                                ((cfg.telegram && cfg.telegram.logESPDisconnect === true) ? 2 : 1)
                                            );
                                            state[name].reconnectState = false;
                                        }
                                    }

                                    parentPort.postMessage({
                                        type: "esp", class: "state", esp: name, thread: threadID,
                                        obj: {
                                            name: data.config.objectId,
                                            state: update.state,
                                            esp_entity_id: data.id
                                        }
                                    });
                                } catch (e) {
                                    log("ESP Home - " + color("cyan", name) +
                                        " - state handler error: " + String(e), 3);
                                }
                            });
                        } catch (e) {
                            log("ESP Home - " + color("cyan", name) +
                                " - newEntity handler error: " + String(e), 3);
                            reset(true);
                        }
                    });

                    // ---- Safe connection attempt ----
                    try {
                        const maybePromise = client.connect();

                        // handle both sync & promise-based implementations
                        if (maybePromise && typeof maybePromise.then === "function") {
                            maybePromise.catch((error) => {
                                if (String(error).includes("HelloResponse")) {
                                    log("ESP Home - " + color("cyan", name) +
                                        " - HelloResponse timeout, retrying...", 2);
                                    reset(true);
                                } else {
                                    log("ESP Home - " + color("cyan", name) +
                                        " - client connect error: " + String(error), 3);
                                    reset(true);
                                }
                            });
                        }
                    } catch (error) {
                        if (String(error).includes("HelloResponse")) {
                            log("ESP Home - " + color("cyan", name) +
                                " - HelloResponse timeout (caught sync), retrying...", 2);
                            reset(true);
                        } else {
                            log("ESP Home - " + color("cyan", name) +
                                " - client connect error (sync): " + String(error), 3);
                            reset(true);
                        }
                    }
                }









                // expose control methods for this connection
                connectionsMapSet(name, {
                    restart: () => reset(true),
                    destroy: () => {
                        try { if (clients[name] && clients[name].disconnect) clients[name].disconnect(); } catch (e) { }
                        try {
                            if (state[name]) {
                                clearTimeout(state[name].errorResetTimeout);
                                if (state[name].reconnectTimeout) { clearTimeout(state[name].reconnectTimeout); state[name].reconnectTimeout = null; }
                                clearTimeout(state[name].keepaliveTimer);
                                if (state[name].checkTimer) { clearInterval(state[name].checkTimer); state[name].checkTimer = null; }
                                clearTimeout(state[name].checkConnect);
                            }
                        } catch (e) { }
                        // if local client exists, remove listeners and destroy its socket
                        try {
                            if (client && client.removeAllListeners) client.removeAllListeners();
                        } catch (e) { }
                        try {
                            if (client && client._socket && !client._socket.destroyed) client._socket.destroy();
                        } catch (e) { }
                        // nulled local reference and stored mirror
                        client = null;
                        delete clients[name];
                        try { if (emitters[name]) emitters[name].removeAllListeners(); } catch (e) { }
                        delete emitters[name];
                        // delete state/cfg entries
                        delete cfgs[name];
                        delete state[name];
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
                            //  let target = (data.esp && data.esp.name) || data.espName || data.name || data.address;
                            let target = data.address;
                            if (!target) {
                                const keys = Object.keys(emitters);
                                if (keys.length === 1) target = keys[0];
                            }
                            if (!target) {
                                log("ESP worker - state message missing target esp name and multiple connections exist", 1);
                                console.log(data)

                                console.log("target: \n", target)
                                console.log(Object.keys(emitters))
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
                            const targetClose = (data.esp && data.esp.name) || data.espName || data.name || data.address;
                            if (!targetClose) {
                                log("ESP worker - close message missing esp.name", 1);
                                break;
                            }
                            destroyConnectionPublic(targetClose);
                            break;
                        }

                        case "restart": {
                            const t = (data.esp && data.esp.name) || data.espName || data.name || data.address;
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
            // Global uncaught exception handler
            process.on('uncaughtException', (err) => {
                const msg = String(reason?.stack || reason);
                const firstLine = msg.split('\n')[0]; // take only the first line
                log("ESP worker - uncaughtException: " + firstLine, 3);

                // --- Handle recoverable write-after-end errors ---
                if (msg.includes("write after end")) {
                    log("ESP worker - recoverable stream write-after-end, cleaning up...", 2);
                    for (const nm of Object.keys(_connectionsControl)) {
                        try {
                            const ctl = _connectionsControl[nm];
                            if (ctl && ctl.restart) ctl.restart(); // try soft restart instead of exit
                        } catch (e) { /* ignore */ }
                    }
                    return; // don’t crash worker
                }

                // --- Handle unrecoverable issues ---
                try {
                    for (const nm of Object.keys(_connectionsControl)) {
                        try {
                            const ctl = _connectionsControl[nm];
                            if (ctl && ctl.destroy) ctl.destroy();
                        } catch (e) { /* ignore */ }
                    }
                } catch (e) {
                    // ignore cleanup errors
                }

                // Give main thread a moment to process the exit
                setTimeout(() => process.exit(1), 100);
            });


            // Global unhandled rejection handler
            process.on('unhandledRejection', (reason) => {
                const msg = String(reason?.stack || reason);
                const firstLine = msg.split('\n')[0]; // take only the first line
                log("ESP worker - unhandledRejection: " + firstLine, 3);
                // --- Handle recoverable handshake timeout ---
                if (msg.includes("HelloResponse") || msg.includes("ConnectResponse")) {
                    log("ESP worker - recoverable handshake timeout, retrying...", 2);
                    // Attempt reconnect instead of exiting
                    for (const nm of Object.keys(_connectionsControl)) {
                        try {
                            const ctl = _connectionsControl[nm];
                            if (ctl && ctl.restart) ctl.restart();
                        } catch (e) { /* ignore */ }
                    }
                    return;
                }

                // --- Handle generic connection errors ---
                if (msg.includes("ECONNRESET") || msg.includes("EPIPE")) {
                    log("ESP worker - recoverable connection reset (EPIPE/ECONNRESET)", 2);
                    for (const nm of Object.keys(_connectionsControl)) {
                        try {
                            const ctl = _connectionsControl[nm];
                            if (ctl && ctl.restart) ctl.restart();
                        } catch (e) { /* ignore */ }
                    }
                    return;
                }

                // --- Everything else is fatal ---
                try {
                    for (const nm of Object.keys(_connectionsControl)) {
                        try {
                            const ctl = _connectionsControl[nm];
                            if (ctl && ctl.destroy) ctl.destroy();
                        } catch (e) { /* ignore */ }
                    }
                } catch (e) { }

                log("ESP worker - unrecoverable rejection, restarting worker...", 3);
                setTimeout(() => process.exit(1), 100);
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

                // ✅ Create one persistent keep-alive agent for all REST calls
                keepAliveAgent = new http.Agent({
                    keepAlive: true,
                    maxSockets: 50,
                    maxFreeSockets: 20,
                    //   maxTotalSockets: 50,     // total across all hosts
                    timeout: 60000, // milliseconds
                });

                WebSocketClient = require('websocket').client;
            }
            function log(msg, level) {
                parentPort.postMessage({ type: "log", msg, module: 1, level });
            }
            function init() {
                for (let x = 0; x < cfg.length; x++) {
                    let config = cfg[x];
                    em[config.address] = new (require('events').EventEmitter)();
                    logs ||= { ws: {}, zhaDevices: {} };
                    state[config.address] ||= {
                        entityTotal: 0, id: 0, logStep: 0,
                        zha: { queryReply: null },
                        timer: { reconnect: null },
                        log: { ws: [], zhaDevices: {} },
                        perf: {},
                        sensorRestSetup: {}, // call rest setup for sensor 
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
                }
            }
            function api(config, address, state) {
                ws[address].connect("ws://" + address + ":" + config.port + "/api/websocket");

                ws[address].on('connectFailed', function (error) {
                    if (!state.error) {
                        setTimeout(() => { haReconnect(error.toString()); }, 5e3);
                    }
                });

                ws[address].on('connect', function (socket) {
                    log("Websocket (" + color("cyan", address) + ") - starting connection", 0);
                    state.reply = true;
                    state.online = true;

                    socket.on('error', function (error) {
                        if (!state.error) {
                            log("websocket (" + color("cyan", address) + ") - " + error.toString(), 3);
                            state.error = true;
                        }
                        socket.close();
                    });

                    socket.on('message', function (message) {
                        let buf = JSON.parse(message.utf8Data);
                        switch (buf.type) {
                            case "pong":
                                state.reply = true;
                                state.retry = false;
                                state.online = true;
                                state.pingsLost = 0;
                                let timeFinish = time.epochMil;
                                let timeResult = timeFinish - state.timeStart;
                                if (timeResult > 500)
                                    log("websocket (" + color("cyan", address) + ") ping lag: " + timeResult + "ms", 2);
                                break;

                            case "result":
                                // console.log(buf)
                                let count = 0;
                                if (buf.id == state.query) {
                                    for (let x = 0; x < buf.result?.length; x++) {
                                        let name = buf.result[x].entity_id;
                                        if (/^(input|switch)/.test(name)) {
                                            count++;
                                            state.entityTotal++;
                                            parentPort.postMessage({
                                                type: "ha", class: "result",
                                                address: address,
                                                name,
                                                state: buf.result[x].state
                                            });
                                        }
                                    }
                                    log("Websocket (" + color("cyan", address)
                                        + ") - received fetch data, total: " + count + " entities", 1);

                                    if (state.error) {
                                        log("Websocket (" + color("cyan", address)
                                            + ") - HA back online - requesting reregistrations", 1);
                                        parentPort.postMessage({
                                            type: "ha", class: "reset",
                                            address: address,
                                        });
                                        state.error = false;
                                    }

                                    if (address == (cfg[(cfg.length - 1)].address)) {
                                        log("Websocket (" + color("cyan", address)
                                            + ") - all fetches done - total entities: "
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
                                }

                                if (buf.id == state.zha.query) {
                                    state.zha.devices ||= {};
                                    if (Array.isArray(buf.result)) {
                                        buf.result.forEach(dev => {
                                            if (dev.user_given_name) {
                                                let name = dev.user_given_name;
                                                logs.zhaDevices[address].push(dev.name);
                                                state.zha.devices[dev.device_reg_id] = {
                                                    userName: dev.name,
                                                    name: dev.user_given_name
                                                };
                                                parentPort.postMessage({
                                                    type: "ha", class: "result_zha",
                                                    address: address,
                                                    name,
                                                    dev
                                                });
                                            }
                                        });
                                        log("Websocket (" + color("cyan", address)
                                            + ") - received ZHA device list, items: " + buf.result.length);
                                        clearTimeout(state.zha.queryReply);
                                    } else if (buf.error?.code == 'unknown_command') {
                                        log("Websocket (" + color("cyan", address) + ") - no ZHA devices - disabling");
                                        clearTimeout(state.zha.queryReply);
                                    } else if (buf.error?.code == 'unknown_error') {
                                        log("Websocket (" + color("cyan", address)
                                            + ") - ZHA not online yet - will retry", 2);
                                    }
                                }
                                break;

                            case "auth_required":
                                log("Websocket (" + color("cyan", address) + ") - authenticating", 0);
                                send({ type: "auth", access_token: config.token });
                                break;

                            case "auth_ok":
                                log("Websocket (" + color("cyan", address) + ") - connection " + color("green", "ONLINE"));
                                log("Websocket (" + color("cyan", address) + ") - subscribing to HA events", 1);

                                state.id++;
                                send({ id: state.id++, type: "subscribe_events", event_type: "state_changed" });
                                send({ id: state.id++, type: "subscribe_events", event_type: "zha_event" });
                                zhaQuery();

                                log("Websocket (" + color("cyan", address) + ") - fetching entity states", 1);
                                state.query = state.id;
                                send({ id: state.id++, type: "get_states" });

                                send({ id: state.id++, type: "ping" });
                                setTimeout(() => {
                                    state.pingsLost = 0;
                                    send({ id: state.id++, type: "ping" });
                                    state.reply = true;
                                    ping();
                                }, 10e3);
                                break;

                            case "event":
                                switch (buf.event.event_type) {
                                    case "zha_event":
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
                                        }
                                        break;

                                    case "state_changed":
                                        let ibuf, obuf;
                                        if (state.log.ws[state.logStep] == undefined) state.log.ws.push(buf.event);
                                        else state.log.ws[state.logStep] = buf.event;
                                        if (state.logStep < 200) state.logStep++; else state.logStep = 0;

                                        if (buf.event.data.new_state != null) ibuf = buf.event.data.new_state.state;
                                        if (ibuf === "on") obuf = true;
                                        else if (ibuf === "off") obuf = false;
                                        else if (ibuf == null)
                                            log(`Websocket (${color("cyan", address)}) - sent null/undefined data: ${ibuf}`, 2);
                                        else if (ibuf === "unavailable")
                                            log(`Websocket (${color("cyan", address)}) - Entity went unavailable: ${buf.event.data.new_state.entity_id}`, 2);
                                        else if (!isNaN(ibuf) && isFinite(ibuf)) obuf = Number(ibuf);
                                        else if (ibuf.length === 32) obuf = ibuf;

                                        if (obuf !== undefined) {
                                            let entity_id = buf.event.data.entity_id;
                                            parentPort.postMessage({
                                                type: "ha", class: "state",
                                                address: address,
                                                name: entity_id,
                                                state: obuf
                                            });
                                        }
                                        break;
                                }
                                break;
                        }
                    });

                    em[address].on('zhaQuery' + address, function () { zhaQuery(); });
                    em[address].on('state' + address, function (data) { send(data); });
                    em[address].on('fetch', function (data) {
                        log("Websocket (" + color("cyan", address) + ") - fetching entities for client: "
                            + color("purple", data.name) + " - port: " + color("purple", data.port), 0);
                        if (data.port) {
                            state.clientFetch = { name: data.name ?? undefined, port: data.port ?? undefined };
                        }
                        state.query = state.id;
                        send({ id: state.id++, type: "get_states" });
                    });

                    // === Internal send() patched ===
                    function send(data) {
                        if (data.type === "state") {
                            if (!data.unit || state.sensorRestSetup[data.entity]?.boot) {
                                // send via WebSocket
                                const packet = {
                                    id: state.id++,
                                    // If unit exists → this is a sensor update using WS set_state
                                    ...(data.unit && {  // WS API does not support "set_state" so this is a dead end
                                        type: "set_state",
                                        entity_id: data.entity,
                                        state: data.state,
                                    }),
                                    // If no unit → this is a normal HA service call (switch/light/etc)
                                    ...(!data.unit && {
                                        type: "call_service",
                                        domain: (!data.zha) ? data.entity.split(".")[0] : "switch",
                                        service: data.state === false ? "turn_off" : "turn_on",
                                        target: (!data.zha)
                                            ? { entity_id: data.entity }
                                            : { device_id: data.zha },
                                    })
                                };
                                if (packet.attributes) packet.attributes = attributes(data.unit, data.entity);
                                try { socket.sendUTF(JSON.stringify(packet)); }
                                catch (error) { log(error, 3); }
                                // console.log(packet)
                            } else {
                                // ✅ send via REST with keep-alive agent
                                const packet = { state: data.state };
                                packet.attributes = attributes(data.unit, data.entity);
                                packet.attributes.friendly_name = data.entity;
                                const postData = JSON.stringify(packet);
                                const options = {
                                    hostname: address,
                                    port: 8123,
                                    path: `/api/states/sensor.${data.entity}`,
                                    method: "POST",
                                    agent: keepAliveAgent, // ✅ Reuse same sockets
                                    headers: {
                                        "Authorization": "Bearer " + config.token,
                                        "Content-Type": "application/json",
                                        "Content-Length": Buffer.byteLength(postData),
                                        "Connection": "keep-alive", // ✅ ensure reuse
                                    },
                                };

                                const req = http.request(options, (res) => {
                                    // consume response to fully close HTTP stream
                                    res.resume();
                                    res.on("end", () => {  // WS API does not support "set_state" so this is a dead end
                                        // state.sensorRestSetup[data.entity] ||= {};
                                        //  state.sensorRestSetup[data.entity].boot = true;
                                    });
                                });
                                req.on("error", (err) => console.error("HA error:", err));
                                req.write(postData);
                                req.end();
                            }
                            function attributes(unit, entity) {
                                let attributes = {};
                                switch (unit) {
                                    case "m3":
                                        if (entity.includes("total"))
                                            attributes.state_class = "total_increasing";
                                        else attributes.state_class = "measurement";
                                        break;
                                    case "kWh":
                                        attributes.device_class = "energy";
                                        attributes.state_class = "total_increasing";
                                        break;
                                    default:
                                        attributes.state_class = "measurement";
                                        break;
                                }
                                attributes.unit_of_measurement = unit;
                                return attributes;
                            }
                        } else {
                            try { socket.sendUTF(JSON.stringify(data)); }
                            catch (error) { log(error, 3); }
                        }
                    }

                    function ping() {
                        if (state.reply == false) {
                            if (state.pingsLost < 2) {
                                if (!state.retry) {
                                    log("websocket (" + color("cyan", address)
                                        + ") - ping was never replied in 10 sec", 3);
                                    state.retry = true;
                                }
                                state.pingsLost++;
                            } else { socket.close(); haReconnect("ping timeout"); return; }
                        }
                        state.reply = false;
                        state.timeStart = time.epochMil;
                        send({ id: state.id++, type: "ping" });
                        setTimeout(() => { ping(); }, 10e3);
                    }

                    function zhaQuery() {
                        log("Websocket (" + color("cyan", address)
                            + ") - querying ZHA device list... (id: " + state.id + ")");
                        logs.zhaDevices[address] = [];
                        state.zha.query = state.id;
                        send({ id: state.id++, type: "zha/devices" });
                        state.zha.queryReply = setTimeout(() => {
                            log("Websocket (" + color("cyan", address)
                                + ") - never replied to ZHA Device query, retrying...");
                            zhaQuery();
                        }, 10e3);
                    }
                });

                function haReconnect(error) {
                    state.error = true;
                    clearTimeout(state.timer.reconnect);
                    if (error) log("websocket (" + color("cyan", address) + ") - " + error.toString(), 3);
                    em[address].removeAllListeners();
                    ws[address].connect("ws://" + address + ":" + config.port + "/api/websocket");
                    state.timer.reconnect = setTimeout(() => {
                        if (!state.reply) haReconnect();
                    }, 10e3);
                }
            }
            parentPort.on('message', (data) => {
                switch (data.type) {
                    case "config":
                        cfg = data.cfg;
                        log("thread received configuration ");
                        init();
                        cfg.forEach((config) => {
                            api(config, config.address, state[config.address]);
                        });
                        break;

                    case "fetch":
                        cfg.forEach(element => { em[element.address].emit('fetch', data); });
                        break;

                    case "state":
                        data.entity = data.entity.replace(/ /g, "_");
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
