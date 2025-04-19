"use client";
import { useEffect, useState, useRef, useCallback, KeyboardEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import ResponderCheckinTable from "./ResponderCheckinTable";
import InventoryLogTable from "./InventoryLogTable";
import ActivityLogTable from "./ActivityLogTable";
import DeliveryLogTable from "./DeliveryLogTable";

// Define the possible tab values
type TabKey = 'checkin' | 'inventory' | 'activity' | 'delivery';

// Define the structure for the toast message
interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

// Define the structure for the DailyLog data based on usage
interface DailyLogData {
  id: string;
  date: string;
  field_command_location: string | null;
  notes: string | null;
  organization_id: string;
  // Consider adding other fields like status if used in filtering or display
  // status?: string | null;
}

export default function DailyLog() {
  const supabase = createClient();
  // Use specific types for state
  const [logs, setLogs] = useState<DailyLogData[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [disasterResponses, setDisasterResponses] = useState<any[]>([]);
  const [updatingDisaster, setUpdatingDisaster] = useState(false);

  // Toast state
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Inline edit state
  const [editFieldCommand, setEditFieldCommand] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [fieldCommandValue, setFieldCommandValue] = useState("");
  const [notesValue, setNotesValue] = useState("");

  // Tab state for log sections
  const [activeTab, setActiveTab] = useState<TabKey>('checkin');

  // Filter/search state
  const [search, setSearch] = useState("");

  const [role, setRole] = useState<string | null>(null);

  // Type for tab refs
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'checkin', label: 'Check-in/out' },
    { key: 'inventory', label: 'Inventaris' },
    { key: 'activity', label: 'Aktivitas' },
    { key: 'delivery', label: 'Pengiriman' },
  ];

  // Ensure tabRefs array has the correct size based on tabs definition
  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
  }, [tabs.length]);

  // Fetch logs on date change
  useEffect(() => {
    fetchLogs(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Fetch user role on mount
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        if (error) throw error;
        setRole(profile?.role || null);
      } catch (err: any) {
        console.error("Error fetching user role:", err);
        // Handle error appropriately, maybe set an error state
      }
    }
    fetchUserRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update edit fields when todayLog changes
  useEffect(() => {
    if (todayLog) {
      setFieldCommandValue(todayLog.field_command_location || "");
      setNotesValue(todayLog.notes || "");
    } else {
      setFieldCommandValue("");
      setNotesValue("");
      setEditFieldCommand(false);
      setEditNotes(false);
    }
  }, [todayLog]);

  // Toast helper
  const showToast = useCallback((type: 'success' | 'error' | 'info' = 'success', message: string) => {
    setToast({ message, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch disaster responses (consider if this is still needed/used)
  useEffect(() => {
    const fetchDisasterResponses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();
        if (profileError) throw profileError;
        if (!profile?.organization_id) return;
        const { data, error } = await supabase
          .from("disaster_responses")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .eq("status", "active") // Ensure this status is correct
          .order("created_at", { ascending: false });
        if (error) throw error;
        setDisasterResponses(data || []);
      } catch (err) {
        console.error("Error fetching disaster responses:", err);
        // Consider showing an error message to the user
      }
    };
    fetchDisasterResponses();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLogs = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError(null);
    setTodayLog(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id') // Select only necessary fields
        .eq('user_id', user.id)
        .single();
      if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`);
      if (!profile?.organization_id) throw new Error('No organization assigned');

      const { data: logsData, error: logsError } = await supabase
        .from('daily_logs')
        .select('id, date, field_command_location, notes, organization_id') // Select specific columns
        .eq('organization_id', profile.organization_id)
        .order('date', { ascending: false });

      if (logsError) throw logsError;

      const typedLogsData: DailyLogData[] = (logsData || []).map(log => ({
        id: log.id,
        date: log.date,
        field_command_location: log.field_command_location,
        notes: log.notes,
        organization_id: log.organization_id,
      }));
      setLogs(typedLogsData);

      // Find log for selected date
      const logForDate = typedLogsData.find((l) => l.date === targetDate);
      console.log("Fetched logs for date:", targetDate, "Found log:", logForDate); // Debugging
      setTodayLog(logForDate || null);

    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred';
      setError(errorMessage);
      console.error("Error fetching logs:", err);
      showToast('error', `Gagal memuat log: ${errorMessage}`); // Show error toast
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, showToast]);

  // Date navigation helpers
  const changeDate = (offset: number) => {
    const currentDate = new Date(date + 'T00:00:00Z'); // Use UTC context for consistency
    currentDate.setUTCDate(currentDate.getUTCDate() + offset);
    setDate(currentDate.toISOString().slice(0, 10));
  };

  // Check-in & Create Log handler
  const handleCheckInCreateLog = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`);
      if (!profile?.organization_id) throw new Error('No organization assigned');

      // Check if a log already exists for this date
      const { data: existingLog, error: existingLogError } = await supabase
        .from('daily_logs')
        .select('id, date, field_command_location, notes, organization_id')
        .eq('organization_id', profile.organization_id)
        .eq('date', date)
        .maybeSingle();

      if (existingLogError) throw existingLogError;

      if (existingLog) {
        showToast('info', `Log harian untuk tanggal ${date} sudah ada.`);
        // Ensure existingLog matches DailyLogData structure before setting state
        const typedExistingLog: DailyLogData = {
            id: existingLog.id,
            date: existingLog.date,
            field_command_location: existingLog.field_command_location,
            notes: existingLog.notes,
            organization_id: existingLog.organization_id,
        };
        setTodayLog(typedExistingLog);
        // Optionally re-fetch if needed, though setting state might be sufficient
        // fetchLogs(date);
      } else {
        // If no log exists, create one
        const { data: newLogData, error: createError } = await supabase
          .from('daily_logs')
          .insert({
            organization_id: profile.organization_id,
            date: date,
            field_command_location: '',
            notes: '',
          })
          .select('id, date, field_command_location, notes, organization_id')
          .single();

        if (createError) throw createError;
        if (!newLogData) throw new Error("Failed to create log, no data returned.");

        const typedNewLog: DailyLogData = {
            id: newLogData.id,
            date: newLogData.date,
            field_command_location: newLogData.field_command_location,
            notes: newLogData.notes,
            organization_id: newLogData.organization_id,
        };
        setTodayLog(typedNewLog);
        // Add to the start of the logs list, ensuring correct sorting if needed elsewhere
        setLogs(prevLogs => [typedNewLog, ...prevLogs.filter(l => l.id !== typedNewLog.id)]);
        showToast('success', 'Log harian berhasil dibuat.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Gagal membuat log harian';
      setError(errorMessage);
      showToast('error', errorMessage);
      console.error("Error in handleCheckInCreateLog:", err);
    } finally {
      setLoading(false);
    }
  };

  // Save edited field
  const saveField = async (field: 'field_command_location' | 'notes', value: string) => {
    if (!todayLog) {
        showToast('error', 'Tidak ada log harian untuk diedit.');
        return;
    }
    try {
      const { error } = await supabase
        .from('daily_logs')
        .update({ [field]: value })
        .eq('id', todayLog.id);
      if (error) throw error;

      // Update local state immediately for better UX
      const updatedLog = { ...todayLog, [field]: value };
      setTodayLog(updatedLog);
      setLogs(prevLogs => prevLogs.map(l => l.id === updatedLog.id ? updatedLog : l));

      showToast('success', `${field === 'field_command_location' ? 'Lokasi Pos Komando' : 'Catatan'} berhasil diperbarui.`);
      // Reset edit state
      if (field === 'field_command_location') setEditFieldCommand(false);
      if (field === 'notes') setEditNotes(false);

    } catch (err: any) {
       const errorMessage = err.message || `Gagal memperbarui ${field}`;
       showToast('error', errorMessage);
       console.error(`Error updating ${field}:`, err);
    }
  };

  // Handle Tab KeyDown for Accessibility
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
        nextIndex = 0;
    } else if (e.key === 'End') {
        nextIndex = tabs.length - 1;
    } else {
        return; // Ignore other keys
    }

    e.preventDefault(); // Prevent default scrolling behavior for arrow keys
    const nextTab = tabRefs.current[nextIndex];
    if (nextTab) {
      nextTab.focus();
      // Optionally change active tab on arrow navigation, or only on Enter/Space
      // setActiveTab(tabs[nextIndex].key);
    }
  };

  // Filter logs based on search input (date or potentially status if added)
  const filteredLogs = logs.filter(log => {
    const searchTerm = search.toLowerCase();
    // Safe filtering with optional chaining and nullish coalescing
    const dateMatch = log.date?.toLowerCase().includes(searchTerm);
    // Add status match if status field exists and is relevant
    // const statusMatch = log.status?.toLowerCase().includes(searchTerm);
    // return dateMatch || statusMatch;
    return dateMatch; // Currently only filtering by date
  });

  // Quick Add placeholder function
  const handleQuickAdd = (section: string) => {
    showToast('info', `Fitur tambah ${section} segera hadir`);
  };

  // Loading and error states
  if (loading && logs.length === 0) { // Show initial loading spinner only
    return <div className="flex justify-center items-center h-64">Memuat log harian...</div>;
  }

  if (error && logs.length === 0) { // Show error only if loading failed initially
    return <div className="text-red-600 p-4">Error: {error}</div>;
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 p-4 rounded-md shadow-lg text-white ${
            toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}
          role="alert"
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-4 font-bold">X</button>
        </div>
      )}

      <h1 className="text-2xl font-semibold mb-4 text-gray-800">Log Harian Operasi</h1>

      {/* Search and Date Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-lg shadow">
         {/* Search Input */}
         <div className="relative w-full md:w-1/3">
            <input
                type="text"
                placeholder="Cari berdasarkan tanggal (YYYY-MM-DD)..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                aria-label="Cari log harian"
            />
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
         </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition duration-150 ease-in-out">&lt;</button>
          <input
            type="date"
            value={date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Pilih tanggal log"
          />
          <button onClick={() => changeDate(1)} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition duration-150 ease-in-out">&gt;</button>
        </div>
      </div>

        {/* Display Filtered Logs - Optional: Show list of available logs */}
        {/* <div className="mb-4">
            <h2 className="text-lg font-medium">Available Logs:</h2>
            {filteredLogs.length > 0 ? (
                <ul>
                    {filteredLogs.map(log => (
                        <li key={log.id} onClick={() => setDate(log.date)} className="cursor-pointer hover:bg-gray-100 p-1 rounded">
                            {log.date} {log.date === date ? '(Selected)' : ''}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No logs match your search.</p>
            )}
        </div> */}


      {/* Log Details Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        {loading && <p>Memeriksa log untuk tanggal {date}...</p>}
        {!loading && !todayLog && (
          <div className="text-center p-4 border border-dashed border-gray-300 rounded-md">
            <p className="text-gray-600 mb-3">Belum ada log harian untuk tanggal {date}.</p>
            <button
              onClick={handleCheckInCreateLog}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              disabled={loading}
            >
              {loading ? 'Membuat...' : 'Buat Log Harian'}
            </button>
             {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        )}

        {todayLog && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Detail Log - {todayLog.date}</h2>
             {/* Field Command Location */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Pos Komando Lapangan:</label>
              {editFieldCommand ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={fieldCommandValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldCommandValue(e.target.value)}
                    className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    aria-label="Edit Lokasi Pos Komando Lapangan"
                  />
                  <button
                      onClick={() => saveField('field_command_location', fieldCommandValue)}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-label="Simpan Lokasi Pos Komando Lapangan"
                  >
                      Simpan
                  </button>
                  <button
                      onClick={() => { setEditFieldCommand(false); setFieldCommandValue(todayLog.field_command_location || ""); }}
                      className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition duration-150 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      aria-label="Batal edit Lokasi Pos Komando Lapangan"
                  >
                      Batal
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-gray-800 bg-gray-100 p-2 rounded-md flex-grow min-h-[40px] flex items-center">
                     {fieldCommandValue || <span className="text-gray-400 italic">Belum diatur</span>}
                  </p>
                  <button
                      onClick={() => setEditFieldCommand(true)}
                      className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                      aria-label="Edit Lokasi Pos Komando Lapangan"
                  >
                     Edit
                  </button>
                </div>
              )}
            </div>

            {/* Notes */}
             <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan:</label>
              {editNotes ? (
                 <div className="flex items-center gap-2">
                  <textarea
                    value={notesValue}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotesValue(e.target.value)}
                    rows={3}
                    className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    aria-label="Edit Catatan"
                  />
                   <button
                       onClick={() => saveField('notes', notesValue)}
                       className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="Simpan Catatan"
                    >
                       Simpan
                   </button>
                   <button
                       onClick={() => { setEditNotes(false); setNotesValue(todayLog.notes || ""); }}
                       className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition duration-150 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        aria-label="Batal edit Catatan"
                    >
                       Batal
                   </button>
                 </div>
              ) : (
                 <div className="flex items-center gap-2">
                  <p className="text-gray-800 bg-gray-100 p-2 rounded-md flex-grow min-h-[40px] flex items-center whitespace-pre-wrap">
                      {notesValue || <span className="text-gray-400 italic">Tidak ada catatan</span>}
                  </p>
                   <button
                       onClick={() => setEditNotes(true)}
                       className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                        aria-label="Edit Catatan"
                    >
                       Edit
                   </button>
                 </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs for Log Sections */}
      {todayLog && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4 border-b border-gray-200">
              {/* Tab List */}
            <div role="tablist" aria-label="Bagian Log Harian" className="flex flex-wrap -mb-px">
              {tabs.map((tab, index) => (
                <button
                  key={tab.key}
                  ref={(el) => { tabRefs.current[index] = el; }}
                  id={`tab-${tab.key}`}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`panel-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => handleKeyDown(e, index)}
                  tabIndex={activeTab === tab.key ? 0 : -1}
                  className={`inline-block p-4 border-b-2 rounded-t-lg font-medium text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Panels */}
          <div>
            {tabs.map((tab) => (
              <div
                key={tab.key}
                id={`panel-${tab.key}`}
                role="tabpanel"
                tabIndex={0}
                aria-labelledby={`tab-${tab.key}`}
                hidden={activeTab !== tab.key}
                className="focus:outline-none"
              >
                 <div className="flex justify-end mb-4">
                     <button
                        onClick={() => handleQuickAdd(tab.label)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm"
                        aria-label={`Tambah ${tab.label} baru`}
                    >
                        + Tambah {tab.label}
                    </button>
                </div>

                {activeTab === 'checkin' && <ResponderCheckinTable dailyLogId={todayLog.id} />}
                {activeTab === 'inventory' && <InventoryLogTable dailyLogId={todayLog.id} />}
                {activeTab === 'activity' && <ActivityLogTable dailyLogId={todayLog.id} />}
                {activeTab === 'delivery' && <DeliveryLogTable dailyLogId={todayLog.id} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
