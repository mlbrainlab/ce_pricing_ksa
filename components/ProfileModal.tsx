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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-md p-8 border border-white/50 dark:border-gray-700/50 flex flex-col transition-all duration-300">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
            <input type="text" className="mt-1 w-full border border-gray-300/50 dark:border-gray-600/50 rounded-2xl px-4 py-3 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none backdrop-blur-md transition-all duration-300" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
            <input type="text" className="mt-1 w-full border border-gray-300/50 dark:border-gray-600/50 rounded-2xl px-4 py-3 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none backdrop-blur-md transition-all duration-300" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email on Quotes</label>
            <input type="email" className="mt-1 w-full border border-gray-300/50 dark:border-gray-600/50 rounded-2xl px-4 py-3 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none backdrop-blur-md transition-all duration-300" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
            <input type="text" className="mt-1 w-full border border-gray-300/50 dark:border-gray-600/50 rounded-2xl px-4 py-3 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none backdrop-blur-md transition-all duration-300" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} disabled={loading} className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl font-bold transition-all">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] font-bold transition-all">{loading ? 'Saving...' : 'Save & Close'}</button>
        </div>
      </div>
    </div>
  );
}
