const bgapiDefs = require('./bgapi-defs.js');
const bgapiErrors = require('./bgapi-errors.js');
const bgapiUtils = require('./bgapi-utils.js');

/**
 * @brief Decoding handler for event evt_system_boot
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
 * @brief Decoding handler for event evt_le_connection_opened
 * @param buffer A buffer containing the payload to decode associated with this message
 * @return A JSON object containing the decoded event
**/
function evt_le_connection_opened(buffer) {
  if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
  console.log('evt_le_connection_opened got a buffer: ' + buffer.toString('hex'));
  let btAddressAsStr = '';
  for (const b of buffer.subarray(0, 6)) {
    if (btAddressAsStr)
      btAddressAsStr = bgapiUtils.UInt8ToHexStr(b) + ':' + btAddressAsStr;  /* Prepend the byte (because buffer is in the reverse order in BGAPI */
    else
      btAddressAsStr = bgapiUtils.UInt8ToHexStr(b); /* Only first byte */
  }
  let addressType = buffer.readUInt8(6);
  let master = buffer.readUInt8(7);
  let connection = buffer.readUInt8(8);
  let bonding = buffer.readUInt8(9);
  let advertiser = buffer.readUInt8(10);
  let result = {
    'address': btAddressAsStr,
    'address_type': addressType,
    'master': master,
    'connection': connection,
    'bonding': bonding,
    'advertiser': advertiser,
  };
  return {needsMoreBytes: 0, eatenBytes: 11, decodedPacket: result};
}

/**
 * @brief Decoding handler for event evt_mesh_node_config_set
 * @param buffer A buffer containing the payload to decode associated with this message
 * @return A JSON object containing the decoded event
 *
 * @note In the returned JSON object, the parameters entry is an object of type Buffer
**/
function evt_mesh_node_config_set(buffer) {
  if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
  console.log('evt_mesh_node_config_set got a buffer: ' + buffer.toString('hex'));
  let id = buffer.readUInt16LE(0);
  let netkeyIndex = buffer.readUInt16LE(2);
  let parametersLen = buffer.readUInt8(4);
  parameters = buffer.slice(5, 5 + parametersLen);
  let result = {
    'id': id,
    'netkey_index': netkeyIndex,
    'parameters': parameters,
  }
  return {needsMoreBytes: 0, eatenBytes: 5+parametersLen, decodedPacket: result};
}

/**
 * @brief Decoding handler for event evt_mesh_generic_server_client_request
 * @param buffer A buffer containing the payload to decode associated with this message
 * @return A JSON object containing the decoded event
 *
 * @note In the returned JSON object, the parameters entry is an object of type Buffer
**/
function evt_mesh_generic_server_client_request(buffer) {
  if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
  console.log('evt_mesh_generic_server_client_request got a buffer: ' + buffer.toString('hex'));
  let modelId = buffer.readUInt16LE(0);
  let elementIndex = buffer.readUInt16LE(2);
  let clientAddress = buffer.readUInt16LE(4);
  let serverAddress = buffer.readUInt16LE(6);
  let applicationKeyIndex = buffer.readUInt16LE(8);
  let transition = buffer.readUInt32LE(10);
  let delay = buffer.readUInt16LE(14);
  let flags = buffer.readUInt16LE(16);
  let type = buffer.readUInt8(18);
  let parametersLen = buffer.readUInt8(19);
  parameters = buffer.slice(20, 20 + parametersLen);
  let result = {
    'model_id': modelId,
    'elem_index': elementIndex,
    'client_address': clientAddress,
    'server_address': serverAddress,
    'appkey_index': applicationKeyIndex,
    'transition': transition,
    'delay': delay,
    'flags': flags,
    'type': type,
    'parameters': parameters,
  }
  return {needsMoreBytes: 0, eatenBytes: 20+parametersLen, decodedPacket: result};
}

/**
 * @brief Decoding handler for event evt_mesh_generic_client_server_status
 * @param buffer A buffer containing the payload to decode associated with this message
 * @return A JSON object containing the decoded event
 *
 * @note In the returned JSON object, the parameters entry is an object of type Buffer
**/
function evt_mesh_generic_client_server_status(buffer) {
  if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
  console.log('evt_mesh_generic_client_server_status got a buffer: ' + buffer.toString('hex'));
  let modelId = buffer.readUInt16LE(0);
  let elementIndex = buffer.readUInt16LE(2);
  let clientAddress = buffer.readUInt16LE(4);
  let serverAddress = buffer.readUInt16LE(6);
  let remaining = buffer.readUInt32LE(8);
  let flags = buffer.readUInt16LE(12);
  let type = buffer.readUInt8(14);
  let parametersLen = buffer.readUInt8(15);
  parameters = buffer.slice(16, 16 + parametersLen);
  let result = {
    'model_id': modelId,
    'elem_index': elementIndex,
    'client_address': clientAddress,
    'server_address': serverAddress,
    'remaining': remaining,
    'flags': flags,
    'type': type,
    'parameters': parameters,
  }
  return {needsMoreBytes: 0, eatenBytes: 16+parametersLen, decodedPacket: result};
}

/**
 * @brief Decoding handler for event evt_gatt_server_user_write_request
 * @param buffer A buffer containing the payload to decode associated with this message
 * @return A JSON object containing the decoded event
 *
 * @note In the returned JSON object, the parameters entry is an object of type Buffer
**/
function evt_gatt_server_user_write_request(buffer) {
  if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
  console.log('evt_gatt_server_user_write_request got a buffer: ' + buffer.toString('hex'));
  let connection = buffer.readUInt8(0);
  let characteristic = buffer.readUInt16LE(1);
  let attOpcode = buffer.readUInt8(3);
  let offset = buffer.readUInt16LE(4);
  let parametersLen = buffer.readUInt8(6);
  parameters = buffer.slice(7, 7 + parametersLen);
  let result = {
    'connection': connection,
    'characteristic': characteristic,
    'att_opcode': attOpcode,
    'offset': offset,
    'parameters': parameters,
  }
  return {needsMoreBytes: 0, eatenBytes: 7+parametersLen, decodedPacket: result};
}

/**
 * @brief Generic decoding handler for events carrying only one 16-bit result code
 * @param buffer A buffer containing the payload to decode associated with this message
 * @return A JSON object containing the decoded event
**/
function evt_generic_16bit_result_code(buffer) {
  if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */

  /* We are sure to get at least 2 bytes here because minimumPayloadLength was set to 2 */
  let resultAsStr = bgapiErrors.errorCodes[buffer.readUInt16LE(0)];
  return {needsMoreBytes: 0, eatenBytes: 2, decodedPacket: { 'result': resultAsStr } };
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

Events[bgapiDefs.Classes.GenericAccessProfile] = {
  0x01 : {
    minimumPayloadLength : 0x1,
    name : 'le_gap_adv_timeout',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 1, decodedPacket: { 'handle':  buffer.readUInt8(0) } };
    }
  }
}

Events[bgapiDefs.Classes.ConnectionManagement] = {
  0x00 : {
    minimumPayloadLength : 0x0b,
    name : 'le_connection_opened',
    handler : evt_le_connection_opened,
  },
  0x01 : {
    minimumPayloadLength : 0x03,
    name : 'le_connection_closed',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 3, decodedPacket: { 'result': bgapiErrors.errorCodes[buffer.readUInt16LE(0)], 'connection': buffer.readUInt8(2) } };
    }
  },
  0x02 : {
    minimumPayloadLength : 0x0a,
    name : 'le_connection_parameters',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 10, decodedPacket: { 'connection': buffer.readUInt8(0), 'interval': buffer.readUInt16LE(1), 'latency': buffer.readUInt16LE(3),
                                                                  'timeout': buffer.readUInt16LE(5), 'security_mode': buffer.readUInt8(7), 'txsize': buffer.readUInt16LE(8) } };
    }
  },
  0x04 : {
    minimumPayloadLength : 0x02,
    name : 'le_connection_phy_status',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 2, decodedPacket: { 'connection': buffer.readUInt8(0), 'phy' : buffer.readUInt8(1) } };
    }
  },
}

Events[bgapiDefs.Classes.GenericAttributeProfile] = {
  0x00 : {
    minimumPayloadLength : 0x03,
    name : 'gatt_mtu_exchanged',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 3, decodedPacket: { 'connection': buffer.readUInt8(0), 'mtu': buffer.readUInt16LE(1) } };
    }
  },
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
  },
  0x02 : {
    minimumPayloadLength : 0x04,
    name : 'mesh_node_config_get',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 4, decodedPacket: { 'id': buffer.readUInt16LE(0), 'netkey_index': buffer.readUInt16LE(2) } };
    }
  },
  0x03 : {
    minimumPayloadLength : 0x05,
    name : 'mesh_node_config_set',
    handler : evt_mesh_node_config_set,
  },
  0x06 : {
    minimumPayloadLength : 0x02,
    name : 'mesh_node_provisioning_started',
    handler : evt_generic_16bit_result_code,
  },
  0x07 : {
    minimumPayloadLength : 0x02,
    name : 'mesh_node_provisioning_failed',
    handler : evt_generic_16bit_result_code,
  },
  0x08 : {
    minimumPayloadLength : 0x05,
    name : 'mesh_node_key_added',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 5, decodedPacket: { 'type': buffer.readUInt8(0), 'index' : buffer.readUInt16LE(1), 'netkey_index': buffer.readUInt16LE(3) } };
    }
  },
  0x09 : {
    minimumPayloadLength : 0x07,
    name : 'mesh_node_model_config_changed',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 7, decodedPacket: { 'mesh_node_config_state': buffer.readUInt8(0), 'element_address' : buffer.readUInt16LE(1), 'vendor_id': buffer.readUInt16LE(3), 'model_id': buffer.readUInt16LE(5) } };
    }
  },
}

Events[bgapiDefs.Classes.BluetoothMeshProxyConnections] = {
  0x00 : {
    minimumPayloadLength : 0x4,
    name : 'mesh_proxy_connected',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 4, decodedPacket: { 'handle': buffer.readUInt32LE(0) } };
    }
  },
  0x01 : {
    minimumPayloadLength : 0x6,
    name : 'mesh_proxy_disconnected',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 6, decodedPacket: { 'handle': buffer.readUInt32LE(0), 'reason': buffer.readUInt16LE(4) } };
    }
  },
}

Events[bgapiDefs.Classes.BluetoothMeshHealthServerModel] = {
  0x00 : {
    minimumPayloadLength : 0x3,
    name : 'mesh_health_server_attention',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 3, decodedPacket: { 'elem_index': buffer.readUInt16LE(0), 'timer': buffer.readUInt8(2) } };
    }
  },
}

Events[bgapiDefs.Classes.BluetoothMeshGenericServerModel] = {
  0x00 : {
    minimumPayloadLength : 0x14,
    name : 'mesh_generic_server_client_request',
    handler : evt_mesh_generic_server_client_request,
  },
}

Events[bgapiDefs.Classes.BluetoothMeshGenericClientModel] = {
  0x00 : {
    minimumPayloadLength : 0x10,
    name : 'mesh_generic_client_server_status',
    handler : evt_mesh_generic_client_server_status,
  },
}

Events[bgapiDefs.Classes.GenericAttributeProfileServer] = {
  0x02 : {
    minimumPayloadLength : 0x7,
    name : 'gatt_server_user_write_request',

    handler : evt_gatt_server_user_write_request,
  },
  0x03 : {
    minimumPayloadLength : 0x6,
    name : 'gatt_server_characteristic_status',
    handler : function(buffer) {
      if (typeof buffer == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
        buffer = Buffer.from(arguments);  /* if this is the case, convert arguments back to a Buffer object to be able to process it */
      return {needsMoreBytes: 0, eatenBytes: 6, decodedPacket: { 'connection': buffer.readUInt8(0), 'characteristic': buffer.readUInt16LE(1), 'status_flags': buffer.readUInt8(3), 'client_config_flags': buffer.readUInt16LE(4) } };
    }
  },
}

module.exports.Events = Events;
