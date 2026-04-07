import { useEffect, useMemo, useState } from "react";

export default function useCountdown(expiresAt) {
  const getTimeLeft = () => {
    if (!expiresAt) return 0;

    const end = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, end - now);
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    setTimeLeft(getTimeLeft());

    if (!expiresAt) return;

    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatted = useMemo(() => {
    const totalSeconds = Math.floor(timeLeft / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }

    return `${minutes}m ${seconds}s`;
  }, [timeLeft]);

  return {
    timeLeft,
    isExpired: timeLeft <= 0,
    formatted,
  };
}