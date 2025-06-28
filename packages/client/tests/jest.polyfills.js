/**
 * Jest polyfills for browser APIs
 */

import { jest } from '@jest/globals';

// TextEncoder/TextDecoder polyfills
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Fetch API mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })
);

// Performance API mock
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn()
};

// URL constructor mock for older Node versions
if (!global.URL) {
  const { URL } = await import('url');
  global.URL = URL;
} 