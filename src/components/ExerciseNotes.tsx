import { useState } from 'react'
import type { ExerciseNote, ExerciseNoteTag } from '../types'
import {
  addExerciseNote,
  deleteExerciseNote,
  getNotesOfExercise,
  updateExerciseNote,
} from '../lib/exerciseNotes'

interface Props {
  exerciseId: string
}

const TAG_LABELS: Record<ExerciseNoteTag, string> = {
  mistake: '错误点',
  activation: '发力点',
  muscles: '肌肉',
  feeling: '感受',
}

const TAGS = Object.keys(TAG_LABELS) as ExerciseNoteTag[]

export default function ExerciseNotes({ exerciseId }: Props) {
  const [notes, setNotes] = useState<ExerciseNote[]>(() => getNotesOfExercise(exerciseId))
  const [tag, setTag] = useState<ExerciseNoteTag | null>(null)
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTag, setEditTag] = useState<ExerciseNoteTag | null>(null)
  const [editText, setEditText] = useState('')

  const refresh = () => setNotes(getNotesOfExercise(exerciseId))

  const submit = () => {
    const value = text.trim()
    if (!value) return
    addExerciseNote(exerciseId, tag, value)
    setText('')
    setTag(null)
    refresh()
  }

  const startEdit = (note: ExerciseNote) => {
    setEditingId(note.id)
    setEditTag(note.tag)
    setEditText(note.text)
  }

  const saveEdit = () => {
    if (!editingId) return
    const value = editText.trim()
    if (!value) return
    updateExerciseNote(editingId, { tag: editTag, text: value })
    setEditingId(null)
    refresh()
  }

  const removeNote = (note: ExerciseNote) => {
    deleteExerciseNote(note.id)
    if (editingId === note.id) setEditingId(null)
    refresh()
  }

  return (
    <>
      <h2 className="section-title">我的笔记</h2>
      {notes.length === 0 ? (
        <p className="hint">
          还没写笔记。这台机器怎么调、这组哪里错了、哪里有发力感，随时记一条，可贴 4 个快捷标签。
        </p>
      ) : (
        <ul className="note-list">
          {notes.map((note) =>
            editingId === note.id ? (
              <li key={note.id} className="note-item">
                <div className="filter-row">
                  {TAGS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="filter-chip"
                      aria-pressed={editTag === item}
                      onClick={() => setEditTag(editTag === item ? null : item)}
                    >
                      {TAG_LABELS[item]}
                    </button>
                  ))}
                </div>
                <textarea
                  className="field-input method-input"
                  rows={3}
                  value={editText}
                  onChange={(event) => setEditText(event.target.value)}
                />
                <div className="note-actions-row">
                  <button
                    className="save-btn"
                    type="button"
                    disabled={!editText.trim()}
                    onClick={saveEdit}
                  >
                    保存
                  </button>
                  <button className="ghost-btn small" type="button" onClick={() => setEditingId(null)}>
                    取消
                  </button>
                </div>
              </li>
            ) : (
              <li key={note.id} className="note-item">
                <div className="note-head">
                  {note.tag && <span className="note-tag">{TAG_LABELS[note.tag]}</span>}
                  <span className="note-date">{note.updatedAt.slice(0, 10)}</span>
                  <span className="note-spacer" />
                  <button className="note-action" type="button" onClick={() => startEdit(note)}>
                    改
                  </button>
                  <button
                    className="note-action"
                    type="button"
                    aria-label="删除这条笔记"
                    onClick={() => removeNote(note)}
                  >
                    ×
                  </button>
                </div>
                <p className="note-text">{note.text}</p>
              </li>
            ),
          )}
        </ul>
      )}

      <div className="note-composer">
        <div className="filter-row">
          {TAGS.map((item) => (
            <button
              key={item}
              type="button"
              className="filter-chip"
              aria-pressed={tag === item}
              onClick={() => setTag(tag === item ? null : item)}
            >
              {TAG_LABELS[item]}
            </button>
          ))}
        </div>
        <textarea
          className="field-input method-input"
          rows={3}
          value={text}
          placeholder="记一条：机器怎么调、哪里错了、哪里有发力感……"
          onChange={(event) => setText(event.target.value)}
        />
        <button className="save-btn" type="button" disabled={!text.trim()} onClick={submit}>
          添加笔记
        </button>
      </div>
    </>
  )
}
