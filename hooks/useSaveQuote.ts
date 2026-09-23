import { useState } from 'react';
import { supabase } from '../components/auth';

export function useSaveQuote() {
  const [savingType, setSavingType] = useState<'draft' | 'final' | null>(null);

  const saveQuote = async (
    isDraft: boolean, 
    currentConfig: any, 
    currentResults: any, 
    customerName: string
  ) => {
    setSavingType(isDraft ? 'draft' : 'final');
    try {
      // Auto-generate title
      const safeAccountName = customerName ? customerName.trim().replace(/\s+/g, '_') : 'Customer';
      const accountType = (currentConfig.institutionType === 'ACADEMIC' || currentConfig.institutionType === 'Academic Institutions') ? 'AA' : 'PP';
      const dealTypeStr = currentConfig.dealType || 'DEAL';
      
      let productMix = currentConfig.selectedProducts && currentConfig.selectedProducts.length > 0 
        ? currentConfig.selectedProducts.map((p: string) => p.toUpperCase()).join('_')
        : 'Quote';
        
      if (currentConfig.dealType === 'Mid-Cycle Upgrade' || currentConfig.dealType === 'MID_CYCLE') {
          productMix = currentConfig.midCycleProduct || 'MID_CYCLE';
      } else if (currentConfig.dealType === 'Extension' || currentConfig.dealType === 'EXTENSION') {
          productMix = (currentConfig.extensionVariant || currentResults?.extension?.variant || 'EXTENSION').replace(/\s+/g, '_');
      }
      
      const yearsStr = `${currentConfig.years || 1}Y`;
      const dateStr = new Date().toISOString().slice(0, 10);
      
      const finalTitle = `Quote_${safeAccountName}_${accountType}_${dealTypeStr}_${productMix}_${yearsStr}_${dateStr}`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Not logged in");
        return;
      }

      // Check for exact name matches to auto-version
      let versionedTitle = finalTitle;
      const { data: existingQuotes } = await supabase
        .from('quotes')
        .select('title')
        .eq('user_id', session.user.id)
        .like('title', `${finalTitle}%`);

      if (existingQuotes && existingQuotes.length > 0) {
        let v = 2;
        while (existingQuotes.some(q => q.title === versionedTitle)) {
          versionedTitle = `${finalTitle}_v${v}`;
          v++;
        }
      }

      const { error } = await supabase
        .from('quotes')
        .insert([{
          user_id: session.user.id,
          title: versionedTitle,
          config: currentConfig,
          results: currentResults,
          is_draft: isDraft,
          rep_name: `${session.user.user_metadata?.first_name || 'Unknown'} ${session.user.user_metadata?.last_name || 'Rep'}`.trim()
        }]);
        
      if (error) throw error;
      
      alert(isDraft ? 'Draft saved successfully!' : 'Final Quote saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save quote');
    } finally {
      setSavingType(null);
    }
  };

  return { saveQuote, savingType };
}
