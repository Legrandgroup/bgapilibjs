const bgapi = require('./bgapilib.js');

var assert = require('assert');

var packet;

packet = bgapi.getCommand('system_reset', 0);
console.log(packet.toJSON())

packet = bgapi.getCommand('flash_ps_erase_all');
console.log(packet.toJSON())


var callbackExecuted;

console.log('Testing handling for unaligned buffer (unrecognized starting sequence)...');
bgapi.resetParser();
callbackExecuted = false;
bgapi.parseIncoming(Buffer.from([0x00]), function(err, packets, nbMoreBytesNeeded) {
        assert(err, "Undetected too short and unaligned buffer.");
        assert(packet!=null, "Returned packet should be null");
        callbackExecuted = true;
    }
);
assert(callbackExecuted, 'Expected a call to callback function with error');

console.log('Testing handling for short incoming buffer...');
bgapi.resetParser();
callbackExecuted = false;
bgapi.parseIncoming(Buffer.from([0x20]), function(err, packets, nbMoreBytesNeeded) {
        assert(nbMoreBytesNeeded==3, "Expected request for 3 more bytes");
        callbackExecuted = true;
    }
);
assert(callbackExecuted, 'Expected a call to callback function with nbMoreBytesNeeded');

console.log('Testing parsing for mesh_generic_server_init response with error code...');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncoming(Buffer.from([0x20, 0x02, 0x1f, 0x04, 0x80, 0x01]), function(err, packets, nbMoreBytesNeeded) {
        assert(nbMoreBytesNeeded==0, "Expected no request for more bytes");
        assert(!err, "Expected no error");
        assert(packets.result == 'invalid_param', "Expected .result attribute == 'invalid_param', instead got: " + JSON.stringify(packets));
        callbackExecuted = true;
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('Testing parsing for concatenated system_get_bt_address responses...');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncoming(Buffer.from([0x00, 0x20, 0x06, 0x01, 0x03, 0x06, 0x05, 0xa4, 0x03, 0x02, 0x01, 0x20, 0x06, 0x01, 0x03, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]), function(err, packets, nbMoreBytesNeeded) {
        if (!err)
            console.log(packets);
    }
);
assert(callbackExecuted, 'Expected a call to callback function');
