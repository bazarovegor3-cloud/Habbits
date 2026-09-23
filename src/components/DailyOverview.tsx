import type { DailyRecord } from '../domain/dailyRecord'

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours} ч ${rest} мин`
}

export function DailyOverview({
  day,
  onEditNutrition,
  onSyncNutrition,
  syncingNutrition,
}: {
  day: DailyRecord
  onEditNutrition: () => void
  onSyncNutrition: () => void
  syncingNutrition: boolean
}) {
  const nutritionValue = day.nutrition?.caloriesKcal !== undefined
    ? `${Math.round(day.nutrition.caloriesKcal)} ккал`
    : 'Нет данных'

  const nutritionDetail = day.nutrition
    ? [
        day.nutrition.proteinG !== undefined
          ? `Б ${Math.round(day.nutrition.proteinG)}`
          : null,
        day.nutrition.fatG !== undefined
          ? `Ж ${Math.round(day.nutrition.fatG)}`
          : null,
        day.nutrition.carbsG !== undefined
          ? `У ${Math.round(day.nutrition.carbsG)}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  const sleepValue = day.sleep?.durationMinutes
    ? formatDuration(day.sleep.durationMinutes)
    : 'Нет данных'

  const activityValue = day.activity?.steps
    ? `${day.activity.steps.toLocaleString('ru-RU')} шагов`
    : 'Нет данных'
  const hasSleep = Boolean(day.sleep?.durationMinutes)

  const cards = [
    {
      icon: '🌙',
      title: 'Сон',
      value: sleepValue,
      detail:
        hasSleep && day.sleep?.score !== undefined
          ? `Оценка сна ${day.sleep.score}/100`
          : 'Health / Fitbit',
      ready: hasSleep,
    },
    {
      icon: '⚡',
      title: 'Активность',
      value: activityValue,
      detail: day.activity?.activeCaloriesKcal
        ? `${Math.round(day.activity.activeCaloriesKcal)} активных ккал`
        : 'Health / Fitbit',
      ready: Boolean(day.activity),
    },
    {
      icon: '🔋',
      title: 'Готовность',
      value:
        hasSleep && day.sleep?.readiness !== undefined
          ? `${day.sleep.readiness}/100`
          : 'Нет данных',
      detail:
        hasSleep && day.sleep?.readiness !== undefined
          ? day.sleep.readiness >= 80
            ? 'Высокая'
            : day.sleep.readiness >= 60
              ? 'Средняя'
              : 'Низкая'
          : 'Расчёт Habbits',
      ready: hasSleep && day.sleep?.readiness !== undefined,
    },
  ]

  return (
    <section className="dailyOverview" aria-label="Сводка дня">
      <article
        className={`summaryCard nutritionCard ${day.nutrition ? 'hasData' : ''}`}
      >
        <span className="summaryIcon">🍽️</span>
        <small>Питание</small>
        <b>{nutritionValue}</b>
        <em>{nutritionDetail || 'Нет данных за день'}</em>

        <div className="summaryActions">
          <button
            className="summarySync"
            type="button"
            onClick={onSyncNutrition}
            disabled={syncingNutrition}
          >
            {syncingNutrition ? 'Синхронизация…' : '↻ FatSecret'}
          </button>
          <button
            className="summaryEdit"
            type="button"
            onClick={onEditNutrition}
            aria-label="Изменить питание вручную"
          >
            ✎
          </button>
        </div>
      </article>

      {cards.map((card) => {
        return (
          <article
            className={`summaryCard ${card.ready ? 'hasData' : ''}`}
            key={card.title}
          >
            <span className="summaryIcon">{card.icon}</span>
            <small>{card.title}</small>
            <b>{card.value}</b>
            <em>{card.detail}</em>
          </article>
        )
      })}
    </section>
  )
}
