import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Trash2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getUserId, getCoachMessages, sendCoachMessage, clearCoachMessages, type CoachMessage } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

interface VirtualCoachProps {
  className?: string;
}

export default function VirtualCoach({ className }: VirtualCoachProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { t, language } = useTranslation();

  const userId = getUserId();

  useEffect(() => {
    if (isOpen && userId) {
      loadMessages();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  async function loadMessages() {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      const result = await getCoachMessages(userId);
      if (result.success) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleSend() {
    if (!userId || !inputValue.trim() || isLoading) return;

    const messageText = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    const tempUserMessage: CoachMessage = {
      id: Date.now(),
      userId,
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const result = await sendCoachMessage(userId, messageText);
      if (result.success) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
          return [...filtered, result.userMessage, result.assistantMessage];
        });
      } else {
        toast.error(result.error || (language === "pt" ? "Erro ao enviar mensagem" : "Failed to send message"));
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
        setInputValue(messageText);
      }
    } catch (error) {
      toast.error(language === "pt" ? "Erro ao contactar o coach" : "Failed to contact coach");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      setInputValue(messageText);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClear() {
    if (!userId) return;
    try {
      const result = await clearCoachMessages(userId);
      if (result.success) {
        setMessages([]);
        toast.success(language === "pt" ? "Conversa limpa" : "Conversation cleared");
      }
    } catch (error) {
      toast.error(language === "pt" ? "Erro ao limpar conversa" : "Failed to clear conversation");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const welcomeMessage = language === "pt"
    ? "Olá! Sou o teu Coach Virtual. Estou aqui para te ajudar com dúvidas sobre exercícios, nutrição, motivação e muito mais. Como posso ajudar hoje?"
    : "Hi! I'm your Virtual Coach. I'm here to help you with questions about exercises, nutrition, motivation and more. How can I help you today?";

  const placeholderText = language === "pt"
    ? "Escreve a tua pergunta..."
    : "Type your question...";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 right-4 z-50 w-[calc(100%-2rem)] max-w-md bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden ${className}`}
            style={{ height: "min(500px, 70vh)" }}
            data-testid="coach-panel"
          >
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Coach Virtual</h3>
                  <p className="text-xs opacity-90">
                    {language === "pt" ? "Sempre disponível" : "Always available"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={handleClear}
                    data-testid="button-clear-chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-close-coach"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
              <div className="space-y-4">
                {isLoadingHistory ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="bg-muted/50 rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                    <p className="text-sm">{welcomeMessage}</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`rounded-2xl p-3 max-w-[85%] ${
                          message.role === "user"
                            ? "bg-emerald-500 text-white rounded-br-sm"
                            : "bg-muted/50 rounded-bl-sm"
                        }`}
                        data-testid={`message-${message.role}-${message.id}`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 rounded-2xl rounded-bl-sm p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          {language === "pt" ? "A pensar..." : "Thinking..."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholderText}
                  disabled={isLoading}
                  className="flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px] max-h-[120px]"
                  rows={1}
                  data-testid="input-coach-message"
                />
                <Button
                  size="icon"
                  className="h-11 w-11 rounded-full bg-emerald-500 hover:bg-emerald-600 shrink-0"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  data-testid="button-send-message"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
        data-testid="button-open-coach"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
