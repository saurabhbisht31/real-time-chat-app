// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";

export default function App() {
  // Grab the session token to verify if an operator is logged in
  const token = localStorage.getItem("token");

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Main communication hub - protected by token presence */}
        <Route path="/" element={token ? <Chat /> : <Navigate to="/login" replace />} />
        
        {/* Wildcard fallback to redirect users safely back home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}