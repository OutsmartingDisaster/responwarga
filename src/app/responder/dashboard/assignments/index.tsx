'use client';

import { useState } from 'react';
import MyAssignmentsList from './MyAssignmentsList';
import AssignmentDetail from './AssignmentDetail';

export default function AssignmentsManager() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setSelectedId(null);
  };

  if (view === 'detail' && selectedId) {
    return <AssignmentDetail assignmentId={selectedId} onBack={handleBack} />;
  }

  return <MyAssignmentsList onSelectAssignment={handleSelect} />;
}
