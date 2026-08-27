import React from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

let alertContainer = null;
let alertRoot = null;

function getAlertRoot() {
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    alertContainer.id = 'ps-native-alert-root';
    document.body.appendChild(alertContainer);
    alertRoot = createRoot(alertContainer);
  }
  return alertRoot;
}

function renderModal({ title, text, icon = 'info', isConfirm = false, confirmText = 'Ya, Lanjutkan', cancelText = 'Batal', resolve }) {
  const root = getAlertRoot();

  const handleClose = (result) => {
    root.render(null);
    if (resolve) resolve(result);
  };

  const IconComponent = icon === 'success' ? CheckCircle2 :
                        icon === 'error' ? AlertCircle :
                        icon === 'warning' ? AlertTriangle : Info;

  const iconColor = icon === 'success' ? 'text-emerald-400' :
                    icon === 'error' ? 'text-rose-400' :
                    icon === 'warning' ? 'text-amber-400' : 'text-sky-400';

  root.render(
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-lg p-6 shadow-2xl space-y-4 text-slate-100 relative">
        <button
          type="button"
          onClick={() => handleClose(false)}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3">
          <div className={`p-2.5 bg-slate-950 border border-slate-800 rounded-md flex-shrink-0 ${iconColor}`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <div className="space-y-1 pt-0.5">
            <h3 className="font-bold text-slate-100 text-base leading-snug">{title}</h3>
            {text && <p className="text-xs text-slate-400 leading-relaxed">{text}</p>}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
          {isConfirm && (
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-xs transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleClose(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs shadow-md shadow-emerald-500/20 transition-colors"
          >
            {isConfirm ? confirmText : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const showConfirm = ({ title, text, icon = 'warning', confirmText = 'Ya, Lanjutkan', cancelText = 'Batal' }) => {
  return new Promise((resolve) => {
    renderModal({ title, text, icon, isConfirm: true, confirmText, cancelText, resolve });
  });
};

export const showSuccess = (title, text = '') => {
  return new Promise((resolve) => {
    renderModal({ title, text, icon: 'success', isConfirm: false, resolve });
  });
};

export const showError = (title, text = '') => {
  return new Promise((resolve) => {
    renderModal({ title, text: typeof text === 'string' ? text : JSON.stringify(text), icon: 'error', isConfirm: false, resolve });
  });
};

export const showAlert = ({ title, text, icon = 'info' }) => {
  return new Promise((resolve) => {
    renderModal({ title, text, icon, isConfirm: false, resolve });
  });
};

export const showToast = (title, type = 'success') => {
  return showSuccess(title);
};

export default { showSuccess, showError, showConfirm, showAlert, showToast };
