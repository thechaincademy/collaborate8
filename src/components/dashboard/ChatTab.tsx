import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const messages = [
  {
    id: 1,
    from: "coparent",
    text: "Hi, just wanted to confirm the payment for this month went through.",
    time: "10:30 AM"
  },
  {
    id: 2,
    from: "me",
    text: "Yes, it was processed yesterday. You should see it in your account now.",
    time: "10:32 AM"
  },
  {
    id: 3,
    from: "coparent",
    text: "Great, thanks for confirming. Also, I wanted to discuss the school trip expense.",
    time: "10:35 AM"
  },
];

const ChatTab = () => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      // Handle send logic
      setMessage("");
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col px-6 pt-12">
      <DashboardHeader title="Chat" />

      {/* Chat Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[80%] ${msg.from === "me" ? "order-2" : ""}`}>
              <div className={`rounded-2xl px-4 py-3 ${
                msg.from === "me" 
                  ? "bg-foreground text-background" 
                  : "bg-card text-foreground"
              }`}>
                <p className="text-sm">{msg.text}</p>
              </div>
              <p className={`mt-1 text-xs text-muted-foreground ${
                msg.from === "me" ? "text-right" : ""
              }`}>
                {msg.time}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Message Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 py-4"
      >
        <Input
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="h-12 flex-1 rounded-full border-border bg-card text-foreground placeholder:text-muted-foreground"
        />
        <Button 
          onClick={handleSend}
          size="icon"
          className="h-12 w-12 rounded-full"
          disabled={!message.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
};

export default ChatTab;
