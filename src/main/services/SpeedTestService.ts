/**
 * Speed test service
 * Measures server latency via TCP connect.
 */

import * as net from 'net';
import type { ServerConfig } from '../../shared/types';
import type { LogManager } from './LogManager';

export interface SpeedTestResult {
  serverId: string;
  latency: number | null;
  error?: string;
}

export class SpeedTestService {
  private logManager: LogManager;
  private readonly MAX_CONCURRENT = 8;

  constructor(logManager: LogManager) {
    this.logManager = logManager;
  }

  /**
   * Test all servers with a bounded worker pool.
   */
  async testAllServers(servers: ServerConfig[]): Promise<Map<string, number | null>> {
    if (servers.length === 0) {
      return new Map();
    }

    this.logManager.addLog('info', `开始测速 ${servers.length} 个服务器`, 'SpeedTest');

    const results = new Map<string, number | null>();
    let cursor = 0;
    const workerCount = Math.min(this.MAX_CONCURRENT, servers.length);

    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= servers.length) {
          return;
        }

        const result = await this.testServer(servers[index]);
        results.set(result.serverId, result.latency);

        if (result.error) {
          this.logManager.addLog(
            'warn',
            `测速失败 ${result.serverId}: ${result.error}`,
            'SpeedTest'
          );
        }
      }
    });

    await Promise.all(workers);

    this.logManager.addLog('info', '测速完成', 'SpeedTest');
    return results;
  }

  /**
   * Test one server by TCP connect latency.
   */
  private async testServer(server: ServerConfig): Promise<SpeedTestResult> {
    const start = Date.now();

    try {
      await new Promise<void>((resolve, reject) => {
        const socket = new net.Socket();
        const timeout = 5000;
        socket.setTimeout(timeout);

        socket.on('connect', () => {
          socket.destroy();
          resolve();
        });

        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('Timeout'));
        });

        socket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });

        const isIpv6 = server.address.includes(':');
        const connectAddress =
          isIpv6 && server.address.startsWith('[') && server.address.endsWith(']')
            ? server.address.slice(1, -1)
            : server.address;

        socket.connect({
          port: server.port,
          host: connectAddress,
          family: isIpv6 ? 6 : 0,
        });
      });

      return {
        serverId: server.id,
        latency: Date.now() - start,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConnectionRefused = errorMessage.includes('ECONNREFUSED');

      // UDP-first protocols often refuse TCP immediately; RTT is still useful.
      if (isConnectionRefused && (server.protocol === 'tuic' || server.protocol === 'hysteria2')) {
        return {
          serverId: server.id,
          latency: Date.now() - start,
        };
      }

      return {
        serverId: server.id,
        latency: null,
        error: errorMessage,
      };
    }
  }
}
