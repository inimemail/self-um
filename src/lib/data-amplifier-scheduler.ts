import { runFakeVisitGenerator } from '@/lib/fake-visit-generator';

const INTERVAL_MS = 5 * 60 * 1000;

let running = false;

async function executeTask() {
  if (running) {
    console.log('[Data Amplifier] Previous task is still running; skipping this tick.');
    return;
  }

  running = true;

  try {
    await runFakeVisitGenerator();
  } catch (error) {
    console.error('[Data Amplifier] Scheduler task failed:', error);
  } finally {
    running = false;
  }
}

export function startDataAmplifierScheduler() {
  console.log(`[Data Amplifier] Scheduler started. Interval: ${INTERVAL_MS / 1000}s`);

  executeTask();

  const intervalId = setInterval(executeTask, INTERVAL_MS);

  return () => {
    clearInterval(intervalId);
    console.log('[Data Amplifier] Scheduler stopped.');
  };
}
