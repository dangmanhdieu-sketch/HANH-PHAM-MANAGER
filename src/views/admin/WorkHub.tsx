import React, { useState } from 'react';
import { CheckSquare, CalendarDays } from 'lucide-react';
import type { NhanVien } from '../../types';
import { TaskManagement } from './TaskManagement';
import { WeddingDispatch } from './WeddingDispatch';

interface Props {
  staffList: NhanVien[];
  currentUser: NhanVien;
  onRefresh: () => void;
}

export const WorkHub: React.FC<Props> = ({ staffList, currentUser, onRefresh }) => {
  const isAdmin = currentUser.Quyen === 'Admin';
  const canViewWeddingSchedule = currentUser.Quyen !== 'Freelancer';
  const [section, setSection] = useState<'tasks' | 'weddings'>('tasks');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E7DFD5] bg-white p-2">
        <button
          type="button"
          onClick={() => setSection('tasks')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${section === 'tasks' ? 'bg-[#c5a059] text-stone-950' : 'text-stone-600 hover:bg-stone-100'}`}
        >
          <CheckSquare size={16} /> Công việc
        </button>
        {canViewWeddingSchedule && (
          <button
            type="button"
            onClick={() => setSection('weddings')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${section === 'weddings' ? 'bg-[#c5a059] text-stone-950' : 'text-stone-600 hover:bg-stone-100'}`}
          >
            <CalendarDays size={16} /> Lịch cưới & Điều phối
          </button>
        )}
      </div>

      {section === 'tasks' ? (
        <TaskManagement staffList={staffList} currentUser={currentUser} onRefresh={onRefresh} />
      ) : canViewWeddingSchedule ? (
        <WeddingDispatch staffList={staffList} currentUser={currentUser} />
      ) : (
        <TaskManagement staffList={staffList} currentUser={currentUser} onRefresh={onRefresh} />
      )}
    </div>
  );
};
