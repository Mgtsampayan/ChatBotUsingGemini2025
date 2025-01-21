import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { useMemo } from "react";

// Enhanced type definition with required timestamp
interface MessageProps {
    message: { 
        sender: 'user' | 'bot'; 
        text: string;
        timestamp: Date;
    };
    onRetry?: () => void;
}

// Improved animation variants with smoother transitions
const messageAnimationVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { duration: 0.2, ease: "easeOut" }
    },
    exit: { 
        opacity: 0, 
        y: -20, 
        scale: 0.95,
        transition: { duration: 0.15, ease: "easeIn" }
    }
};

const Message = ({ message, onRetry }: MessageProps) => {
    const isUser = message.sender === 'user';
    
    // Enhanced timestamp formatting with more detailed error handling
    const formattedTime = useMemo(() => {
        try {
            if (!(message.timestamp instanceof Date)) {
                throw new Error('Invalid timestamp');
            }
            return message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true // 12-hour format with AM/PM
            });
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return '--:--';
        }
    }, [message.timestamp]);

    return (
        <motion.div
            variants={messageAnimationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout // Smooth layout transitions
            className={cn(
                "flex items-end gap-2 mb-4",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage 
                    src={isUser ? "/user-avatar.png" : "/bot-avatar.png"} 
                    alt={isUser ? "User Avatar" : "Bot Avatar"}
                />
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
                <span 
                    className={cn(
                        "text-xs text-muted-foreground",
                        isUser ? "text-right" : "text-left"
                    )}
                    aria-label={`Sent at ${formattedTime}`}
                >
                    {formattedTime}
                </span>
            </div>
        </motion.div>
    );
};

export default Message;