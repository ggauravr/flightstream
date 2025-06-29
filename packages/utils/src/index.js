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
 * @fileoverview FlightStream Utilities Package
 *
 * This package provides utilities for working with Arrow data and Flight protocol
 * in FlightStream. It includes schema inference, arrow building, and type system
 * components.
 */

// Core utilities
export { ArrowBuilder } from './arrow-builder.js';
export { inferSchema, inferColumnType, normalizeSchema, generateArrowSchema } from './schema-inference.js';
export { streamingUtils } from './streaming-utils.js';

// Type system (modular)
export * from './type-system/index.js';
