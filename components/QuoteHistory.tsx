import { useEffect, useState } from 'react';
import { db } from '../firebaseClient';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface QuoteHistoryProps {
  userProfile: any;
  onLoadQuote: (quote: any) => void;
}

export function QuoteHistory({ userProfile, onLoadQuote }: QuoteHistoryProps) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!userProfile?.uid) return;
      try {
        const q = query(
          collection(db, 'quotes'),
          where('userId', '==', userProfile.uid),
            // if we need to sortBy we must also index it if we don't we'll get an error, removing orderBy for now to keep it simple.
            // orderBy('updatedAt', 'desc') 
        );
        const querySnapshot = await getDocs(q);
        const fetchedQuotes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Local sort
        fetchedQuotes.sort((a: any, b: any) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
        setQuotes(fetchedQuotes);
      } catch (error) {
        console.error("Error fetching quotes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuotes();
  }, [userProfile]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading your history...</div>;
  }

  if (quotes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Saved Quotes</h2>
        <p className="text-gray-500 dark:text-gray-400">You haven't saved any quotes yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quote History</h2>
      
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <div className="px-4 py-4 flex items-center sm:px-6">
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                  <div className="truncate">
                    <div className="flex text-sm">
                      <p className="font-medium text-blue-600 truncate">{quote.quoteName}</p>
                      <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                        v{quote.version || 1}
                      </p>
                    </div>
                    <div className="mt-2 flex">
                      <div className="flex items-center text-sm text-gray-500">
                        Status: <span className={`ml-1 font-medium ${quote.status === 'draft' ? 'text-yellow-600' : 'text-green-600'}`}>{quote.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                    <p className="text-sm text-gray-900 dark:text-gray-300">
                        Last edited: {quote.updatedAt?.toDate().toLocaleDateString() || ''}
                    </p>
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={() => onLoadQuote(quote)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Open Quote
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
