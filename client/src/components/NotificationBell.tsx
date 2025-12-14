import { useEffect, useState, useCallback } from "react";
import { Bell, Droplets, X, Utensils, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { pollNotifications, markNotificationRead, getUserId } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

interface Notification {
  id: number;
  type: string;
  message: string;
  sentAt: string;
  read: boolean;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { language } = useTranslation();

  const poll = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    
    try {
      const result = await pollNotifications(userId, language);
      if (result.success) {
        setNotifications(result.notifications || []);
        setRetryCount(0);
      }
    } catch (error) {
      console.error("Error polling notifications:", error);
      setRetryCount(prev => prev + 1);
    }
  }, [language]);

  useEffect(() => {
    poll();
    const baseInterval = 60000;
    const interval = setInterval(poll, Math.min(baseInterval * Math.pow(1.5, retryCount), 300000));
    return () => clearInterval(interval);
  }, [poll, retryCount]);

  const handleDismiss = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "water": return <Droplets className="w-4 h-4 text-blue-500" />;
      case "meal": return <Utensils className="w-4 h-4 text-green-500" />;
      case "workout": return <Dumbbell className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold" data-testid="text-notifications-title">
            {language === "pt" ? "Notificações" : "Notifications"}
          </h4>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm" data-testid="text-no-notifications">
              {language === "pt" ? "Sem notificações" : "No notifications"}
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.id} className="p-3 border-b last:border-0 flex gap-3" data-testid={`notification-${notif.id}`}>
                <div className="p-2 bg-primary/10 rounded-full h-fit">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.sentAt).toLocaleTimeString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDismiss(notif.id)}
                  data-testid={`button-dismiss-${notif.id}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
