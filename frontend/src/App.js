import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import CreateOrder from './pages/CreateOrder';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/transactions" element={<Transactions />} />
        <Route path="/dashboard/create-order" element={<CreateOrder />} /> 
      </Routes>
    </Router>
  );
}

export default App;