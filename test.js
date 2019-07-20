const bgapi = require('./bgapilib.js');

var assert = require('assert');

var packet;

var callbackExecuted;

console.log('=== Testing handling for unaligned buffer (unrecognized starting sequence)...');
bgapi.resetParser();
callbackExecuted = false;
bgapi.parseIncomingIterate(Buffer.from([0x00]), function(err, packet, nbMoreBytesNeeded) {
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
bgapi.parseIncomingIterate(Buffer.from([0x77, 0x07, 0x14, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
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
bgapi.parseIncomingIterate(Buffer.from([0x77, 0x07]), function(err, packet, nbMoreBytesNeeded) {
        if (err)
            errorReturned = true;
    }
);
assert(errorReturned, 'Expected call to callback with error (desynchronized bytes)');
callbackExecuted = false;
bgapi.parseIncomingIterate(Buffer.from([0x20, 0x02, 0x0D, 0x01, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        assert(!err, "Expected no error");
        assert(packet.result == 'success', 'Error on result (expecting success)');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing handling for short incoming buffer...');
bgapi.resetParser();
callbackExecuted = false;
bgapi.parseIncomingIterate(Buffer.from([0x20]), function(err, packet, nbMoreBytesNeeded) {
        assert(nbMoreBytesNeeded==3, "Expected request for 3 more bytes");
        callbackExecuted = true;
    }
);
assert(callbackExecuted, 'Expected a call to callback function with nbMoreBytesNeeded');

console.log('=== Testing parsing for mesh_generic_server_init response with error code...');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncomingIterate(Buffer.from([0x20, 0x02, 0x1f, 0x04, 0x80, 0x01]), function(err, packet, nbMoreBytesNeeded) {
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
bgapi.parseIncomingIterate(Buffer.from([0x00, 0x20, 0x06, 0x01, 0x03, 0x06, 0x05, 0xa4, 0x03, 0x02, 0x01, 0x20, 0x06, 0x01, 0x03, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]), function(err, packet, nbMoreBytesNeeded) {
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
bgapi.parseIncomingIterate(Buffer.from([0xA0, 0x12, 0x01, 0x00, 0x02, 0x00, 0x0C, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        console.log('Running callback for evt_system_boot');
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
bgapi.parseIncomingIterate(Buffer.from([0x20, 0x02, 0x0D, 0x01, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        assert(!err, "Expected no error");
        assert(packet.result == 'success', 'Error on result (expecting success)');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing evt_mesh_node_provisioned');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncomingIterate(Buffer.from([0xA0, 0x06, 0x14, 0x01, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00]), function(err, packet, nbMoreBytesNeeded) {
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
bgapi.parseIncomingIterate(Buffer.from([0xA0, 0x07, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        console.log('Running callback for evt_mesh_node_initialized');
        assert(packet.provisioned, 'Error on decoded provisioned');
        assert(packet.address == 0, 'Error on decoded address');
        assert(!err, "Expected no error");
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing evt_mesh_generic_server_client_request');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncomingIterate(Buffer.from([0xA0, 0x16, 0x1F, 0x00, 0x02, 0x10, 0x00, 0x00, 0xFF, 0x7F, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x02, 0x02, 0xCC, 0x4C]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        console.log('Running callback for evt_mesh_generic_server_client_request');
        console.log(packet);
        assert(packet.model_id == 0x1002, 'Error on decoded model_id');
        assert(packet.elem_index == 0, 'Error on decoded elem_index');
        assert(packet.client_address == 0x7fff, 'Error on decoded client_address');
        assert(packet.server_address == 0x0007, 'Error on decoded server_address');
        assert(packet.appkey_index == 0, 'Error on decoded appkey_index');
        assert(packet.transition == 0, 'Error on decoded transition');
        assert(packet.delay == 0, 'Error on decoded delay');
        assert(packet.flags == 2, 'Error on decoded flags');
        assert(packet.type == 2, 'Error on decoded type');
        assert(Buffer.from([0xcc, 0x4c]).equals(packet.parameters), 'Error on decoded parameters (buffer)');
        assert(!err, "Expected no error");
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing that messageId is set in result for rsp_flash_ps_erase_all');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncomingIterate(Buffer.from([0x20, 0x02, 0x0D, 0x01, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        assert(!err, "Expected no error");
        assert(packet.messageId == 'rsp_flash_ps_erase_all', 'Missing messageId rsp_flash_ps_erase_all');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing that messageId is set in result for evt_mesh_node_initialized');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncomingIterate(Buffer.from([0xA0, 0x07, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        assert(!err, "Expected no error");
        assert(packet.messageId == 'evt_mesh_node_initialized', 'Missing messageId evt_mesh_node_initialized');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing exception in callback when more bytes needed');
callbackExecuted = false;
exceptionRaised = false;
bgapi.resetParser();
try {
    bgapi.parseIncomingIterate(Buffer.from([0xA0, 0x07, 0x14, 0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
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

console.log('=== Testing buffer flush and check');
bgapi.resetParser();
bgapi.parseIncomingIterate(Buffer.from([0x20]), function(err, packet, nbMoreBytesNeeded) {
        assert(packet == null, 'Expected no result yet (partial buffer)');
    }
);
assert(bgapi.getCurrentRxBuffer().equals(Buffer.from([0x20])), 'Failure on check internal receive buffer');
bgapi.resetParser();
/* Queue a partial response message */
bgapi.parseIncomingIterate(Buffer.from([0x20, 0x02, 0x0D, 0x01]), function(err, packet, nbMoreBytesNeeded) {
        assert(packet == null, 'Expected no result yet (partial buffer)');
    }
);
assert(bgapi.getCurrentRxBuffer().equals(Buffer.from([0x20, 0x02, 0x0D, 0x01])), 'Failure on check internal receive buffer');
callbackExecuted = false;
/* Queue the rest of the response message */
bgapi.parseIncomingIterate(Buffer.from([0x00, 0x00]), function(err, packet, nbMoreBytesNeeded) {
        callbackExecuted = true;
        assert(!err, "Expected no error");
        assert(packet.result == 'success', 'Error on result (expecting success)');
        if (!err)
            console.log(packet);
    }
);
assert(callbackExecuted, 'Expected a call to callback function');
assert(bgapi.getCurrentRxBuffer().equals(Buffer.from([])), 'Expected an empty internal receive buffer');

console.log('=== Testing parseIncoming() with three 3 simultaneously received');
callbackExecuted = false;
bgapi.resetParser();
event1 = Buffer.from([0xA0, 0x12, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]);
event2 = Buffer.from([0xA0, 0x12, 0x01, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]);
event3 = Buffer.from([0xA0, 0x12, 0x01, 0x00, 0x03, 0x00, 0x03, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]);
tripleEvents = Buffer.concat([event1, event2, event3]);
bgapi.parseIncoming(tripleEvents, function(err, packets, nbMoreBytesNeeded) {
        callbackExecuted = true;
        console.log('Running callback for evt_system_boot');
        console.log('Packets is:');
        console.log(packets);
        assert(packets.length==3, 'Expecting 3 packets in the buffer');
        assert(packets[0].major == 1, 'Error on decoded major version');
        assert(packets[0].minor == 1, 'Error on decoded minor version');
        assert(packets[1].major == 2, 'Error on decoded major version');
        assert(packets[1].minor == 2, 'Error on decoded minor version');
        assert(packets[2].major == 3, 'Error on decoded major version');
        assert(packets[2].minor == 3, 'Error on decoded minor version');
        assert(packets[0].patch == 0, 'Error on decoded patch version');
        assert(packets[1].patch == 0, 'Error on decoded patch version');
        assert(packets[2].patch == 0, 'Error on decoded patch version');
        assert(packets[0].build == 65534, 'Error on decoded build version');
        assert(packets[1].build == 65534, 'Error on decoded build version');
        assert(packets[2].build == 65534, 'Error on decoded build version');
        assert(packets[0].bootloader == 0, 'Error on decoded bootloader version');
        assert(packets[1].bootloader == 0, 'Error on decoded bootloader version');
        assert(packets[2].bootloader == 0, 'Error on decoded bootloader version');
        assert(packets[0].hw == 1, 'Error on decoded hw version');
        assert(packets[1].hw == 2, 'Error on decoded hw version');
        assert(packets[2].hw == 3, 'Error on decoded hw version');
        assert(packets[0].hash == 3828121568, 'Error on decoded hash version');
        assert(packets[1].hash == 3828121568, 'Error on decoded hash version');
        assert(packets[2].hash == 3828121568, 'Error on decoded hash version');
        assert(!err, "Expected no error");
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing parseIncoming() with desynchronisation before and after properly decoded packet(s)');
callbackExecuted = false;
bgapi.resetParser();
prefix = Buffer.from([0x00, 0x01]);
event1 = Buffer.from([0xA0, 0x12, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]);
event2 = Buffer.from([0xA0, 0x12, 0x01, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]);
suffix = Buffer.from([0x20, 0x02]);
tripleEvents = Buffer.concat([prefix, event1, event2, suffix]);
bgapi.parseIncoming(tripleEvents, function(err, packets, nbMoreBytesNeeded) {
        assert(!err, 'Expecting no error feedback when at least one packet is decoded when calling parseIncoming()');
        callbackExecuted = true;
        console.log('Running callback for evt_system_boot');
        console.log('Packets is:');
        console.log(packets);
        assert(packets.length==2, 'Expecting 2 packets in the buffer');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing parseIncoming() with only desynchronised bytes');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncoming(Buffer.from([0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]), function(err, packets, nbMoreBytesNeeded) {
        assert(callbackExecuted==false, 'Expecting callback to be invoked only once');
        callbackExecuted = true;
        assert(err.message == 'Desynchronized buffer', 'Expecting an error with message "Desynchronized buffer"');
        assert(packets == null || packets.length==0, 'Expecting no packets in the buffer');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

console.log('=== Testing parseIncoming() on 2 packets decoded, but without 3rd arg (nbMoreBytesNeeded) in callback');
callbackExecuted = false;
bgapi.resetParser();
event1 = Buffer.from([0xA0, 0x12, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]);
event2 = Buffer.from([0xA0, 0x12, 0x01, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0xE0, 0x7F, 0x2C, 0xE4]);
suffix = Buffer.from([0xA0, 0x12]);
tripleEvents = Buffer.concat([event1, event2, suffix]);
bgapi.parseIncoming(tripleEvents, function(err, packets) {
        assert(!err, 'Expecting no error feedback when at least one packet is decoded when calling parseIncoming()');
        callbackExecuted = true;
        console.log('Running callback for evt_system_boot');
        console.log('Packets is:');
        console.log(packets);
        assert(packets.length==2, 'Expecting 2 packets in the buffer');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');

    console.log('=== Testing parseIncoming() on no packet decoded, but without 3rd arg (nbMoreBytesNeeded) in callback');
callbackExecuted = false;
bgapi.resetParser();
bgapi.parseIncoming(Buffer.from([0xA0, 0x12]), function(err, packets) {
        assert(!err, 'Expecting no error feedback when at least one packet is decoded when calling parseIncoming()');
        callbackExecuted = true;
        assert(packets == null || packets.length==0, 'Expecting no packets in the buffer');
    }
);
assert(callbackExecuted, 'Expected a call to callback function');
