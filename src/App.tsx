import { HashRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LibraryProvider } from './context/LibraryContext';
import { RepositoryProvider } from './context/RepositoryContext';
import { repository } from './data';
import { I18nProvider } from './i18n/I18nProvider';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { TopicPage } from './pages/TopicPage';
import { InstallProvider } from './pwa/InstallProvider';
import { SettingsProvider } from './settings/SettingsProvider';

export default function App() {
  return (
    <RepositoryProvider repository={repository}>
    <InstallProvider>
    <SettingsProvider repository={repository}>
    <I18nProvider repository={repository}>
      <LibraryProvider repository={repository}>
        {/* HashRouter works from file:// and inside desktop/mobile wrappers. */}
        <ErrorBoundary>
        <HashRouter>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/topic/:id" element={<TopicPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </HashRouter>
        </ErrorBoundary>
      </LibraryProvider>
    </I18nProvider>
    </SettingsProvider>
    </InstallProvider>
    </RepositoryProvider>
  );
}
