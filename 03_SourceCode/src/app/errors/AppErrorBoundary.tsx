import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  readonly children: ReactNode;
};

type AppErrorBoundaryState = {
  readonly hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error('Unhandled application error.', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="app-error" role="alert">
          <h1>应用暂时无法继续</h1>
          <p>请刷新页面后重试。当前错误不会自动上传。</p>
        </main>
      );
    }

    return this.props.children;
  }
}
