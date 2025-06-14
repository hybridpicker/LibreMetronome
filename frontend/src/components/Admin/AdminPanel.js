import React, { useState } from 'react';
import AdminLogin from '../Admin/AdminLogin';
import SoundSetManager from '../Admin/SoundSetManager';
import './AdminPanel.css';

const AdminPanel = ({ onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setAdminUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  // Check for existing auth on mount
  React.useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    
    if (token && user) {
      fetch('/api/admin/check-auth/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
        credentials: 'include',
      })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          setAdminUser({ username: data.username });
        } else {
          handleLogout();
        }
      })
      .catch(() => handleLogout());
    }
  }, []);

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        <button className="close-button" onClick={onClose}>×</button>
        
        {!isAuthenticated ? (
          <AdminLogin onLogin={handleLogin} />
        ) : (
          <div className="admin-content">
            <div className="admin-header">
              <h1>Admin Panel</h1>
              <div className="admin-info">
                <span>Logged in as: {adminUser?.username}</span>
                <button onClick={handleLogout}>Logout</button>
              </div>
            </div>
            <SoundSetManager />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
