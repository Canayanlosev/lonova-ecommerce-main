"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: React.ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="premium-card p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Bir Hata Oluştu</h3>
            <p className="text-sm text-slate-500">{this.state.message || "Beklenmeyen bir hata oluştu."}</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="premium-button flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Yeniden Dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
