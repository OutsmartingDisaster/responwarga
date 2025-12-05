'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Package, MapPin, AlertTriangle, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  FIELD_REPORT_CATEGORIES, 
  AID_DELIVERY_SUBCATEGORIES, 
  INCIDENT_SUBCATEGORIES,
  SUBCATEGORY_LABELS,
  FieldReport,
  FieldReportCategory
} from '@/types/operations';

interface FieldReportsListProps {
  operationId: string;
  refreshTrigger?: number;
}

const CATEGORY_ICONS = {
  aid_delivery: Package,
  field_condition: MapPin,
  incident: AlertTriangle
};

const CATEGORY_COLORS = {
  aid_delivery: 'bg-green-500/20 text-green-400 border-green-500/30',
  field_condition: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  incident: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export default function FieldReportsList({ operationId, refreshTrigger }: FieldReportsListProps) {
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/operations/${operationId}/field-reports`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setReports(result.data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [operationId, refreshTrigger]);

  const getSubcategoryLabel = (category: FieldReportCategory, subcategory: string) => {
    if (category === 'aid_delivery') return AID_DELIVERY_SUBCATEGORIES[subcategory as keyof typeof AID_DELIVERY_SUBCATEGORIES];
    if (category === 'incident') return INCIDENT_SUBCATEGORIES[subcategory as keyof typeof INCIDENT_SUBCATEGORIES];
    return SUBCATEGORY_LABELS[subcategory] || subcategory;
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  if (error) {
    return <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">{error}</div>;
  }

  if (reports.length === 0) {
    return null; // Parent will show empty state
  }

  return (
    <div className="space-y-3">
      {reports.map(report => {
        const Icon = CATEGORY_ICONS[report.category];
        const isExpanded = expandedId === report.id;
        
        return (
          <div key={report.id} className="bg-slate-800/40 border border-white/5 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : report.id)}
              className="w-full p-4 flex items-start gap-3 text-left hover:bg-slate-800/60 transition-colors"
            >
              <div className={`p-2 rounded-lg ${CATEGORY_COLORS[report.category]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs rounded-lg border ${CATEGORY_COLORS[report.category]}`}>
                    {FIELD_REPORT_CATEGORIES[report.category]}
                  </span>
                  {report.subcategory && (
                    <span className="text-xs text-slate-500">
                      {getSubcategoryLabel(report.category, report.subcategory)}
                    </span>
                  )}
                </div>
                <h4 className="text-white font-medium truncate">{report.title}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(report.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  {report.location_name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {report.location_name}
                    </span>
                  )}
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                {report.description && <p className="text-slate-300 text-sm">{report.description}</p>}
                
                <div className="flex flex-wrap gap-3 text-sm">
                  {report.severity && (
                    <span className={`px-2 py-1 rounded-lg ${
                      report.severity === 'severe' ? 'bg-red-500/20 text-red-400' :
                      report.severity === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                    }`}>Keparahan: {report.severity === 'severe' ? 'Parah' : report.severity === 'moderate' ? 'Sedang' : 'Ringan'}</span>
                  )}
                  {report.urgency && (
                    <span className={`px-2 py-1 rounded-lg ${
                      report.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                      report.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      report.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-500/20 text-slate-400'
                    }`}>Urgensi: {report.urgency === 'critical' ? 'Kritis' : report.urgency === 'high' ? 'Tinggi' : report.urgency === 'medium' ? 'Sedang' : 'Rendah'}</span>
                  )}
                  {report.affected_count && <span className="text-slate-400">Terdampak: {report.affected_count} orang</span>}
                  {report.quantity_delivered && <span className="text-slate-400">Bantuan: {report.quantity_delivered}</span>}
                </div>

                {report.photos && report.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {report.photos.map((photo, idx) => (
                      <img key={idx} src={photo} alt="" className="aspect-square object-cover rounded-lg" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
