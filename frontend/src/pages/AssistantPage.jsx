import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import ChatBubble from '../components/chat/ChatBubble'
import DocumentUpload from '../components/chat/DocumentUpload'
import RiskReportPanel from '../components/chat/RiskReportPanel'
import { sendChatMessage } from '../services/chatService'

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi, I'm your BizPilot assistant. Ask me anything about your business, or upload a document and ask me about it." },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [riskReport, setRiskReport] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input
    setMessages((m) => [...m, { role: 'user', text: userMessage }])
    setInput('')
    setSending(true)

    try {
      const res = await sendChatMessage(userMessage)
      setMessages((m) => [...m, { role: 'assistant', text: res.reply, sources: res.sources }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Something went wrong. Please try again.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <AppLayout>
      <h1 className="page-title">AI Assistant</h1>
      <p className="page-subtitle">Chat with your business assistant, powered by RAG over your documents</p>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        <DocumentUpload onReportReady={setRiskReport} />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {riskReport && (
            <RiskReportPanel report={riskReport} onClose={() => setRiskReport(null)} />
          )}

          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 560 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 4px 12px' }}>
              {messages.map((m, i) => (
                <ChatBubble key={i} role={m.role} text={m.text} sources={m.sources} />
              ))}
              {sending && <ChatBubble role="assistant" text="Thinking..." />}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                className="input-field"
                placeholder="Ask about your business, or a document you uploaded..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="btn-primary" type="submit" disabled={sending}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}