import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FeedbackProvider } from './components/feedback/FeedbackProvider.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FeedbackProvider>
      <App />
    </FeedbackProvider>
  </StrictMode>,
)
