/**
 * @brief BGAPI 16-bit error codes (often returned as the result field in responses)
 *
 * This has been extracted from BGAPI specs rev 1.5.0
 *
 * @note To generate this JSON almost automatically, here is a magic sed command to run on a dumped text file copied over from the BGAPI spec
 * @code{cat bgapi-error-codes.txt | sed -n -e "s/^.*\(0x[[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]]\)[[:blank:]][[:blank:]]*\([^[:blank:]]*\).*$/\1: '\2',/p" | sort}
**/

const errorCodes = {
0x0000: 'success',
0x0101: 'invalid_conn_handle',
0x0102: 'waiting_response',
0x0103: 'gatt_connection_timeout',
0x0180: 'invalid_param',
0x0181: 'wrong_state',
0x0182: 'out_of_memory',
0x0183: 'not_implemented',
0x0184: 'invalid_command',
0x0185: 'timeout',
0x0186: 'not_connected',
0x0187: 'flow',
0x0188: 'user_attribute',
0x0189: 'invalid_license_key',
0x018a: 'command_too_long',
0x018b: 'out_of_bonds',
0x018c: 'unspecified',
0x018d: 'hardware',
0x018e: 'buffers_full',
0x018f: 'disconnected',
0x0190: 'too_many_requests',
0x0191: 'not_supported',
0x0192: 'no_bonding',
0x0193: 'crypto',
0x0194: 'data_corrupted',
0x0195: 'command_incomplete',
0x0196: 'not_initialized',
0x0197: 'invalid_sync_handle',
0x0198: 'invalid_module_action',
0x0199: 'radio',
0x0202: 'unknown_connection_identifier',
0x0205: 'authentication_failure',
0x0206: 'pin_or_key_missing',
0x0207: 'memory_capacity_exceeded',
0x0208: 'connection_timeout',
0x0209: 'connection_limit_exceeded',
0x020a: 'synchronous_connectiontion_limit_exceeded',
0x020b: 'acl_connection_already_exists',
0x020c: 'command_disallowed',
0x020d: 'connection_rejected_due_to_limited_resources',
0x020e: 'connection_rejected_due_to_security_reasons',
0x020f: 'connection_rejected_due_to_unacceptable_bd_addr',
0x0210: 'connection_accept_timeout_exceeded',
0x0211: 'unsupported_feature_or_parameter_value',
0x0212: 'invalid_command_parameters',
0x0213: 'remote_user_terminated',
0x0214: 'remote_device_terminated_connection_due_to_low_resources',
0x0215: 'remote_powering_off',
0x0216: 'connection_terminated_by_local_host',
0x0217: 'repeated_attempts',
0x0218: 'pairing_not_allowed',
0x021a: 'unsupported_remote_feature',
0x021f: 'unspecified_error',
0x0222: 'll_response_timeout',
0x0223: 'll_procedure_collision',
0x0225: 'encryption_mode_not_acceptable',
0x0226: 'link_key_cannot_be_changed',
0x0228: 'instant_passed',
0x0229: 'pairing_with_unit_key_not_supported',
0x022a: 'different_transaction_collision',
0x022e: 'channel_assessment_not_supported',
0x022f: 'insufficient_security',
0x0230: 'parameter_out_of_mandatory_range',
0x0237: 'simple_pairing_not_supported_by_host',
0x0238: 'host_busy_pairing',
0x0239: 'connection_rejected_due_to_no_suitable_channel_found',
0x023a: 'controller_busy',
0x023b: 'unacceptable_connection_interval',
0x023c: 'advertising_timeout',
0x023d: 'connection_terminated_due_to_mic_failure',
0x023e: 'connection_failed_to_be_established',
0x023f: 'mac_connection_failed',
0x0240: 'coarse_clock_adjustment_rejected_but_will_try_to_adjust_using_clock_dragging',
0x0242: 'unknown_advertising_identifier',
0x0243: 'limit_reached',
0x0244: 'operation_cancelled_by_host',
0x0245: 'packet_too_long',
0x0301: 'passkey_entry_failed',
0x0302: 'oob_not_available',
0x0303: 'authentication_requirements',
0x0304: 'confirm_value_failed',
0x0305: 'pairing_not_supported',
0x0306: 'encryption_key_size',
0x0307: 'command_not_supported',
0x0308: 'unspecified_reason',
0x0309: 'repeated_attempts',
0x030a: 'invalid_parameters',
0x030b: 'dhkey_check_failed',
0x030c: 'numeric_comparison_failed',
0x030d: 'bredr_pairing_in_progress',
0x030e: 'cross_transport_key_derivation_generation_not_allowed',
0x0401: 'invalid_handle',
0x0402: 'read_not_permitted',
0x0403: 'write_not_permitted',
0x0404: 'invalid_pdu',
0x0405: 'insufficient_authentication',
0x0406: 'request_not_supported',
0x0407: 'invalid_offset',
0x0408: 'insufficient_authorization',
0x0409: 'prepare_queue_full',
0x040a: 'att_not_found',
0x040b: 'att_not_long',
0x040c: 'insufficient_enc_key_size',
0x040d: 'invalid_att_length',
0x040e: 'unlikely_error',
0x040f: 'insufficient_encryption',
0x0410: 'unsupported_group_type',
0x0411: 'insufficient_resources',
0x0412: 'out_of_sync',
0x0413: 'value_not_allowed',
0x0480: 'application',
0x0501: 'ps_store_full',
0x0502: 'ps_key_not_found',
0x0503: 'i2c_ack_missing',
0x0504: 'i2c_timeout',
0x0901: 'file_not_found',
0x0a01: 'file_open_failed',
0x0a02: 'xml_parse_failed',
0x0a03: 'device_connection_failed',
0x0a04: 'device_comunication_failed',
0x0a05: 'authentication_failed',
0x0a06: 'incorrect_gatt_database',
0x0a07: 'disconnected_due_to_procedure_collision',
0x0a08: 'disconnected_due_to_secure_session_failed',
0x0a09: 'encryption_decryption_error',
0x0a0a: 'maximum_retries',
0x0a0b: 'data_parse_failed',
0x0a0c: 'pairing_removed',
0x0a0d: 'inactive_timeout',
0x0a0e: 'mismatched_or_insufficient_security',
0x0b01: 'image_signature_verification_failed',
0x0b02: 'file_signature_verification_failed',
0x0b03: 'image_checksum_error',
0x0c01: 'already_exists',
0x0c02: 'does_not_exist',
0x0c03: 'limit_reached',
0x0c04: 'invalid_address',
0x0c05: 'malformed_data',
0x0c06: 'already_initialized',
0x0c07: 'not_initialized',
0x0c08: 'no_friend_offer',
0x0c09: 'prov_link_closed',
0x0c0a: 'prov_invalid_pdu',
0x0c0b: 'prov_invalid_pdu_format',
0x0c0c: 'prov_unexpected_pdu',
0x0c0d: 'prov_confirmation_failed',
0x0c0e: 'prov_out_of_resources',
0x0c0f: 'prov_decryption_failed',
0x0c10: 'prov_unexpected_error',
0x0c11: 'prov_cannot_assign_addr',
0x0c12: 'address_temporarily_unavailable',
0x0c13: 'address_already_used',
0x0d01: 'remote_disconnected',
0x0d02: 'local_disconnected',
0x0d03: 'cid_not_exist',
0x0d04: 'le_disconnected',
0x0d05: 'flow_control_violated',
0x0d06: 'flow_control_credit_overflowed',
0x0d07: 'no_flow_control_credit',
0x0d08: 'connection_request_timeout',
0x0d09: 'invalid_cid',
0x0d0a: 'wrong_state',
0x0e01: 'invalid_address',
0x0e02: 'invalid_model',
0x0e03: 'invalid_app_key',
0x0e04: 'invalid_net_key',
0x0e05: 'insufficient_resources',
0x0e06: 'key_index_exists',
0x0e07: 'invalid_publish_params',
0x0e08: 'not_subscribe_model',
0x0e09: 'storage_failure',
0x0e0a: 'not_supported',
0x0e0b: 'cannot_update',
0x0e0c: 'cannot_remove',
0x0e0d: 'cannot_bind',
0x0e0e: 'temporarily_unable',
0x0e0f: 'cannot_set',
0x0e10: 'unspecified',
0x0e11: 'invalid_binding',
};

module.exports.errorCodes = errorCodes;
