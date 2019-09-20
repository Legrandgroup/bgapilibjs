# bgapilibjs

A Node Library for communicating using the BGAPI serial protocol

This libary is using the modern BGAPI protocol recently updated and that contains incompatible changes compared to the old BGAPI specs that were used on BLE112 and BLE113 devices.

It aims to be compatible with the new Silabs-based BGAPI interfaces.

Although the code in this library is targetting compatibility with the methods exported by [bglib](https://github.com/tessel/bglib) that supported BLE112 and BLE113, it has been designed from scratch based on the new BGAPI specs.

# Using bgapilibjs

In order to use bgapilibjs, just add the following line in your javascript code:
```
const bgapi = require('bgapilib.js');
```

bgapilibjs only parses BGAPI frames that are recevied from a BGAPI modem or forges frames to send to a modem.

Therfore, you will need to use an third party library to read/write from/to the serial port.

Here is a small example on how to do this using the Javascript library serialport:
```
const SerialPort = require('serialport');
const BgApi = require('bgapilib');

var bleSerialPort = new SerialPort('/dev/ttyUSB0');
BgApi.resetParser();

bleSerialPort.registerSerialListener(function(data) {
  BgApi.parseIncomingIterate(data, function(err, packet, nbMoreBytesNeeded) {
    console.log("Received raw packet " + JSON.stringify(packet));
    if (err) {
      console.error(err + ". Received packet: " + data);
    }
    else {
      if (nbMoreBytesNeeded == 0) {
        console.log("Received " + packet.messageId);
      }
      else {
        console.warn("At least " + nbMoreBytesNeeded + " more bytes needed");
      }
    }
  });
}
```

This example code listens to BGAPI incoming events or responses and dumps those to the console, thus you will first need to make sure an event is coming in before you can actually see something.

In order to run unit tests on bgapilibjs, move to the root of the sources and run:
```
node ./test.js
```
