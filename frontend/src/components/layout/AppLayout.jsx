import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content fade-in-up">
        {children}
      </main>
    </div>
  )
}
