function UploadPanel({ onUpload, uploadError, uploadBusy = false, description }) {
  const defaultDescription =
    'Upload an `.xlsx` or `.csv` file with columns like Name, Roll Number, and Class.'
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-light text-slate-900">Import Student Data</h2>
      <p className="mt-1 text-sm text-slate-600">{description || defaultDescription}</p>

      <label
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-emerald-400 hover:bg-emerald-50 ${uploadBusy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <span className="text-sm font-semibold text-slate-700">
          {uploadBusy ? 'Uploading to cloud…' : 'Click to choose file'}
        </span>
        <span className="mt-1 text-xs text-slate-500">Supports .xlsx and .csv</span>
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={onUpload}
          disabled={uploadBusy}
          className="hidden"
          aria-label="Upload student file"
        />
      </label>

      {uploadError ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {uploadError}
        </p>
      ) : null}
    </section>
  )
}

export default UploadPanel
