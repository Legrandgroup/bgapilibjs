const bgapiErrors = require('./bgapi-errors.js');

const DEBUG = false;  /* Set this to true to enable verbose debug to console */

/**
 * @brief Convert a byte into its 2-hexadecimal digit representation
 *
 * @param uint8 The byte to convert to string
 * @return The resulting string (2-digits)
**/
function UInt8ToHexStr(uint8) {
  let bb = uint8 & 0xFF;  /* Force intput to be 8-bit, mask higher bits if any */
  let resultStr = '';
  if (!(bb & 0xF0)) /* Will only convert to one digit */
    resultStr = '0'; /* So we prefix with a 0 before */
  resultStr += bb.toString(16);
  return resultStr;
}

/**
 * @brief Convert a 16-bit word its 4-hexadecimal digit representation
 *
 * @param uint16 The 16-bit value to convert to string
 * @return The resulting string (4-digits)
**/
function UInt16ToHexStr(uint16) {
  return UInt8ToHexStr(uint16 & 0xFF00) + UInt8ToHexStr(uint16 & 0x00FF);  /* Force intput to be 16-bit, mask higher bits if any */
}

/**
 * @brief BGAPI message types (corresponds to the field hilen/message type in the BGAPI protocol)
**/
const MessageTypes = {
  Command : 0x20,
  Response : 0x20,
  Event : 0xa0,
}

/**
 * @brief BGAPI message classes (corresponds to the field class in the BGAPI protocol)
**/
const Classes = {
  System : 0x01,
  PersitentStore : 0x0d,
  MeshNode : 0x14,
  GenericAttributeProfileServer : 0x0a,
  BluetoothMeshGenericClientModel : 0x1e,
  BluetoothMeshGenericServerModel : 0x1f,
}

/**
 * @brief Map of BGAPI message string prefixes to their corresponding BGAPI classes
**/
const PrefixToClass = {
  'system' : Classes.System,
  'flash_ps' : Classes.PersitentStore,
  'mesh_node' : Classes.MeshNode,
  'mesh_generic_client' : Classes.BluetoothMeshGenericClientModel,
  'mesh_generic_server' : Classes.BluetoothMeshGenericServerModel,
  'gatt_server' : Classes.GenericAttributeProfileServer,
}

var bgapiRXBuffer = Buffer.alloc(0);
var bgapiRXBufferPos = 0;

/**
 * @brief This function tries to guess a class ID based on the prefix of the command/response/event name provided as argument
 *
 * @param name The official name of the command/response/event in the BGAPI spec
 * @return The auto-detected class ID or undefined if we did not find a match
**/
function namePrefixToClassId(name) {
  for (var prefix in PrefixToClass) {
    if (PrefixToClass.hasOwnProperty(prefix)) {
      if (name.startsWith(prefix)) {
        return PrefixToClass[prefix];
      }
    }
  }
  return undefined;
}

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
  'gatt_server_write_attribute_value' : {
    id : 0x02,
    minimumPayloadLength : 5,
    handler : cmd_gatt_server_write_attribute_value,
  },
  'mesh_generic_client_init' : { id : 0x04 },
  'mesh_generic_server_init' : { id : 0x04 },
}

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
      btAddressAsStr = UInt8ToHexStr(b) + ':' + btAddressAsStr;  /* Prepend the byte (because buffer is in the reverse order in BGAPI */
    else
      btAddressAsStr = UInt8ToHexStr(b); /* Only first byte */
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
Responses[Classes.System] = {
  0x03 : {
    minimumPayloadLength : 6,
    name : 'system_get_bt_address',
    handler : rsp_system_get_bt_address,
  }
}
Responses[Classes.BluetoothMeshGenericClientModel] = {
  0x04 : {
    minimumPayloadLength : 2,
    name : 'mesh_generic_client_init',
    handler : rsp_generic_16bit_result_code,
  }
}

Responses[Classes.BluetoothMeshGenericServerModel] = {
  0x04 : {
    minimumPayloadLength : 2,
    name : 'mesh_generic_server_init',
    handler : rsp_generic_16bit_result_code,
  }
}

Responses[Classes.PersitentStore] = {
  0x01 : {
    minimumPayloadLength : 2,
    name : 'flash_ps_erase_all',
    handler : rsp_generic_16bit_result_code,
  }
}

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
  return {needsMoreBytes: 0, eatenBytes: 18, decodedPacket: result };
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
Events[Classes.System] = {
  0x00 : {
    minimumPayloadLength : 0x12,
    name : 'evt_system_boot',
    handler : evt_system_boot,
  }
}

/**
 * @brief This function creates a BGAPI byte buffer representing the command provided as first argument
 *
 * @param commandName The official name of the command in the BGAPI spec
 * @return A buffer containing the byte sequence to send over serial link to the BGAPI NCP
 *
 * @note If the command requires additional arguments, you can provide them as 2nd, 3rd etc. arguments, for example: getCommand('system_reset', 0)
**/
function getCommand(commandName) {
    if (Commands[commandName]) {
      let header = Buffer.alloc(4);
      
      header[0] = MessageTypes.Command;
      
      let minimumPayloadLength = Commands[commandName].minimumPayloadLength;
      if (minimumPayloadLength === undefined) { /* Assume 0 if no minimumPayloadLength property exists */
        minimumPayloadLength = 0;
      }
      header[1] = minimumPayloadLength;
      
      let classId = Commands[commandName].classId;
      if (classId === undefined) {  /* If no classId is present in the Commands object, then try to guess based on the command prefix */
        classId = namePrefixToClassId(commandName);
      }
      if (classId === undefined) {  /* If even guessing did not work, raise an error */
        throw new Error("Undefined class for command: " + commandName);
      }
      header[2] = classId
      
      header[3] = Commands[commandName].id;
      
      payloadHandler = Commands[commandName].handler;
      let message;
      if (payloadHandler === undefined) { /* If there is no payload handler, generate no payload */
        message = header;
      }
      else {
        let payload = Commands[commandName].handler.apply(this, Array.prototype.slice.call(arguments, 1));
        message = Buffer.concat([header, payload])
      }
      if (DEBUG) console.debug('Packet is ' + message.toString('hex'));
      return message;
    }
    else {
      throw new Error("Unknown command: " + commandName);
    }
}

/**
 * @brief Decode a response buffer
 *
 * @param buffer A Buffer object to decode (possibly too short, or with trailing bytes)
 * @return An object containing the result of the decoding process
**/
function decodeResponse(buffer) {
  console.log('Decoding response packet ' + buffer.toString('hex'));
  let bufferLength = buffer.length;
  let resultNeedsMoreBytes = 0;
  let resultEatenBytes = 0;
  let resultDecodedPacket = {};
  if (bufferLength<4) {
    resultNeedsMoreBytes = 4 - bufferLength;
  }
  else {
    if (buffer[0] != MessageTypes.Response) {
      throw new Error("Invalid response buffer: " + buffer.toString('hex'));
    }
    resultEatenBytes += 4;
    let minimumPayloadLength = buffer[1];
    let messageClass = buffer[2];
    let messageId = buffer[3];
    if (bufferLength < minimumPayloadLength + 4) {  /* Byte 3 tells us the minimum size of the packet, so we can already guess if we don't have enough bytes */
      resultNeedsMoreBytes = 4 + minimumPayloadLength - bufferLength;
    }
    else {
      if (Responses[messageClass] && Responses[messageClass][messageId]) {
        let handlerMinimumPayloadLength = Responses[messageClass][messageId].minimumPayloadLength;
        if (handlerMinimumPayloadLength === undefined)
          handlerMinimumPayloadLength = 0;  /* If no minimum size was provided by handler, just assume 0 */
        if (bufferLength < handlerMinimumPayloadLength + 4) { /* Redo the buffer length check, not on packet data but on minimum values provided by the handler */
          resultNeedsMoreBytes = 4 + handlerMinimumPayloadLength - bufferLength;
        }
        else {  /* If we reach here, we know that we should at least have the minimum bytes (indicated by .handlerMinimumPayloadLength) in the buffer to start decoding */
          let responseName = Responses[messageClass][messageId].name;
          if (Responses[messageClass][messageId].handler === undefined) {
            console.error('No handler for response message ' + responseName);
          }
          else {
            let handlerName = Responses[messageClass][messageId].name;
            if (DEBUG) {
              console.debug('Will invoke handler for ' + handlerName + ' with args:');
              console.debug(buffer.slice(4));
            }
            /* Invoke handler, removing the 4 header bytes */
            /* Note that, because buffer is an array, during this call to the handler each byte will be sent to the handler as a separate argument */
            let handlerResult = Responses[messageClass][messageId].handler.apply(this, buffer.slice(4));
            if (DEBUG) {
              console.debug('Handler result:');
              console.debug(handlerResult);
            }
            if (handlerResult) {
              if (handlerResult.eatenBytes === undefined &&
                  handlerResult.needsMoreBytes === undefined &&
                  handlerResult.decodedPacket === undefined) {  /* Simple handlers can avoid providing eatenBytes or needsMoreBytes, nor decodedPacket */
                /* In such case, they directly return the decodedPacket */
                console.warn('Unstructured response from handler assumed to be the raw result:');
                console.warn(handlerResult);
                resultDecodedPacket = handlerResult;
                console.error('No .eatenBytes attribute was provided by handler ' + handlerName + '. Using the preconfigured value from Responses definition: ' + handlerMinimumPayloadLength);
                resultEatenBytes += handlerMinimumPayloadLength;
              }
              else {  /* We have at least one attribute set among .eatenBytes, .needsMoreBytes or .decodedPacket */
                if (DEBUG) {
                  console.log('Handler ' + handlerName + ' was run, result is:');
                  console.log(handlerResult);
                }
                
                if (!(handlerResult.eatenBytes === undefined))
                  resultEatenBytes += handlerResult.eatenBytes; /* Take bytes eaten by handler into account */
                else {
                  console.error('No .eatenBytes attribute was provided by handler ' + handlerName + '. Using the preconfigured value from Responses definition: ' + handlerMinimumPayloadLength);
                  resultEatenBytes += handlerMinimumPayloadLength;
                }
                
                if (!(handlerResult.needsMoreBytes === undefined))
                  resultNeedsMoreBytes += handlerResult.needsMoreBytes; /* Take bytes needed by handler to complete decoding into account */
                else
                  console.warn('No .needsMoreBytes attribute was provided by handler ' + handlerName);
                
                resultDecodedPacket = handlerResult.decodedPacket;  /* For full feedback handlers, extract only the decodedPacket field */
              }
            }
            else {
              console.warn('No result returned by handler ' + handlerName);
              console.error('No .eatenBytes attribute was provided by handler ' + handlerName + '. Using the preconfigured value from Responses definition: ' + handlerMinimumPayloadLength);
              resultEatenBytes += handlerMinimumPayloadLength;
            }
          }
        }
      }
      else {
        console.warn('No response handler found for messageClass=0x' + UInt8ToHexStr(messageClass) + ' & messageId=0x' + UInt8ToHexStr(messageId));
      }
    }
  }
  let result = { eatenBytes: resultEatenBytes, decodedPacket: resultDecodedPacket, needsMoreBytes: resultNeedsMoreBytes };
  if (DEBUG) {
    console.debug('Returning:');
    console.debug(result);
  }
  return result;
}

/**
 * @brief Decode an event buffer
 *
 * @param buffer A Buffer object to decode (possibly too short, or with trailing bytes)
 * @return An object containing the result of the decoding process
**/
function decodeEvent(buffer) {
  console.log('Decoding event packet ' + buffer.toString('hex'));
  let bufferLength = buffer.length;
  let resultNeedsMoreBytes = 0;
  let resultEatenBytes = 0;
  let resultDecodedPacket = {};
  if (bufferLength<4) {
    resultNeedsMoreBytes = 4 - bufferLength;
  }
  else {
    if (buffer[0] != MessageTypes.Event) {
      throw new Error("Invalid event buffer: " + buffer.toString('hex'));
    }
    resultEatenBytes += 4;
    let minimumPayloadLength = buffer[1];
    let messageClass = buffer[2];
    let messageId = buffer[3];
    if (bufferLength < minimumPayloadLength + 4) {  /* Byte 3 tells us the minimum size of the packet, so we can already guess if we don't have enough bytes */
      resultNeedsMoreBytes = 4 + minimumPayloadLength - bufferLength;
    }
    else {
      if (Events[messageClass] && Events[messageClass][messageId]) {
        let handlerMinimumPayloadLength = Events[messageClass][messageId].minimumPayloadLength;
        if (handlerMinimumPayloadLength === undefined)
          handlerMinimumPayloadLength = 0;  /* If no minimum size was provided by handler, just assume 0 */
        if (bufferLength < handlerMinimumPayloadLength + 4) { /* Redo the buffer length check, not on packet data but on minimum values provided by the handler */
          resultNeedsMoreBytes = 4 + handlerMinimumPayloadLength - bufferLength;
        }
        else {
          let eventName = Events[messageClass][messageId].name;
          if (Events[messageClass][messageId].handler === undefined) {
            console.error('No handler for event message ' + eventName);
          }
          else {
            let handlerName = Events[messageClass][messageId].name;
            if (DEBUG) {
              console.debug('Will invoke handler for ' + handlerName + ' with args:');
              console.debug(buffer.slice(4));
            }
            /* Invoke handler, removing the 4 header bytes */
            /* Note that, because buffer is an array, during this call to the handler each byte will be sent to the handler as a separate argument */
            let handlerResult = Events[messageClass][messageId].handler.apply(this, buffer.slice(4));
            if (DEBUG) {
              console.debug('Handler result:');
              console.debug(handlerResult);
            }
            if (handlerResult) {
              if (handlerResult.eatenBytes === undefined &&
                  handlerResult.needsMoreBytes === undefined &&
                  handlerResult.decodedPacket === undefined) {  /* Simple handlers can avoid providing eatenBytes or needsMoreBytes, nor decodedPacket */
                /* In such case, they directly return the decodedPacket */
                console.warn('Unstructured event from handler assumed to be the raw result:');
                console.warn(handlerResult);
                resultDecodedPacket = handlerResult;
                console.error('No .eatenBytes attribute was provided by handler ' + handlerName + '. Using the preconfigured value from Events definition: ' + handlerMinimumPayloadLength);
                resultEatenBytes += handlerMinimumPayloadLength;
              }
              else {  /* We have at least one attribute set among .eatenBytes, .needsMoreBytes or .decodedPacket */
                if (DEBUG) {
                  console.log('Handler ' + handlerName + ' was run, result is:');
                  console.log(handlerResult);
                }
                
                if (!(handlerResult.eatenBytes === undefined))
                  resultEatenBytes += handlerResult.eatenBytes; /* Take bytes eaten by handler into account */
                else {
                  console.error('No .eatenBytes attribute was provided by handler ' + handlerName + '. Using the preconfigured value from Events definition: ' + handlerMinimumPayloadLength);
                  resultEatenBytes += handlerMinimumPayloadLength;
                }
                
                if (!(handlerResult.needsMoreBytes === undefined))
                  resultNeedsMoreBytes += handlerResult.needsMoreBytes; /* Take bytes needed by handler to complete decoding into account */
                else
                  console.warn('No .needsMoreBytes attribute was provided by handler ' + handlerName);
                
                resultDecodedPacket = handlerResult.decodedPacket;  /* For full feedback handlers, extract only the decodedPacket field */
              }
            }
            else {
              console.warn('No result returned by handler ' + handlerName);
              console.error('No .eatenBytes attribute was provided by handler ' + handlerName + '. Using the preconfigured value from Events definition: ' + handlerMinimumPayloadLength);
              resultEatenBytes += handlerMinimumPayloadLength;
            }
          }
        }
      }
      else {
        console.warn('No event handler found for messageClass=0x' + UInt8ToHexStr(messageClass) + ' & messageId=0x' + UInt8ToHexStr(messageId));
      }
    }
  }
  let result = { eatenBytes: resultEatenBytes, decodedPacket: resultDecodedPacket, needsMoreBytes: resultNeedsMoreBytes };
  if (DEBUG) {
    console.debug('Returning:');
    console.debug(result);
  }
  return result;
}

/**
 * @brief Decode an incoming byte buffer
 *
 * @param buffer The buffer to decode (possibly too short, or with trailing bytes)
 * @return An object containing the result of the decoding process or undefined if no decoding could be performed
**/
function decodeBuffer(buffer) {
  if (buffer[0] == MessageTypes.Response) {
    return decodeResponse(buffer);
  }
  else if (buffer[0] == MessageTypes.Event) {
    return decodeEvent(buffer);
  }
  else
    return undefined;
}

/**
 * @brief Check if a buffer starts with a valid response or event signature
 *
 * @param buffer The buffer to check
 * @return true if the buffer starts with a valid signature
**/
function validPacketStart(buffer) {
  return (buffer[0] == MessageTypes.Response ||
          buffer[0] == MessageTypes.Event); /* Found the start of a message */
}

/**
 * @brief Reset the BGAPI decoding state machine
**/
function resetParser() {
  bgapiRXBuffer = Buffer.alloc(0);
}

/**
 * @brief Try to decode messages from a receiving buffer
 *
 * @param buffer A Buffer of new incoming bytes
 * @param callback A function with 1 argument that will be set to the number of additional bytes needed to decode.
 *
 * @note This function may raise exceptions if the buffer was not properly decoded
 *
 * @return An array with two elements [newBuffer, packet] where:
 *         newBuffer is the new buffer after having consumed the decoded bytes from the buffer
 *         result is the decoded packet from the buffer
**/
function tryDecode(buffer, callback) {
  result = decodeBuffer(buffer);
  if (result === undefined) {
    throw new Error('Failure decoding buffer ' + buffer.toString('hex'));
  }
  else {
    if (!(result.needsMoreBytes === undefined) && result.needsMoreBytes > 0) {
      console.log('Missing at least ' + result.needsMoreBytes + ' more byte(s) to decode');
      callback && callback(result.needsMoreBytes);
      return [buffer, undefined];
    }
    else {
      if (result.eatenBytes <= 0) {
        throw new Error('No byte processed at the beginning of buffer ' + buffer.toString('hex'));
      }
      else {  /* Message has been parsed (eatenBytes>0) */
        if (DEBUG) {
          console.log(result.eatenBytes + ' bytes used by handler, removing them from the head of the current buffer');
          console.log('Buffer was: ' + buffer.toString('hex'));
        }
        buffer = buffer.slice(result.eatenBytes); /* Cut the first bytes that have now been decoded */
        if (DEBUG) {
          if (buffer.length>0)
            console.log('Buffer is now: ' + buffer.toString('hex'));
          else
            console.log('Buffer is now empty');
        }
        return [buffer, result.decodedPacket];  /* Good decode, return it with the new buffer where decoded bytes have been removed from the head */
      }
    }
  }
}

/**
 * @brief Add incoming bytes to the receiving buffer and try to decode as many messages as possible inside the current buffer
 *
 * @param incomingBytes A Buffer of new incoming bytes
 * @param callback A function with 3 arguments: function(err, packets, nbMoreBytesNeeded) where:
 *        err Will be an Error message if decoding failed (desynchronized buffer of undecodable content), or null if there was no error
 *        packets will be an array of successfully decoded packets, [] if there is no proper packet to decode (yet, and in this case, nbMoreBytesNeeded will be set) or null if errors were encountered
 *        nbMoreBytesNeeded is an estimation of the minimum additional bytes needed to properly decode the buffer
 *
 * @note The callback function may be invoked multiple times depending on how the process goes (often invoked several times on desynchronized buffer)
**/
function parseIncoming(incomingBytes, callback) {
  let rxBuffer = Buffer.concat([bgapiRXBuffer, incomingBytes]);
  let skippedBytes = 0;
  let goodDecode = false;
  let callbackException = null;
  
  if (DEBUG) console.debug('Entering parseIncoming() with current RX buffer: ' + rxBuffer.toString('hex'));
  while (rxBuffer.length>0) {
    if (!validPacketStart(rxBuffer)) {
      if (goodDecode) { /* We are desynchronized, but we are right after a good decode... this is dodgy */
        console.warn('Desynchronized buffer after a first good decode');
        goodDecode=false;
      }
      else {
        console.warn('Desynchronized buffer');
      }
      callback && callback(new Error("Desynchronized buffer"), null, 0);
      rxBuffer = rxBuffer.slice(1);
      skippedBytes++;
    }
    else {
      if (skippedBytes > 0) {
        console.warn('Note: skipped ' + skippedBytes + ' byte(s) preceeding a suspected message start');
        skippedBytes=0;
      }
      try {
        let bufferNeedsMoreBytes = 0;
        let result = tryDecode(rxBuffer, function(needsMoreBytes) {
            console.log('Reaching needsmodebytes callback');
            bufferNeedsMoreBytes = needsMoreBytes;
            callback && callback(null, null, needsMoreBytes);
          }
        );
        if (bufferNeedsMoreBytes>0) {
          if (DEBUG) console.debug('tryDecode() requests at least ' + bufferNeedsMoreBytes + ' byte(s) to decode, exitting the synchronization loop');
          break;
        }
        if (!(result[0] === undefined))
          rxBuffer = result[0];
        let packet = result[1];
        if (packet) {
          goodDecode = true;
          try { /* Run the callback but if if raises any exception, just raise it back to caller */
            callback && callback(null, packet, 0);
          }
          catch(exception) {
            callbackException = exception;
            break;  /* Stop decoding */
          }
        }
      }
      catch(exception) {
        console.error('Exception occurred while decoding:');
        console.error(exception.stack);
        console.error('Discarding the whole buffer');
        rxBuffer = Buffer.alloc(0);
        callback && callback(new Error("Buffer decoding failure"), null, 0);
      }
    }
  }
  if (callbackException) {
    console.warn('Stopping decoding input because callback raised the following exception:');
    console.warn(callbackException.stack);
  }
  if (rxBuffer.length != 0)
    console.warn(rxBuffer.length + ' trailing byte(s) remained undecoded');
  
  bgapiRXBuffer = rxBuffer;
  if (callbackException) {
    throw callbackException;
  }
}

module.exports.resetParser = resetParser;
module.exports.getCommand = getCommand;
module.exports.parseIncoming = parseIncoming;
