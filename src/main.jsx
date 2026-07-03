import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FeedbackProvider } from './components/feedback/FeedbackProvider.jsx'
import { installLinkNavigation } from './router/navigation.js'
import SpaRoot from './SpaRoot.jsx'
import './index.css'

installLinkNavigation()

const appContent = (
  <FeedbackProvider>
    <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
    <div id="main-content" tabIndex="-1">
      <SpaRoot />
    </div>
  </FeedbackProvider>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {appContent}
  </StrictMode>,
)
