bot = function (id, data, obj) {
    core(JSON.stringify({ type: "telegram", obj: { class: "send", id, data, obj } }), 65432, '127.0.0.1');
};
slog = function (message, level, system) {
    if (level == undefined) level = 1;
    if (!system) core("log", { message: message, mod: (moduleName + "-Client"), level: level });
    else core("log", { message: message, mod: system, level: level });
};
writeNV = function (name) {  // write non-volatile memory to the disk
    let lname = name.toLocaleLowerCase();
    timer.fileWriteLast ||= time.epoch;
    clearTimeout(timer.fileWrite);
    if (time.epoch - timer.fileWriteLast > 9) writeFile();
    else timer.fileWrite = setTimeout(() => { writeFile(); }, 10e3);
    function writeFile() {
        // slog("writing NV data...");
        timer.fileWriteLast = time.epoch;
        fs.writeFile(workingDir + "/nv-" + lname + "-bak.json", JSON.stringify(nv[name], null, 2), function () {
            fs.copyFile(workingDir + "/nv-" + lname + "-bak.json", workingDir + "/nv-" + lname + ".json", (err) => {
                if (err) throw err;
            });
        });
    }
}
core = function (type, data, auto) {
    if (type == "state") {
        if (data.unit == "owner") {
            entity[data.name] ||= {};
            entity[data.name].update = time.epochMil;
            entity[data.name].stamp = time.stamp;
            entity[data.name].state = data.state;
            entityLocal[data?.name]?.names?.forEach((element) => {
                if (auto != element)
                    try { automation[element](element, { name: data.name, state: data.state }); } catch { }
            });
            let names = entityLocal[data?.name]?.names;
            if (names)
                for (let x = 0; x < names.length; x++) {
                    // console.log("sending entity: " + buf.data.name + " - with state: " + buf.data.state + " - to automation: " + names[x])
                    if (names[x] == "sync") {
                        //  console.log("sate update for: " + buf.data.name, entityLocal[buf.data.name])
                        for (let y = 0; y < entityLocal[data.name].sync.length; y++) {
                            let partner = entityLocal[data.name].sync[y]
                            if (!(partner in entity)) {
                                slog("syncing entity: " + data.name + " - but partner: " + partner + " DOES NOT EXIST", 3);
                            } else if (entity[data.name]?.state != entity[partner]?.state) {
                                slog("syncing entity: " + data.name + " - with partner: " + partner + " - state: " + data.state, 0);
                                core("state", { name: partner, state: data.state });
                            }
                        }
                    }
                }
        }
    }
    udp.send(JSON.stringify({ name: moduleName, type, data, auto }), 65432, '127.0.0.1');
}
com = function () {
    udp.on('message', function (data, info) {
        let buf = JSON.parse(data);
        //  console.log(buf);
        switch (buf.type) {
            case "state":       // incoming state change (from HA websocket service)
                slog("receiving state update, entity: " + buf.data.name + " value: " + buf.data.state, 0);
                entity[buf.data.name] ||= {};
                entity[buf.data.name].update = time.epochMil;
                entity[buf.data.name].stamp = time.stamp;
                entity[buf.data.name].state = buf.data.state;
                if (online == true) {
                    if (!(buf.data.name in entityLocal)) {
                        slog("entity: " + buf.data.name + " - is not referenced locally - pruning");
                        core("prune", buf.data.name);
                        return;
                    }
                    let names = entityLocal[buf.data.name]?.names;
                    for (let x = 0; x < names.length; x++) {
                        // console.log("sending entity: " + buf.data.name + " - with state: " + buf.data.state + " - to automation: " + names[x])
                        if (names[x] == "sync") {
                            //  console.log("sate update for: " + buf.data.name, entityLocal[buf.data.name])
                            for (let y = 0; y < entityLocal[buf.data.name].sync.length; y++) {
                                let partner = entityLocal[buf.data.name].sync[y]
                                if (!(partner in entity)) {
                                    slog("syncing entity: " + buf.data.name + " - but partner: " + partner + " DOES NOT EXIST", 3);
                                } else if (entity[buf.data.name]?.state != entity[partner]?.state) {
                                    slog("syncing entity: " + buf.data.name + " - with partner: " + partner + " - state: " + buf.data.state, 0);
                                    core("state", { name: partner, state: buf.data.state });
                                }
                            }
                        } else try { automation[names[x]](names[x], { name: buf.data.name, state: buf.data.state }); }
                        catch (e) { console.trace(e); }
                    }
                }
                break;
            case "fetchReply":        // Incoming HA Fetch result
                slog("received fetch reply");
                if (online == false) sys.boot(3);
                break;
            case "reRegister":          // reregister request from server
                if (online == true) {
                    slog("server lost sync, reregistering...");
                    setTimeout(() => { register(); }, 500);
                }
                break;
            case "proceed":
                if (online == false) setTimeout(() => { sys.boot(2); }, 1e3);
                else slog("reregisterion successful");
                break;
            case "diag":                // incoming diag refresh request, then reply object
                function safeStringify(obj) {
                    const seen = new WeakSet();
                    return JSON.stringify(obj, (key, value) => {
                        // ... (Your circular/timeout logic remains the same)
                        if (typeof value === "object" && value !== null) {
                            if (seen.has(value)) return "[Circular]";
                            seen.add(value);
                            if (value._idleNext !== undefined && value._idlePrev !== undefined) {
                                return "[Timeout]";
                            }
                        }
                        return value;
                    }, null); // <-- Use null or omit the argument to remove formatting
                }
                udp.send(safeStringify({ type: "diag", clientName: moduleName, state, nv, config, entityLocal, entity }), 65432, '127.0.0.1');
                // console.log(state)
                //core(JSON.stringify({ type: "diag", obj: { state, nv: nv, config } }), 65432, '127.0.0.1');
                break;
            case "telegram":
                // console.log("receiving telegram message: " + buf.data);
                switch (buf.data.class) {
                    case "agent":
                        user.telegram.agent(buf.data.data);
                        break;
                    case "callback":
                        user.telegram.callback(buf.data.data);
                        break;
                }
                break;
            case "log": console.log(buf.data); break;
        }
    });
}
register = function (update) {/////no update?
    slog("trying to register with TWIT Core");
    let obj = { entities: entityLocal ?? undefined, telegram: config.telegram ? true : false };

    core((update ? "registerUpdate" : "register"), obj);
    if (config.telegram) {
        if (!nv.telegram) nv.telegram ||= [];
        else for (let x = 0; x < nv.telegram.length; x++)
            core("telegram", { class: "sub", id: nv.telegram[x].id });
    }
}
fetch = function () {
    // register(true);
    state.cache = {};
    if (entityLocal) core("fetch");
    // if (config.esp?.subscribe) core(JSON.stringify({ type: "espFetch" }), 65432, '127.0.0.1');
}
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
    state.args = execStartArgs.join(" ");
    console.log("starting arguments: " + state.args)
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
                console.log(color("yellow", "installing TWIT-Client-" + moduleName + " service..."));
                if (map["-j"]) {
                    console.log("Extra function triggered because -j was provided:", map["-j"]);
                    process.exit();
                }
                const execStartCommand = `nodemon "${workingDir}client.js" -w "${workingDir}client.js" --exitcrash ${state.args}`;
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
                console.log(color("yellow", "uninstalling TWIT-Client-" + moduleName + " service..."));
                try { execSync("systemctl stop twit-client-" + moduleName); } catch { }
                try { execSync("systemctl disable twit-client-" + moduleName + ".service"); } catch { }
                try { fs.unlinkSync("/etc/systemd/system/twit-client-" + moduleName + ".service"); } catch { }
                execSync("systemctl daemon-reload");
                console.log("TWIT-Client-" + moduleName + " service uninstalled");
                process.exit();
            case "-a":
                try { moduleName ||= moduleName } catch {
                    console.log(color("red", "you must specify a module name with -n"));
                    process.exit();
                }
                const automationFile = value;
                let configPath = null;
                let internal = true;
                if (args[i + 2] === "-c" && args[i + 3]) {
                    const configFile = args[i + 3];
                    configPath = path.resolve(configFile);
                    auto.loadConfig(configPath);
                    internal = false;
                    i += 2;
                }
                auto.load(automationFile, internal);
                auto.watcher(automationFile, auto.reload, internal);
                i++;
                break;
            default:
                if (option.startsWith("-")) {
                    console.log(`Unknown or unhandled flag: ${option}`, 3);
                }
                break;
        }
    }
}
auto = {
    call: function (data) {
        for (const name in automation) {
            //   if (name in entityLocal[data.name].names)
            try { automation[name](name, data); } catch (e) { console.trace(e); }
        }
    },
    // clear only this module's automation names and the module cache (no global wipe)
    clear: function (modulePath) {
        let automationPath = path.resolve(modulePath);
        let resolvedPath = require.resolve(automationPath);

        // Remove registered automation functions that were recorded for this module
        let prev = auto.module[resolvedPath] || [];
        for (let name of prev) if (automation[name]) delete automation[name];

        // remove bookkeeping for this module
        delete auto.module[resolvedPath];

        // remove Node's module cache so next require() loads fresh code
        if (require.cache[resolvedPath]) delete require.cache[resolvedPath];
    },
    loadEntities: function (configData, fileName, names) { // acting for both internal and external config 
        if (configData.entities) {
            configData.entities.forEach(entity => {
                entityLocal[entity] ||= { names: [] };
                names.forEach(name => {
                    if (!entityLocal[entity].names.includes(name)) {
                        entityLocal[entity].names.push(name);
                    }
                });
            });
            let hasConfigs = 0;
            configData.config?.forIn((name, value) => { if (value) hasConfigs++; })
            if (hasConfigs == 0) {
                console.log("no automation config entities exist - running top level entities prune");
                names.forEach(name => { pruneForFile(name); });
            }
        }
        for (const name in configData.config) {
            if (configData.config[name]?.entities) {
                configData.config[name].entities.forEach(entity => {
                    entityLocal[entity] ||= { names: [] };
                    if (!entityLocal[entity].names.includes(name)) {
                        entityLocal[entity].names.push(name);
                    }
                });
            }
            // now that both top-level and per-config entities for `name` are processed,
            // prune using the union-aware function:
            pruneForFile(name);
        }

        // console.log(entityLocal)
        // --- after you've populated entityLocal from top-level and per-config lists ---
        // Helper: prune for a single fileName using the union of top-level + per-config entities
        function pruneForFile(fileName) {
            const keysToFullyDelete = [];
            // top-level entities from the file being processed (may be undefined)
            const topEntities = Array.isArray(configData.entities) ? configData.entities : [];
            // per-config (e.g. configData.config[name]) entities for this fileName (may be undefined)
            const perEntities = Array.isArray(configData.config?.[fileName]?.entities)
                ? configData.config[fileName].entities
                : [];

            for (const entity of Object.keys(entityLocal)) {
                const nameList = entityLocal[entity].names || [];
                if (!nameList.includes(fileName)) continue;

                // if entity is present in EITHER the top-level entities list OR the file-specific entities list,
                // then it still belongs to that file and should NOT be pruned.
               // console.log("entity local: ", entity, " - entity config: ", topEntities[entity])
                const stillPresent = topEntities.includes(entity) || perEntities.includes(entity);
                if (stillPresent) continue;

                // not present anywhere for this file -> remove the fileName from the names array
                const idx = nameList.indexOf(fileName);
                if (idx !== -1) nameList.splice(idx, 1);

                if (nameList.length === 0) {
                    console.log(`found orphaned entity: ${entity} (last automation, scheduling for full delete)`);
                    keysToFullyDelete.push(entity);
                } else {
                    console.log(`found orphaned entity: ${entity} (removed ${fileName}, still used by others)`);
                }
            }

            keysToFullyDelete.forEach(e => { delete entityLocal[e]; });
        }

        // console.log(config)
        configData.sync?.forEach(sync => {
            console.log("sync group - loading - ", sync);
            // 1. Process all new/existing sync relationships (Creation and Partner Pruning)
            sync.forEach(member => {
                console.log("sync group - setting up member: ", member);
                entityLocal[member] ||= { names: [] };
                // PARTNER PRUNING: Reset the sync list to only include current partners.
                entityLocal[member].sync = [];
                // Ensure "sync" is in names
                if (!entityLocal[member].names.includes("sync"))
                    entityLocal[member].names.push("sync");
                // Populate sync partners
                sync.forEach(memberOther => {
                    if (memberOther != member)
                        entityLocal[member].sync.push(memberOther);
                })
            });
        });
        // --------------------------------------------------------------------------------
        // 1.5. NEW FEATURE: Prune "sync" flag if the entity has no remaining partners.
        Object.keys(entityLocal).forEach(entityName => {
            const entity = entityLocal[entityName];
            // Check if the entity has the sync flag AND its partner list is empty
            if (entity.names?.includes("sync") && entity.sync && entity.sync.length === 0) {
                console.log(`sync group - pruning - entity '${entityName}' has no partners remaining. Removing "sync" flag and key.`);
                // Remove "sync" from the names array
                entity.names = entity.names.filter(name => name !== "sync");
                // Delete the sync key (the empty partner list)
                delete entity.sync;
            }
        });
        // --------------------------------------------------------------------------------
        // 2. FEATURE: Cleanup Orphaned Sync Flags/Keys (Removal of Unreferenced Members)
        const activeSyncMembers = new Set();
        // Build a set of ALL entity names referenced in the source configData.sync
        configData.sync?.forEach(syncGroup => {
            syncGroup.forEach(member => {
                activeSyncMembers.add(member);
            });
        });

        // Iterate over ALL entities in entityLocal
        Object.keys(entityLocal).forEach(entityName => {
            const entity = entityLocal[entityName];
            // Check if the entity has a 'sync' flag and is NO LONGER in the source list
            if (entity.names?.includes("sync") && !activeSyncMembers.has(entityName)) {
                console.log(`sync group - cleanup - entity '${entityName}' is orphaned (no references). Removing member.`);
                // Remove "sync" from the names array
                entity.names = entity.names.filter(name => name !== "sync");
                // Delete the sync key (which contains the list of sync partners)
                delete entity.sync;
            }
        });

        //     console.log(configData)
        config.heartbeat ||= {};
        configData.heartbeat ||= {};
        configData?.heartbeat?.forIn((name, value) => {
            if (name in config?.heartbeat) {
                if (config.heartbeat[name]?.internal != value) {
                    console.log("heartbeat - changed - updating timer for: " + name);
                    createTimer(name, value);
                }
            } else {
                console.log("heartbeat - creating " + name);
                createTimer(name, value);
            }
        })
        config.heartbeat?.forIn((name, value) => {

            if (!(name in configData.heartbeat)) {
                console.log("heartbeat - orphaned - removing: " + name);
                clearInterval(config.heartbeat[name]?.timer);
                delete config.heartbeat[name];
            }
        })

        function createTimer(name, value) {
            config.heartbeat[name] = { interval: value, timer: null, state: false };
            member = config.heartbeat[name];
            member.interval = value;
            if (member.timer) clearInterval(member.timer);
            member.timer = setInterval(() => {
                if (!member.state) { core("state", { name, state: true }); member.state = true; }
                else { core("state", { name, state: false }); member.state = false; }
            }, (value));
        }
        console.log("heartbeat - importation finished - members: ", Object.keys(config.heartbeat));

    },
    loadConfig: function (configPath, reload) {
        try {
            const fileExtension = path.extname(configPath).toLowerCase();
            let externalCfg = null;
            if (fileExtension === '.json') {
                externalCfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                console.log(`loading external JSON config from: ${configPath}`);
            } else if (fileExtension === '.js') {
                externalCfg = require(configPath);
                console.log(`loading external JS config from: ${configPath}`);
            } else {
                console.error(`Error: Unsupported config file type "${fileExtension}". Only .json or .js are supported.`);
            }

            const names = Object.keys(externalCfg.config);

            for (const name of names) {
                console.log(`loading external config for automation: ${name}`);
                config[name] = externalCfg.config[name];
                if (reload) automation[name](name, null, "config");
            }
            console.log(`loading entities from external config: ${configPath}`);
            auto.loadEntities(externalCfg, configPath, names);
            auto.watcher(configPath, auto.reloadConfig);
        } catch (error) {
            console.error(`Error loading external config file "${configPath}":`, error.message);
        }
    },
    reloadConfig: function (configPath) {
        delete require.cache[configPath];
        auto.loadConfig(configPath, true);
        slog("updating core/client entity registrations...");
        setTimeout(() => { register(); fetch(); }, 2e3);
    },
    // load a module and register its automations (records which names belong to the file)
    load: function (automationFile, internal) {
        try {
            const automationPath = path.resolve(automationFile);
            const resolvedPath = require.resolve(automationPath);

            // require fresh copy (caller should delete cache if reloading; keeping this
            // here is harmless for first-time loads)
            const clientModule = require(automationPath);

            if (!clientModule.automation) throw new Error("Module does not export an 'automation' object.");

            const names = Object.keys(clientModule.automation);

            if (internal) { // load entities from internal config
                console.log(`loading entities from internal config: ${automationFile}`);
                auto.loadEntities(clientModule, automationFile, names);
            }

            // register each exported automation function under the global 'automation' object
            for (const name of names) {
                let lname = name.toLocaleLowerCase();
                let path = workingDir + "nv-" + lname + ".json";
                if (fs.existsSync(path)) {
                    console.log("found NV data for: " + name + " - loading now...");
                    nv[name] = JSON.parse(fs.readFileSync(path, 'utf8'));
                } else {
                    console.log("found no NV data for: " + name + " - required path: " + path);
                }
                console.log("loading automation -" + name + "- into memory");
                automation[name] = clientModule.automation[name];
            }
            // remember which names belong to this module file
            auto.module[resolvedPath] = names;
            console.log(`Successfully processed automation: ${automationFile}`);
            return clientModule;
        } catch (error) {
            console.error(`Error processing automation file "${automationFile}":`, error.message);
            return null;
        }
    },
    // reload workflow: cleanup previous automations for this file, clear cache, load new file, start new automations
    reload: function (automationFilePath, internal) {
        try {
            const automationPath = path.resolve(automationFilePath);
            const resolvedPath = require.resolve(automationPath);

            // 1) clean up all old automations for this module
            const prevNames = auto.module[resolvedPath] || [];
            for (const name of prevNames) {
                if (automation[name]) {
                    try {
                        // tell automation to clean itself
                        automation[name](name, null, true);
                    } catch (e) {
                        console.error(`Error cleaning automation "${name}"`, e);
                    }
                    // clear any known timers/listeners
                    if (state[name]?.timer) clearInterval(state[name].timer);
                    delete automation[name];            // <-- REMOVE FIRST
                    delete state[name];
                    if (internal) delete config[name];
                }
            }

            // 2) clear module cache and our bookkeeping
            if (require.cache[resolvedPath]) delete require.cache[resolvedPath];
            delete auto.module[resolvedPath];

            // 3) now load the new module and register fresh automations
            const newModuleExports = auto.load(automationFilePath, internal);
            setTimeout(() => { register(); fetch(); }, 2e3);
            // 4) initialise only the new automations
            const newNames = auto.module[resolvedPath] || [];
            for (const name of newNames) {
                if (automation[name]) {
                    try { automation[name](name, "init"); }
                    catch (e) { console.error(`Error starting automation "${name}"`, e); }
                }
            }

            // housekeeping…
            auto.watcher(automationFilePath, auto.reload, internal);

            //  const configPath = auto.paths[automationFilePath];
            //   if (configPath) auto.watcher(configPath, auto.reload);

            console.log(`Successfully reloaded and restarted automation: ${path.parse(automationFilePath).name}`);

            console.log("updating core/client entity registrations...");
            setTimeout(() => { fetch(); }, 2e3);

        } catch (error) {
            console.error(`Failed to reload automation file "${automationFilePath}":`, error.message);
            slog(`Failed to reload automation: ${automationFilePath}. Error: ${error.message}`, 3, "HOT-RELOAD-FAIL");
        }
    },
    // no change here — keep your debounced watcher
    watcher: function (filePath, reloadCallback, internal) {
        console.log("creating watcher for: " + filePath);
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
                    slog(`File change event detected. Reloading ${filePath}...`, 1, 'HOT-RELOAD');
                    reloadCallback(filePath, internal);
                    delete timer[timerKey];
                }, 200);
            }
        });
        fileWatchers[filePath] = watcher;
    }
}
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
}
telegram = {
    sub: function (msg) {
        let buf = { user: msg.from.first_name + " " + msg.from.last_name, id: msg.from.id }
        if (!telegram.auth(msg)) {
            slog("telegram - user just joined the group - " + msg.from.first_name + " " + msg.from.last_name + " ID: " + msg.from.id, 0, 2);
            nv.telegram.push(buf);
            bot(msg.chat.id, 'registered');
            core(JSON.stringify({ type: "telegram", obj: { class: "sub", id: msg.from.id } }), 65432, '127.0.0.1');
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
    buttonMulti: function (msg, auto, array) {
        buf = { reply_markup: { inline_keyboard: [[]] } };
        array.forEach(element => {
            buf.reply_markup.inline_keyboard[0].push({ text: element, callback_data: (auto + element) })
        });
        bot(msg.from.id, buf);
    },
}
sys = {         // ______________________system area, don't need to touch anything below this line__________________________________
    init: function () {
        automation = {};
        auto.module = {}; // map resolvedModulePath -> [automationName, ...]
        nv = {};
        entity = {};
        entityLocal = {};
        config = { heartbeat: {} };
        state = { cache: {}, args: "" };
        push = {};
        heartbeat = { timer: [], state: [] };
        logName = null;
        online = false;
        timer = { fileWriteLast: null, };
        fileWatchers = {};
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
        time.startTime();
        fs = require('fs');
        // events = require('events');
        // em = new events.EventEmitter();
        exec = require('child_process').exec;
        execSync = require('child_process').execSync;
        workingDir = require('path').dirname(require.main.filename) + "/";
        path = require('path');
        scriptName = path.basename(__filename).slice(0, -3);
        udp = require('dgram').createSocket('udp4');
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
        objMerge = function (dest, source) { // object merge, potentially destructive if overlap 
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
        sys.boot(0);
    },
    boot: function (step) {
        switch (step) {
            case 0:
                checkArgs();

                setTimeout(() => { time.sync(); time.boot++; sys.boot(1); }, 1e3);
                break;
            case 1:
                com();
                register();
                bootWait = setInterval(() => {
                    console.log("core registration failed, retrying...");
                    register();
                }, 10e3);
                break;
            case 2:
                clearInterval(bootWait);
                slog("registered with TWIT Core");
                if (entityLocal) {
                    slog("fetching entities from core");
                    core("fetch");
                    bootWait = setInterval(() => {
                        slog("core entity fetch is failing, retrying...", 2);
                        core("fetch");
                    }, 10e3);
                } else sys.boot(4);
                break;
            case 3:
                slog("core fetch complete");
                clearInterval(bootWait);
                online = true;
                for (const name in automation) {
                    slog(name + " automation initializing...");
                }
                auto.call("init");
                fetch();
                setInterval(() => { core("heartbeat"); time.boot++; }, 1e3);
                break;
        }
    },
};
setTimeout(() => { sys.init(); }, 1e3);
