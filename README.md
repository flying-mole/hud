# hud

Flying Mole quadcopter HUD (Head-Up Display).

This is the user interface which controls the quadcopter.

Features:

* Web interface to control the quadcopter
* Shows sensors & system stats as well as motors status (with pretty graphs)
* Raspberry Pi camera support (preview, record)
* Joystick support
* Multiple stabilizers available
* Live editing of all config entries
* Record & export sensors data (as CSV)

Related blog (in French): http://emersion.fr/blog

## Screenshots

![screen shot 2015-05-23 at 19 38 24](https://cloud.githubusercontent.com/assets/506932/7785173/b6426afe-0183-11e5-9b30-2fe24ea40115.png)

![screen shot 2015-05-16 at 15 20 04](https://cloud.githubusercontent.com/assets/506932/7666273/71269f0c-fbdf-11e4-9a5f-0e79fe2a8a11.png)

## General structure

* `lib/`: Raspberry Pi code
  * `controllers/`: available stabilizers
  * `camera.js`: Raspberry Pi Camera support
  * `msg-builder.js`: creates messages for the client
  * `msg-handler.js`: handles messages sent by the client
  * `quadcopter.js`: main module
  * `sensors.js`: Inertial Mesurement Unit support
  * `server.js`: HTTP server
* `public/`: browser code
* `config.js`: persistent configuration
