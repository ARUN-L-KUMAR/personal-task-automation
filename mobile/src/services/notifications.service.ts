import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import api from '@/services/api';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
let notificationsModule: typeof import('expo-notifications') | null = null;

async function getNotificationsModule(): Promise<typeof import('expo-notifications') | null> {
  if (isExpoGo) {
    return null;
  }

  if (notificationsModule) {
    return notificationsModule;
  }

  const mod = await import('expo-notifications');
  mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  notificationsModule = mod;
  return notificationsModule;
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice || isExpoGo) {
    return null;
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return null;
  }

  const permissionStatus = await Notifications.getPermissionsAsync();
  let finalStatus = permissionStatus.status;

  if (finalStatus !== 'granted') {
    const requestResult = await Notifications.requestPermissionsAsync();
    finalStatus = requestResult.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  const tokenResult = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return tokenResult.data;
}

export const notificationsService = {
  async registerDeviceToken(): Promise<{ registered: boolean; token?: string }> {
    const token = await getExpoPushToken();
    if (!token) {
      return { registered: false };
    }

    await api.post('/api/notifications/register-device', {
      expo_push_token: token,
      platform: Platform.OS,
      device_name: Device.deviceName || null,
      app_version: Constants.expoConfig?.version || null,
    });

    return { registered: true, token };
  },

  async sendTestPush(title = 'Personal Task', body = 'Push notification test'): Promise<any> {
    const response = await api.post('/api/notifications/send-test', {
      title,
      body,
      data: { source: 'mobile-test' },
    });
    return response.data;
  },
};
