/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * @fileoverview Main entry point for the Arrow Flight Server core package
 *
 * This package provides a generic Arrow Flight server framework with plugin architecture
 * for Node.js applications. It includes the core gRPC server, protocol handlers, and
 * base service classes for building Flight data services.
 */

// Core server components
export { FlightServer } from './flight-server.js';
export { FlightServiceBase } from './flight-service-base.js';
export { createProtocolHandlers } from './protocol-handlers.js';
