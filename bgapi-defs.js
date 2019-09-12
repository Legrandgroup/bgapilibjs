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
  GenericAccessProfile : 0x03,
  ConnectionManagement : 0x08,
  PersitentStore : 0x0d,
  MeshNode : 0x14,
  GenericAttributeProfileServer : 0x0a,
  BluetoothMeshHealthServerModel : 0x1b,
  BluetoothMeshGenericClientModel : 0x1e,
  BluetoothMeshGenericServerModel : 0x1f,
}

/**
 * @brief Map of BGAPI message string prefixes to their corresponding BGAPI classes
**/
const PrefixToClass = {
  'system' : Classes.System,
  'le_gap' : Classes.GenericAccessProfile,
  'le_connection' : Classes.ConnectionManagement,
  'flash_ps' : Classes.PersitentStore,
  'mesh_node' : Classes.MeshNode,
  'mesh_health_server' : Classes.BluetoothMeshHealthServerModel,
  'mesh_generic_client' : Classes.BluetoothMeshGenericClientModel,
  'mesh_generic_server' : Classes.BluetoothMeshGenericServerModel,
  'gatt_server' : Classes.GenericAttributeProfileServer,
}

module.exports.MessageTypes = MessageTypes;
module.exports.Classes = Classes;
module.exports.PrefixToClass = PrefixToClass;
