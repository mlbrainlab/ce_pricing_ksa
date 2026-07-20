import { useState } from 'react';
import { db } from '../firebaseClient';
import { doc, updateDoc } from 'firebase/firestore';

export function Preferences({ userProfile, onProfileUpdate }: { userProfile: any, onProfileUpdate: (p: any) => void }) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [defaultDealType, setDefaultDealType] = useState(userProfile?.defaultDealType || 'new_logo');
  const [defaultChannel, setDefaultChannel] = useState(userProfile?.defaultChannel || 'direct');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      const updates = {
        displayName,
        phone,
        defaultDealType,
        defaultChannel
      };
      await updateDoc(userRef, updates);
      onProfileUpdate({ ...userProfile, ...updates });
      setMessage('Preferences saved successfully!');
    } catch (error) {
      console.error(error);
      setMessage('Failed to save preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Profile Preferences</h2>
      {message && <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded">{message}</div>}
      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Deal Type</label>
          <select value={defaultDealType} onChange={e => setDefaultDealType(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="new_logo">New Logo</option>
            <option value="renewal">Renewal</option>
            <option value="extension">Extension</option>
            <option value="mid_cycle">Mid-Cycle Add-on</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Channel</label>
          <select value={defaultChannel} onChange={e => setDefaultChannel(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="direct" disabled={userProfile?.role === 'cp'}>Direct (USD)</option>
            <option value="fulfilment">Fulfilment (SAR)</option>
            <option value="partner_sourced">Partner Sourced (SAR)</option>
          </select>
        </div>
        <div className="pt-4 flex justify-end">
          <button disabled={isSaving} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
