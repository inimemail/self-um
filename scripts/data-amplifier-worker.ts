#!/usr/bin/env node

import 'dotenv/config';
import { startDataAmplifierScheduler } from '@/lib/data-amplifier-scheduler';

const stopScheduler = startDataAmplifierScheduler();

console.log('[Data Amplifier] Worker is running. Press Ctrl+C to stop.');

function shutdown(signal: string) {
  console.log(`[Data Amplifier] Received ${signal}; shutting down.`);
  stopScheduler();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.stdin.resume();
