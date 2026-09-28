import { useEffect, useState } from "react";

function useCurrentTime() {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const initialUpdate = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 30000);

    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  return now;
}

export default useCurrentTime;