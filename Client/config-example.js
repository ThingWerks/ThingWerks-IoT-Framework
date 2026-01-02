module.exports = {
    entity: {
        subscribe: [
            // "input_boolean.test",
            //  "sunlight",
            //  "wifi_signal",
            "test-local-sensor",
            "lth-relay2",
            "Lights Outside Bedroom",
            "input_boolean.test_house",
        ],
        create: [
            "test-local-sensor",
            //  "test-local-sensor2",
        ],
        sync: {},
        heartbeat: [],
    },
    config: {
        // create an object using exactly the names used for each automation listed in your automation file
        // "---automation name here----": {    }
    }
}
