
require('./bgapi-errors.js');

const MessageTypes = {
  Command : 0x20,
  Response : 0x20,
  Event : 0x0a,
}

const Classes = {
  System : 0x01,
  PersitentStore : 0x0d,
  MeshNode : 0x14,
  BluetoothMeshGenericClientModel : 0x1e,
  BluetoothMeshGenericServerModel : 0x1f,
}

const PrefixToClass = {
  'system' : Classes.System,
  'flash_ps' : Classes.PersitentStore,
  'mesh_node' : Classes.MeshNode,
  'mesh_generic_client' : Classes.BluetoothMeshGenericClientModel,
  'mesh_generic_server' : Classes.BluetoothMeshGenericServerModel,
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
    id : 0x00,
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
  'mesh_generic_client_init' : { id : 0x04 },
  'mesh_generic_server_init' : { id : 0x04 },
}

function system_get_bt_address(buffer) {
  console.debug('Got arg:');
  console.debug(buffer);
  console.log('system_get_bt_address ' + buffer.toString('hex'));
  return 'test_result';
}

/**
 * @brief List of known response messages and associated handlers
**/
const Responses = {
  0x01 : {  /* Classes.System == 0x01. All responses in system class go here */
    0x03 : {  /* This is the message id */
      minimumPayloadLength : 6,
      name : 'system_get_bt_address',
      handler : system_get_bt_address,
    }
  }
}

/**
 * @brief List of known event messages and associated handlers
**/
const Events = {
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
      console.log('Packet is ' + message.toString('hex'));
      return message;
    }
    else {
      throw new Error("Unknown command: " + commandName);
    }
}

/**
 * @brief Decode a response buffer
 *
 * @param buffer The buffer to decode (possibly too short, or with trailing bytes)
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
        let handlerMinimumPayloadLength = Responses[messageClass][messageId].handlerMinimumPayloadLength;
        if (handlerMinimumPayloadLength === undefined)
          handlerMinimumPayloadLength = 0;  /* If no minimum size was provided by handler, just assume 0 */
        if (bufferLength < handlerMinimumPayloadLength + 4) { /* Redo the buffer length check, not on packet data but on minimum values provided by the handler */
          resultNeedsMoreBytes = 4 + handlerMinimumPayloadLength - bufferLength;
        }
        else {
          let responseName = Responses[messageClass][messageId].name;
          if (Responses[messageClass][messageId].handler === undefined) {
            console.log('No handler for response message ' + responseName);
          }
          else {
            console.debug('Will invoke handler for ' + Responses[messageClass][messageId].name + ' with args:');
            console.debug(buffer.slice(4));
            let handlerResult = Responses[messageClass][messageId].handler(buffer.slice(4));  /* Invoke handler, removing the 4 header bytes */
            if (handlerResult) {
              if (!(handlerResult.eatenBytes === undefined))
                resultEatenBytes += handlerResult.eatenBytes; /* Take bytes eaten by handler into account */
              if (!(handlerResult.needsMoreBytes === undefined))
                resultNeedsMoreBytes += handlerResult.needsMoreBytes; /* Take bytes needed by handler to complete decoding into account */
              if (handlerResult.eatenBytes === undefined &&
                  handlerResult.needsMoreBytes === undefined &&
                  handlerResult.decodedPacket === undefined) {  /* Simple handlers can avoid providing eatenBytes or needsMoreBytes, nor decodedPacket */
                /* In such case, they directly return the decodedPacket */
                resultDecodedPacket = handlerResult;
              }
              else {
                resultDecodedPacket = handlerResult.decodedPacket;  /* For full feedback handlers, extract only the decodedPacket field */
              }
            }
          }
        }
      }
    }
  }
  let result = { eatenBytes: resultEatenBytes, decodedPacket: resultDecodedPacket, needsMoreBytes: resultNeedsMoreBytes };
  console.log('Returning:');
  console.log(result);
  return result;
}

/**
 * @brief Decode an event buffer
 *
 * @param buffer The buffer to decode (possibly too short, or with trailing bytes)
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
    resultEatenBytes += 4;
    if (buffer[0] != MessageTypes.Event) {
      throw new Error("Invalid event buffer: " + buffer.toString('hex'));
    }
  }
  let result = { eatenBytes: resultEatenBytes, decodedPacket: resultDecodedPacket, needsMoreBytes: resultNeedsMoreBytes };
  console.log('Returning:');
  console.log(result);
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

function parseIncoming(incomingBytes, callback) {
  let rxBuffer = Buffer.concat([bgapiRXBuffer, incomingBytes]);
  let skippedBytes = 0;
  console.debug('Current buffer: ' + rxBuffer.toString('hex'));
  while (rxBuffer.length>0) {
    if (!validPacketStart(rxBuffer)) {
      console.warn('Desynchronized buffer');
      callback && callback(new Error("Desynchronized buffer"), null);
      rxBuffer = rxBuffer.slice(1);
      skippedBytes++;
    }
    else {
      if (skippedBytes > 0) {
        console.warn('Note: ' + skippedBytes + ' byte(s) skipped at head of incoming buffer');
      }
      let result = decodeBuffer(rxBuffer);
      if (result === undefined) {
        console.error('Failure decoding buffer ' + rxBuffer.toString('hex') + '. Discarding the whole buffer');
        rxBuffer = Buffer.alloc(0);
      }
      else {
        if (!(result.needsMoreBytes === undefined) && result.needsMoreBytes > 0) {
          console.debug('Missing at least ' + result.needsMoreBytes + ' more byte(s) to decode');
          break;
        }
        else {
          if (result.eatenBytes <= 0) {
            console.error('Error: no byte processed at the beginning of buffer ' + rxBuffer.toString('hex') + '. Discarding the whole buffer');
            rxBuffer = Buffer.alloc(0);
          }
          else {
            rxBuffer = rxBuffer.slice(result.eatenBytes); /* Cut the first bytes that have now been decoded */
          }
        }
      }
    }
  }
  if (rxBuffer.length != 0)
    console.warn(rxBuffer.length + ' trailing byte(s) remained undecoded');
  
  bgapiRXBuffer = rxBuffer;
}

module.exports.resetParser = resetParser;
module.exports.getCommand = getCommand;
module.exports.parseIncoming = parseIncoming;
