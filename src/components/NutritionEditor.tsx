import { useState, type FormEvent } from 'react'
import type { NutritionSummary } from '../domain/dailyRecord'

type NutritionValues = Required<
  Pick<NutritionSummary, 'caloriesKcal' | 'proteinG' | 'fatG' | 'carbsG'>
>

export function NutritionEditor({
  initial,
  onSave,
  onCancel,
  onClear,
}: {
  initial?: NutritionSummary
  onSave: (values: NutritionValues) => void
  onCancel: () => void
  onClear: () => void
}) {
  const [calories, setCalories] = useState(
    String(initial?.caloriesKcal ?? ''),
  )
  const [protein, setProtein] = useState(String(initial?.proteinG ?? ''))
  const [fat, setFat] = useState(String(initial?.fatG ?? ''))
  const [carbs, setCarbs] = useState(String(initial?.carbsG ?? ''))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave({
      caloriesKcal: Number(calories),
      proteinG: Number(protein),
      fatG: Number(fat),
      carbsG: Number(carbs),
    })
  }

  return (
    <form className="nutritionEditor" onSubmit={submit}>
      <div className="editorHeading">
        <div>
          <h3>🍽️ Питание за сегодня</h3>
          <p>Пока вводим вручную. Позже эти поля заполнит FatSecret.</p>
        </div>
        <button className="editorClose" type="button" onClick={onCancel}>
          ×
        </button>
      </div>

      <div className="nutritionFields">
        <label>
          <span>Калории</span>
          <input
            inputMode="decimal"
            min="0"
            placeholder="2500"
            required
            step="1"
            type="number"
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
          />
          <small>ккал</small>
        </label>

        <label>
          <span>Белки</span>
          <input
            inputMode="decimal"
            min="0"
            placeholder="180"
            required
            step="0.1"
            type="number"
            value={protein}
            onChange={(event) => setProtein(event.target.value)}
          />
          <small>г</small>
        </label>

        <label>
          <span>Жиры</span>
          <input
            inputMode="decimal"
            min="0"
            placeholder="70"
            required
            step="0.1"
            type="number"
            value={fat}
            onChange={(event) => setFat(event.target.value)}
          />
          <small>г</small>
        </label>

        <label>
          <span>Углеводы</span>
          <input
            inputMode="decimal"
            min="0"
            placeholder="280"
            required
            step="0.1"
            type="number"
            value={carbs}
            onChange={(event) => setCarbs(event.target.value)}
          />
          <small>г</small>
        </label>
      </div>

      <div className="editorActions">
        {initial && (
          <button className="editorClear" type="button" onClick={onClear}>
            Очистить
          </button>
        )}
        <button className="editorCancel" type="button" onClick={onCancel}>
          Отмена
        </button>
        <button className="editorSave" type="submit">
          Сохранить
        </button>
      </div>
    </form>
  )
}
