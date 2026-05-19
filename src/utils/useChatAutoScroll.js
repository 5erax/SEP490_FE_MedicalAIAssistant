import { useEffect, useRef } from "react";

const AUTO_SCROLL_THRESHOLD = 96;

export function useChatAutoScroll(scrollKey) {
  const containerRef = useRef(null);
  const endRef = useRef(null);
  const shouldFollowRef = useRef(true);

  function handleScroll() {
    const container = containerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldFollowRef.current = distanceFromBottom < AUTO_SCROLL_THRESHOLD;
  }

  useEffect(() => {
    if (!shouldFollowRef.current) return;

    window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [scrollKey]);

  return {
    containerRef,
    endRef,
    handleScroll,
  };
}
