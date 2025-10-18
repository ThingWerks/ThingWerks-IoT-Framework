{
    "webDiag": true,
    "webDiagPort": 20000,
    "logging": {
        "debug": false,
        "client": false,
        "clientCrash": true
    },
    "homeAssistant": [
        {
            "enable": true,
            "legacyAPI": false,
            "address": "10.21.0.1",
            "port": 8123,
            "token": "-------------"
        },
        {
            "enable": true,
            "legacyAPI": false,
            "address": "10.21.0.3",
            "port": 8123,
            "token": "------------"
        }
    ],
    "telegram": {
        "enable": false,
        "logLevel": 2,
        "logESPDisconnect": true,
        "token": "------:-------",
        "users": [
            6176063468
        ]
    },
    "rocket": {
        "enable": true,
        "server": "10.21.0.1",
        "port": 3000,
        "user": "----------",
        "token": "------------",
        "channel": "TWIT-Mambaroto"
    },
    "esp": {
        "enable": true,
        "max_devices_per_thread": 10,
        "devices": {
            "Solar": {
                "ip": "10.21.0.32",
                "key": "----------="
            },
            "Solar2": {
                "ip": "10.21.0.34",
                "key": "-------------="
            },
            "Pump": {
                "ip": "10.21.0.40",
                "key": "--------------="
            },
            "Solar-Ram": {
                "ip": "10.21.0.41",
                "key": "--------------="
            }
        }
    }
}
