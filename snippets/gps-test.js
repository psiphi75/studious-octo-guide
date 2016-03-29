// Set out serial port
var SERIAL_PORT = '/dev/ttyO1';

// We require octalbonescript just to initialise the serial port.
// This only needs to be done once, every time we boot.
var obs = require('octalbonescript');

// Load the GPS module
var SerialGPS = require('super-duper-serial-gps-system');

// Enable serial for such that we can use it for the GPS device
obs.serial.enable(SERIAL_PORT, function(err) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('enabled serial: ' + SERIAL_PORT);
});


// This configures the serial port (to 9600 baud) and starts listening
// to the GPS device.
var gps = new SerialGPS(SERIAL_PORT, 9600);

// Monitor for 'position' event.  The data object is described below.
gps.on('position', function(data) {
    if (typeof data === 'undefined') {
        console.log('No GPS signal.');
    } else {
        console.log(data);
    }
});
