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

## Setup

The HUD will work on the Raspberry Pi as well as on your desktop/laptop, even if sensors/motors/camera are not available. It requires Node >= 4.0.

Install dependencies:
```
npm install
```

Start the HUD:
```
npm start
```

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

## What happens when...

> When I start the quadcopter?

* A web server is started on the Raspberry Pi. You can access it using your web browser and a nice user interface will show up.
* Checks are performed to know which hardware components are available: motors, sensors, camera...

> When I increase the main power?

The quacopter is on ground. When you increase the main power, all motors will begin to rotate.

When on air, the quadcopter runs a controller which stabilizes the machine. At a predefinied rate, the quadcopter will gather data from sensors and give it to the controller. The controller has a target angle for each axis, which is set to 0 by default, which means the quadcopter tries to remain horizontal. The controller will compute the correction that needs to be applied to the motor speeds to reach the target, and give it back. Then, the quacopter will send appropriate commands to each motor.

> When I move my joystick to the right?

First of all, your joystick move is detected and interpreted as a command to increase the x axis angle. A message is sent from the browser to the server on the Raspberry Pi to say: _Hey! Increase the x angle to 10 degrees!_. The server then receives this message and changes the controller target for the x angle from 0 to 10 degrees. The controller, which is executed at a fixed rate, will take into account this change and update the motor speeds accordingly. The quadcopter will begin to move to the right.
