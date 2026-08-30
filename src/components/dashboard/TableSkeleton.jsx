function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          {Array.from({ length: cols }).map((__, colIndex) => (
            <div
              key={colIndex}
              className="h-8 flex-1 animate-pulse rounded-md bg-slate-200/80"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default TableSkeleton
