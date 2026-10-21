// eslint-disable-next-line @typescript-eslint/no-require-imports
const ZKLib = require("node-zklib");
import { ZKDevice } from './types';

export class DeviceConnectionManager {
  /**
   * Create a new ZKLib instance.
   */
  static createInstance(device: ZKDevice) {
    return new ZKLib(device.ip, device.port, device.timeout || 3000, device.inport || 4000);
  }

  /**
   * Executes an operation on a ZKTeco device with a retry mechanism and fallback.
   * Ensures the socket is safely created and closed.
   */
  static async executeWithRetry<T>(
    device: ZKDevice,
    operation: (zk: any) => Promise<T>,
    fallback: () => T,
    retries = 2
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const zk = this.createInstance(device);
      try {
        await zk.createSocket();
        const result = await operation(zk);
        await this.safeDisconnect(zk);
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`[ZK Connection Manager] Connection to ${device.ip}:${device.port} failed on attempt ${attempt}. Error:`, error?.message || error);
        await this.safeDisconnect(zk);
        
        // If the host is completely unreachable or timed out during initial connect, don't repeat doomed retries
        const errCode = error?.code || error?.err?.code || '';
        const errMsg = String(error?.message || error?.err?.message || '');
        const isUnreachable = errCode === 'ETIMEDOUT' || errCode === 'EHOSTUNREACH' || errCode === 'ENETUNREACH' || errCode === 'ECONNREFUSED' || errMsg.includes('timed out');
        if (isUnreachable) {
          break;
        }

        if (attempt < retries) {
          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    }

    console.error(`[ZK Connection Manager] All attempts failed for ${device.ip}:${device.port}. Falling back. Error:`, lastError?.message || lastError);
    return fallback();
  }

  private static async safeDisconnect(zk: any) {
    try {
      if (zk && typeof zk.disconnect === 'function') {
        await zk.disconnect();
      }
    } catch {
      // Ignore disconnect errors
    }
  }
}
