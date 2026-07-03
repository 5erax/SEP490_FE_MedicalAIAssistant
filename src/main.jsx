import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { FeedbackProvider } from './components/feedback/FeedbackProvider.jsx'
import { installLinkNavigation } from './router/navigation.js'
import SpaRoot from './SpaRoot.jsx'
import './index.css'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

installLinkNavigation()

const appContent = (
  <FeedbackProvider>
    <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
    <div id="main-content" tabIndex="-1">
      <SpaRoot />
    </div>
  </FeedbackProvider>
)

const app = googleClientId.trim()
  ? (
    <GoogleOAuthProvider
      clientId={googleClientId}
      script_props={{
        async: true,
        defer: true,
        crossOrigin: 'anonymous',
      }}
    >
      {appContent}
    </GoogleOAuthProvider>
  )
  : appContent

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {app}
  </StrictMode>,
)
