import { useState, useEffect } from 'react';
import { supabase } from './auth';

interface AdminQuote {
  id: string;
  title: string;
  is_draft: boolean;
  created_at: string;
  rep_name?: string;
  config: any;
}

export function AdminPanel({ onLoadQuote }: { onLoadQuote: (config: any) => void }) {
  const [quotes, setQuotes] = useState<AdminQuote[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data } = await supabase.from('admins').select('user_id').limit(1);
      if (data && data.length > 0) {
        setIsAdmin(true);
      }
    } catch (e) {}
  };

  const fetchAllQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setQuotes(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchAllQuotes();
    }
  }, [isOpen, isAdmin]);

  if (!isAdmin) return null;

  const filteredQuotes = quotes.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase()) || 
    (q.rep_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg shadow-md mb-8 border border-purple-200 dark:border-purple-800">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <h2 className="text-xl font-bold text-purple-900 dark:text-purple-100 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          Super Admin: Organization Quotes
        </h2>
        <span className="text-purple-600">{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div className="mt-4 border-t border-purple-200 dark:border-purple-800 pt-4">
          <input 
            type="text" 
            placeholder="Search by quote title or rep name..."
            className="w-full mb-4 px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-md dark:bg-gray-800 dark:text-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {filteredQuotes.map(q => (
              <div key={q.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <div>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{q.title}</span>
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full ${q.is_draft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {q.is_draft ? 'Draft' : 'Final'}
                  </span>
                  <div className="text-sm text-gray-500 mt-1">
                    Rep: <span className="font-semibold text-purple-700 dark:text-purple-400">{q.rep_name || 'Unknown Rep'}</span> • {new Date(q.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onLoadQuote(q.config)} className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-sm font-medium">View Quote</button>
                </div>
              </div>
            ))}
            {filteredQuotes.length === 0 && <p className="text-gray-500">No quotes found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
