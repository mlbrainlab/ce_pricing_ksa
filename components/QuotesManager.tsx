import { useState, useEffect } from 'react';
import { supabase } from './auth';

interface Quote {
  id: string;
  title: string;
  config: any;
  results: any;
  is_draft: boolean;
  created_at: string;
}

export function QuotesManager({
  onLoadQuote,
  onClose
}: {
  currentConfig?: any;
  currentResults?: any;
  customerName?: string;
  onLoadQuote: (config: any) => void;
  onClose: () => void;
}) {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const fetchQuotes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (Array.isArray(data)) {
        setQuotes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      fetchQuotes();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full p-6 border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📂 My Saved Quotes & Drafts
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 pr-2">
          {quotes.map(q => (
            <div key={q.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <div>
                <span className="font-bold text-gray-800 dark:text-gray-200">{q.title}</span>
                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${q.is_draft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {q.is_draft ? 'Draft' : 'Final'}
                </span>
                <div className="text-sm text-gray-500 mt-1">
                  {new Date(q.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <button onClick={() => { onLoadQuote(q.config); onClose(); }} className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium">Load</button>
                <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:text-red-800 text-sm font-medium px-2">Delete</button>
              </div>
            </div>
          ))}
          {quotes.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No saved quotes yet.</p>
              <p className="text-sm text-gray-400 mt-2">Save a quote at the bottom of the calculator to see it here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
