import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/AdminPage';
import { ActivityBoardDetailPage } from './pages/ActivityBoardDetailPage';
import { ActivityBoardNewPage } from './pages/ActivityBoardNewPage';
import { ActivityBoardPage } from './pages/ActivityBoardPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { BlockedUsersPage } from './pages/BlockedUsersPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { LikesPage } from './pages/LikesPage';
import { LoginPage } from './pages/LoginPage';
import { MatchesPage } from './pages/MatchesPage';
import { MessagesPage } from './pages/MessagesPage';
import { MyBoardPage } from './pages/MyBoardPage';
import { MyInterestsPage } from './pages/MyInterestsPage';
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
        <Route element={<AuthCallbackPage />} path="auth/callback" />
        <Route element={<OnboardingPage />} path="onboarding" />
        <Route element={<HomePage />} path="home" />
        <Route element={<DiscoverPage />} path="discover" />
        <Route element={<ActivityBoardPage />} path="board" />
        <Route element={<ActivityBoardNewPage />} path="board/new" />
        <Route element={<ActivityBoardDetailPage />} path="board/:postId" />
        <Route element={<MyBoardPage />} path="my-board" />
        <Route element={<MyInterestsPage />} path="my-interests" />
        <Route element={<ProfileDetailPage />} path="profile/:id" />
        <Route element={<LikesPage />} path="likes" />
        <Route element={<MatchesPage />} path="matches" />
        <Route element={<MessagesPage />} path="messages/:matchId" />
        <Route element={<MyProfilePage />} path="my-profile" />
        <Route element={<SettingsPage />} path="settings" />
        <Route element={<SafetyPage />} path="safety" />
        <Route element={<BlockedUsersPage />} path="blocked-users" />
        <Route element={<AdminPage />} path="admin" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}
