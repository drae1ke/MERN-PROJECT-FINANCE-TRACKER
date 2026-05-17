import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import FrontPage from "./FrontPage";
import Signin from "./Signin";
import Signup from "./Signup";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  return localStorage.getItem("token") ? children : <Navigate to="/signin" replace />;
};

const GuestRoute = ({ children }) => {
  return localStorage.getItem("token") ? <Navigate to="/" replace /> : children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <FrontPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestRoute>
              <Signup />
            </GuestRoute>
          }
        />
        <Route
          path="/signin"
          element={
            <GuestRoute>
              <Signin />
            </GuestRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
