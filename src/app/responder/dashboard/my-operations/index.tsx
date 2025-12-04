'use client';

import { useState } from 'react';
import MyOperationsList from './MyOperationsList';
import MyOperationDetail from './MyOperationDetail';

export default function MyOperationsManager() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

  const handleSelectOperation = (id: string) => {
    setSelectedOperationId(id);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setSelectedOperationId(null);
  };

  if (view === 'detail' && selectedOperationId) {
    return <MyOperationDetail operationId={selectedOperationId} onBack={handleBack} />;
  }

  return <MyOperationsList onSelectOperation={handleSelectOperation} />;
}
