export enum NotificationType {
  EMAIL = 'EMAIL',
  TELEGRAM = 'TELEGRAM',
  LOCAL = 'LOCAL',
}

const notificationTypesArray: ReadonlyArray<NotificationType> = Object.values(NotificationType);

export function isNotificationType(
  notificationTypeString: string | undefined
): notificationTypeString is NotificationType {
  if (!notificationTypeString) {
    return false;
  }
  return (
    notificationTypesArray.findIndex(
      notificationType => notificationType === notificationTypeString
    ) !== -1
  );
}
