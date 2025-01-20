import { motion } from "framer-motion";
const TypingIndicator = () => {
    return (
        <div className="flex items-center gap-2 p-3 max-w-[100px] bg-muted rounded-2xl rounded-bl-none">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{
                        y: ["0%", "-50%", "0%"],
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                    }}
                />
            ))}
        </div>
    );
};
export default TypingIndicator;