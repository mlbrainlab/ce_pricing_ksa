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
  currentConfig,
  currentResults,
  onLoadQuote,
  customerName
}: {
  currentConfig: any;
  currentResults: any;
  onLoadQuote: (config: any) => void;
  customerName: string;
}) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchQuotes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
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
    if (isOpen) {
      fetchQuotes();
    }
  }, [isOpen]);

  const handleSave = async (isDraft: boolean) => {
    let finalTitle = title.trim();
    if (!finalTitle) {
      // Auto-generate title
      const productMix = currentConfig.selectedProducts && currentConfig.selectedProducts.length > 0 
        ? currentConfig.selectedProducts.join('_') 
        : 'Quote';
      finalTitle = customerName 
       ? `Quote_${customerName.replace(/\s+/g,'_')}_${currentConfig.dealType}_${productMix}_${new Date().toISOString().slice(0,10)}`
       : `Quote_${currentConfig.dealType}_${productMix}_${new Date().toISOString().slice(0,10)}`;
       
      setTitle(finalTitle); // update the input visually
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('quotes')
        .insert([{
          user_id: session.user.id,
          title: finalTitle,
          config: currentConfig,
          results: currentResults,
          is_draft: isDraft
        }]);
        
      if (error) throw error;
      
      setTitle('');
      fetchQuotes();
      alert('Quote saved successfully!');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Saved Quotes & Drafts</h2>
        <span>{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex gap-4 mb-6">
            <input 
              type="text" 
              placeholder="Quote Title (e.g. Acme Corp Q3)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <button 
              onClick={() => handleSave(true)}
              disabled={loading}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Save Draft
            </button>
            <button 
              onClick={() => handleSave(false)}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save Final Quote
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto">
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
                <div className="flex gap-2">
                  <button onClick={() => onLoadQuote(q.config)} className="text-blue-600 hover:underline">Load</button>
                  <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            ))}
            {quotes.length === 0 && <p className="text-gray-500">No saved quotes yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
