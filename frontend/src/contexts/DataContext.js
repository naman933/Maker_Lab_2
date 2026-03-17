import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as storage from '../services/storage';
import { calculatePriority } from '../services/priorityEngine';

const API = process.env.REACT_APP_BACKEND_URL || '';
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [ver, setVer] = useState(0);
  const [users, setUsersState] = useState([]);
  const bump = useCallback(() => setVer(v => v + 1), []);

  const queries = storage.getQueries();
  const cycles = storage.getCycles();
  const uploads = storage.getUploads();
  const activeCycle = cycles.find(c => c.isActive) || null;

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/api/users`);
      if (resp.ok) {
        const data = await resp.json();
        setUsersState(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, ver]);

  const addCycle = (cycle) => {
    const updated = [...cycles, { ...cycle, id: Date.now().toString(), isActive: false }];
    storage.setCycles(updated);
    bump();
  };

  const setActiveCycle = (id) => {
    const updated = cycles.map(c => ({ ...c, isActive: c.id === id }));
    storage.setCycles(updated);
    bump();
  };

  const importQueries = (newQueries, fileName, uploadedBy) => {
    const existing = storage.getQueries();
    const existingIds = new Set(existing.map(q => q.ticketId));
    const members = users.filter(u => u.role === 'AdCom Member');

    let imported = 0;
    const toAdd = [];

    newQueries.forEach(q => {
      if (!q.ticketId || existingIds.has(q.ticketId)) return;

      let assignedTo = '';
      if (members.length > 0) {
        const counts = {};
        members.forEach(m => { counts[m.username] = 0; });
        [...existing, ...toAdd].forEach(eq => {
          if (eq.assignedTo && counts[eq.assignedTo] !== undefined &&
              eq.internalStatus !== 'Resolved' && eq.internalStatus !== 'Spam') {
            counts[eq.assignedTo]++;
          }
        });
        const sorted = Object.entries(counts).sort((a, b) => a[1] - b[1]);
        assignedTo = sorted[0]?.[0] || '';
      }

      const priority = calculatePriority(q);
      toAdd.push({
        ticketId: String(q.ticketId),
        referenceTicketId: q.referenceTicketId || '',
        candidateName: q.candidateName || '',
        merittoCategory: q.merittoCategory || '',
        createdDate: q.createdDate || new Date().toISOString(),
        merittoStatus: q.merittoStatus || '',
        description: q.description || '',
        assignedTo,
        internalStatus: 'New',
        cycle: activeCycle?.name || 'No Active Cycle',
        priorityScore: priority.priorityScore,
        priorityLevel: priority.priorityLevel,
        aiCategory: '',
        aiConfidenceScore: null,
        aiSummary: '',
        aiIntentTags: '',
        aiUrgencyTag: '',
        aiDraftResponse: '',
        closureDate: null,
        tat: null,
        escalationFlag: false,
        escalationReason: '',
        adminResolution: '',
        reassignmentHistory: [],
        slaBreachFlag: false,
        updatedDate: q.updatedDate || '',
        firstClosureDate: q.firstClosureDate || '',
        lastReplyBy: q.lastReplyBy || '',
        leadId: q.leadId || '',
        feedbackScore: q.feedbackScore || '',
        originalAssignedTo: q.originalAssignedTo || '',
      });
      imported++;
    });

    storage.setQueries([...existing, ...toAdd]);

    const uploadLog = {
      id: Date.now().toString(),
      fileName,
      uploadedBy,
      dateTime: new Date().toISOString(),
      recordsImported: imported,
      cycle: activeCycle?.name || 'No Active Cycle',
    };
    storage.setUploads([...uploads, uploadLog]);
    bump();
    return imported;
  };

  const updateQuery = (ticketId, updates) => {
    const all = storage.getQueries();
    const idx = all.findIndex(q => q.ticketId === String(ticketId));
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      storage.setQueries(all);
      bump();
    }
  };

  const addUser = async (user) => {
    try {
      const resp = await fetch(`${API}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Failed to create user');
      }
      bump();
      return await resp.json();
    } catch (err) {
      throw err;
    }
  };

  const updateUser = async (id, updates) => {
    try {
      const resp = await fetch(`${API}/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Failed to update user');
      }
      bump();
      return await resp.json();
    } catch (err) {
      throw err;
    }
  };

  const deleteUser = async (id) => {
    try {
      const resp = await fetch(`${API}/api/users/${id}`, { method: 'DELETE' });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Failed to delete user');
      }
      bump();
    } catch (err) {
      throw err;
    }
  };

  const clearUploadedData = () => {
    storage.setQueries([]);
    storage.setUploads([]);
    bump();
  };

  const clearAllData = () => {
    storage.setQueries([]);
    storage.setUploads([]);
    storage.setCycles([]);
    bump();
  };

  return (
    <DataContext.Provider value={{
      queries, cycles, uploads, users, activeCycle, ver,
      addCycle, setActiveCycle,
      importQueries, updateQuery,
      addUser, updateUser, deleteUser, fetchUsers, bump,
      clearUploadedData, clearAllData,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
