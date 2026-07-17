import { Routes, Route } from 'react-router-dom';
import Auth from '@/features/auth/Auth';
import ForgotPassword from '@/features/auth/ForgotPassword';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
    </Routes>
  );
}

export default App;
