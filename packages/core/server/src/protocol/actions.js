/**
 * Arrow Flight Action Handlers
 *
 * This module contains the custom action handlers for Arrow Flight protocol.
 * These actions extend the standard Flight protocol with server-specific operations.
 */

import { convertToGrpcError, FLIGHT_PROTOCOL } from '@flightstream/core-shared';

/**
 * Handle refresh-datasets action
 * @param {Object} call - gRPC call object
 * @param {Object} flightService - Flight service instance
 */
export async function handleRefreshDatasets(call, flightService) {
  try {
    console.log('Refreshing datasets...');
    await flightService.refreshDatasets();

    const datasets = flightService.getDatasets();
    call.write({
      type: FLIGHT_PROTOCOL.ACTION_TYPES.REFRESH_DATASETS,
      body: Buffer.from(JSON.stringify({
        status: 'success',
        message: `Refreshed ${datasets.length} datasets`,
        datasets: datasets
      }))
    });

    call.end();
  } catch (error) {
    console.error('Error refreshing datasets:', error);
    call.write({
      type: 'error',
      body: Buffer.from(JSON.stringify({
        error: 'Failed to refresh datasets',
        details: error.message
      }))
    });
    call.end();
  }
}

/**
 * Handle get-server-info action
 * @param {Object} call - gRPC call object
 * @param {Object} flightService - Flight service instance
 */
export function handleGetServerInfo(call, flightService) {
  try {
    const datasets = flightService.getDatasets();
    const serverInfo = {
      server: 'Arrow Flight Server',
      version: '1.0.0',
      protocol_version: FLIGHT_PROTOCOL.VERSION,
      datasets: {
        count: datasets.length,
        list: datasets
      },
      capabilities: [
        'listFlights',
        'getFlightInfo',
        'getSchema',
        'doGet',
        'doAction',
        'listActions'
      ],
      timestamp: new Date().toISOString()
    };

    call.write({
      type: FLIGHT_PROTOCOL.ACTION_TYPES.GET_SERVER_INFO,
      body: Buffer.from(JSON.stringify(serverInfo, null, 2))
    });

    call.end();
  } catch (error) {
    console.error('Error getting server info:', error);
    call.write({
      type: 'error',
      body: Buffer.from(JSON.stringify({
        error: 'Failed to get server info',
        details: error.message
      }))
    });
    call.end();
  }
}

/**
 * Get available action types
 * @returns {Array} List of available action types
 */
export function getAvailableActions() {
  return Object.values(FLIGHT_PROTOCOL.ACTION_TYPES);
}

/**
 * Validate action type
 * @param {string} actionType - Action type to validate
 * @returns {boolean} True if action type is valid
 */
export function isValidActionType(actionType) {
  return Object.values(FLIGHT_PROTOCOL.ACTION_TYPES).includes(actionType);
} 