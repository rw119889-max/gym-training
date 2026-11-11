import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { ExercisePhoto } from '../types'
import { addExercisePhoto, deleteExercisePhoto, getExercisePhotos } from '../lib/exercisePhotos'
import { compressImage } from '../lib/image'
import { putImage } from '../lib/storage'
import RecipeImage from './RecipeImage'

interface Props {
  exerciseId: string
}

export default function ExercisePhotos({ exerciseId }: Props) {
  const [photos, setPhotos] = useState<ExercisePhoto[]>(() => getExercisePhotos(exerciseId))
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = () => setPhotos(getExercisePhotos(exerciseId))

  const pickPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      const stamped = Date.now()
      for (const [index, file] of files.entries()) {
        const blob = await compressImage(file)
        const id = `ep-${stamped}-${index}-${Math.random().toString(36).slice(2, 6)}`
        await putImage(id, blob)
        addExercisePhoto({
          id,
          exerciseId,
          label: label.trim(),
          createdAt: new Date().toISOString(),
        })
      }
      setLabel('')
      refresh()
    } catch {
      window.alert('照片保存失败，手机空间可能不够了，清理后再试。')
    } finally {
      setBusy(false)
    }
  }

  const removePhoto = async (photo: ExercisePhoto) => {
    await deleteExercisePhoto(photo.id)
    refresh()
  }

  return (
    <>
      <h2 className="section-title">我的照片</h2>
      {photos.length === 0 ? (
        <p className="hint">还没存照片。拍下这台机器怎么调、你的站位，下次直接照着摆。</p>
      ) : (
        <div className="detail-images photo-strip">
          {photos.map((photo, index) => (
            <div key={photo.id} className="photo-cell">
              <RecipeImage
                imageId={photo.id}
                alt={photo.label || `照片 ${index + 1}`}
                className="detail-image"
              />
              {photo.label && <p className="photo-label">{photo.label}</p>}
              <button
                className="image-remove"
                type="button"
                aria-label={`删除照片 ${index + 1}`}
                onClick={() => void removePhoto(photo)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="photo-add">
        <input
          className="field-input"
          value={label}
          maxLength={20}
          placeholder="标注（可选）：这台机器怎么调 / 我的站位"
          onChange={(event) => setLabel(event.target.value)}
        />
        <label className="ghost-btn small photo-add-btn">
          {busy ? '保存中…' : '+ 加照片'}
          <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={pickPhotos} />
        </label>
      </div>
    </>
  )
}
