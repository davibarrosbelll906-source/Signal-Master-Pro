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

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const currentUser = useAppStore(s => s.currentUser);
  
  if (!currentUser) return <Redirect to="/login" />;

  return (
    <div className="flex h-screen bg-[var(--bg-0)] overflow-hidden text-white">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,255,136,0.03),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(68,136,255,0.03),transparent_50%)] pointer-events-none"></div>
        <div className="relative z-10 p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot" component={ForgotPasswordPage} />
      <Route path="/projector" component={ProjectorPage} />
      
      <Route path="/dashboard" component={() => <Redirect to="/dashboard/signals" />} />
      <Route path="/dashboard/:path*">
        <DashboardLayout>
          <Switch>
            <Route path="/dashboard/signals" component={SignalsPage} />
            <Route path="/dashboard/history" component={HistoryPage} />
            <Route path="/dashboard/analytics" component={AnalyticsPage} />
            <Route path="/dashboard/heatmap" component={HeatmapPage} />
            <Route path="/dashboard/backtesting" component={BacktestingPage} />
            <Route path="/dashboard/scoreboard" component={ScoreboardPage} />
            <Route path="/dashboard/diary" component={DiaryPage} />
            <Route path="/dashboard/bank" component={BankPage} />
            <Route path="/dashboard/goals" component={GoalsPage} />
            <Route path="/dashboard/risk" component={RiskPage} />
            <Route path="/dashboard/reports" component={ReportsPage} />
            <Route path="/dashboard/calendar" component={CalendarPage} />
            <Route path="/dashboard/revenue" component={RevenuePage} />
            <Route path="/dashboard/team" component={TeamPage} />
            <Route path="/dashboard/affiliates" component={AffiliatesPage} />
            <Route path="/dashboard/leaderboard" component={LeaderboardPage} />
            <Route path="/dashboard/strategies" component={StrategiesPage} />
            <Route path="/dashboard/achievements" component={AchievementsPage} />
            <Route path="/dashboard/telegram" component={TelegramPage} />
            <Route path="/dashboard/notifications" component={NotificationsPage} />
            <Route path="/dashboard/profile" component={ProfilePage} />
            <Route path="/dashboard/settings" component={SettingsPage} />
            <Route path="/dashboard/admin" component={AdminPage} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
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
