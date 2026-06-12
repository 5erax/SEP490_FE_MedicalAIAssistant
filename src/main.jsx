import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FeedbackProvider } from './components/feedback/FeedbackProvider.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FeedbackProvider>
      <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
      <div id="main-content" tabIndex="-1">
        <App />
      </div>
    </FeedbackProvider>
  </StrictMode>,
)
