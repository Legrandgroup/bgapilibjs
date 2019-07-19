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

In order to run unit tests on bgapilibjs, move to the root of the sources and run:
```
node ./test.js
```
