import React from 'react';
import { EntryPage } from './components/EntryPage';
import { EditorPage } from './components/EditorPage';
import { useUIStore } from './store';

function App() {
  const currentPage = useUIStore((state) => state.currentPage);
  const toasts = useUIStore((state) => state.toasts);
  const dismissToast = useUIStore((state) => state.dismissToast);

  return (
    <>
      {currentPage === 'entry' ? <EntryPage /> : <EditorPage />}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]
              animate-in slide-in-from-right
              ${
                toast.type === 'success'
                  ? 'bg-green-600 text-white'
                  : toast.type === 'error'
                  ? 'bg-red-600 text-white'
                  : toast.type === 'warning'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-orange-500 text-white'
              }
            `}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-white hover:opacity-80"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
