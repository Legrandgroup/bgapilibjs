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

module.exports.UInt8ToHexStr = UInt8ToHexStr;
module.exports.UInt16ToHexStr = UInt16ToHexStr;
