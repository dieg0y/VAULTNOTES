/**
 * threatIntel/index.ts — Public barrel for the threat-intel layer.
 *
 * UI modules import from here, never from internal files — keeps the layer's
 * public surface small and stable.
 */
export * from './types';
export * from './errors';
export * from './client';
export * from './credentials';
export * from './cache';
export * from './consent';
export * from './activity';
export * from './rateLimit';
export * from './registry';
