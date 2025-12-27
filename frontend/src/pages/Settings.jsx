import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { canEdit } from '../utils/permissions';

const Settings = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  
  // Check if user can edit settings
  const canEditSettings = canEdit('settings');
  
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    role: '',
    profilePhoto: ''
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [activeTab, setActiveTab] = useState('profile');

  // Load user data on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserData({
          name: data.name || '',
          email: data.email || '',
          role: data.role || '',
          profilePhoto: data.profilePhoto || ''
        });
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('Load profile error:', err);
      setError('Failed to load profile');
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUserData(prev => ({ ...prev, profilePhoto: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        // Update localStorage with new token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Trigger auth change event
        window.dispatchEvent(new Event('authChange'));
        
        setMessage('Profile updated successfully');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password changed successfully');
        setPasswordData({
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Change password error:', err);
      setError('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = () => {
    setUserData(prev => ({ ...prev, profilePhoto: '' }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Top Header Bar */}
      <div className="ml-64 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-orange-500 text-xl font-bold">🔥 Elints</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">Customer Support:</span>
          <span className="text-blue-600">
            📞 +91-6364444752, +91-9333911911
          </span>
          <button className="text-white bg-blue-600 p-2 rounded-lg hover:underline">
            🎧 Get Instant Online Support
          </button>
        </div>
      </div>

      <div className="ml-64 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Messages */}
          {message && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex px-6">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === 'profile'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === 'password'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Change Password
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'profile' ? (
                // Profile Settings Tab
                <div className="space-y-6">
                  {/* Profile Photo Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-4">
                      {userData.profilePhoto ? (
                        <img
                          src={userData.profilePhoto}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-semibold">
                          {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        {canEditSettings ? (
                          <>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded text-sm font-medium transition-colors"
                            >
                              Upload Photo
                            </button>
                            {userData.profilePhoto && (
                              <button
                                onClick={handleRemovePhoto}
                                className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded text-sm font-medium transition-colors"
                              >
                                Remove Photo
                              </button>
                            )}
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageSelect}
                            />
                            <p className="text-xs text-gray-500">
                              JPG, PNG or GIF. Max size 5MB
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">
                            View only - contact admin to edit
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={userData.name}
                      onChange={handleProfileChange}
                      readOnly={!canEditSettings}
                      disabled={!canEditSettings}
                      className={`w-full border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        !canEditSettings ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                      }`}
                      placeholder="Enter your name"
                    />
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={userData.email}
                      onChange={handleProfileChange}
                      readOnly={!canEditSettings}
                      disabled={!canEditSettings}
                      className={`w-full border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        !canEditSettings ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                      }`}
                      placeholder="Enter your email"
                    />
                  </div>

                  {/* Role Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <input
                      type="text"
                      name="role"
                      value={userData.role}
                      readOnly
                      disabled
                      className="w-full border border-gray-300 rounded px-4 py-2 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  {/* Save Button */}
                  {canEditSettings && (
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Change Password Tab
                <div className="space-y-6">
                  {canEditSettings ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password *
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="w-full border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter new password"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Must be at least 6 characters
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password *
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="w-full border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Confirm new password"
                        />
                      </div>

                      {/* Change Password Button */}
                      <div className="pt-4 border-t border-gray-200">
                        <button
                          onClick={handleChangePassword}
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Changing...' : 'Change Password'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                      <p className="text-sm text-yellow-800">
                        <span className="font-semibold">View Only Mode:</span> You do not have permission to change your password. Please contact your administrator to edit settings.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
