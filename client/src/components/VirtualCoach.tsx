import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Trash2, Bot, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getUserId, getCoachMessages, sendCoachMessage, clearCoachMessages, regeneratePlanViaCoach, type CoachMessage } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface QuickAction {
  label: string;
  message: string;
}

function detectQuickActions(content: string, language: string): QuickAction[] {
  const actions: QuickAction[] = [];
  const lowerContent = content.toLowerCase();
  
  const isPt = language === "pt";
  
  // Detect plan creation suggestion - expanded keywords
  const planKeywordsPt = [
    "criar um novo plano", "criar novo plano", "novo plano personalizado",
    "queres que crie", "queres que eu crie", "posso criar", "gostarias que criasse",
    "novo plano completo", "plano de 7 dias", "plano completo",
    "se sim", "diz sim", "diz \"sim"
  ];
  const planKeywordsEn = [
    "create a new plan", "create new plan", "new personalized plan",
    "would you like me to create", "i can create", "shall i create",
    "new complete plan", "7-day plan", "complete plan",
    "if yes", "say yes"
  ];
  const planKeywords = isPt ? planKeywordsPt : planKeywordsEn;
  
  if (planKeywords.some(kw => lowerContent.includes(kw))) {
    actions.push({
      label: isPt ? "Sim, cria o plano" : "Yes, create the plan",
      message: isPt ? "Sim, cria o plano" : "Yes, create the plan"
    });
    actions.push({
      label: isPt ? "Não, obrigado" : "No, thanks",
      message: isPt ? "Não, obrigado" : "No, thanks"
    });
  }
  
  // Detect confirmation request
  const confirmKeywordsPt = ["confirma", "confirmar", "tens a certeza", "queres continuar", "prosseguir"];
  const confirmKeywordsEn = ["confirm", "are you sure", "want to continue", "proceed"];
  const confirmKeywords = isPt ? confirmKeywordsPt : confirmKeywordsEn;
  
  if (confirmKeywords.some(kw => lowerContent.includes(kw)) && actions.length === 0) {
    actions.push({
      label: isPt ? "Sim" : "Yes",
      message: isPt ? "Sim" : "Yes"
    });
    actions.push({
      label: isPt ? "Não" : "No",
      message: isPt ? "Não" : "No"
    });
  }
  
  return actions;
}

interface VirtualCoachProps {
  className?: string;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export default function VirtualCoach({ className, isOpenExternal, onCloseExternal }: VirtualCoachProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  
  // Support both internal and external control
  const isControlled = isOpenExternal !== undefined;
  const isOpen = isControlled ? isOpenExternal : isOpenInternal;
  const setIsOpen = isControlled 
    ? (open: boolean) => { if (!open && onCloseExternal) onCloseExternal(); }
    : setIsOpenInternal;
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();

  const userId = getUserId();

  useEffect(() => {
    if (isOpen && userId) {
      loadMessages();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change or when chat opens
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    };
    // Use multiple timeouts to ensure scroll happens after render
    setTimeout(scrollToBottom, 50);
    setTimeout(scrollToBottom, 150);
    setTimeout(scrollToBottom, 300);
  }, [messages, isOpen, isLoadingHistory]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!userId || !inputValue.trim() || isLoading || isRegenerating) return;

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

        // Check if user authorized plan creation
        if (result.intent === "authorize_plan" && (result.intentConfidence || 0) > 0.8) {
          await handleRegeneratePlan(messageText);
        }
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

  async function handleRegeneratePlan(context?: string) {
    if (!userId || isRegenerating) return;
    
    setIsRegenerating(true);
    
    try {
      const result = await regeneratePlanViaCoach(userId, context);
      
      if (result.success) {
        toast.success(
          language === "pt" 
            ? "Novo plano criado com sucesso!" 
            : "New plan created successfully!"
        );
        
        // Reload messages to show coach confirmation
        await loadMessages();
        
        // Invalidate queries to refresh dashboard
        queryClient.invalidateQueries({ queryKey: ["plan"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      } else {
        toast.error(result.error || (language === "pt" ? "Erro ao criar plano" : "Failed to create plan"));
      }
    } catch (error) {
      console.error("Error regenerating plan:", error);
      toast.error(language === "pt" ? "Erro ao criar novo plano" : "Failed to create new plan");
    } finally {
      setIsRegenerating(false);
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

  async function handleQuickAction(actionMessage: string) {
    if (!userId || isLoading || isRegenerating) return;
    
    setIsLoading(true);

    const tempUserMessage: CoachMessage = {
      id: Date.now(),
      userId,
      role: "user",
      content: actionMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const result = await sendCoachMessage(userId, actionMessage);
      if (result.success) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
          return [...filtered, result.userMessage, result.assistantMessage];
        });

        if (result.intent === "authorize_plan" && (result.intentConfidence || 0) > 0.8) {
          await handleRegeneratePlan(actionMessage);
        }
      } else {
        toast.error(result.error || (language === "pt" ? "Erro ao enviar mensagem" : "Failed to send message"));
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      }
    } catch (error) {
      toast.error(language === "pt" ? "Erro ao contactar o coach" : "Failed to contact coach");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  }

  const welcomeMessage = language === "pt"
    ? "Olá! Sou o teu Coach Virtual. Estou aqui para te ajudar com dúvidas sobre exercícios, nutrição, motivação e muito mais. Posso até criar um novo plano personalizado para ti! Como posso ajudar hoje?"
    : "Hi! I'm your Virtual Coach. I'm here to help you with questions about exercises, nutrition, motivation and more. I can even create a new personalized plan for you! How can I help you today?";

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

            <ScrollArea className="flex-1 p-4">
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
                  messages.map((message, index) => {
                    const isLastAssistantMessage = message.role === "assistant" && index === messages.length - 1;
                    const quickActions = isLastAssistantMessage ? detectQuickActions(message.content, language) : [];
                    
                    return (
                      <div key={message.id}>
                        <div
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
                        {quickActions.length > 0 && !isLoading && !isRegenerating && (
                          <div className="flex flex-wrap gap-2 mt-2 ml-1">
                            {quickActions.map((action, actionIndex) => (
                              <Button
                                key={actionIndex}
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAction(action.message)}
                                className="text-xs h-8 px-3 border-emerald-500/50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-500"
                                data-testid={`button-quick-action-${actionIndex}`}
                              >
                                <Zap className="w-3 h-3 mr-1.5" />
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
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
                {isRegenerating && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl rounded-bl-sm p-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium text-emerald-600">
                            {language === "pt" ? "A criar o teu novo plano..." : "Creating your new plan..."}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === "pt" ? "Isto pode demorar alguns segundos" : "This may take a few seconds"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
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

      {/* Only show floating button when not controlled externally */}
      {!isControlled && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-20 right-4 md:bottom-4 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
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
      )}
    </>
  );
}
