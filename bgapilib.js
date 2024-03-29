const bgapiDefs = require('./bgapi-defs.js');
const bgapiResponses = require('./bgapi-responses.js');
const bgapiEvents = require('./bgapi-events.js');
const bgapiCommands = require('./bgapi-commands.js');
const bgapiUtils = require('./bgapi-utils.js');

const DEBUG = true;  /* Set this to true to enable verbose debug to console */

var bgapiRXBuffer = Buffer.alloc(0);
var bgapiRXBufferPos = 0;

/**
 * @brief This function tries to guess a class ID based on the prefix of the command/response/event name provided as argument
 *
 * @param name The official name of the command/response/event in the BGAPI spec
 * @return The auto-detected class ID or undefined if we did not find a match
**/
function namePrefixToClassId(name) {
  for (var prefix in bgapiDefs.PrefixToClass) {
    if (bgapiDefs.PrefixToClass.hasOwnProperty(prefix)) {
      if (name.startsWith(prefix)) {
        return bgapiDefs.PrefixToClass[prefix];
      }
    }
  }
  return undefined;
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
    if (bgapiCommands.Commands[commandName]) {
      let header = Buffer.alloc(4);
      
      header[0] = bgapiDefs.MessageTypes.Command;
      
      let minimumPayloadLength = bgapiCommands.Commands[commandName].minimumPayloadLength;
      if (minimumPayloadLength === undefined) { /* Assume 0 if no minimumPayloadLength property exists */
        minimumPayloadLength = 0;
      }
      header[1] = minimumPayloadLength;
      
      let classId = bgapiCommands.Commands[commandName].classId;
      if (classId === undefined) {  /* If no classId is present in the Commands object, then try to guess based on the command prefix */
        classId = namePrefixToClassId(commandName);
      }
      if (classId === undefined) {  /* If even guessing did not work, raise an error */
        throw new Error("Undefined class for command: " + commandName);
      }
      header[2] = classId
      
      header[3] = bgapiCommands.Commands[commandName].id;
      
      payloadHandler = bgapiCommands.Commands[commandName].handler;
      let message;
      if (payloadHandler === undefined) { /* If there is no payload handler, generate no payload */
        message = header;
      }
      else {
        let payload = bgapiCommands.Commands[commandName].handler.apply(this, Array.prototype.slice.call(arguments, 1));
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
 * @brief Decode an event or response buffer
 *
 * @note This code is common for events or response
 *
 * @param buffer A Buffer object to decode (possibly too short, or with trailing bytes)
 * @return An object containing the result of the decoding process
**/
function decodeBuffer(buffer) {
  let incomingMessageType;
  let incomingMessageHandlerDescr;
  switch (buffer[0]) {
    case bgapiDefs.MessageTypes.Response:
      incomingMessageType = 'response';
      incomingMessageNamePrefix = 'rsp_';
      incomingMessageHandlerDescr = bgapiResponses.Responses;
      break;
    case bgapiDefs.MessageTypes.Event:
      incomingMessageType = 'event';
      incomingMessageNamePrefix = 'evt_';
      incomingMessageHandlerDescr = bgapiEvents.Events;
      break;
    default:
      throw new Error("Unknown message type: 0x" + bgapiDefs.UInt8ToHexStr(buffer[0]));
  }
  /* The code below is generic and processes indifferently response or event messages */
  /* incomingMessageType is a the human-friendly string representation type of the message (for logging purposes) */
  /* incomingMessageHandlerDescr is an alias for the message handler description (either bgapiResponses.Responses or bgapiResponses.Events) */
  
  console.log('Decoding ' + incomingMessageType + ' packet ' + buffer.toString('hex'));
  let bufferLength = buffer.length;
  let resultNeedsMoreBytes = 0;
  let resultEatenBytes = 0;
  let resultDecodedPacket = {};
  let identifiedMessageId = '';
  if (bufferLength<4) {
    resultNeedsMoreBytes = 4 - bufferLength;
  }
  else {
    resultEatenBytes += 4;
    let minimumPayloadLength = buffer[1];
    let messageClass = buffer[2];
    let messageId = buffer[3];
    if (bufferLength < minimumPayloadLength + 4) {  /* Byte 3 tells us the minimum size of the packet, so we can already guess if we don't have enough bytes */
      resultNeedsMoreBytes = 4 + minimumPayloadLength - bufferLength;
    }
    else {
      if (incomingMessageHandlerDescr[messageClass] && incomingMessageHandlerDescr[messageClass][messageId]) {
        let handlerMinimumPayloadLength = incomingMessageHandlerDescr[messageClass][messageId].minimumPayloadLength;
        if (handlerMinimumPayloadLength === undefined)
          handlerMinimumPayloadLength = 0;  /* If no minimum size was provided by handler, just assume 0 */
        if (bufferLength < handlerMinimumPayloadLength + 4) { /* Redo the buffer length check, not on packet data but on minimum values provided by the handler */
          resultNeedsMoreBytes = 4 + handlerMinimumPayloadLength - bufferLength;
        }
        else {  /* If we reach here, we know that we should at least have the minimum bytes (indicated by .handlerMinimumPayloadLength) in the buffer to start decoding */
          let interpretedMessageName = incomingMessageHandlerDescr[messageClass][messageId].name;
          if (incomingMessageHandlerDescr[messageClass][messageId].handler === undefined) {
            console.error('No handler for ' + incomingMessageType + ' message ' + interpretedMessageName);
          }
          else {
            let handlerName = incomingMessageHandlerDescr[messageClass][messageId].name;
            identifiedMessageId = incomingMessageNamePrefix + handlerName;
            if (DEBUG) {
              console.debug('Will invoke handler for ' + handlerName + ' with args:');
              console.debug(buffer.slice(4));
            }
            /* Invoke handler, removing the 4 header bytes */
            /* Note that, because buffer is an array, during this call to the handler each byte will be sent to the handler as a separate argument */
            let handlerResult = incomingMessageHandlerDescr[messageClass][messageId].handler.apply(this, buffer.slice(4));
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
                console.error('No .eatenBytes attribute was provided by handler ' + handlerName + '. Using the preconfigured value from ' + incomingMessageType + 's definition: ' + handlerMinimumPayloadLength);
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
                  console.error('No .eatenBytes attribute was provided by handler ' + handlerName + '. Using the preconfigured value from ' + incomingMessageType + 's definition: ' + handlerMinimumPayloadLength);
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
              console.error('No .eatenBytes attribute was provided by handler ' + handlerName + '. Using the preconfigured value from ' + incomingMessageType + 's definition: ' + handlerMinimumPayloadLength);
              resultEatenBytes += handlerMinimumPayloadLength;
            }
          }
        }
      }
      else {
        console.warn('No ' + incomingMessageType + ' handler found for messageClass=0x' + bgapiUtils.UInt8ToHexStr(messageClass) + ' & messageId=0x' + bgapiUtils.UInt8ToHexStr(messageId));
      }
    }
  }
  let result = { messageId: identifiedMessageId, eatenBytes: resultEatenBytes, decodedPacket: resultDecodedPacket, needsMoreBytes: resultNeedsMoreBytes };
  if (DEBUG) {
    console.debug('Returning:');
    console.debug(result);
  }
  return result;
}

/**
 * @brief Check if a buffer starts with a valid response or event signature
 *
 * @param buffer The buffer to check
 * @return true if the buffer starts with a valid signature
**/
function validPacketStart(buffer) {
  return (buffer[0] == bgapiDefs.MessageTypes.Response ||
          buffer[0] == bgapiDefs.MessageTypes.Event); /* Found the start of a message */
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
  try {
    result = decodeBuffer(buffer);
  }
  catch (exception) {
    console.error('Caught an exception in buffer decoding handler: ');
    console.error(exception.stack);
    throw new Error('Failure decoding buffer ' + buffer.toString('hex'));
  }
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
      if (result.decodedPacket.messageId != undefined)
        console.warn('messageId was already set in the result from handler, it will be overwritten anyway. Please fix the handler');
      else
        result.decodedPacket.messageId = result.messageId;  /* Transfer the detected message ID into the result */
      return [buffer, result.decodedPacket];  /* Good decode, return it with the new buffer where decoded bytes have been removed from the head */
    }
  }
}

/**
 * @brief Add incoming bytes to the receiving buffer and try to decode as many messages as possible inside the current buffer
 *
 * @param incomingBytes A Buffer of new incoming bytes
 * @param callback A function with 3 arguments: function(err, packets, nbMoreBytesNeeded) where:
 *        err Will be an Error message if decoding failed (desynchronized buffer of undecodable content), or null if there was no error
 *        packet is a successfully decoded packet, or null if there is no proper packet to decode (yet, and in this case, nbMoreBytesNeeded will be set) or if errors were encountered (in such case err is non null)
 *        nbMoreBytesNeeded is an estimation of the minimum additional bytes needed to properly decode the buffer
 *
 * @note The callback function may be invoked multiple times depending on how the process goes (often invoked several times on desynchronized buffer)
**/
function parseIncomingIterate(incomingBytes, callback) {
  let rxBuffer = Buffer.concat([bgapiRXBuffer, incomingBytes]);
  let skippedBytes = 0;
  let goodDecode = false;
  let callbackException = null;
  
  if (DEBUG) console.debug('Entering parseIncomingIterate() with current RX buffer: ' + rxBuffer.toString('hex'));
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
            try {
              callback && callback(null, null, needsMoreBytes);
            }
            catch(exception) {
              callbackException = exception;
            }
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

/**
 * @brief Add incoming bytes to the receiving buffer and try to decode as many messages as possible inside the current buffer
 *
 * @param incomingBytes A Buffer of new incoming bytes
 * @param callback A function with 3 arguments: function(err, packets, nbMoreBytesNeeded) where:
 *        err Will be an Error message describing issues during decoding (desynchronized buffer of undecodable content), it will be non null only if no packet could be decoded at all, but errors will be muted otherwise
 *        packets is an array of successfully decoded packet, or null if there was no packet decoded at all (yet, and in this case, nbMoreBytesNeeded will be set) or if errors were encountered (in such case err is non null)
 *        nbMoreBytesNeeded is an estimation of the minimum additional bytes needed to properly decode the buffer
 *
 * @note The callback function will be invoked exactly and only once with an array of all successfully decoded packets or with error conditions, except where an exception is raised, when it might not be invoked at all.
**/
function parseIncoming(incomingBytes, callback) {
  let queuedPackets = []
  let queuedError = null;
  let queuedNbMoreBytesNeeded = 0;
  
  parseIncomingIterate(incomingBytes, function(err, packet, nbMoreBytesNeeded) {
      if (err)
        queuedError = err;
      else {
        if (packet == null) {  /* No packet was decoded */
          if (nbMoreBytesNeeded>0)
            queuedNbMoreBytesNeeded = nbMoreBytesNeeded;
        }
        else {
          queuedPackets.push(packet);
        }
      }
    }
  );
  
  if (queuedPackets.length>0) {
    callback && callback(null, queuedPackets, queuedNbMoreBytesNeeded);
  }
  else if (queuedError) { /* Errors will be sent to callback only if there is absolutely no packet decoded */
    callback && callback(queuedError, null, queuedNbMoreBytesNeeded);
  }
  else if (queuedNbMoreBytesNeeded>0) {
    callback && callback(null, null, queuedNbMoreBytesNeeded);
  }
}

/**
 * @brief Retrieve the current receive buffer (that has been built so far by subsequent calls to parseIncomingIterate()
 *
 * @return The receive buffer
 *
 * @note Once bytes are used to successfully decode BGAPI messages, they are removed from the buffer),
 *       also, calls to resetParser() will flush the receive buffer
**/
function getCurrentRxBuffer() {
  return bgapiRXBuffer;
}

module.exports.resetParser = resetParser;
module.exports.getCommand = getCommand;
module.exports.parseIncomingIterate = parseIncomingIterate;
module.exports.parseIncoming = parseIncoming;
module.exports.getCurrentRxBuffer = getCurrentRxBuffer;
