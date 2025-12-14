import { storage } from "../storage";

interface WaterReminder {
  userId: number;
  shouldRemind: boolean;
  message: string;
  messagePt: string;
}

function isWithinSleepHours(sleepStart: number, sleepEnd: number): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  
  if (sleepStart > sleepEnd) {
    return currentHour >= sleepStart || currentHour < sleepEnd;
  }
  return currentHour >= sleepStart && currentHour < sleepEnd;
}

export async function checkWaterReminder(userId: number): Promise<WaterReminder> {
  const settings = await storage.getNotificationSettings(userId);
  
  if (!settings || !settings.waterRemindersEnabled) {
    return { userId, shouldRemind: false, message: "", messagePt: "" };
  }

  if (isWithinSleepHours(settings.sleepStartHour, settings.sleepEndHour)) {
    return { userId, shouldRemind: false, message: "", messagePt: "" };
  }

  const notifications = await storage.getUserNotifications(userId, 10);
  const lastWaterReminder = notifications.find(n => n.type === "water");
  
  if (lastWaterReminder) {
    const lastSentTime = new Date(lastWaterReminder.sentAt).getTime();
    const intervalMs = settings.waterReminderIntervalMinutes * 60 * 1000;
    const now = Date.now();
    
    if (now - lastSentTime < intervalMs) {
      return { userId, shouldRemind: false, message: "", messagePt: "" };
    }
  }

  const glassesPerDay = Math.ceil(settings.waterTargetMl / 250);
  const message = `Time to drink water! Aim for ${glassesPerDay} glasses (${settings.waterTargetMl}ml) daily.`;
  const messagePt = `Hora de beber água! Objetivo: ${glassesPerDay} copos (${settings.waterTargetMl}ml) por dia.`;

  return { userId, shouldRemind: true, message, messagePt };
}

export async function createWaterReminder(userId: number, language: string = "en"): Promise<void> {
  const reminder = await checkWaterReminder(userId);
  
  if (reminder.shouldRemind) {
    await storage.createNotificationLog({
      userId,
      type: "water",
      message: language === "pt" ? reminder.messagePt : reminder.message,
      read: false,
    });
  }
}

export async function getUnreadNotifications(userId: number) {
  const notifications = await storage.getUserNotifications(userId, 20);
  return notifications.filter(n => !n.read);
}
