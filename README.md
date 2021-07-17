# studious-octo-guide

Turn your BeagleBone Green/Black into a remotely controlled device. This project is documented [here](https://www.hackster.io/anemoi/lean-green-rc-sailing-machine-2cdde5).

## Requirements

This works on a BeagleBone Blue.

## Installing on your BeagleBone

On your BeagleBone's command-line run the following commands. This will download
the source code and install all the JavaScript (NodeJS) dependencies. It will
take a few minutes.

```bash
git clone https://github.com/psiphi75/studious-octo-guide
cd studious-octo-guide
npm install
```

Also read `studious-octo-guide/INSTALL.md` for further installation instructions.

## Running the code

This all gets run on the beaglebone.

### The local server (web server and MQTT proxy)

To run the code run the following command. It should run on boot. But to run the code manually:

```bash
cd studious-octo-guide/local-server
node index.js
```

This will start 2 node processes on your BeagleBone:

-   The first will be the [web-remote-control](https://www.npmjs.com/package/web-remote-control) Proxy, this creates a web-server and proxy such that you can interact with the device in real-time, as well as get status updates from the device: http://192.168.7.2:8888/
-   The other will run the `index.js` file in the `the-whole-shebang/` folder. This will run the main bit of code to collect data from the sensors and send status updates to the Proxy.

### The sailboat

```bash
cd studious-octo-guide/beaglebone
sudo node index.js          # Root is required to control the servos
```

## TODO

-   Make the web-remote-control automatically connect on the correct channel.
-   Seperate out the code into different modules and listen on MQTT:
    -   GPS
    -   Servos
    -   AHRS

## License

Copyright 2016 Simon M. Werner

Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. The ASF licenses this file to you under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
