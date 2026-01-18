import { Platform } from 'react-native';
import CodePush from 'react-native-code-push';
import ApiService from '../src/services/api';

interface VersionCheckResponse {
  current_version: string;
  latest_version: string;
  min_supported_version: string;
  is_current: boolean;
  is_outdated: boolean;
  is_unsupported: boolean;
  needs_update: boolean;
  update_required: boolean;
  codepush_available: boolean;
  codepush_deployment_key: string | null;
  platform: string;
  server_time: string;
}

interface VersionCheckOptions {
  forceUpdate?: boolean;
  onCodePushAvailable?: () => void;
  onForceUpdateRequired?: () => void;
  onUpdateNotAvailable?: () => void;
  onUpdateUnsupported?: () => void;
  onError?: (error: Error) => void;
}

class VersionManager {
  private static instance: VersionManager;
  private readonly API_BASE_URL: string;
  private currentAppVersion: string;
  private platform: string;

  constructor(apiBaseUrl: string = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001') {
    this.API_BASE_URL = apiBaseUrl;
    this.currentAppVersion = '1.0.0'; // This should come from app.json or package.json
    this.platform = Platform.OS;
    
    // Get current app version from package.json
    this.loadCurrentVersion();
  }

  static getInstance(apiBaseUrl?: string): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager(apiBaseUrl);
    }
    return VersionManager.instance;
  }

  private async loadCurrentVersion(): Promise<void> {
    try {
      // Get version from package.json
      this.currentAppVersion = '1.0.0'; // This should match your actual app version
    } catch (error) {
      console.warn('Could not load app version, using default');
      this.currentAppVersion = '1.0.0';
    }
  }

  async checkAppVersion(options: VersionCheckOptions = {}): Promise<VersionCheckResponse | null> {
    try {
      const response = await ApiService.checkAppVersion();
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      const versionData: VersionCheckResponse = response.data;
      
      console.log('Version check result:', versionData);

      // Handle different scenarios
      if (versionData.is_unsupported) {
        options.onUpdateUnsupported?.();
        return versionData;
      }

      if (versionData.update_required) {
        options.onForceUpdateRequired?.();
        return versionData;
      }

      if (versionData.codepush_available) {
        await this.handleCodePushUpdate(versionData.codepush_deployment_key, options);
        return versionData;
      }

      if (versionData.is_current) {
        options.onUpdateNotAvailable?.();
        return versionData;
      }

      return versionData;

    } catch (error) {
      console.error('Version check failed:', error);
      options.onError?.(error as Error);
      return null;
    }
  }

  private async handleCodePushUpdate(
    deploymentKey: string | null, 
    options: VersionCheckOptions
  ): Promise<void> {
    try {
      if (deploymentKey) {
        // Configure CodePush with deployment key from server
        console.log('Configuring CodePush with deployment key from server');
      }

      options.onCodePushAvailable?.();

      // Trigger CodePush sync
      const syncStatus = await CodePush.sync({
        installMode: CodePush.InstallMode.IMMEDIATE,
        updateDialog: {
          appendReleaseDescription: true,
          descriptionPrefix: '\n\nChanges:\n',
          title: 'Update Available',
          mandatoryUpdateMessage: 'An important update is available and must be installed.',
          mandatoryContinueButtonLabel: 'Install Now',
          optionalIgnoreButtonLabel: 'Skip',
          optionalInstallButtonLabel: 'Install',
        },
      });

      console.log('CodePush sync status:', syncStatus);

    } catch (error) {
      console.error('CodePush update failed:', error);
      options.onError?.(error as Error);
    }
  }

  async getVersionInfo(): Promise<any> {
    try {
      const response = await ApiService.getVersionInfo();
      return response.data;
    } catch (error) {
      console.error('Failed to get version info:', error);
      return null;
    }
  }

  getCurrentVersion(): string {
    return this.currentAppVersion;
  }

  getPlatform(): string {
    return this.platform;
  }

  // Force immediate update check (useful for testing)
  async forceUpdateCheck(options: VersionCheckOptions = {}): Promise<void> {
    await this.checkAppVersion({
      forceUpdate: true,
      ...options
    });
  }

  // Schedule periodic version checks
  scheduleVersionCheck(intervalMs: number = 24 * 60 * 60 * 1000, options: VersionCheckOptions = {}): void {
    setInterval(() => {
      this.checkAppVersion(options);
    }, intervalMs);
  }
}

export default VersionManager;
export type { VersionCheckResponse, VersionCheckOptions };