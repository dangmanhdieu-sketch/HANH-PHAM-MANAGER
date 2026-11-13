import React, { useState } from 'react';
import { CheckSquare, CalendarDays } from 'lucide-react';
import type { NhanVien } from '../../types';
import { BusinessModule } from './BusinessModule';
import { WeddingDispatch } from './WeddingDispatch';

interface Props {
  staffList: NhanVien[];
  currentUser: NhanVien;
  onRefresh: () => void;
}

export const WorkHub: React.FC<Props> = ({ staffList, currentUser, onRefresh }) => {
  const isAdmin = currentUser.Quyen === 'Admin';
  const [section, setSection] = useState<'tasks' | 'weddings'>(isAdmin ? 'tasks' : 'weddings');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-700/60 bg-stone-900/70 p-2">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setSection('tasks')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${section === 'tasks' ? 'bg-[#c5a059] text-stone-950' : 'text-stone-300 hover:bg-stone-800'}`}
          >
            <CheckSquare size={16} /> Công việc
          </button>
        )}
        <button
          type="button"
          onClick={() => setSection('weddings')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${section === 'weddings' ? 'bg-[#c5a059] text-stone-950' : 'text-stone-300 hover:bg-stone-800'}`}
        >
          <CalendarDays size={16} /> Lịch cưới & Điều phối
        </button>
      </div>

      {section === 'tasks' && isAdmin ? (
        <BusinessModule module="CONG_VIEC" staffList={staffList} currentUser={currentUser} onRefresh={onRefresh} />
      ) : (
        <WeddingDispatch staffList={staffList} currentUser={currentUser} />
      )}
    </div>
  );
};
