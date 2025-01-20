type MessageProps = {
    message: { sender: 'user' | 'bot'; text: string };
};

const Message: React.FC<MessageProps> = ({ message }) => {
    return (
        <div
            className={`flex mb-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
        >
            <div
                className={`max-w-[70%] p-3 rounded-lg shadow-sm ${message.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
            >
                <p className="text-sm">{message.text}</p>
            </div>
        </div>
    );
};

export default Message;