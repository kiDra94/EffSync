import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  validateFile,
  isPreviewable,
  simpleType,
  formatBytes,
  uploaderRole,
  gradeSummary,
  fileNameFromResponse,
  openBlob,
} from './documentFiles'

const file = (name, size = 1000) => ({ name, size })

// the documents page's file rules and labels (Definition of done: out of DocumentView)
describe('documentFiles', () => {
  it('accepts the allowed formats up to 25 MB', () => {
    expect(validateFile(file('abgabe.PDF'))).toBe('')
    expect(validateFile(null)).toBe('Bitte wähle eine Datei aus.')
    expect(validateFile(file('riesig.pdf', 25 * 1024 * 1024 + 1))).toBe('Datei überschreitet das Limit von 25 MB.')
    expect(validateFile(file('skript.exe'))).toMatch(/^Erlaubte Formate:/)
  })

  it('opens images, text and PDFs in the browser', () => {
    expect(isPreviewable('application/pdf')).toBe(true)
    expect(isPreviewable('image/png')).toBe(true)
    expect(isPreviewable('application/vnd.ms-excel')).toBe(false)
  })

  it('names the file type', () => {
    expect(simpleType('application/pdf')).toBe('PDF')
    expect(simpleType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('Dokument')
    expect(simpleType('text/csv')).toBe('Tabelle')
    expect(simpleType('image/png')).toBe('Bild')
    expect(simpleType('')).toBe('Datei')
  })

  it('formats sizes', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
    expect(formatBytes(512)).toBe('512 Bytes')
    expect(formatBytes(1894)).toBe('1.85 KB')
  })

  it('names the uploader role and the grade', () => {
    expect(uploaderRole({ uploader: { role: 'Teacher' } })).toBe('Lehrer')
    expect(uploaderRole({})).toBe('Benutzer')
    expect(gradeSummary({ grade: '2' })).toBe('Note: 2')
    expect(gradeSummary({ feedback: 'gut' })).toBe('Feedback vorhanden')
    expect(gradeSummary({ is_gradeable: true })).toBe('Noch offen')
    expect(gradeSummary({})).toBe('Keine Bewertung')
  })

  it('takes the file name from the download headers', () => {
    const response = (disposition) => ({ headers: { 'content-disposition': disposition } })
    expect(fileNameFromResponse(response("attachment; filename*=UTF-8''%C3%9Cbung.pdf"), 'x.pdf')).toBe('Übung.pdf')
    expect(fileNameFromResponse(response('attachment; filename="abgabe.pdf"'), 'x.pdf')).toBe('abgabe.pdf')
    expect(fileNameFromResponse({ headers: {} }, 'x.pdf')).toBe('x.pdf')
  })

  // review: with 'noopener' window.open always returns null, so every opened
  // file was downloaded as well
  describe('openBlob', () => {
    afterEach(() => vi.restoreAllMocks())

    const setUp = (opened) => {
      URL.createObjectURL = vi.fn(() => 'blob:file')
      URL.revokeObjectURL = vi.fn()
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      vi.spyOn(window, 'open').mockReturnValue(opened)
      return click
    }

    it('opens the file in a new tab without a download, cut off from this page', () => {
      const tab = { opener: window }
      const click = setUp(tab)

      openBlob(new Blob(['%PDF']), 'abgabe.pdf')

      expect(window.open).toHaveBeenCalledWith('blob:file', '_blank')
      expect(tab.opener).toBeNull()
      expect(click).not.toHaveBeenCalled()
    })

    it('downloads the file when the tab is blocked', () => {
      const click = setUp(null)

      openBlob(new Blob(['%PDF']), 'abgabe.pdf')

      expect(click).toHaveBeenCalledTimes(1)
    })
  })
})
