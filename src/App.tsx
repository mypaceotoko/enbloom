import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/AdminPage';
import { ActivityBoardDetailPage } from './pages/ActivityBoardDetailPage';
import { ActivityBoardEditPage } from './pages/ActivityBoardEditPage';
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
import { MyActivityPage } from './pages/MyActivityPage';
import { MyBoardPage } from './pages/MyBoardPage';
import { MyInterestsPage } from './pages/MyInterestsPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ProfileDetailPage } from './pages/ProfileDetailPage';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { RoomsPage } from './pages/RoomsPage';
import { SafetyPage } from './pages/SafetyPage';
import { SettingsPage } from './pages/SettingsPage';
import { SettingsThemePage } from './pages/SettingsThemePage';

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
        <Route element={<RoomsPage />} path="rooms" />
        <Route element={<RoomDetailPage />} path="rooms/:roomId" />
        <Route element={<ActivityBoardNewPage />} path="board/new" />
        <Route element={<ActivityBoardEditPage />} path="board/:postId/edit" />
        <Route element={<ActivityBoardDetailPage />} path="board/:postId" />
        <Route element={<MyBoardPage />} path="my-board" />
        <Route element={<MyActivityPage />} path="my-activity" />
        <Route element={<MyInterestsPage />} path="my-interests" />
        <Route element={<ProfileDetailPage />} path="profile/:id" />
        <Route element={<LikesPage />} path="likes" />
        <Route element={<MatchesPage />} path="matches" />
        <Route element={<MessagesPage />} path="messages/:matchId" />
        <Route element={<MyProfilePage />} path="my-profile" />
        <Route element={<NotificationsPage />} path="notifications" />
        <Route element={<SettingsPage />} path="settings" />
        <Route element={<SettingsThemePage />} path="settings/theme" />
        <Route element={<SafetyPage />} path="safety" />
        <Route element={<BlockedUsersPage />} path="blocked-users" />
        <Route element={<AdminPage />} path="admin" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}
