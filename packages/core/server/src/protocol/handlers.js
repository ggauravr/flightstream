/**
 * Arrow Flight Protocol Handlers
 *
 * This module contains the standard gRPC method handlers for Arrow Flight protocol.
 * These handlers bridge between the gRPC server and the Flight service implementation.
 *
 * Each handler:
 * 1. Receives gRPC calls from clients
 * 2. Validates request parameters
 * 3. Delegates to the appropriate Flight service method
 * 4. Handles errors and converts them to appropriate gRPC status codes
 */

import { convertToGrpcError, FLIGHT_PROTOCOL } from '@flightstream/core-shared';
import { 
  handleRefreshDatasets, 
  handleGetServerInfo, 
  getAvailableActions,
  isValidActionType 
} from './actions.js';

/**
 * Create protocol handlers for a Flight service instance
 * @param {FlightServiceBase} flightService - Flight service implementation
 * @returns {Object} gRPC method handlers
 */
export function createProtocolHandlers(flightService) {
  return {
    /**
     * Handshake Handler
     *
     * Arrow Flight handshake is used for:
     * - Authentication between client and server
     * - Protocol version negotiation
     * - Session establishment
     */
    handshake: (call) => {
      console.log('Handshake called');

      // Handle incoming handshake requests from client
      call.on('data', (request) => {
        console.log('Handshake request received:', request);

        // Send handshake response back to client
        // In a production system, this would include authentication validation
        call.write({
          protocol_version: request.protocol_version || 1,
          payload: Buffer.from('handshake-response')
        });
      });

      // Client has finished sending handshake data
      call.on('end', () => {
        call.end();
      });

      // Handle handshake errors
      call.on('error', (error) => {
        console.error('Handshake error:', error);
      });
    },

    /**
     * ListFlights Handler
     *
     * Arrow Flight's discovery mechanism - allows clients to find available datasets.
     * This is a server streaming RPC that returns a stream of FlightInfo objects.
     */
    listFlights: (call) => {
      console.log('ListFlights called');
      try {
        flightService.listFlights(call);
      } catch (error) {
        console.error('Error in listFlights handler:', error);
        call.emit('error', convertToGrpcError(error));
      }
    },

    /**
     * GetFlightInfo Handler
     *
     * Gets detailed metadata about a specific dataset identified by FlightDescriptor.
     * This is a unary RPC (single request, single response).
     */
    getFlightInfo: (call, callback) => {
      console.log('GetFlightInfo called');
      try {
        // gRPC unary calls use callbacks, so we pass the callback to FlightService
        const callWithCallback = { ...call, callback };
        flightService.getFlightInfo(callWithCallback);
      } catch (error) {
        console.error('Error in getFlightInfo handler:', error);
        callback(convertToGrpcError(error));
      }
    },

    /**
     * GetSchema Handler
     *
     * Returns just the Arrow schema for a dataset, without any data.
     * This is useful for clients that need to prepare for data processing
     * without actually retrieving the full dataset.
     */
    getSchema: (call, callback) => {
      console.log('GetSchema called');
      try {
        // gRPC unary calls use callbacks, so we pass the callback to FlightService
        const callWithCallback = { ...call, callback };
        flightService.getSchema(callWithCallback);
      } catch (error) {
        console.error('Error in getSchema handler:', error);
        callback(convertToGrpcError(error));
      }
    },

    /**
     * DoGet Handler
     *
     * The main data transfer operation - streams dataset data to client.
     * This is a server streaming RPC that sends FlightData messages containing
     * Arrow record batches in IPC format.
     */
    doGet: (call) => {
      console.log('DoGet called');
      try {
        flightService.doGet(call);
      } catch (error) {
        console.error('Error in doGet handler:', error);
        call.emit('error', convertToGrpcError(error));
      }
    },

    /**
     * DoPut Handler
     *
     * Upload data from client to server. This is a client streaming RPC
     * where the client sends Arrow data and the server processes it.
     */
    doPut: (call) => {
      console.log('DoPut called - not implemented');

      // Collect incoming data
      const recordBatches = [];

      call.on('data', (flightData) => {
        console.log('Received flight data:', flightData);
        recordBatches.push(flightData);
      });

      call.on('end', () => {
        console.log(`DoPut completed with ${recordBatches.length} record batches`);

        // Send response indicating success
        call.write({
          app_metadata: Buffer.from(JSON.stringify({
            status: 'success',
            records_received: recordBatches.length
          }))
        });

        call.end();
      });

      call.on('error', (error) => {
        console.error('DoPut error:', error);
      });
    },

    /**
     * DoAction Handler
     *
     * Execute custom server actions. This allows for server-specific operations
     * beyond the standard Flight protocol.
     */
    doAction: (call) => {
      console.log('DoAction called');

      try {
        const action = call.request;
        const actionType = action.type;
        // const _actionBody = action.body ? action.body.toString() : '';

        console.log(`Executing action: ${actionType}`);

        switch (actionType) {
        case FLIGHT_PROTOCOL.ACTION_TYPES.REFRESH_DATASETS:
          handleRefreshDatasets(call, flightService);
          break;

        case FLIGHT_PROTOCOL.ACTION_TYPES.GET_SERVER_INFO:
          handleGetServerInfo(call, flightService);
          break;

        default:
          console.warn(`Unknown action type: ${actionType}`);
          call.write({
            type: 'error',
            body: Buffer.from(JSON.stringify({
              error: `Unknown action type: ${actionType}`,
              available_actions: getAvailableActions()
            }))
          });
          call.end();
        }
      } catch (error) {
        console.error('Error in doAction:', error);
        call.emit('error', convertToGrpcError(error));
      }
    },

    /**
     * ListActions Handler
     *
     * List available custom actions that can be executed via DoAction.
     */
    listActions: (call) => {
      console.log('ListActions called');
      try {
        flightService.listActions(call);
      } catch (error) {
        console.error('Error in listActions handler:', error);
        call.emit('error', convertToGrpcError(error));
      }
    }
  };
}

// Action handlers are now imported from ./actions.js

export default createProtocolHandlers;
