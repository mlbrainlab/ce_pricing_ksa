import React, { useState, useEffect } from 'react';
import { supabase } from './auth';
import { Lock, User, Eye, EyeOff, CheckCircle2, AlertCircle, X, KeyRound } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  onSave: (profile: any) => void;
}

export function ProfileModal({ isOpen, onClose, userProfile, onSave }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [showPasswordTab, setShowPasswordTab] = useState(false);
  
  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (isOpen && userProfile) {
      setFirstName(userProfile.first_name || '');
      setLastName(userProfile.last_name || '');
      setEmail(userProfile.quote_email || '');
      setPhone(userProfile.phone || '');
      setProfileSuccess('');
      setProfileError('');
      setPasswordSuccess('');
      setPasswordError('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('profile');
      setShowPasswordTab(false);
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          quote_email: email,
          phone: phone,
        },
      });

      if (error) throw error;
      onSave(data.user?.user_metadata);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (e: any) {
      setProfileError(e.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPasswordError(e.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 transition-all duration-300">
      <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl backdrop-saturate-[200%] rounded-[2.25rem] shadow-[0_20px_60px_rgba(0,0,0,0.2),inset_0_2px_3px_rgba(255,255,255,0.85)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.15)] w-full max-w-lg p-6 sm:p-8 border border-white/70 dark:border-white/10 flex flex-col transition-all duration-300">
        
        {/* Top Curved Glass Specular Highlight */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/40 via-white/10 to-transparent dark:from-white/10 dark:via-transparent rounded-t-[2.25rem] pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(37,99,235,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)]">
              {activeTab === 'profile' ? <User className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                {activeTab === 'profile' ? 'User Profile' : 'Change Password'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userProfile?.email || 'Manage your account settings'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Liquid-Glass Tab Switcher (Visible only once "Need to change password?" is tapped) */}
        {showPasswordTab && (
          <div className="relative z-10 flex p-1.5 bg-black/5 dark:bg-black/25 rounded-2xl border border-black/5 dark:border-white/5 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-gray-800/90 text-blue-700 dark:text-blue-300 shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,1)] border border-white/80 dark:border-gray-700/60'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile Details</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-white dark:bg-gray-800/90 text-blue-700 dark:text-blue-300 shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,1)] border border-white/80 dark:border-gray-700/60'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
          </div>
        )}

        {/* Tab 1: Profile Form */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="relative z-10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-white/80 dark:border-gray-700/60 rounded-xl px-4 py-2.5 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500/60 outline-none backdrop-blur-xl text-sm transition-all"
                  placeholder="First Name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-white/80 dark:border-gray-700/60 rounded-xl px-4 py-2.5 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500/60 outline-none backdrop-blur-xl text-sm transition-all"
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Email on Quotes</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-white/80 dark:border-gray-700/60 rounded-xl px-4 py-2.5 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500/60 outline-none backdrop-blur-xl text-sm transition-all"
                placeholder="quote@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-white/80 dark:border-gray-700/60 rounded-xl px-4 py-2.5 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500/60 outline-none backdrop-blur-xl text-sm transition-all"
                placeholder="+966 5X XXX XXXX"
              />
            </div>

            {profileError && (
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-xs font-medium bg-red-500/10 dark:bg-red-900/30 p-3 rounded-xl border border-red-500/30 backdrop-blur-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-medium bg-emerald-500/10 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-500/30 backdrop-blur-md">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordTab(true);
                  setActiveTab('password');
                }}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>Need to change password?</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={profileLoading}
                  className="px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="group relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white rounded-xl shadow-[0_4px_16px_rgba(37,99,235,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)] text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none" />
                  <span className="relative z-10">{profileLoading ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Change Password Form */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="relative z-10 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)"
                  className="w-full border border-white/80 dark:border-gray-700/60 rounded-xl pl-4 pr-11 py-2.5 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500/60 outline-none backdrop-blur-xl text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 cursor-pointer"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full border border-white/80 dark:border-gray-700/60 rounded-xl pl-4 pr-11 py-2.5 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500/60 outline-none backdrop-blur-xl text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-xs font-medium bg-red-500/10 dark:bg-red-900/30 p-3 rounded-xl border border-red-500/30 backdrop-blur-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-medium bg-emerald-500/10 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-500/30 backdrop-blur-md">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                disabled={passwordLoading}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 rounded-xl transition-all cursor-pointer"
              >
                Back to Profile
              </button>
              <button
                type="submit"
                disabled={passwordLoading}
                className="group relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white rounded-xl shadow-[0_4px_16px_rgba(37,99,235,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)] text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none" />
                <span className="relative z-10">{passwordLoading ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
