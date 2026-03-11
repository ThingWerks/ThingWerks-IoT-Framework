module.exports = {
    framework: (_name) => {
        return {
            state: state[_name] ?? undefined,
            config: config[_name] ?? undefined,
            nv: nv[_name] ?? undefined,
            push: push[_name] ||= {},
            log: (m, l) => slog(m, l, _name),
            write: () => file.write(_name, "nv"),
            send: (name, s, u, a) => com.core("state", { name, state: s, unit: u, address: a }, _name),
            tool: {
                debounce: Object.assign((key, delay, callback) => {
                    // console.log("checking debounce: " + key);
                    let registry, gate;
                    if (_name && global.state[_name]) {
                        registry = global.state[_name]._debounce ||= {};
                        gate = registry[key] ||= { active: false, start: 0 };
                        if (!gate.active) {
                            gate.start = Date.now() / 1000; // time.epoch
                            gate.active = true;
                        } else if (Date.now() / 1000 - gate.start >= delay) {
                            callback();
                            gate.active = false;
                        }
                    }
                }, {
                    reset: (key) => {
                        // console.log("resetting debounce: " + key);
                        if (global.state[_name]._debounce?.[key]) global.state[_name]._debounce[key].active = false;
                    }
                }),
                round: function (x, precision) { return Math.round(x * precision) / precision },
            }
        }
    }
}
