import { NotificationType } from '../models/NotificationsType';
import { ConfigBasedOnType } from '../models/NotificationsConfig';

export default class NotificationConfig {
  notificationConfigs: Map<NotificationType, ConfigBasedOnType[NotificationType]> = new Map();

  public addConfig<K extends NotificationType>(type: K, config: ConfigBasedOnType[K]): void {
    this.notificationConfigs.set(type, config);
  }

  // Some beautiful typescript Voodoo magic.
  public getConfig<K extends NotificationType>(type: K): ConfigBasedOnType[K] | undefined {
    const config = this.notificationConfigs.get(type);

    if (!config) {
      return undefined;
    }

    return config as ConfigBasedOnType[K];
  }
}
