import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { SocketContext } from "./SocketContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user || !token) return;

    const socketInstance = io(BACKEND_URL, {
      auth: { token },
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect", () => {
      setSocket(socketInstance);
      setConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};