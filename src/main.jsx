import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { FeedbackProvider } from './components/feedback/FeedbackProvider.jsx'
import { installLinkNavigation } from './router/navigation.js'
import { getGoogleClientId, isGoogleOAuthEnabledForCurrentOrigin } from './services/googleOAuthConfig.js'
import { AuthSessionProvider } from './state/AuthSessionProvider.jsx'
import SpaRoot from './SpaRoot.jsx'
import './styles/index.css'

const STALE_ASSET_RELOAD_KEY = 'medimate.stale-asset-reload'
const googleClientId = getGoogleClientId()

function installStaleAssetRecovery() {
  window.setTimeout(() => {
    sessionStorage.removeItem(STALE_ASSET_RELOAD_KEY)
  }, 10_000)

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()

    if (sessionStorage.getItem(STALE_ASSET_RELOAD_KEY) === '1') return

    sessionStorage.setItem(STALE_ASSET_RELOAD_KEY, '1')
    window.location.reload()
  })
}

installLinkNavigation()
installStaleAssetRecovery()

const appContent = (
  <FeedbackProvider>
    <AuthSessionProvider>
      <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
      <div id="main-content" tabIndex="-1">
        <SpaRoot />
      </div>
      <SpeedInsights />
    </AuthSessionProvider>
  </FeedbackProvider>
)

const app = isGoogleOAuthEnabledForCurrentOrigin()
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
