import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import Client360Page from './pages/Client360Page'
import InvoicesPage from './pages/InvoicesPage'
import AssistantPage from './pages/AssistantPage'
import RemindersPage from './pages/RemindersPage'
import CurrencyGSTPage from './pages/CurrencyGSTPage'
import NegotiationPage from './pages/NegotiationPage'
import ProfilerPage from './pages/ProfilerPage'
import BurnoutPage from './pages/BurnoutPage'
import ContractPage from './pages/ContractPage'
import MeetingPage from './pages/MeetingPage'
import PortfolioPage from './pages/PortfolioPage'
import DisputesPage from './pages/DisputesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
          <Route path="/clients/:clientId" element={<ProtectedRoute><Client360Page /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
          <Route path="/assistant" element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />
          <Route path="/reminders" element={<ProtectedRoute><RemindersPage /></ProtectedRoute>} />
          <Route path="/currency" element={<ProtectedRoute><CurrencyGSTPage /></ProtectedRoute>} />
          <Route path="/negotiate" element={<ProtectedRoute><NegotiationPage /></ProtectedRoute>} />
          <Route path="/profiler" element={<ProtectedRoute><ProfilerPage /></ProtectedRoute>} />
          <Route path="/burnout" element={<ProtectedRoute><BurnoutPage /></ProtectedRoute>} />
          <Route path="/contracts" element={<ProtectedRoute><ContractPage /></ProtectedRoute>} />
          <Route path="/meetings" element={<ProtectedRoute><MeetingPage /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />
          <Route path="/disputes" element={<ProtectedRoute><DisputesPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}