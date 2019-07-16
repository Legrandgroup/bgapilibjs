const bgapiDefs = require('./bgapi-defs.js');

/**
 * @brief Decoding handler for event  evt_system_boot
 * @param buffer A buffer containing the payload to decode associated with this message
 * @return A JSON object containing the decoded event
**/
function evt_system_boot(buffer) {
  if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
  console.log('evt_system_boot got a buffer: ' + buffer.toString('hex'));
  let majorVersion = buffer.readUInt16LE(0);
  let minorVersion = buffer.readUInt16LE(2);
  let patchVersion = buffer.readUInt16LE(4);
  let buildVersion = buffer.readUInt16LE(6);
  let bootloaderVersion = buffer.readUInt32LE(8);
  let hwType = buffer.readUInt16LE(12);
  let versionHash = buffer.readUInt32LE(14);
  let result = {
    'major': majorVersion,
    'minor': minorVersion,
    'patch': patchVersion,
    'build': buildVersion,
    'bootloader': bootloaderVersion,
    'hw': hwType,
    'hash': versionHash,
  }
  return {needsMoreBytes: 0, eatenBytes: 18, decodedPacket: result};
}

/**
 * @brief Known event messages and associated handlers
 * 
 * This object must be populated with entries whose key is the message class (use the Class enum above)
 * The value of each entry is an object containing one entry per message decoded, using the message ID as the key.
 * Each entry contains an object desribing the event:
 * - Attribute minimumPayloadLength (optional) contains to the value of Minimum payload length taken from the BGAPI spec
 * - Attribute name is the mandatory name of the message in the BGAPI spec (without the 'evt_' prefix)
 * - Attribute handler points to a function that will process and decode the event arguments, it will get as argument the payload of the message (excluding the fixed 4 BGAPI header bytes)
 *   and it must return a JSON object containing the decoded event
**/
var Events = {};
Events[bgapiDefs.Classes.System] = {
  0x00 : {
    minimumPayloadLength : 0x12,
    name : 'system_boot',
    handler : evt_system_boot,
  }
}

Events[bgapiDefs.Classes.MeshNode] = {
  0x00 : {
    minimumPayloadLength : 0x07,
    name : 'mesh_node_initialized',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 7, decodedPacket: { 'provisioned': (buffer.readUInt8(0) == 0), 'address': buffer.readUInt16LE(1), 'ivi': buffer.readUInt32LE(3) } };
    }
  },
  0x01 : {
    minimumPayloadLength : 0x06,
    name : 'mesh_node_provisioned',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 6, decodedPacket: { 'iv_index': buffer.readUInt32LE(0), 'address': buffer.readUInt16LE(4) } };
    }
  }
}

module.exports.Events = Events;
