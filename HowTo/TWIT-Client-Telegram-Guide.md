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
- Add [Telegram example](https://github.com/ThingWerks/ThingWerks-IoT-Framework/blob/main/Client/telegram-example.js) code block into the User Object in TWIT Client: 

### Usage Guidelines
#### Accessing Data
- when a user enters the telegram password inside the bot chat, they are added to the `nv.telegram` object. This is then saved to the hard drive in `/apps/twit/nv-clientName.json`. you must delete this element from the array and save the file to remove a registered user.
- all password/registration attempts and remote control commands are sent to every TWIT client that has Telegram configured, therefore
  - you must use different commands, passwords and callback names if  the same Telegram user ID is registered with multiple TWIT Clients
  - you may have to remove these two responses/lines in order to keep silent the replies from multiple TWIT clients a the same time.
  - ```
    else if (msg.text == "/start") bot(msg.chat.id, "give me the passcode");
    else bot(msg.chat.id, "i don't know you, go away");
    ```
- to access automation state memory `state.auto[numberOfIndex]` or `state.auto[0]` if you have only one automation in this client.
- toggle devices same as in automation example `esp.send(0, true);` or `ha.send("switch.fan_bed_switch", false);`


#### Remote Control
- example template code should not be modified unless otherwise stated
- the Telegram Agent Function `switch (msg.text)` switch/cases is for registered users and where you put your remote control logic
- `else if (msg.text == "/start")` unregistered users; standard Telegram bot start command, change response accordingly
- `else bot(msg.chat.id, "i don't know you, go away");` response if user is unrecognized and data is not the password, change accordingly

#### Remote Control Menu / Callback
- the Telegram Agent reply `case "r":` generates two example Menus. a `setTimeout` delay is added to ensure Menu Title is displayed/sent to the telegram user before the button appear.
- the `telegram.buttonToggle(msg, "t1", "Test Button");` presents a yes/no or true/false toggle.
- the `telegram.buttonMulti(msg, "TestMenu", "Test Choices", ["test1", "test2", "test3"]);` presents a variable length menu. The array can contain any items you want but the callback must match those same names.
- the response to the "TestToggle" and "TestMenu" are handled in the Telegram callback function under `switch (code)`
- the "TestToggle" callback calls `function myFunction(newState)`, adjust to your needs.
- the "TestMenu" callback can be anything, like a function, etc.
