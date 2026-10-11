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

export function AdminPanel({ onLoadQuote, onClose }: { onLoadQuote: (config: any) => void; onClose: () => void; }) {
  const [quotes, setQuotes] = useState<AdminQuote[]>([]);
  const [search, setSearch] = useState('');

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
    fetchAllQuotes();
  }, []);

  const filteredQuotes = quotes.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase()) || 
    (q.rep_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
      <div className="bg-purple-50/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-w-4xl w-full p-8 border border-white/50 dark:border-purple-800/50 max-h-[90vh] flex flex-col transition-all duration-300">
        <div className="flex justify-between items-center mb-6 border-b border-purple-200/50 dark:border-purple-800/50 pb-4">
          <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2">
            🛡️ Super Admin: Organization Quotes
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <input 
          type="text" 
          placeholder="Search by quote title or rep name..."
          className="w-full mb-6 px-5 py-4 border border-purple-300/50 dark:border-purple-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/50 outline-none backdrop-blur-md transition-all duration-300"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        
        <div className="space-y-3 overflow-y-auto flex-1 pr-2">
          {filteredQuotes.map(q => (
            <div key={q.id} className="flex justify-between items-center p-5 bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-sm border border-purple-100/50 dark:border-purple-900/30 transition-all hover:shadow-md hover:bg-white/80 dark:hover:bg-gray-800/80">
              <div className="min-w-0 flex-1 mr-4">
                <span className="font-bold text-gray-800 dark:text-gray-200 text-lg break-all">{q.title}</span>
                <span className={`inline-block ml-3 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap align-middle ${q.is_draft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {q.is_draft ? 'Draft' : 'Final'}
                </span>
                <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                  <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-medium truncate max-w-[200px]">Rep: {q.rep_name || 'Unknown Rep'}</span> 
                  <span>• {new Date(q.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { onLoadQuote(q.config); onClose(); }} className="px-6 py-2.5 bg-purple-600/10 text-purple-700 dark:text-purple-400 hover:bg-purple-600/20 rounded-xl text-sm font-bold transition-all shadow-sm">View Quote</button>
              </div>
            </div>
          ))}
          {filteredQuotes.length === 0 && <p className="text-center text-gray-500 py-10 text-lg">No quotes found.</p>}
        </div>
      </div>
    </div>
  );
}
