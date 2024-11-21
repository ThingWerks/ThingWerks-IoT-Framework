#!/usr/bin/node
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
if (isMainThread) {
    let
        ha = {
            fetch: function (client, retry) {
                let sendDelay = 0, completed = 0, delay = 20, haSystem, buf = [];
                if (retry == undefined) retry = 0;
                if (client.ha) {
                    //   console.log(client.ha);
                    //  logs.haInputs.forEach(element => { console.log(element); });
                    for (let x = 0; x < client.ha.length; x++) {
                        for (let y = 0; y < cfg.homeAssistant.length; y++) {
                            haSystem = y;
                            for (let z = 0; z < logs.haInputs[y].length; z++) {
                                if (x == client.ha.length - 1 && z == logs.haInputs[y].length - 1) checkIfCompleted(y);
                                if (logs.haInputs[y][z] == client.ha[x]) {
                                    log("HA fetch found device for Client: " + a.color("white", client.name) + " On HA System: " + y + " - Entity: " + logs.haInputs[y][z], 1, 0)
                                    getData(y, client.ha[x]);
                                }
                            }
                        }
                    }       // flow is different than regular because NaN will corrupt flow meter NV data and also we want to know if a regular sensor is NaN
                    function getData(ha, name) {
                        let typeCheck = ["input_boolean", 'input_button', "switch", "input_number", "flow", "sensor"];
                        let typeGet = ["input_boolean", 'input_button', "switch", "input_number", "sensor", "sensor"];
                        for (let x = 0; x < typeCheck.length; x++) {
                            if (name.includes(typeCheck[x])) {
                                setTimeout(() => {
                                    hass[ha].states.get(typeGet[x], name)
                                        .then(data => {
                                            switch (x) {
                                                case 0:
                                                case 1:
                                                case 2: data.state == "on" ? buf.push(true) : buf.push(false); finished(); break;
                                                case 3:
                                                case 4: if (isNaN(Number(data.state)) != true && Number(data.state) != null)
                                                    buf.push(Number(data.state));  // prevent NaN for flow meters
                                                    finished();
                                                    break;
                                                case 5: buf.push(Number(data.state)); finished(); break;
                                            }
                                        })
                                        .catch(err => console.error(err))
                                }, sendDelay);
                                sendDelay += delay;
                                break;
                            }
                        }
                    }
                }
                function finished() {
                    completed++;
                    if (client.ha.length == completed) {
                        log("fetch completed, found " + completed + " entities, sending results for HA system:" + haSystem + " to client:" + client.name, 1)
                        udp.send(JSON.stringify({ type: "haFetchReply", obj: buf }), client.port)
                    }
                }
                function checkIfCompleted(x) {
                    setTimeout(() => {
                        if (completed != client.ha.length) {
                            if (retry < 3) {
                                log("Home Assistant is not fully online or some entities are not found, refreshing entities", 1, 2);
                                retry++;
                                for (let y = 0; y < cfg.homeAssistant.length; y++) {
                                    logs.haInputs[x] = [];
                                    try {
                                        hass[x].states.list()
                                            .then(data => {
                                                data.forEach(element => { logs.haInputs[x].push(element.entity_id) });
                                                if (cfg.homeAssistant.length - 1 == x) response.send(logs.haInputs);
                                            })
                                            .catch(err => { log("entity query failed: " + err, 1, 2); });
                                    } catch (e) { console.log(e) }
                                }
                                // setTimeout(() => { ha.fetch(client, retry) }, 20e3);  // client will reinitiate fetch call 
                            } else {
                                log("Home Assistant is not fully online or some entities are not found, all attempts failed, ", 1, 3);
                            }
                        }
                    }, 2e3);
                }
            },
            ws: function () {
                for (let haNum = 0; haNum < cfg.homeAssistant.length; haNum++) {
                    ws.push({});
                    let client = state.ha[haNum].ws;
                    let config = cfg.homeAssistant[haNum];
                    ws[haNum].connect("ws://" + config.address + ":" + config.port + "/api/websocket");
                    ws[haNum].on('connectFailed', function (error) { if (!client.error) { log(error.toString(), 1, 3); client.error = true; } });
                    ws[haNum].on('connect', function (socket) {
                        //    if (client.reply == false) { log("fetching sensor states", 1); ha.fetch(); client.id = 0; }
                        client.reply = true;
                        client.online = true;
                        client.error = false;
                        socket.on('error', function (error) {
                            if (!client.error) { log("websocket (" + a.color("white", config.address) + ") " + error.toString(), 1, 3); client.error = true; }
                        });
                        //   socket.on('close', function () { log('Connection closed!', 1, 3); });
                        socket.on('message', function (message) {
                            let buf = JSON.parse(message.utf8Data);
                            switch (buf.type) {
                                case "pong":
                                    //    log("pong: " + JSON.stringify(buf))
                                    client.reply = true;
                                    client.online = true;
                                    client.pingsLost = 0;
                                    let timeFinish = new Date().getMilliseconds();
                                    let timeResult = timeFinish - client.timeStart;
                                    if (timeResult > 1000) log("websocket (" + a.color("white", config.address) + ") ping is lagging - delay is: " + timeResult + "ms", 1, 0);
                                    break;
                                case "auth_required":
                                    log("Websocket (" + a.color("white", config.address) + ") authenticating", 1);
                                    send({ type: "auth", access_token: config.token, });
                                    break;
                                case "auth_ok":
                                    //  state.client = []; // force UDP client to reconnect if WS gets disconnected (will force fetch again)
                                    for (let x = 0; x < state.client.length; x++) {
                                        udp.send(JSON.stringify({ type: "haFetchAgain" }), state.client[x].port);
                                    }
                                    log("Websocket (" + a.color("white", config.address) + ") authentication accepted", 1);
                                    log("Websocket (" + a.color("white", config.address) + ") subscribing to event listener", 1);
                                    send({ id: 1, type: "subscribe_events", event_type: "state_changed" });
                                    client.timeStart = new Date().getMilliseconds();
                                    send({ id: client.id++, type: "ping" });
                                    setTimeout(() => { client.pingsLost = 0; send({ id: client.id++, type: "ping" }); client.reply = true; ping(); }, 10e3);
                                    break;
                                case "result": // sudo callback for set state via ws
                                    //  if (buf.id == tt2) log("ws result delay was: " + (Date.now() - tt))
                                    // log("result: " + JSON.stringify(buf));
                                    // 
                                    //  let delay = ha.perf(0);
                                    //     log("ws delay was: " + delay, 0, 0)
                                    break;
                                case "event":
                                    switch (buf.event.event_type) {
                                        case "state_changed":
                                            if (config.legacyAPI == false && state.perf.ha[haNum].wait == true) {
                                                let delay = ha.perf(0);
                                                log("ws delay was: " + delay, 0, 0)
                                            }
                                            let ibuf = undefined;
                                            if (buf.event.data.new_state != undefined                       // filter out corrupted events
                                                && buf.event.data.new_state != null) ibuf = buf.event.data.new_state.state;
                                            let obuf = undefined;
                                            if (logs.ws[haNum][client.logStep] == undefined) logs.ws[haNum].push(buf.event);
                                            else logs.ws[haNum][client.logStep] = buf.event                     // record last 200 ws events for this client into the ws log  
                                            if (client.logStep < 200) client.logStep++; else client.logStep = 0;
                                            //  log("WS received data" + JSON.stringify(buf.event))
                                            for (let x = 0; x < state.client.length; x++) {                    // scan all UDP clients
                                                for (let y = 0; y < state.client[x].ha.length; y++) {          // scan registered HA entities for each client 
                                                    if (state.client[x].ha[y] == buf.event.data.entity_id) {   // if this entity ID matches Client X's Entity Y
                                                        //     log("WS received data for sensor: " + x + " local name: " + state.client[x].ha[y] + " buf name: " + buf.event.data.entity_id + JSON.stringify(buf.event.data.new_state))
                                                        if (ibuf === "on") obuf = true;                     // check if entity is binary
                                                        else if (ibuf === "off") obuf = false;
                                                        else if (ibuf === null || ibuf == undefined) log("HA (" + a.color("white", config.address) + ") is sending bogus (null/undefined) data: " + ibuf, 1, 2);
                                                        else if (ibuf === "unavailable") {                  // only disconnected ESP modules send this code
                                                            if (cfg.telegram.logESPDisconnect == true)           // its annoying, see if enabled 
                                                                log("HA (" + a.color("white", config.address) + "): ESP Module has gone offline: " + buf.event.data.new_state.entity_id + ibuf, 1, 2);
                                                        }
                                                        else if (!isNaN(parseFloat(Number(ibuf))) == true   // check if data is float
                                                            && isFinite(Number(ibuf)) == true && ibuf != null) obuf = ibuf;
                                                        else if (ibuf.length == 32) { obuf = ibuf }         // button entity, its always 32 chars
                                                        else log("HA (" + a.color("white", config.address) + ") is sending bogus data = Entity: "
                                                            + buf.event.data.new_state.entity_id + " Bytes: " + ibuf.length + " data: " + ibuf, 1, 2);
                                                        //   log("ws sensor: " + x + " data: " + buf.event.data.new_state.state + " result: " + ibuf);
                                                        if (obuf != undefined) {                            // send data to relevant clients 
                                                            udp.send(JSON.stringify({ type: "haStateUpdate", obj: { id: y, state: obuf } }), state.client[x].port);
                                                        }
                                                    }
                                                }
                                            }
                                            break;
                                    }
                                    break;
                            }
                        });
                        em.on('send' + haNum, function (data) { send(data) });
                        function send(data) {
                            try { socket.sendUTF(JSON.stringify(data)); }
                            catch (error) { log(error, 1, 3) }
                        }
                        function ping() {
                            if (client.reply == false) {
                                if (client.pingsLost < 2) {
                                    log("websocket (" + a.color("white", config.address) + ") ping never got replied in 10 sec", 1, 3);
                                    client.pingsLost++;
                                }
                                else { socket.close(); haReconnect("ping timeout"); return; }
                            }
                            client.reply = false;
                            client.timeStart = new Date().getMilliseconds();
                            send({ id: client.id++, type: "ping" });
                            setTimeout(() => { ping(); }, 10e3);
                        }
                        function haReconnect(error) {
                            log("websocket (" + a.color("white", config.address) + ") " + error.toString(), 1, 3);
                            ws[haNum].connect("ws://" + config.address + ":" + config.port + "/api/websocket");
                            setTimeout(() => { if (client.reply == false) { haReconnect("retrying..."); } }, 10e3);
                        }
                    });
                }
            },
            perf: function (num) {
                state.perf.ha[num].wait = false;
                let delay = Date.now() - state.perf.ha[num].start;
                if (delay < state.perf.ha[num].best) state.perf.ha[num].best = delay;
                if (delay > state.perf.ha[num].worst) state.perf.ha[num].worst = delay;
                let total = 0;
                if (state.perf.ha[num].last100Pos < 99) {
                    if (state.perf.ha[num].last100[state.perf.ha[num].last100Pos]) state.perf.ha[num].last100[state.perf.ha[num].last100Pos++] = delay;
                    else state.perf.ha[num].last100.push(delay);
                } else {
                    console.log(state.perf.ha);
                    if (state.perf.ha[num].last100[state.perf.ha[num].last100Pos]) state.perf.ha[num].last100[state.perf.ha[num].last100Pos] = delay;
                    else state.perf.ha[num].last100.push(delay);
                    state.perf.ha[num].last100Pos = 0;
                    state.perf.ha[num].worst = 0;
                    state.perf.ha[num].best = 1000;
                }
                state.perf.ha[num].last100.forEach(element => { total += element });
                state.perf.ha[num].average = Math.floor(total / state.perf.ha[num].last100.length);
                return delay;
            }
        },
        sys = {
            udp: function (data, info) {
                let buf, port = info.port, id = undefined,
                    haNum = undefined;
                try { buf = JSON.parse(data); }
                catch (error) { log("A UDP client (" + info.address + ") is sending invalid JSON data: " + error, 3, 3); return; }
                // console.log(buf)
                checkUDPreg();
                switch (buf.type) {
                    case "heartBeat": state.client[id].heartBeat = true; break; // start heartbeat 
                    case "udpFetch":
                        log("incoming UDP Fetch request from client: " + state.client[id].name, 3, 0);
                        for (let x = 0; x < state.client.length; x++) {
                            for (let y = 0; y < state.udp[x].entity.length; y++) {
                                for (let b = 0; b < state.client[id].udp.length; b++) {
                                    if (state.client[id].udp[b] == state.udp[x].entity[y].name) {
                                        log("sending ESP Device ID: " + b + "  Name:" + state.udp[x].entity[y].name + "  data: " + state.udp[x].entity[y].state, 3, 0);
                                        udp.send(JSON.stringify({ type: "udpState", obj: { id: b, state: state.udp[x].entity[y].state } }), port);
                                    }
                                }
                            }
                        }
                        break;
                    case "udpState":    // incoming state change for UDP duplex client
                        for (let x = 0; x < cfg.udp.devices.length; x++) {
                            //console.log
                            for (let y = 0; y < state.esp[x].entity.length; y++) {
                                if (state.esp[x].entity[y].name == buf.obj.name) {
                                    thread.esp[x].postMessage(
                                        { type: "espSend", obj: { name: buf.obj.name, id: state.esp[x].entity[y].id, state: buf.obj.state } });
                                    break;
                                }
                            }
                        }
                        log("incoming UDP state: " + buf.obj.name + " data: " + buf.obj.state, 3, 0);
                        break;
                    case "udpTele":     // incoming UDP telemetry data from UDP Simplex client

                        break;
                    case "udpRegister": // incoming duplex UDP client registration 

                        break;
                    case "espState":    // incoming state change (ESP)
                        if (cfg.esp.enable == true) {
                            for (let x = 0; x < cfg.esp.devices.length; x++) {
                                //console.log
                                for (let y = 0; y < state.esp[x].entity.length; y++) {
                                    if (state.esp[x].entity[y].name == buf.obj.name) {
                                        thread.esp[x].postMessage(
                                            { type: "espSend", obj: { name: buf.obj.name, id: state.esp[x].entity[y].id, state: buf.obj.state } });
                                        break;
                                    }
                                }
                            }
                        }
                        log("incoming ESP state: " + buf.obj.name + " data: " + buf.obj.state, 3, 0);
                        break;
                    case "espFetch":    // incoming ESP fetch request from TWIT client
                        log("incoming ESP Fetch request from client: " + state.client[id].name, 3, 0);
                        for (let x = 0; x < state.esp.length; x++) {
                            for (let y = 0; y < state.esp[x].entity.length; y++) {
                                for (let b = 0; b < state.client[id].esp.length; b++) {
                                    if (state.client[id].esp[b] == state.esp[x].entity[y].name) {
                                        log("sending ESP Device ID: " + b + "  Name:" + state.esp[x].entity[y].name + "  data: " + state.esp[x].entity[y].state, 3, 0);
                                        udp.send(JSON.stringify({ type: "espState", obj: { id: b, state: state.esp[x].entity[y].state } }), port);
                                    }
                                }
                            }
                        }
                        break;
                    case "haFetch":     // incoming HA fetch request from TWIT client
                        log("Client " + id + " - " + a.color("white", state.client[id].name) + " - requesting fetch", 3, 0);
                        ha.fetch(state.client[id]);
                        break;
                    case "haQuery":     // HA all device list request
                        logs.haInputs = [];
                        for (let x = 0; x < cfg.homeAssistant.length; x++) {
                            logs.haInputs.push([]);
                            log("Client: " + state.client[id].name + " is querying HA (" + a.color("white", cfg.homeAssistant[x].address) + ") entities", 3, 1);
                            hass[x].states.list()
                                .then(dbuf => { dbuf.forEach(element => { logs.haInputs[x].push(element.entity_id) }); })
                                .catch(err => {
                                    console.log("\nCannot connect to HA, IP address or token incorrect");
                                    process.exit();
                                });
                        }
                        udp.send(JSON.stringify({ type: "haQueryReply", obj: logs.haInputs }), port);
                        break;
                    case "haState":     // incoming state change (Home Assistant)
                        let sensor = undefined;
                        let haNum;
                        // console.log(buf)
                        for (let y = 0; y < cfg.homeAssistant.length; y++) {
                            for (let z = 0; z < logs.haInputs[y].length; z++) {
                                if (buf.obj.name == logs.haInputs[y][z]) {
                                    haNum = y;
                                    sensor = false;
                                    break;
                                } else {        // identify HA num even if no match
                                    if (z == logs.haInputs[y].length - 1 && buf.obj.ip == cfg.homeAssistant[y].address) {
                                        haNum = y;
                                        sensor = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (sensor == undefined) {
                            if (buf.obj.unit != undefined && buf.obj.name != undefined) {
                                //      log("sensor name: " + buf.obj.name + "  value: " + buf.obj.state + " unit: " + buf.obj.unit, 0, 0);
                                hass[(buf.obj.haID == undefined) ? 0 : buf.obj.haID].states.update('sensor', "sensor." + buf.obj.name,
                                    { state: buf.obj.state, attributes: { state_class: 'measurement', unit_of_measurement: buf.obj.unit } });
                                return;
                            } else log("received invalid HA State setting: " + JSON.stringify(buf), 3, 3); return;
                        }
                        state.perf.ha[haNum].start = Date.now();
                        state.perf.ha[haNum].wait = true;
                        state.perf.ha[haNum].id = state.ha[haNum].ws.id;
                        let sort = ["input_boolean", "input_button", "switch"];
                        if (buf.obj.unit == undefined) {
                            log("Client: " + state.client[id].name + " is setting HA entity: " + buf.obj.name + " to value: " + buf.obj.state, 3, 0);
                            for (let x = 0; x < sort.length; x++) {
                                if (buf.obj.name) {
                                    if (buf.obj.name.includes(sort[x])) {
                                        if (cfg.homeAssistant[haNum].legacyAPI == false) {
                                            em.emit('send' + haNum, {
                                                "id": state.ha[haNum].ws.id++,
                                                "type": "call_service",
                                                "domain": sort[x],
                                                "service": buf.obj.state == false ? 'turn_off' : 'turn_on',
                                                "target": { "entity_id": buf.obj.name }
                                            })
                                        } else {
                                            hass[haNum].services.call(buf.obj.state == false ? 'turn_off' : 'turn_on', sort[x], { entity_id: buf.obj.name })
                                                .then(dbuf => {
                                                    let delay = ha.perf(haNum);
                                                    log("delay was: " + delay, 0, 0);
                                                });
                                        }
                                        break;
                                    }
                                }
                            }
                            return;
                        }
                        break;
                    case "register":    // incoming registrations
                        state.client[id].name = buf.name;
                        log("client " + id + " - " + a.color("white", buf.name) + " - is initiating new connection", 3, 1);
                        if (buf.obj.ha != undefined && buf.obj.ha.length > 0) {
                            log("client " + id + " - " + a.color("white", buf.name) + " - is registering Home Assistant entities", 3, 1);
                            buf.obj.ha.forEach(element => { state.client[id].ha.push(element) });
                        }
                        if (buf.obj.esp != undefined && buf.obj.esp.length > 0) {
                            buf.obj.esp.forEach(element => {
                                log("client " + id + " - " + a.color("white", buf.name) + " - is registering ESP entity - "
                                    + a.color("green", element), 3, 1);
                                state.client[id].esp.push(element)
                            });
                        }
                        if (buf.obj.udp != undefined && buf.obj.udp.length > 0) {
                            buf.obj.udp.forEach(element => {
                                log("client " + id + " - " + a.color("white", buf.name) + " - is registering UDP entity - "
                                    + a.color("green", element), 3, 1);
                                state.client[id].udp.push(element)
                            });
                        }
                        if (buf.obj.telegram != undefined && buf.obj.telegram == true) {
                            log("client " + id + " - " + a.color("white", buf.name) + " - is registering as telegram agent", 3, 1);
                            state.client[id].telegram = true;
                            // state.telegram.port = info.port;
                        }
                        break;
                    case "coreData":    // incoming sensor state from clients
                        let exist = false;
                        if (buf.obj.register == true) {
                            log("Client : " + state.client[id].name == undefined ? id : state.client[id].name
                                + " is registering for CoreData updates", 3, 1);
                            if (state.client[id].coreData == undefined) state.client[id].coreData = [];
                            if (Array.isArray(buf.obj.name)) {
                                log("Client : " + state.client[id].name == undefined ? id : state.client[id].name
                                    + " is registering CoreData as an array, enumerating", 3, 1);
                                buf.obj.name.forEach(element => { state.client[id].coreData.push(element); });
                            }
                            else state.client[id].coreData.push(buf.obj.name)
                        } else {
                            for (let x = 0; x < state.coreData.length; x++) {
                                if (state.coreData[x].name == buf.obj.name) {
                                    state.coreData[x].data = buf.obj.data;
                                    exist = true;
                                    break;
                                }
                            }
                            if (exist == false) {     // a client is sending sensor data for the first time
                                log("Client: " + (state.client[id].name == undefined ? id : state.client[id].name)
                                    + " - is populating CoreData: " + buf.obj.name, 3, 1);
                                state.coreData.push({ name: buf.obj.name, data: buf.obj.data });
                            }
                            for (let x = 0; x < state.client.length; x++) {
                                if (state.client[x].coreData != undefined) {
                                    for (let y = 0; y < state.client[x].coreData.length; y++) {
                                        if (state.client[x].coreData[y] == buf.obj.name) {
                                            //    log("sending coreData: " + buf.obj.name + "  to client: " + x, 3, 0);
                                            udp.send(JSON.stringify({
                                                type: "coreData",
                                                obj: { name: buf.obj.name, data: buf.obj.data, }
                                            }), state.client[x].port);
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    case "log":         // incoming log messages from UDP clients
                        log(buf.obj.message, buf.obj.mod, buf.obj.level, port);
                        break;
                    case "diag-old":    // incoming UDP client Diag
                        //console.log(buf)
                        // console.log(buf.obj);
                        let diagBuf = { auto: [], ha: [], esp: [], udp: [], coreData: [] };
                        if (buf.obj.state.udp != undefined && buf.obj.state.udp.length > 0)
                            for (let x = 0; x < buf.obj.state.udp.length; x++) {
                                diagBuf.udp.push({ name: state.client[id].udp[x], state: buf.obj.state.udp[x] });
                            }
                        if (buf.obj.state.ha != undefined && buf.obj.state.ha.length > 0)
                            for (let x = 0; x < buf.obj.state.ha.length; x++) {
                                diagBuf.ha.push({ name: state.client[id].ha[x], state: buf.obj.state.ha[x] });
                            }
                        if (buf.obj.state.esp != undefined && buf.obj.state.esp.length > 0)
                            for (let x = 0; x < buf.obj.state.esp.length; x++) {
                                diagBuf.esp.push({ name: state.client[id].esp[x], state: buf.obj.state.esp[x] });
                            }
                        if (buf.obj.state.coreData != undefined && buf.obj.state.coreData.length > 0)
                            for (let x = 0; x < buf.obj.state.coreData.length; x++) {
                                diagBuf.coreData.push(buf.obj.state.coreData[x]);
                            }
                        for (let x = 0; x < buf.obj.state.auto.length; x++) {
                            diagBuf.auto.push(buf.obj.state.auto[x]);
                        }
                        diag[id] = { name: state.client[id].name, ip: state.client[id].ip, state: diagBuf, nv: buf.obj.nv }
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
                function checkUDPreg() {
                    let registered = false;
                    for (let x = 0; x < state.client.length; x++) {
                        if (state.client[x].port == port) {
                            state.client[x].time = time.epochMil;
                            id = x;
                            registered = true;
                            break;
                        }
                    }
                    if (registered == false) {
                        for (let x = 0; x < state.client.length; x++) {
                            //   console.log("udp port for client: " + x + state.client[x].port);
                            if (state.client[x].port == undefined) {
                                log("client " + x + " is being cleared (unpopulated)", 3, 2);
                                state.client[x] = new newClient();
                                id = x;
                                registered = true;
                                break;
                            }
                        }
                        id = state.client.push(new newClient()) - 1;
                        //diag.push([]);
                        if (buf.type == "heartBeat") {
                            log("client " + id + " is unrecognized", 3, 2);
                            udp.send(JSON.stringify({ type: "udpReRegister" }), port);
                        }
                    }
                    function newClient() {
                        this.name = buf.name;
                        this.port = port;
                        this.ip = info.address;
                        this.time = time.epochMil;
                        this.telegram = false;
                        this.ha = [];
                        this.esp = [];
                        this.udp = [];
                    }
                }
            },
            watchDog: function () {
                for (let x = 0; x < state.client.length; x++) {
                    if (state.client[x].heartBeat == true && time.epochMil - state.client[x].time >= 2000) {
                        log("Client: " + state.client[x].name + " has crashed!!", 3, 0);
                        state.client.splice(x, 1);
                        diag.splice(x, 1);
                        log("rescanning HA inputs")
                        for (let x = 0; x < cfg.homeAssistant.length; x++) {  // reset HA Inputs when client restart (crashes)
                            logs.haInputs[x] = [];
                            hass[x].states.list()
                                .then(data => {
                                    data.forEach(element => { logs.haInputs[x].push(element.entity_id) });
                                })
                                .catch(err => { log("fetching failed", 0, 2); });
                        }
                    } else if (time.epochMil - state.client[x].time >= 10000) {
                        log("removing stale client id: " + x, 3);
                        state.client.splice(x, 1);
                    }
                }
            },
            ipc: function (data) {      // Incoming inter process communication 
                //  console.log(data.type)
                switch (data.type) {
                    case "esp":
                        switch (data.class) {
                            case "init":
                                if (~state.esp[data.esp].boot) {
                                    log("initializing esp worker: " + data.esp, 0, 1);
                                    state.esp[data.esp].boot = true;
                                }
                                state.esp[data.esp].entities = data.entities;
                                break;
                            case "entity":
                                state.esp[data.esp].entity[data.obj.io] = { id: data.obj.id, name: data.obj.name, type: data.obj.type, state: undefined };
                                //   console.log(state.esp[data.esp])
                                break;
                            case "reset":
                                log("resetting esp entity array for ESP: " + data.esp, 0, 1);
                                if (state.esp[data.esp] != undefined) state.esp[data.esp].entity = [];
                                break;
                            case "state":
                                //   console.log("incoming state change: ", state.esp[data.esp].entity[data.obj.io]);
                                state.esp[data.esp].entity[data.obj.io].state = data.obj.state;   // store the state locally 
                                state.esp[data.esp].entity[data.obj.io].update = time.stamp;
                                for (let a = 0; a < state.client.length; a++) {        // scan all the UDP clients and find which one cares about this entity
                                    for (let b = 0; b < state.client[a].esp.length; b++) {                 // scan each UDP clients registered ESP entity list
                                        if (state.client[a].esp[b] == state.esp[data.esp].entity[data.obj.io].name) {     // if there's a match, send UDP client the data
                                            udp.send(JSON.stringify({ type: "espState", obj: { id: b, state: data.obj.state } }), state.client[a].port);
                                            //    console.log("UDP Client: " + a + " esp: " + b + " state: ", data.obj.state);
                                            break;
                                        }
                                    }
                                }
                                break;
                        }
                        break;
                    case "log": log(data.obj[0], data.obj[1], data.obj[2]); break;
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
                        break;
                    case 1:     // read nv.json file
                        sys.boot(2);  // core does not use nv data, bypassed
                        return;
                        console.log("Loading non-volatile data...");
                        fs.readFile(workingDir + "/nv.json", function (err, data) {
                            if (err) {
                                console.log("\x1b[33;1mNon-Volatile Storage does not exist\x1b[37;m"
                                    + "\nnv.json file should be in same folder as core.js file");
                                nv = { telegram: [] };
                                sys.boot(2);
                            }
                            else { nv = JSON.parse(data); }
                        });
                        break;
                    case 2:     // state init and load modules
                        sys.lib();
                        sys.init();
                        log("initializing system states done");
                        log("checking args");
                        sys.checkArgs();
                        log("actual working directory: " + workingDir);
                        if (cfg.esp != undefined && cfg.esp.devices != undefined && cfg.esp.devices.length > 0 && cfg.esp.enable == true) { // load worker threads
                            cfg.esp.devices.forEach((_, x) => { newWorker(x, true); });
                            function newWorker(x, boot) {
                                if (boot) log("initialing ESP thread: " + x);
                                else log("re-initialing crashed ESP thread: " + x);
                                thread.esp[x] = (new Worker(__filename, { workerData: { esp: x } }));
                                thread.esp[x].on('message', (data) => sys.ipc(data));
                                thread.esp[x].on('error', (error) => { log("ESP worker: " + x + " crashed", 0, 3); console.log(error); newWorker(x); });
                                //  thread.esp[x].on('exit', (code) => { log("ESP worker: " + x + " exited", 0, 3); newWorker(x); });
                                thread.esp[x].postMessage({ type: "config", obj: cfg });
                            }
                        }
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
                                    hass[x].states.list()
                                        .then(data => {
                                            data.forEach(element => { logs.haInputs[x].push(element.entity_id) });
                                            if (cfg.homeAssistant.length - 1 == x) response.send(logs.haInputs);
                                        })
                                        .catch(err => { log("fetching failed", 0, 2); });
                                }
                            });
                            express.get("/client/:name", async function (request, response) {
                                const clientName = request.params.name;  // Extract client name from the URL
                                const client = state.client.find(c => c.name === clientName);  // Find the client by name
                                if (!client) return response.status(404).send({ error: `Client with name "${clientName}" not found` });
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
                                            resolve({ client: client.name, state: buf.obj.state, nv: buf.obj.nv });
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
                                log(a.color("red", "Telegram API Token is invalid", 3));
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
                    case 3:     // connect to Home Assistant
                        if (cfg.homeAssistant) {
                            for (let x = 0; x < cfg.homeAssistant.length; x++) {
                                if (cfg.homeAssistant[x].enable == true) {
                                    haconnect();
                                    log("Legacy API - connecting to " + a.color("white", cfg.homeAssistant[x].address), 1);
                                    function haconnect() {
                                        hass[x].status()
                                            .then(data => {
                                                log("Legacy API (" + a.color("white", cfg.homeAssistant[x].address) + ") service: " + a.color("green", data.message), 1);
                                                log("Legacy API (" + a.color("white", cfg.homeAssistant[x].address) + ") fetching available inputs", 1);
                                                hass[x].states.list()
                                                    .then(data => {
                                                        if (data.includes("401: Unauthorized"))
                                                            log("Legacy API (" + a.color("white", cfg.homeAssistant[x].address) + ") Connection failed:" + data, 1, 3)
                                                        else {
                                                            data.forEach(element => { logs.haInputs[x].push(element.entity_id) });
                                                            if (x == cfg.homeAssistant.length - 1) {
                                                                if (state.ha[x].errorStart == true) {
                                                                    log("Legacy API has starting error - delaying UDP connections for 30 seconds...");
                                                                    setTimeout(() => sys.boot(4), 30e3);
                                                                }
                                                                else sys.boot(4);
                                                            }
                                                        }
                                                    })
                                                    .catch(err => {
                                                        log(err, 1, 2);
                                                        log("Legacy API - connection to (" + a.color("white", cfg.homeAssistant[x].address) + ") failed, retrying in 10 seconds", 3);
                                                        setTimeout(() => {
                                                            haconnect();
                                                        }, 10e3);
                                                    });
                                            })
                                            .catch(err => {
                                                setTimeout(() => {
                                                    log("Legacy API (" + a.color("white", cfg.homeAssistant[x].address) + ") service: Connection failed, retrying....", 1, 2)
                                                    state.ha[x].errorStart = true;
                                                    haconnect();
                                                }, 10e3);
                                                log(err, 1, 2);
                                            });
                                    }
                                } else if (x == cfg.homeAssistant.length - 1) sys.boot(4);
                            }
                        } else sys.boot(4);
                        break;
                    case 4:     // start system timer - starts when initial HA Fetch completes
                        udp.on('listening', () => { log("starting UDP Server - Interface: 127.0.0.1 Port: 65432"); });
                        udp.on('error', (err) => { console.error(`udp server error:\n${err.stack}`); udp.close(); });
                        udp.on('message', (msg, info) => { sys.udp(msg, info); });
                        udp.bind(65432, "127.0.0.1");
                        log("stating websocket service...");
                        if (cfg.homeAssistant != undefined) ha.ws();
                        setInterval(() => { sys.watchDog(); }, 1e3);
                        setTimeout(() => log("TW Core just went online", 0, 2), 20e3);
                        break;
                }
            },
            init: function () { // initialize system volatile memory
                state = { client: [], udp: [], ha: [], esp: [], perf: { ha: [] }, coreData: [] };
                diag = [];      // array for each UDP client diag
                ws = [];
                hass = [];
                logs = { step: 0, sys: [], ws: [], tg: [], tgStep: 0, haInputs: [], esp: [] };
                if (cfg.homeAssistant) {
                    for (let x = 0; x < cfg.homeAssistant.length; x++) {
                        logs.ws.push([]);
                        logs.haInputs.push([]);
                        state.ha.push({ ws: {}, errorStart: false });
                        ws.push(new WebSocketClient());
                        hass.push(new HomeAssistant({
                            host: "http://" + cfg.homeAssistant[x].address,
                            port: cfg.homeAssistant[x].port,
                            token: cfg.homeAssistant[x].token,
                            ignoreCert: true
                        }));
                        state.ha[x].ws =
                        {
                            timeout: null, // used for esp reset 
                            logStep: 0,
                            error: false,
                            id: 1,
                            reply: true,
                            pingsLost: 0,
                            timeStart: 0,
                        };
                        state.perf.ha.push(
                            {
                                best: 1000,
                                worst: 0,
                                average: 0,
                                id: 0,
                                start: 0,
                                wait: false,
                                last100Pos: 0,
                                last100: [],
                            }
                        );
                    };
                }
                if (cfg.esp != undefined)
                    cfg.esp.devices.forEach((_, x) => { state.esp.push({ entity: [], boot: false }); })
                state.telegram = { started: false };
            },
            lib: function () {
                util = require('util');
                exec = require('child_process').exec;
                execSync = require('child_process').execSync;
                if (cfg.webDiag == true) {
                    expressLib = require("express");
                    express = expressLib();
                }
                if (cfg.homeAssistant != undefined) {
                    HomeAssistant = require('homeassistant');
                    WebSocketClient = require('websocket').client;
                }
                events = require('events');
                em = new events.EventEmitter();
                udpServer = require('dgram');
                udp = udpServer.createSocket('udp4');
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
                            case 'white': c = 7; break;
                        }
                        if (input === true) return '\x1b[3' + c + bold;     // begin color without end
                        if (input === false) return '\x1b[37;m';            // end color
                        vbuf = op + '\x1b[3' + c + bold + input + '\x1b[37;m';
                        return vbuf;
                    }
                };
                file = {
                    write: {
                        nv: function () {  // write non-volatile memory to the disk
                            log("writing NV data...")
                            fs.writeFile(workingDir + "/nv-bak.json", JSON.stringify(nv), function () {
                                fs.copyFile(workingDir + "/nv-bak.json", workingDir + "/nv.json", (err) => {
                                    if (err) throw err;
                                });
                            });
                        }
                    },
                };
                log = function (message, mod, level, port) {      // add a new case with the name of your automation function
                    let
                        buf = time.stamp, cbuf = buf + "\x1b[3", lbuf = "", mbuf = "", ubuf = buf + "\x1b[3";
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
                            if (mod != undefined) ubuf += a.color("green", mod) + " | ";
                            else mbuf += " system | ";
                            break;
                    }
                    buf += mbuf + message;
                    cbuf += mbuf + message;
                    ubuf += mbuf + message;
                    if (logs.sys[logs.step] == undefined) logs.sys.push(buf);
                    else logs.sys[logs.step] = buf;
                    if (logs.step < 500) logs.step++; else logs.step = 0;
                    if (cfg.telegram != undefined && cfg.telegram.enable == true && state.telegram.started == true) {
                        if (level >= cfg.telegram.logLevel
                            || level == 0 && cfg.telegram.logDebug == true) {
                            try {
                                for (let x = 0; x < cfg.telegram.users.length; x++) {
                                    if (cfg.telegram.logESPDisconnect == false) {
                                        if (!message.includes("ESP module went offline, resetting ESP system:")
                                            && !message.includes("ESP module is reconnected: ")
                                            && !message.includes("ESP Module has gone offline: ")) {
                                            bot.sendMessage(cfg.telegram.users[x], buf).catch(error => { log("telegram sending error") })
                                        }
                                    } else bot.sendMessage(cfg.telegram.users[x], buf).catch(error => { log("telegram sending error") })
                                }
                            } catch (error) { console.log(error, "\nmessage: " + message + "  - Mod: " + mod) }
                        }
                    }
                    if (port != undefined) {
                        console.log(ubuf);
                        udp.send(JSON.stringify({ type: "log", obj: ubuf }), port);
                    } else if (level == 0 && cfg.debugging == true) console.log(cbuf);
                    else if (level != 0) console.log(cbuf);
                    return buf;
                };
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
            },
            checkArgs: function () {
                let journal = false;
                if (process.argv[3] == "-j") journal = true;
                if (process.argv[2] == "-i") {
                    log("installing ThingWerks-Core service...");
                    let exec = "ExecStart=nodemon " + workingDir + "core.js -w " + workingDir + "core.js -w " + workingDir + "config.json --exitcrash --delay 5";
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
                    // execSync("mkdir /apps/ha -p");
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
    thread = { esp: [] };
    sys.boot(0);
}
if (!isMainThread) {
    if (workerData.esp != undefined) {
        let sys = {
            init: function () {
                cfg = {};
                client = null;
                state = { entity: [], reconnect: false, boot: false, errorResetTimeout: null };
                sys.lib();
            },
            lib: function () {
                events = require('events');
                em = new events.EventEmitter();
                require('events').EventEmitter.defaultMaxListeners = 50;
                a = {
                    color: function (color, input, ...option) {   //  ascii color function for terminal colors
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
                };
            }
        }
        const { Client } = require('@2colors/esphome-native-api');
        sys.init();
        function espInit() {
            client = new Client({
                host: cfg.esp.devices[workerData.esp].ip,
                port: 6053,
                encryptionKey: cfg.esp.devices[workerData.esp].key,
                reconnect: true,
                reconnectInterval: 5000,
                pingInterval: 3000,
                pingAttempts: 3,
                tryReconnect: true,
            });
            try { clientConnect(); } catch (error) { log(error) };
        }
        function espReset() {
            try { client.disconnect(); } catch (error) { log("ESP disconnect failed...", 2); }
            setTimeout(() => {
                em.removeAllListeners();
                client = null;
                setTimeout(() => { espInit(); }, 5e3);
            }, 10e3);
        }
        function clientConnect() {
            if (state.reconnect == false) {
                log("trying to connect to esp module: " + a.color("white", cfg.esp.devices[workerData.esp].ip), 2);       // client connection function, ran for each ESP device
            }
            client.on('error', (error) => {
                if (state.reconnect == false) {
                    log("ESP module had a connection error, resetting ESP connection: "
                        + a.color("white", cfg.esp.devices[workerData.esp].ip), 2, (cfg.telegram.logESPDisconnect) ? 2 : 0);
                    state.reconnect = true;
                    espReset();
                }
            });
            client.on('disconnected', () => {
                if (state.reconnect == false) {
                    log("ESP module disconnected, resetting ESP connection: "
                        + a.color("white", cfg.esp.devices[workerData.esp].ip), 2, (cfg.telegram.logESPDisconnect) ? 2 : 0);
                    espReset();
                    state.reconnect = true;
                }
            });
            client.on('newEntity', data => {
                let exist = 0, io = null;
                for (let x = 0; x < state.entity.length; x++)         // scan for this entity in the entity list
                    if (state.entity[x].id == data.id) { exist++; io = x; break; };
                if (exist == 0)                                                 // dont add this entity if its already in the list 
                    io = state.entity.push({ name: data.config.objectId, type: data.type, id: data.id }) - 1;
                if (state.boot == false)
                    log("new entity - connected - ID: " + data.id + " - " + a.color("green", data.config.objectId), 2);
                parentPort.postMessage({ type: "esp", class: "entity", esp: workerData.esp, obj: { id: data.id, io, name: data.config.objectId, type: data.type } });
                if (data.type === "Switch") {                                 // if this is a switch, register the emitter
                    em.on(data.config.objectId, function (id, state) {        // emitter for this connection 
                        try { data.connection.switchCommandService({ key: id, state: state }); }
                        catch (e) { log("error sending command to ESP - resetting...", 2, 3); espReset(); } // reset() was removed from here
                    });
                }
                data.on('state', (update) => {
                    if (state.reconnect == true) {
                        if (cfg.telegram.logESPDisconnect == true) {
                            log("ESP Module reconnected: " + a.color("white", cfg.esp.devices[workerData.esp].ip) + " - "
                                + a.color("green", data.config.objectId) + " - Signal: " + update.state, 2, 2);
                        } else {
                            log("ESP Module reconnected: " + a.color("white", cfg.esp.devices[workerData.esp].ip) + " - "
                                + a.color("green", data.config.objectId) + " - Signal: " + update.state, 2, 1);
                        }
                        state.reconnect = false;
                    }
                    if (state.boot == false) {
                        if (data.config.objectId.includes("wifi"))
                            log("ESP Module connected: " + a.color("white", cfg.esp.devices[workerData.esp].ip) + " - "
                                + a.color("green", data.config.objectId) + " - Signal: " + update.state, 2, 1);
                        setTimeout(() => { state.boot = true; }, 20);  // indicate booted so not to show entity names again
                    }
                    for (let x = 0; x < state.entity.length; x++) {
                        if (state.entity[x].id == update.key) {          // identify this entity request with local object
                            parentPort.postMessage({ type: "esp", class: "state", esp: workerData.esp, obj: { io: x, name: data.config.objectId, state: update.state } });
                        }
                    }
                });
            });
            try { client.connect(); } catch (error) { log("client connect error: " + error) };
        }
        parentPort.on('message', (data) => {
            switch (data.type) {
                case "config":
                    cfg = data.obj;
                    log("ESP connections initiating...", 2);
                    espInit();
                    break;
                case "espSend":
                    em.emit(data.obj.name, data.obj.id, data.obj.state);
                    break;
            }
        });
        function log(...buf) { parentPort.postMessage({ type: "log", obj: { ...buf } }); }
    }
}
