interface BoardViewHeaderProps {
  orgName: string;
  today: string;
  confidenceLevel: number;
}

export function BoardViewHeader({ orgName, today, confidenceLevel }: BoardViewHeaderProps) {
  return (
    <div className="flex items-end justify-between border-b-2 border-gray-900 pb-4 mb-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0E1A2B] text-white text-xs font-bold">
            ◆
          </div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Strata</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Data Capital Portfolio Review</h1>
        <p className="text-sm text-gray-500 mt-1">{orgName} · {today}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-wider text-gray-400">Prepared for</p>
        <p className="text-sm font-semibold text-gray-900">Board of Directors</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Confidence: {Math.round(confidenceLevel * 100)}%</p>
      </div>
    </div>
  );
}
