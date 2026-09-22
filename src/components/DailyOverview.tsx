import type { DailyRecord } from '../domain/dailyRecord'

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours} ч ${rest} мин`
}

export function DailyOverview({
  day,
  onEditNutrition,
}: {
  day: DailyRecord
  onEditNutrition: () => void
}) {
  const nutritionValue = day.nutrition?.caloriesKcal
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

  const cards = [
    {
      icon: '🍽️',
      title: 'Питание',
      value: nutritionValue,
      detail: nutritionDetail || 'Заполнить вручную',
      ready: Boolean(day.nutrition),
      onClick: onEditNutrition,
    },
    {
      icon: '🌙',
      title: 'Сон',
      value: sleepValue,
      detail:
        day.sleep?.readiness !== undefined
          ? `Готовность ${day.sleep.readiness}`
          : 'Health / Fitbit',
      ready: Boolean(day.sleep),
      onClick: undefined,
    },
    {
      icon: '⚡',
      title: 'Активность',
      value: activityValue,
      detail: day.activity?.activeCaloriesKcal
        ? `${Math.round(day.activity.activeCaloriesKcal)} активных ккал`
        : 'Health / Fitbit',
      ready: Boolean(day.activity),
      onClick: undefined,
    },
  ]

  return (
    <section className="dailyOverview" aria-label="Сводка дня">
      {cards.map((card) => {
        const content = (
          <>
            <span className="summaryIcon">{card.icon}</span>
            <small>{card.title}</small>
            <b>{card.value}</b>
            <em>{card.detail}</em>
          </>
        )

        return card.onClick ? (
          <button
            className={`summaryCard editable ${card.ready ? 'hasData' : ''}`}
            key={card.title}
            type="button"
            onClick={card.onClick}
          >
            {content}
          </button>
        ) : (
          <article
            className={`summaryCard ${card.ready ? 'hasData' : ''}`}
            key={card.title}
          >
            {content}
          </article>
        )
      })}
    </section>
  )
}
