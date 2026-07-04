import fs from 'fs';
import path from 'path';

// Path to your log file
const logFilePath = path.join(process.cwd(), 'app.log');

// Function to log events
export function logEvent(event) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${event}\n`;

  fs.appendFile(logFilePath, logLine, (err) => {
    if (err) console.error('Failed to write log:', err);
  });
}
