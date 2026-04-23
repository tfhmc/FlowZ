/**
 * React hook for listening to IPC events from Electron main process
 */

import { useEffect } from 'react';
import { api } from '../ipc';
import { ErrorHandler, ErrorCategory } from '../lib/error-handler';
import { useAppStore } from '../store/app-store';

interface NativeEventData {
  processStarted: { pid: number; timestamp: string };
  processStopped: { timestamp: string };
  processError: { error: string; timestamp: string };
  configChanged: { key?: string; oldValue?: any; newValue?: any };
  statsUpdated: any;
  navigateToPage: string;
  proxyModeSwitched: { success: boolean; newMode: string };
  proxyModeSwitchFailed: { success: boolean; error: string };
}

type NativeEventListener<K extends keyof NativeEventData> = (data: NativeEventData[K]) => void;

export function useNativeEvent<K extends keyof NativeEventData>(
  eventName: K,
  callback: NativeEventListener<K>
) {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    switch (eventName) {
      case 'processStarted':
        unsubscribe = api.proxy.onStarted(callback as any);
        break;
      case 'processStopped':
        unsubscribe = api.proxy.onStopped(callback as any);
        break;
      case 'processError':
        unsubscribe = api.proxy.onError(callback as any);
        break;
      case 'configChanged':
        unsubscribe = api.config.onChanged(callback as any);
        break;
      case 'statsUpdated':
        unsubscribe = api.stats.onUpdated(callback as any);
        break;
      default:
        console.warn(`Unknown event: ${eventName}`);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [eventName, callback]);
}

/**
 * Hook to listen to all native events and update store
 */
export function useNativeEventListeners() {
  const handleProcessStarted = (data: NativeEventData['processStarted']) => {
    console.log('Process started:', data);
    useAppStore.getState().refreshConnectionStatus();
  };

  const handleProcessStopped = (data: NativeEventData['processStopped']) => {
    console.log('Process stopped:', data);
    useAppStore.getState().refreshConnectionStatus();
  };

  const handleProcessError = (data: NativeEventData['processError']) => {
    console.error('Process error:', data);

    if (data.error) {
      let category = ErrorCategory.Process;
      let canRetry = true;

      if (data.error.includes('Trojan') || data.error.includes('trojan')) {
        category = ErrorCategory.Connection;

        if (
          data.error.includes('认证失败') ||
          data.error.includes('密码错误') ||
          data.error.includes('配置错误')
        ) {
          canRetry = false;
        }
      }

      if (data.error.includes('VLESS') || data.error.includes('vless')) {
        category = ErrorCategory.Connection;

        if (data.error.includes('UUID 错误') || data.error.includes('认证失败')) {
          canRetry = false;
        }
      }

      if (data.error.includes('不支持的协议') || data.error.includes('Protocol')) {
        category = ErrorCategory.Config;
        canRetry = false;
      }

      ErrorHandler.handle({
        category,
        userMessage: data.error,
        technicalMessage: data.error,
        canRetry,
      });
    }
  };

  const handleConfigChanged = (data: NativeEventData['configChanged']) => {
    console.log('Config changed:', data);

    if (data.newValue) {
      useAppStore.setState({ config: data.newValue });
      return;
    }

    const state = useAppStore.getState();
    if (!state.isLoading) {
      state.loadConfig();
    }
  };

  const handleStatsUpdated = (data: NativeEventData['statsUpdated']) => {
    console.log('Stats updated:', data);
    if (data) {
      useAppStore.setState({ stats: data });
    }
  };

  useNativeEvent('processStarted', handleProcessStarted);
  useNativeEvent('processStopped', handleProcessStopped);
  useNativeEvent('processError', handleProcessError);
  useNativeEvent('configChanged', handleConfigChanged);
  useNativeEvent('statsUpdated', handleStatsUpdated);
}
