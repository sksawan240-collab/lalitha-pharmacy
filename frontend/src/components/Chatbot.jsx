import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatbotApi } from '../services/endpoints';

const QUICK = ['Where is my order?', 'What products are available?', 'Show me products in the tablet category', 'How do I place an order?', 'How can I download my invoice?', 'What are your services?'];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: 'assistant', text: 'Hello! I am the Lalitha Pharmacy AI Assistant. Ask me about products, orders, invoices or our services. I share general information only — please consult a qualified doctor or pharmacist for medical advice.' }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const box = useRef(null);

  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }); }, [msgs, typing, open]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || typing) return;
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setInput(''); setTyping(true);
    try {
      const res = await chatbotApi.ask({ message: q, history: msgs.slice(-6) });
      setMsgs((m) => [...m, { role: 'assistant', text: res.data.reply, sources: res.data.sources }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', text: 'Sorry, I could not reach the assistant service right now. Please try again or contact support.' }]);
    }
    setTyping(false);
  };

  return (
    <>
      <motion.button onClick={() => setOpen(!open)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-med-600 to-pharm-600 text-2xl text-white shadow-pop" aria-label="AI Assistant">
        {open ? '✕' : '⚕'}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }}
            className="fixed bottom-24 right-5 z-50 flex h-[520px] w-[min(380px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop">
            <div className="bg-gradient-to-r from-med-700 to-pharm-600 px-4 py-3 text-white">
              <p className="font-display font-bold">Lalitha Pharmacy AI Assistant</p>
              <p className="text-[11px] opacity-80">General information only · not a doctor</p>
            </div>
            <div ref={box} className="flex-1 space-y-3 overflow-y-auto bg-ink-50 p-4">
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'ml-auto bg-gradient-to-br from-med-600 to-med-500 text-white' : 'bg-white shadow-card'}`}>
                  {m.text}
                </div>
              ))}
              {typing && <div className="flex gap-1 rounded-2xl bg-white px-4 py-3 shadow-card w-fit"><span className="h-2 w-2 animate-bounce rounded-full bg-med-400" /><span className="h-2 w-2 animate-bounce rounded-full bg-med-400 [animation-delay:.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-med-400 [animation-delay:.3s]" /></div>}
            </div>
            <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-white px-3 pt-2">
              {QUICK.map((q) => <button key={q} onClick={() => send(q)} className="whitespace-nowrap rounded-full bg-med-50 px-3 py-1 text-[11px] font-semibold text-med-700 hover:bg-med-100">{q}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 bg-white p-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about products, orders…" className="input !py-2 text-sm" />
              <button className="btn-primary !px-4 !py-2 text-sm">Send</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
