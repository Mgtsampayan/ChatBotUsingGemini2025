import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
type MessageProps = {
    message: { 
        sender: 'user' | 'bot'; 
        text: string;
        timestamp?: Date;
    };
};
const Message = ({ message }: MessageProps) => {
    const isUser = message.sender === 'user';
    const timestamp = message.timestamp || new Date();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
                "flex items-end gap-2 mb-4",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <Avatar className="w-8 h-8">
                <AvatarImage src={isUser ? "/user-avatar.png" : "/bot-avatar.png"} />
                <AvatarFallback>{isUser ? "U" : "B"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1 max-w-[70%]">
                <div
                    className={cn(
                        "p-3 rounded-2xl",
                        isUser
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted text-muted-foreground rounded-bl-none"
                    )}
                >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.text}
                    </p>
                </div>
                <span className={cn(
                    "text-xs text-muted-foreground",
                    isUser ? "text-right" : "text-left"
                )}>
                    {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </motion.div>
    );
};
export default Message;