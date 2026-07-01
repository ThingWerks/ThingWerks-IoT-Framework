module.exports = {
    framework: (_name) => {
        return {
            state: _state[_name] ?? undefined,
            config: _config[_name] ?? undefined,
            nv: _nv[_name] ?? undefined,
            push: _push[_name] ||= {},
            log: (m, l) => slog(m, l, _name),
            write: () => file.write(_name, "nv"),
            send: (name, s, u, a) => com.core("state", { name, state: s, unit: u, address: a }, _name),
            tool: {
                debounce: Object.assign((key, delay, callback) => {
                    let registry, gate;
                    if (_name && global._state[_name]) {
                        registry = global._state[_name]._debounce ||= {};
                        gate = registry[key] ||= { active: false, start: 0 };

                        const now = time.epoch;
                        // Check if 'now' is 13 digits or longer (1 trillion or higher)
                        const isMillis = now >= 1e12;

                        // If system is using milliseconds, multiply seconds-delay by 1000
                        const adjustedDelay = isMillis ? (delay * 1000) : delay;

                        if (!gate.active) {
                            gate.start = now;
                            gate.active = true;
                        } else if (now - gate.start >= adjustedDelay) {
                            callback();
                            gate.active = false;
                        }
                    }
                }, {
                    reset: (key) => {
                        if (global._state[_name]._debounce?.[key]) global._state[_name]._debounce[key].active = false;
                    }
                }),
                round: function (x, precision) { return Math.round(x * precision) / precision },
            }
        }
    }
}
