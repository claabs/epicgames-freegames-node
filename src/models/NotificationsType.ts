enum NotificationType {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  LOCAL = 'local',
}

const notificationTypesArray: ReadonlyArray<NotificationType> = Object.values(NotificationType);

function isNotificationType(
  notificationTypeString: string | undefined,
): notificationTypeString is NotificationType {
  if (!notificationTypeString) {
    return false;
  }
  return (
    notificationTypesArray.findIndex(
      notificationType => notificationType === notificationTypeString,
    ) !== -1
  );
}

function toSafeNotificationType(notificationType?: string): NotificationType {
  if (isNotificationType(notificationType)) {
    return notificationType;
  }

  throw new Error(`Cannot cast string "${notificationType}" to a NotificationType`);
}

export { NotificationType, isNotificationType, toSafeNotificationType };
