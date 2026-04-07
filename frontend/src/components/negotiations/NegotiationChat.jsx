import { useEffect, useRef, useState } from "react";
import { useSocket } from "../../contexts/SocketContext";

export default function NegotiationChat({ negotiationId }) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      if (msg.negotiation_id === negotiationId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleError = (err) => {
      setError(err.error || "An error occurred.");
    };

    socket.on("negotiation:message", handleMessage);
    socket.on("negotiation:error", handleError);

    return () => {
      socket.off("negotiation:message", handleMessage);
      socket.off("negotiation:error", handleError);
    };
  }, [socket, negotiationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ 
      behavior: "smooth", 
      block: "nearest",
      inline: "start" 
    });
  }, [messages]);
  const handleSend = () => {
    if (!text.trim() || !socket) return;
    setError("");
    socket.emit("negotiation:message", {
      negotiation_id: negotiationId,
      text: text.trim(),
    });
    setText("");
  };

  return (
    <div className="card stack">
      <h3 className="section-title" style={{ margin: 0 }}>Negotiation Chat</h3>

      <div style={{ maxHeight: "300px", overflowY: "auto" }} className="stack">
        {messages.length === 0 ? (
          <p className="helper-text">No messages yet. Start the conversation!</p>
        ) : null}
        {messages.map((msg, i) => (
          <div key={i} className="card card--muted">
            <strong>{msg.sender.role === "regular" ? "Candidate" : "Business"}</strong>
            <p>{msg.text}</p>
            <p className="helper-text">{new Date(msg.createdAt).toLocaleString()}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error ? <div className="error-alert">{error}</div> : null}

      <div className="row">
        <input
          className="input"
          style={{ flex: 1 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
        />
        <button className="button" type="button" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}