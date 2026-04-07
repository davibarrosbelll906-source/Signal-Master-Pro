import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore, initStore } from "@/lib/store";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";

import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";

// Dashboard Pages
import SignalsPage from "@/pages/SignalsPage";
import HistoryPage from "@/pages/HistoryPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import HeatmapPage from "@/pages/HeatmapPage";
import BacktestingPage from "@/pages/BacktestingPage";
import ScoreboardPage from "@/pages/ScoreboardPage";
import DiaryPage from "@/pages/DiaryPage";
import BankPage from "@/pages/BankPage";
import GoalsPage from "@/pages/GoalsPage";
import RiskPage from "@/pages/RiskPage";
import ReportsPage from "@/pages/ReportsPage";
import ProjectorPage from "@/pages/ProjectorPage";
import CalendarPage from "@/pages/CalendarPage";
import RevenuePage from "@/pages/RevenuePage";
import TeamPage from "@/pages/TeamPage";
import AffiliatesPage from "@/pages/AffiliatesPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import StrategiesPage from "@/pages/StrategiesPage";
import AchievementsPage from "@/pages/AchievementsPage";
import TelegramPage from "@/pages/TelegramPage";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import DashboardHomePage from "@/pages/DashboardHomePage";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const currentUser = useAppStore(s => s.currentUser);

  if (!currentUser) return <Redirect to="/login" />;

  return (
    <div className="flex h-screen bg-[var(--bg-0)] overflow-hidden text-white">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,255,136,0.03),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(68,136,255,0.03),transparent_50%)] pointer-events-none" />
        <div className="relative z-10 p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Wrap a page in DashboardLayout with auth guard
function D({ component: Page }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <Page />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot" component={ForgotPasswordPage} />

      {/* Dashboard routes — each has its own flat route for reliable matching */}
      <Route path="/dashboard" component={() => <D component={DashboardHomePage} />} />
      <Route path="/dashboard/signals" component={() => <D component={SignalsPage} />} />
      <Route path="/dashboard/history" component={() => <D component={HistoryPage} />} />
      <Route path="/dashboard/analytics" component={() => <D component={AnalyticsPage} />} />
      <Route path="/dashboard/heatmap" component={() => <D component={HeatmapPage} />} />
      <Route path="/dashboard/backtesting" component={() => <D component={BacktestingPage} />} />
      <Route path="/dashboard/scoreboard" component={() => <D component={ScoreboardPage} />} />
      <Route path="/dashboard/diary" component={() => <D component={DiaryPage} />} />
      <Route path="/dashboard/bank" component={() => <D component={BankPage} />} />
      <Route path="/dashboard/goals" component={() => <D component={GoalsPage} />} />
      <Route path="/dashboard/risk" component={() => <D component={RiskPage} />} />
      <Route path="/dashboard/reports" component={() => <D component={ReportsPage} />} />
      <Route path="/dashboard/calendar" component={() => <D component={CalendarPage} />} />
      <Route path="/dashboard/revenue" component={() => <D component={RevenuePage} />} />
      <Route path="/dashboard/team" component={() => <D component={TeamPage} />} />
      <Route path="/dashboard/affiliates" component={() => <D component={AffiliatesPage} />} />
      <Route path="/dashboard/leaderboard" component={() => <D component={LeaderboardPage} />} />
      <Route path="/dashboard/strategies" component={() => <D component={StrategiesPage} />} />
      <Route path="/dashboard/achievements" component={() => <D component={AchievementsPage} />} />
      <Route path="/dashboard/telegram" component={() => <D component={TelegramPage} />} />
      <Route path="/dashboard/notifications" component={() => <D component={NotificationsPage} />} />
      <Route path="/dashboard/profile" component={() => <D component={ProfilePage} />} />
      <Route path="/dashboard/settings" component={() => <D component={SettingsPage} />} />
      <Route path="/dashboard/admin" component={() => <D component={AdminPage} />} />

      {/* Projector — full screen overlay, rendered inside dashboard layout so auth is enforced */}
      <Route path="/dashboard/projector" component={() => <D component={ProjectorPage} />} />
      {/* Legacy route kept for backward compat */}
      <Route path="/projector" component={ProjectorPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    initStore();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
