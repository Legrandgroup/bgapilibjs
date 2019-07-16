const bgapiDefs = require('./bgapi-defs.js');
const bgapiErrors = require('./bgapi-errors.js');
const bgapiUtils = require('./bgapi-utils.js');

/**
 * @brief Decoding handler for response rsp_system_get_bt_address
 * @param buffer A buffer containing the payload to decode associated with this message
 * @return A JSON object containing the decoded response
**/
function rsp_system_get_bt_address(buffer) {
  if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
  
  /* We are sure to get at least 6 bytes here because minimumPayloadLength was set to 6 */
  let btAddressAsStr = '';
  for (const b of buffer.subarray(0, 6)) {
    if (btAddressAsStr)
      btAddressAsStr = bgapiUtils.UInt8ToHexStr(b) + ':' + btAddressAsStr;  /* Prepend the byte (because buffer is in the reverse order in BGAPI */
    else
      btAddressAsStr = bgapiUtils.UInt8ToHexStr(b); /* Only first byte */
  }
  return {needsMoreBytes: 0, eatenBytes: 6, decodedPacket: { 'bd_addr': btAddressAsStr } };
}

/**
 * @brief Generic decoding handler for responses carrying only one 16-bit result code
 * @param buffer A buffer containing the payload to decode associated with this message
 * @return A JSON object containing the decoded response
**/
function rsp_generic_16bit_result_code(buffer) {
  if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
  
  /* We are sure to get at least 2 bytes here because minimumPayloadLength was set to 2 */
  let resultAsStr = bgapiErrors.errorCodes[buffer.readUInt16LE(0)];
  return {needsMoreBytes: 0, eatenBytes: 2, decodedPacket: { 'result': resultAsStr } };
}

/**
 * @brief Known response messages and associated handlers
 * 
 * This object must be populated with entries whose key is the message class (use the Class enum above)
 * The value of each entry is an object containing one entry per message decoded, using the message ID as the key.
 * Each entry contains an object desribing the response:
 * - Attribute minimumPayloadLength (optional) contains to the value of Minimum payload length taken from the BGAPI spec
 * - Attribute name is the mandatory name of the message in the BGAPI spec (without the 'rsp_' prefix)
 * - Attribute handler points to a function that will process and decode the response arguments, it will get as argument the payload of the message (excluding the fixed 4 BGAPI header bytes)
 *   and it must return a JSON object containing the decoded response
**/
var Responses = {};
Responses[bgapiDefs.Classes.System] = {
  0x03 : {
    minimumPayloadLength : 6,
    name : 'system_get_bt_address',
    handler : rsp_system_get_bt_address,
  }
}
Responses[bgapiDefs.Classes.BluetoothMeshGenericClientModel] = {
  0x04 : {
    minimumPayloadLength : 2,
    name : 'mesh_generic_client_init',
    handler : rsp_generic_16bit_result_code,
  }
}

Responses[bgapiDefs.Classes.BluetoothMeshGenericServerModel] = {
  0x04 : {
    minimumPayloadLength : 2,
    name : 'mesh_generic_server_init',
    handler : rsp_generic_16bit_result_code,
  }
}

Responses[bgapiDefs.Classes.PersitentStore] = {
  0x01 : {
    minimumPayloadLength : 2,
    name : 'flash_ps_erase_all',
    handler : rsp_generic_16bit_result_code,
  }
}

module.exports.Responses = Responses;
