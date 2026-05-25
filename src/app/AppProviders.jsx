import { FeedbackProvider } from "../components/feedback/FeedbackProvider.jsx";

export function AppProviders({ children }) {
  return <FeedbackProvider>{children}</FeedbackProvider>;
}
