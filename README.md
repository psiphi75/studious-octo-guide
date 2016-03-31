# studious-octo-guide
Turn your BeagleBone Green/Black into a remotely controlled device.

This project is documented here: [Link to Hackster.io]

## Requirements
The following items are required for this project to run out-of-the-box.  You can hack the code to remove components as you desire:
- [Grove 3-Axis Digital Gyroscope](http://www.seeedstudio.com/depot/Grove-3Axis-Digital-Gyro-p-750.html)
- [Grove 3-Axis Digital Accelerometer](http://www.seeedstudio.com/wiki/Grove_-_3-Axis_Digital_Accelerometer%28%C2%B11.5g%29)
- [Grove 3-Axis Digital Compass](http://www.seeedstudio.com/wiki/Grove_-_3-Axis_Compass_V1.0)
- A serial GPS
- A working GPRS modem

## Installing on your BeagleBone

On your BeagleBone's command-line run the following commands.  This will download
the source code and install all the JavaScript (NodeJS) dependencies.  It will
take a few minutes.

```bash
git clone https://github.com/psiphi75/studious-octo-guide
cd studious-octo-guide
npm install
```

## Running the code

To run the code run the following command.

```bash
npm run
```

This will start 2 node processes on your BeagleBone:
 - The first will be the [web-remote-control](https://www.npmjs.com/package/web-remote-control) Proxy, this creates a web-server and proxy such that you can interact with the device in real-time, as well as get status updates from the device.
   - http://192.168.7.2:8888/
-
 - The other will run the `index.js` file in the `the-whole-shebang/` folder. This will run the main bit of code to collect data from the sensors and send status updates to the Proxy.



# todo
update rc.local
document booting
create wrc server script and documentation (npm run server??)
