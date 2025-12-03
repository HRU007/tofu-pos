import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "border border-slate-300 bg-transparent hover:bg-slate-50 text-slate-700",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
    destructive: "bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} px-4 py-2`} 
      {...props}
    >
      {children}
    </button>
  );
};

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${className}`}>
    {children}
  </span>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => (
  <input 
    className={`flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl animate-[scaleIn_0.2s_ease-out] overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="font-bold text-lg text-slate-800">{title}</div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-slate-100 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface ToastProps {
  title: string;
  description: string;
  type?: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ title, description, type = 'success' }) => (
  <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm p-4 rounded-lg shadow-lg flex items-center gap-3 animate-[slideDown_0.3s_ease-out] ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
    <div>
      <h4 className="font-bold text-sm">{title}</h4>
      <p className="text-xs opacity-90">{description}</p>
    </div>
  </div>
);

interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  activeTab: T;
  onChange: (id: T) => void;
}

export const Tabs = <T extends string>({ tabs, activeTab, onChange }: TabsProps<T>) => (
  <div className="flex border-b border-slate-200">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
          activeTab === tab.id 
            ? 'text-blue-600' 
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {tab.label}
        {activeTab === tab.id && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full mx-4" />
        )}
      </button>
    ))}
  </div>
);