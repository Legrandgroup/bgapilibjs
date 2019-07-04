const bgapi = require('./bgapilib.js');

var assert = require('assert');

var packet;

packet = bgapi.getCommand('system_reset', 0);
console.log(packet.toJSON())

packet = bgapi.getCommand('flash_ps_erase_all');
console.log(packet.toJSON())

bgapi.resetParser();

var errorDetected = false;
bgapi.parseIncoming(Buffer.from([0x00]), function(err, packets) {
        assert(err, "Undetected too short and unaligned buffer.");
        assert(packet!=null, "Returned packet should be null");
        errorDetected = true;
        }
    );
        
assert(errorDetected, 'Expected too short and unaligned buffer error undetected');

bgapi.resetParser();

bgapi.parseIncoming(Buffer.from([0x20]), function(err, packets) {
        console.log(packets);
        }
    );

bgapi.resetParser();

bgapi.parseIncoming(Buffer.from([0x00, 0x20, 0x06, 0x01, 0x03, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0x20, 0x06, 0x01, 0x03, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]), function(err, packets) {
        console.log(packets);
        }
    );
