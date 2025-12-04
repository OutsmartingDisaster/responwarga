'use client';

import React, { useState } from 'react';
import OperationsList from './OperationsList';
import CreateOperationForm from './CreateOperationForm';
import OperationDetail from './OperationDetail';
import { toast } from 'react-hot-toast';

type View = 'list' | 'create' | 'detail';

export default function OperationsManager() {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setCurrentView('create');
  };

  const handleSelectOperation = (id: string) => {
    setSelectedOperationId(id);
    setCurrentView('detail');
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedOperationId(null);
  };

  const handleCreateSuccess = (operationId: string) => {
    toast.success('Operasi respon berhasil diaktivasi!');
    setSelectedOperationId(operationId);
    setCurrentView('detail');
  };

  return (
    <div className="p-6">
      {currentView === 'list' && (
        <OperationsList
          onCreateNew={handleCreateNew}
          onSelectOperation={handleSelectOperation}
        />
      )}

      {currentView === 'create' && (
        <CreateOperationForm
          onBack={handleBack}
          onSuccess={handleCreateSuccess}
        />
      )}

      {currentView === 'detail' && selectedOperationId && (
        <OperationDetail
          operationId={selectedOperationId}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
