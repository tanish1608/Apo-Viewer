import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DatastoreList from './components/DatastoreList';
import DatastoreDetail from './components/DatastoreDetail';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <DatastoreList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/datastore/:id"
                element={
                  <PrivateRoute>
                    <DatastoreDetail />
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App