export default function ChatBubble({ role, text, sources }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div
        style={{
          maxWidth: '70%',
          padding: '10px 14px',
          borderRadius: 12,
          background: isUser ? '#4f46e5' : '#fff',
          color: isUser ? '#fff' : '#1a1d23',
          border: isUser ? 'none' : '1px solid #e5e7eb',
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
        {sources && sources.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: isUser ? '#e0e7ff' : '#6b7280' }}>
            Sources: {sources.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}
