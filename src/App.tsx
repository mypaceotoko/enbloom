import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/AdminPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { LikesPage } from './pages/LikesPage';
import { LoginPage } from './pages/LoginPage';
import { MatchesPage } from './pages/MatchesPage';
import { MessagesPage } from './pages/MessagesPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ProfileDetailPage } from './pages/ProfileDetailPage';
import { SafetyPage } from './pages/SafetyPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route element={<LandingPage />} index />
        <Route element={<LoginPage />} path="login" />
        <Route element={<OnboardingPage />} path="onboarding" />
        <Route element={<HomePage />} path="home" />
        <Route element={<DiscoverPage />} path="discover" />
        <Route element={<ProfileDetailPage />} path="profile/:id" />
        <Route element={<LikesPage />} path="likes" />
        <Route element={<MatchesPage />} path="matches" />
        <Route element={<MessagesPage />} path="messages/:matchId" />
        <Route element={<MyProfilePage />} path="my-profile" />
        <Route element={<SettingsPage />} path="settings" />
        <Route element={<SafetyPage />} path="safety" />
        <Route element={<AdminPage />} path="admin" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}
