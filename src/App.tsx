import { Routes, Route } from 'react-router-dom';
import Auth from '@/features/auth/Auth';
import ForgotPassword from '@/features/auth/ForgotPassword';
import Dashboard from '@/features/dashboard/Dashboard';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
