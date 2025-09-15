'use client';

interface ConnectionStatusProps {
  usingFallback: boolean;
}

export default function ConnectionStatus({ usingFallback }: ConnectionStatusProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${usingFallback ? 'bg-destructive' : 'bg-secondary'}`}></div>
        <span className="text-sm text-muted-foreground">
          {usingFallback ? 'FastAPI server offline' : 'Connected to player database'}
        </span>
      </div>
      {usingFallback && (
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-primary hover:underline"
        >
          Retry connection
        </button>
      )}
    </div>
  );
}
