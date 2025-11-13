import React from 'react';
import { FiMenu } from 'react-icons/fi';
import Sidebar from '../Sidebar';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import Toast from '../Toast';
import AdminAccessCode from '../AdminAccessCode';
import AnalyticsSection from './components/AnalyticsSection';
import GuestActivitySection from './components/GuestActivitySection';
import { useClicksData } from './hooks/useClicksData';
import { useFilters } from './hooks/useFilters';

export default function AdminDashboard({ onLogout, userData }) {
  const {
    activeNav,
    setActiveNav,
    isSidebarOpen,
    setIsSidebarOpen,
    isMobile,
    showToast,
    setShowToast,
    toastMessage,
    toastType,
    showToastMessage
  } = useFilters();

  const {
    clicksData,
    analyticsData,
    isLoading,
    analyticsLoading,
    fetchData,
    fetchAllClicksForAnalytics,
    handleDeleteClick,
    handleDeleteAll,
    handleExportCSV,
    showDeleteModal,
    setShowDeleteModal,
    deleteMode,
    isDeleting,
    handleDeleteConfirm
  } = useClicksData({ showToastMessage, activeNav });

  const handleNavClick = (nav) => {
    setActiveNav(nav);
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-black text-gray-300 flex">
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeNav={activeNav}
        handleNavClick={handleNavClick}
        userData={userData}
        handleLogout={onLogout}
        isMobile={isMobile}
      />

      <main className="flex-1 overflow-auto bg-black p-4 sm:p-6 md:p-8 min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <FiMenu size={20} className="text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">
            {activeNav === 'analytics' ? 'Analytics' : activeNav === 'guests' ? 'Guest Activity' : 'Access Codes'}
          </h1>
          <div className="w-8"></div>
        </div>

        {activeNav === 'analytics' ? (
          <AnalyticsSection
            analyticsData={analyticsData}
            analyticsLoading={analyticsLoading}
            total={clicksData.total}
            fetchData={fetchData}
            fetchAllClicksForAnalytics={fetchAllClicksForAnalytics}
          />
        ) : activeNav === 'guests' ? (
          <GuestActivitySection
            isLoading={isLoading}
            clicks={clicksData.clicks}
            total={clicksData.total}
            totalPages={clicksData.totalPages}
            page={clicksData.page}
            setPage={clicksData.setPage}
            fetchData={fetchData}
            handleDeleteClick={handleDeleteClick}
            handleDeleteAll={handleDeleteAll}
            handleExportCSV={handleExportCSV}
          />
        ) : (
          <AdminAccessCode />
        )}

        <DeleteConfirmationModal
          showModal={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          deleteMode={deleteMode}
          isDeleting={isDeleting}
        />

        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setShowToast(false)}
          />
        )}
      </main>
    </div>
  );
}