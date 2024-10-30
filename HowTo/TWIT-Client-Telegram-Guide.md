## TWIT Client Telegram Remote Control Guide
### Setup
- Add Telegram config codeblock: 
- ```
  let
    cfg = {
        moduleName: "NewClientModule",      // give this NodeJS Client a name for notification
        telegram: {                         // delete this object if you don't use Telegram
            password: "password",           // password for telegram registration
        },
  ```
- Add Telegram example code block into the User Object in TWIT Client: https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/telegram-example.js

### Usage Guidelies
#### Accessing Data

#### Remote Control
- example template code should not be modified unless otherwise stated
- the Telegram Agent Function``` switch (msg.text) ``` switch/cases is for registered users and where you put your remote control logic
- ```else if (msg.text == "/start")``` unregsitered users; standard Telegram bot start command, change response accordingly
- ```else bot(msg.chat.id, "i don't know you, go away");``` response if user is unrecognized and data is not the password, change accordingly

#### Remote Control Menu / Callback
- the Telegram Agent reply `case "r":` generates two example Menus. a `setTimeout` delay is added to ensure Menu Title is displayed/sent to the telegram user before the button appear.
- the `telegram.buttonToggle(msg, "t1", "Test Button");` presenmts a yes/no or true/false toggle.
- the `telegram.buttonMulti(msg, "TestMenu", "Test Choices", ["test1", "test2", "test3"]);` presents a variable length menu. The array can contain any items you want but the callback must match those same names.
- the response to the "TestToggle" and "TestMenu" are handeled in the Telegram callback function under ```switch (code)```
- the "TestToggle" callback calls `function myFunction(newState)`, adjust to your needs.
- the "TestMenu" callback can be anything, like a function, etc.
- to access automation state memory `state.auto[index]` 
