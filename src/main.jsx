import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FeedbackProvider } from './components/feedback/FeedbackProvider.jsx'
import { installLinkNavigation } from './router/navigation.js'
import SpaRoot from './SpaRoot.jsx'
import './index.css'

installLinkNavigation()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FeedbackProvider>
      <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
      <div id="main-content" tabIndex="-1">
        <SpaRoot />
      </div>
    </FeedbackProvider>
  </StrictMode>,
)
