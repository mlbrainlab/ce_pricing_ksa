import { useState, useEffect } from 'react';
import { supabase } from './auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  onSave: (profile: any) => void;
}

export function ProfileModal({ isOpen, onClose, userProfile, onSave }: ProfileModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userProfile) {
      setFirstName(userProfile.first_name || '');
      setLastName(userProfile.last_name || '');
      setEmail(userProfile.quote_email || '');
      setPhone(userProfile.phone || '');
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          quote_email: email,
          phone: phone
        }
      });
      if (error) throw error;
      onSave(data.user?.user_metadata);
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
            <input type="text" className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
            <input type="text" className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email on Quotes</label>
            <input type="email" className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
            <input type="text" className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">{loading ? 'Saving...' : 'Save & Close'}</button>
        </div>
      </div>
    </div>
  );
}
