type MessageProps = {
    message: { sender: 'user' | 'bot'; text: string }
}

const Message: React.FC<MessageProps> = ({ message }) => {
    return (
        <div className={`mb-2 p-2 rounded-md ${message.sender === 'user' ? 'bg-blue-200 self-end' : 'bg-gray-200 self-start'}`}>
            {message.text}
        </div>
    )
}

export default Message;