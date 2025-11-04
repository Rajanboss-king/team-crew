import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ChatbotSection = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "नमस्ते! मैं किसान मित्र हूँ। Hello! I am Kisan Mitra. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");

  const sampleQuestions = [
    "What fertilizer should I use for tomatoes?",
    "गेहूं की बुवाई का सही समय क्या है?",
    "How to prevent pest attacks?",
    "मौसम के अनुसार फसल चुनाव"
  ];

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = { role: "user", content: input };
    setMessages([...messages, newMessage]);

    // Simulate AI response
    setTimeout(() => {
      const response: Message = {
        role: "assistant",
        content: "Based on your query, I recommend monitoring soil moisture levels and applying organic fertilizers. For specific guidance, I can provide detailed recommendations based on your crop type and location. 🌱"
      };
      setMessages(prev => [...prev, response]);
    }, 1000);

    setInput("");
  };

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Meet
            <span className="block bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              Kisan Mitra
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Your 24/7 AI farming assistant, fluent in Hindi and English
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary" />
                Chat with Kisan Mitra
              </CardTitle>
              <CardDescription>
                Ask anything about farming, crops, weather, or treatments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sample Questions */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Quick Questions:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sampleQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto py-2 px-3 text-sm hover:bg-primary/5 hover:border-primary/50"
                      onClick={() => setInput(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Chat Messages */}
              <Card className="bg-muted/30">
                <ScrollArea className="h-[400px] p-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === "assistant" 
                            ? "bg-primary/10 text-primary" 
                            : "bg-secondary/10 text-secondary"
                        }`}>
                          {message.role === "assistant" ? (
                            <Bot className="w-5 h-5" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        <div className={`flex-1 space-y-1 ${message.role === "user" ? "items-end" : ""}`}>
                          <div className={`inline-block px-4 py-2 rounded-2xl ${
                            message.role === "assistant"
                              ? "bg-card border border-border"
                              : "bg-primary text-primary-foreground"
                          }`}>
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type your question in Hindi or English..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} size="icon" className="flex-shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ChatbotSection;
