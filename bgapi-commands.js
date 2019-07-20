const bgapiDefs = require('./bgapi-defs.js');
//const bgapiErrors = require('./bgapi-errors.js');
//const bgapiUtils = require('./bgapi-utils.js');

/**
 * @brief Implementation of command gatt_server_write_attribute_value
 * @param attribute A 16-bit value containing the Attribute handle
 * @param offset A 16-bit value containint the Value offset
 * @param value A variable-length Buffer object containing the Value
**/
function cmd_gatt_server_write_attribute_value(attribute, offset, value) {
  if (typeof value == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    value = Buffer.from(arguments, 2);  /* if this is the case, convert arguments back to a Buffer object to be able to process it, skipping the previous positional arguments */
  if (typeof value == 'string') /* We also permissively accept a string as value (3rd parameter), we will then perform the transformation to a buffer ourselves */
    value = Buffer.from(value);
  resultHead = Buffer.alloc(5); /* Allocate twice 16-bits to carry attribute + offset, and one more byte to store the length of the byte array for value */
  resultHead.writeUInt16LE(attribute, 0);
  resultHead.writeUInt16LE(offset, 2);
  if (value.length>255)
    throw new Error('Value longer than 255 bytes: ' + value.toString('hex'));
  resultHead.writeUInt8(value.length, 4);
  return Buffer.concat([resultHead, value]);
}

/**
 * @brief Implementation of command gatt_server_write_attribute_value
 * @param mask A 16-bit value containing the Enabled advertising packet type as a bitmask
 * @param gap_data_type A variable-length Buffer object containing the GAP data type
**/
function cmd_mesh_node_start_unprov_beaconing(mask, gap_data_type) {
  if (typeof gap_data_type == 'number')  /* apply() method invoked on handler changes buffer into a serie of byte arguments */
    gap_data_type = Buffer.from(arguments, 2);  /* if this is the case, convert arguments back to a Buffer object to be able to process it, skipping the previous positional arguments */
  if (typeof gap_data_type == 'string') /* We also permissively accept a string as gap_data_type (2nd parameter), we will then perform the transformation to a buffer ourselves */
    gap_data_type = Buffer.from(gap_data_type);
  resultHead = Buffer.alloc(3); /* Allocate 16-bits to carry mask, and one more byte to store the length of the byte array for gap_data_type */
  resultHead.writeUInt16LE(mask, 0);
  if (gap_data_type.length>255)
    throw new Error('gap_data_type longer than 255 bytes: ' + gap_data_type.toString('hex'));
  resultHead.writeUInt8(gap_data_type.length, 2);
  return Buffer.concat([resultHead, gap_data_type]);
}

/**
 * @brief List of known command messages, expected encoding, and specific handlers if any
 *
 * Keys are the command official name as a string (taken from the BGAPI spec, but without the 'cmd_' prefix) (ie: cmd_system_reset is called 'system_reset')
 * In each entry for a specific key, we will store a object describing the command:
 * - Attribute id is mandatory and contains the 1-byte command ID (taken from the BGAPI spec, aka method)
 * - Attribute minimumPayloadLength contains the expected minimumPayloadLength for this command (aka lolen). This will be assumed to be 0 if not provided
 * - Attrivute classId contains the class ID for this command (taken from the BGAPI spec, aka class). If not provided, it will be guessed from the prefix of command name using PrefixToClass above
 * - Attribute handler points to a function that will process and encode the command arguments, it must return a Buffer object containing the added payload of the command (excluding the fixed 4 BGAPI header bytes)
**/
const Commands = {
  'system_reset' : {
    id : 0x01,
    minimumPayloadLength : 1,
    handler : function(dfu) {
        if (dfu<0 && dfu>2)
            throw new Error("Invalid dfu value: " + dfu);
        return Buffer.from([dfu]);
    }
  },
  'system_get_bt_address' : { id : 0x03 },
  'flash_ps_erase_all' : { id : 0x01 },
  'mesh_node_init' : { id : 0x00 },
  'mesh_node_start_unprov_beaconing' : {
    id: 0x01,
    minimumPayloadLength : 1,
    handler : function(bearer) {
      return Buffer.from([bearer]);
    }
  },
  'mesh_node_set_adv_event_filter' : {
    id : 0x08,
    minimumPayloadLength : 3,
    handler : cmd_mesh_node_start_unprov_beaconing,
  },
  'gatt_server_write_attribute_value' : {
    id : 0x02,
    minimumPayloadLength : 5,
    handler : cmd_gatt_server_write_attribute_value,
  },
  'mesh_generic_client_init' : { id : 0x04 },
  'mesh_generic_server_init' : { id : 0x04 },
}

module.exports.Commands = Commands;
