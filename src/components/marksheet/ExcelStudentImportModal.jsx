import React, { useState } from 'react'
import * as XLSX from 'xlsx'
import { parseStudentImportSheet } from '../../utils/excelStudentImport.js'
import { upsertStudentsFromImport } from '../../firebase/studentRepository.js'

export default function ExcelStudentImportModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [previewStudents, setPreviewStudents] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (!selected) return
    setFile(selected)
    setStatusMessage('')
    setErrorMessage('')

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const parsed = parseStudentImportSheet(worksheet)

        if (parsed.length === 0) {
          setErrorMessage('No valid student rows found in the selected Excel sheet.')
          setPreviewStudents([])
        } else {
          setPreviewStudents(parsed)
          setStatusMessage(`Found ${parsed.length} student records ready to import to Firebase backend.`)
        }
      } catch (err) {
        console.error('Failed to parse Excel file:', err)
        setErrorMessage('Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.')
      }
    }
    reader.readAsArrayBuffer(selected)
  }

  const handleUploadToFirebase = async () => {
    if (previewStudents.length === 0) return
    setIsUploading(true)
    setStatusMessage('')
    setErrorMessage('')

    try {
      await upsertStudentsFromImport(previewStudents)
      setStatusMessage(`Successfully imported ${previewStudents.length} students into Firebase backend!`)
      if (onSuccess) onSuccess(previewStudents)
      setTimeout(() => {
        setIsUploading(false)
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Firebase upload failed:', err)
      setErrorMessage(err.message || 'Failed to upload students to Firebase backend.')
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="font-black text-lg text-white">Import Students Excel to Firebase</h3>
              <p className="text-xs text-slate-400">Upload your 350 student details file (.xlsx / .xls)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:text-white hover:border-slate-700"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-bold text-rose-300">
            ⚠️ {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-bold text-emerald-300">
            ✅ {statusMessage}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-300">Select Excel File (.xlsx / .csv)</label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
          />
        </div>

        {previewStudents.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span>Preview Parsed Roster ({previewStudents.length} Students)</span>
            </div>
            <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-2 space-y-1.5 text-xs">
              {previewStudents.slice(0, 15).map((s, idx) => (
                <div key={idx} className="flex justify-between px-2 py-1 bg-slate-900/60 rounded-lg text-slate-300">
                  <span className="font-bold text-white">{s.name} ({s.id})</span>
                  <span className="text-indigo-400">Class {s.class}</span>
                </div>
              ))}
              {previewStudents.length > 15 && (
                <div className="text-center py-1 text-[11px] text-slate-500">
                  ...and {previewStudents.length - 15} more student records
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={previewStudents.length === 0 || isUploading}
            onClick={handleUploadToFirebase}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
          >
            {isUploading ? 'Uploading to Firebase...' : `Upload ${previewStudents.length} Students to Firebase`}
          </button>
        </div>
      </div>
    </div>
  )
}
