import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { initAgentChat } from '@lark-apaas/aily-web-sdk';
import type { AgentSDKInstance } from '@lark-apaas/aily-web-sdk';

const CHANNEL_TOKEN = 'demo-disabled';

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<AgentSDKInstance | null>(null);
  const destroyedRef = useRef(false);

  const destroyInstance = useCallback(async () => {
    if (instanceRef.current) {
      try {
        await instanceRef.current.destroy();
      } catch {
        // ignore
      }
      instanceRef.current = null;
    }
  }, []);

  const initChat = useCallback(async () => {
    if (!containerRef.current) return;
    destroyedRef.current = false;
    try {
      const instance = await initAgentChat(containerRef.current, {
        channelToken: CHANNEL_TOKEN,
      });
      if (destroyedRef.current) {
        await instance.destroy();
      } else {
        instanceRef.current = instance;
      }
    } catch {
      // init failed silently
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      initChat();
    } else {
      destroyInstance();
    }
    return () => {
      destroyedRef.current = true;
      destroyInstance();
    };
  }, [isOpen, initChat, destroyInstance]);

  const togglePanel = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)]"
          >
            <div className="w-full h-full bg-white border border-black/5 rounded-[26px] shadow-[0_20px_48px_#14364017] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#4df3c5]/15 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-[#22cdf1]" />
                  </div>
                  <span className="text-sm font-semibold text-[#08090d]">AI 助手</span>
                </div>
                <button
                  onClick={togglePanel}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#14141480] hover:bg-[#f4f8f8] hover:text-[#08090d] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div ref={containerRef} className="flex-1 min-h-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={togglePanel} className="academy-floating-chat-trigger">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-5 h-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </>
  );
}
