import React from 'react';
import { FiDownload, FiTrash2 } from 'react-icons/fi';

const GuestActivityActions = ({ onExportCSV, onDeleteAll, total }) => {
  return (
    <div className="flex flex-col xs:flex-row gap-3">
      <button
        onClick={onExportCSV}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-semibold text-sm hover:bg-green-700 rounded-lg transition-colors w-full xs:w-auto min-w-[120px]"
        disabled={total === 0}
        title="Export all filtered data to CSV"
      >
        <FiDownload size={16} />
        <span>Export CSV</span>
      </button>
      <button
        onClick={onDeleteAll}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-semibold text-sm hover:bg-red-700 rounded-lg transition-colors w-full xs:w-auto min-w-[120px]"
        disabled={total === 0}
        title="Delete all records"
      >
        <FiTrash2 size={16} />
        <span>Delete All</span>
      </button>
    </div>
  );
};

export default GuestActivityActions;