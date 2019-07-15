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
        callbackExecuted = true;
        if (!err)
            console.log(packets);
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('Testing cmd_system_reset emission and feedback event');
callbackExecuted = false;
bgapi.resetParser();
packet = bgapi.getCommand('system_reset', 0);
assert(packet.equals(Buffer.from([0x20, 0x01, 0x01, 0x01, 0x00])), 'Expected another payload for command cmd_system_reset. Got: ' + packet.toString('hex'));
bgapi.parseIncoming(Buffer.from([0xA0, 0x12, 0x01, 0x00, 0x02, 0x00, 0x0C, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]), function(err, packets, nbMoreBytesNeeded) {
        callbackExecuted = true;
        console.log('Running callback for rsp_system_reset');
//        console.log('Got the following packets:');
//        console.log(packets);
        assert(packets.major == 2, 'Error on decoded major version');
        assert(packets.minor == 12, 'Error on decoded minor version');
        assert(packets.patch == 0, 'Error on decoded patch version');
        assert(packets.build == 65534, 'Error on decoded build version');
        assert(packets.bootloader == 0, 'Error on decoded bootloader version');
        assert(packets.hw == 1, 'Error on decoded hw version');
        assert(packets.hash == 3828121568, 'Error on decoded hash version');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('Testing cmd_gatt_server_write_attribute_value packet generation');
packet = bgapi.getCommand('gatt_server_write_attribute_value', 11, 0, 'fake node');
assert(packet.equals(Buffer.from([0x20, 0x05, 0x0A, 0x02, 0x0B, 0x00, 0x00, 0x00, 0x09, 0x66, 0x61, 0x6B, 0x65, 0x20, 0x6E, 0x6F, 0x64, 0x65])), 'Expected another payload for command cmd_system_reset. Got: ' + packet.toString('hex'));

console.log('Testing cmd_flash_ps_erase_all packet generation and response');
callbackExecuted = false;
bgapi.resetParser();
packet = bgapi.getCommand('flash_ps_erase_all');
assert(packet.equals(Buffer.from([0x20, 0x00, 0x0D, 0x01])), 'Expected another payload for command cmd_flash_ps_erase_all. Got: ' + packet.toString('hex'));
bgapi.parseIncoming(Buffer.from([0x20, 0x02, 0x0D, 0x01, 0x00, 0x00]), function(err, packets, nbMoreBytesNeeded) {
        callbackExecuted = true;
        if (!err)
            console.log(packets);
    }
);
assert(callbackExecuted, 'Expected a call to callback function');
