const bgapi = require('./bgapilib.js');

var assert = require('assert');

var packet;

var callbackExecuted;

console.log('=== Testing handling for unaligned buffer (unrecognized starting sequence)...');
bgapi.resetParser();
callbackExecuted = false;
bgapi.parseIncoming(Buffer.from([0x00]), function(err, packet, nbMoreBytesNeeded) {
        assert(err, "Undetected too short and unaligned buffer.");
        assert(packet===null, "Returned packet should be null");
        callbackExecuted = true;
    }
);
assert(callbackExecuted, 'Expected a call to callback function with error');

console.log('=== Testing error returned in callback when buffer is not synchronized');
bgapi.resetParser();
callbackExecuted = false;
nbErrorReturned = 0;
bgapi.parseIncoming(Buffer.from([0x77, 0x07, 0x14, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        if (!err)
            callbackExecuted = true;
        else
            nbErrorReturned++;
    }
);
assert(!callbackExecuted, 'Expected no call to callback function without an error');
assert(nbErrorReturned==5, 'Expected 5 callback calls with errors for 5 desynchronized bytes');

console.log('=== Testing resynchronization immediately after a reset');
bgapi.resetParser();
errorReturned = false;
bgapi.parseIncoming(Buffer.from([0x77, 0x07]), function(err, packet, nbMoreBytesNeeded) {
        if (err)
            errorReturned = true;
    }
);
assert(errorReturned, 'Expected call to callback with error (desynchronized bytes)');
callbackExecuted = false;
bgapi.parseIncoming(Buffer.from([0x20, 0x02, 0x0D, 0x01, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        assert(!err, "Expected no error");
        assert(packet.result == 'success', 'Error on result (expecting success)');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing handling for short incoming buffer...');
bgapi.resetParser();
callbackExecuted = false;
bgapi.parseIncoming(Buffer.from([0x20]), function(err, packet, nbMoreBytesNeeded) {
        assert(nbMoreBytesNeeded==3, "Expected request for 3 more bytes");
        callbackExecuted = true;
    }
);
assert(callbackExecuted, 'Expected a call to callback function with nbMoreBytesNeeded');

console.log('=== Testing parsing for mesh_generic_server_init response with error code...');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncoming(Buffer.from([0x20, 0x02, 0x1f, 0x04, 0x80, 0x01]), function(err, packet, nbMoreBytesNeeded) {
        assert(nbMoreBytesNeeded==0, "Expected no request for more bytes");
        assert(!err, "Expected no error");
        assert(packet.result == 'invalid_param', "Expected .result attribute == 'invalid_param', instead got: " + JSON.stringify(packet));
        callbackExecuted = true;
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing parsing for concatenated system_get_bt_address responses...');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncoming(Buffer.from([0x00, 0x20, 0x06, 0x01, 0x03, 0x06, 0x05, 0xa4, 0x03, 0x02, 0x01, 0x20, 0x06, 0x01, 0x03, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        if (!err)
            console.log(packet);
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing cmd_system_reset emission and feedback event');
callbackExecuted = false;
bgapi.resetParser();
packet = bgapi.getCommand('system_reset', 0);
assert(packet.equals(Buffer.from([0x20, 0x01, 0x01, 0x01, 0x00])), 'Expected another payload for command cmd_system_reset. Got: ' + packet.toString('hex'));
bgapi.parseIncoming(Buffer.from([0xA0, 0x12, 0x01, 0x00, 0x02, 0x00, 0x0C, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        console.log('Running callback for rsp_system_reset');
        assert(packet.major == 2, 'Error on decoded major version');
        assert(packet.minor == 12, 'Error on decoded minor version');
        assert(packet.patch == 0, 'Error on decoded patch version');
        assert(packet.build == 65534, 'Error on decoded build version');
        assert(packet.bootloader == 0, 'Error on decoded bootloader version');
        assert(packet.hw == 1, 'Error on decoded hw version');
        assert(packet.hash == 3828121568, 'Error on decoded hash version');
        assert(!err, "Expected no error");
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing cmd_gatt_server_write_attribute_value packet generation');
packet = bgapi.getCommand('gatt_server_write_attribute_value', 11, 0, 'fake node');
assert(packet.equals(Buffer.from([0x20, 0x05, 0x0A, 0x02, 0x0B, 0x00, 0x00, 0x00, 0x09, 0x66, 0x61, 0x6B, 0x65, 0x20, 0x6E, 0x6F, 0x64, 0x65])), 'Expected another payload for command cmd_system_reset. Got: ' + packet.toString('hex'));

console.log('=== Testing cmd_flash_ps_erase_all packet generation and response');
callbackExecuted = false;
bgapi.resetParser();
packet = bgapi.getCommand('flash_ps_erase_all');
assert(packet.equals(Buffer.from([0x20, 0x00, 0x0D, 0x01])), 'Expected another payload for command cmd_flash_ps_erase_all. Got: ' + packet.toString('hex'));
bgapi.parseIncoming(Buffer.from([0x20, 0x02, 0x0D, 0x01, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        assert(!err, "Expected no error");
        assert(packet.result == 'success', 'Error on result (expecting success)');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing evt_mesh_node_provisioned');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncoming(Buffer.from([0xA0, 0x06, 0x14, 0x01, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        console.log('Running callback for evt_mesh_node_provisioned');
        assert(packet.iv_index == 0, 'Error on decoded iv_index');
        assert(packet.address == 16, 'Error on decoded address');
        assert(!err, "Expected no error");
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing evt_mesh_node_initialized');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncoming(Buffer.from([0xA0, 0x07, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        console.log('Running callback for evt_mesh_node_initialized');
        assert(packet.provisioned, 'Error on decoded provisioned');
        assert(packet.address == 0, 'Error on decoded address');
        assert(!err, "Expected no error");
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing exception in callback when more bytes needed');
callbackExecuted = false;
exceptionRaised = false;
bgapi.resetParser();
try {
    bgapi.parseIncoming(Buffer.from([0xA0, 0x07, 0x14, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
            callbackExecuted = true;
            throw new Error('TestException');
        }
    );
}
catch(exception) {
    exceptionRaised = true;
    console.log('Above exception was expected in test');
    assert(exception.message == 'TestException', 'Exception message mismatch: ' + exception.message);
    assert(exception.name == 'Error', 'Exception name mismatch: ' + exception.name);
}
assert(callbackExecuted, 'Expected a call to callback function');
assert(exceptionRaised, 'Expected an exception propagated to us');

/* Add unit test to check content of internal buffer */
/* Add unit test to check reset of state and then content */
/* Add unit test to check reset of state and when first a few good bytes are sent, then reset then, send a proper buffer to check it is decoded */
