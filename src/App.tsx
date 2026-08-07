import { useMemo, useState } from 'react'

type Day = {
  habits: Record<string, boolean>
  water: number
  caffeine: number
}

type State = {
  days: Record<string, Day>
}

type Tab = 'today' | 'calendar' | 'stats' | 'settings'

const KEY = 'habbits-react-v2'
const WATER = 3000
const CAFFEINE = 400
const TARGET = 6

const habits = [
  { id: 'english', name: 'Английский', sub: '10 минут', icon: 'A', points: 14 },
  { id: 'chess', name: 'Шахматы', sub: '10 минут', icon: '♞', points: 14 },
  { id: 'journal', name: 'Дневник', sub: 'Запись за день', icon: '▣', points: 14 },
  { id: 'abstinence', name: 'Воздержание', sub: 'Каждый день', icon: '◎', points: 14 },
  { id: 'book', name: 'Книга', sub: '20 минут', icon: '▤', points: 14 },
  { id: 'video', name: 'Обучающее видео', sub: '15 минут', icon: '▶', points: 14 },
]

const empty = (): Day => ({
  habits: {},
  water: 0,
  caffeine: 0,
})

const dkey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`

function load(): State {
  try {
    const x = localStorage.getItem(KEY)
    return x ? JSON.parse(x) : { days: {} }
  } catch {
    return { days: {} }
  }
}

function Ring({
  value,
  max,
  label,
  type,
}: {
  value: number
  max: number
  label: string
  type: 'water' | 'caffeine'
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const r = 48
  const c = 2 * Math.PI * r
  const dashOffset = c - (pct / 100) * c

  const color =
    type === 'water'
      ? '#38bdf8'
      : value > 400
        ? '#ef4444'
        : value >= 250
          ? '#facc15'
          : '#22c55e'

  return (
    <div className="ring">
      <svg viewBox="0 0 120 120">
        <circle className="rb" cx="60" cy="60" r={r} />
        <circle
          className="rf"
          cx="60"
          cy="60"
          r={r}
          style={{
            stroke: color,
            strokeDasharray: c,
            strokeDashoffset: dashOffset,
          }}
        />
      </svg>

      <div>
        <b className="ringValue" key={value}>
          {value}
        </b>
        <small>{label}</small>
        <em>{Math.round((value / max) * 100)}%</em>
      </div>
    </div>
  )
}

export default function App() {
  const [state, setState] = useState<State>(load)
  const [tab, setTab] = useState<Tab>('today')

  const tk = dkey()
  const today = state.days[tk] ?? empty()

  const update = (fn: (d: Day) => Day) =>
    setState((previous) => {
      const next = {
        ...previous,
        days: {
          ...previous.days,
          [tk]: fn(previous.days[tk] ?? empty()),
        },
      }

      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })

  const stats = (key: string) => {
    const day = state.days[key] ?? empty()
    const doneHabits = habits.filter((habit) => day.habits[habit.id]).length

    return {
      done: doneHabits + (day.water >= WATER ? 1 : 0),
      total: habits.length + 1,
    }
  }

  const todayStats = stats(tk)

  const score = Math.min(
    100,
    habits.reduce(
      (sum, habit) => sum + (today.habits[habit.id] ? habit.points : 0),
      0,
    ) + Math.min(10, Math.round((today.water / WATER) * 10)),
  )

  const streak = useMemo(() => {
    let current = 0
    const date = new Date()

    while (stats(dkey(date)).done >= TARGET) {
      current++
      date.setDate(date.getDate() - 1)
    }

    return current
  }, [state])

  const habitStreak = (id: string) => {
    let current = 0
    const date = new Date()

    while ((state.days[dkey(date)] ?? empty()).habits[id]) {
      current++
      date.setDate(date.getDate() - 1)
    }

    return current
  }

  const calendar = Array.from({ length: 35 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (34 - i))

    const dayStats = stats(dkey(date))

    return {
      day: date.getDate(),
      pct: (dayStats.done / dayStats.total) * 100,
      today: dkey(date) === tk,
    }
  })

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))

    const dayStats = stats(dkey(date))

    return {
      label: new Intl.DateTimeFormat('ru-RU', {
        weekday: 'short',
      }).format(date),
      pct: Math.round((dayStats.done / dayStats.total) * 100),
    }
  })

  return (
    <main className="app">
      <header className="top">
        <div>
          <h1>
            {tab === 'today'
              ? 'Сегодня 🚀'
              : tab === 'calendar'
                ? 'Календарь'
                : tab === 'stats'
                  ? 'Статистика'
                  : 'Настройки'}
          </h1>

          <p>
            {new Intl.DateTimeFormat('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }).format(new Date())}
          </p>
        </div>

        <span className="pill">
          {todayStats.done}/{todayStats.total}
        </span>
      </header>

      {tab === 'today' && (
        <>
          <section className="hero">
            <div className="heroRow">
              <div>
                <small>Прогресс дня</small>
                <strong>
                  {score}
                  <i>/100</i>
                </strong>
                <span className="heroPercent">{Math.round(score)}%</span>
              </div>

              <div className="streak">
                <small>🔥 Общая серия</small>
                <b>{streak} дней</b>
              </div>
            </div>

            <div className="progress">
              <i style={{ width: `${score}%` }} />
            </div>
          </section>

          <section className="list">
            {habits.map((habit) => {
              const done = Boolean(today.habits[habit.id])

              return (
                <button
                  className={`habit ${done ? 'done' : ''}`}
                  key={habit.id}
                  onClick={() =>
                    update((day) => ({
                      ...day,
                      habits: {
                        ...day.habits,
                        [habit.id]: !day.habits[habit.id],
                      },
                    }))
                  }
                >
                  <span className="icon">{habit.icon}</span>

                  <span className="copy">
                    <b>{habit.name}</b>
                    <small>{habit.sub}</small>
                  </span>

                  <span className="hstreak">
                    🔥 {habitStreak(habit.id)} дн.
                  </span>

                  <span className="check">{done ? '✓' : '○'}</span>
                </button>
              )
            })}
          </section>

          <section className="trackers">
            <article className="tracker">
              <h2>💧 Вода</h2>

              <Ring
                value={today.water}
                max={WATER}
                label="/ 3000 мл"
                type="water"
              />

              <div className="buttons">
                {[700, 500, 400, 300].map((value) => (
                  <button
                    className="quickBtn"
                    key={value}
                    onClick={() =>
                      update((day) => ({
                        ...day,
                        water: day.water + value,
                      }))
                    }
                  >
                    +{value}
                  </button>
                ))}
              </div>

              <button
                className="reset"
                onClick={() =>
                  update((day) => ({
                    ...day,
                    water: 0,
                  }))
                }
              >
                Сбросить
              </button>
            </article>

            <article className="tracker">
              <h2>☕ Кофеин</h2>

              <Ring
                value={today.caffeine}
                max={CAFFEINE}
                label="/ 400 мг"
                type="caffeine"
              />

              <div className="buttons three">
                {[80, 100, 150].map((value) => (
                  <button
                    className="quickBtn"
                    key={value}
                    onClick={() =>
                      update((day) => ({
                        ...day,
                        caffeine: day.caffeine + value,
                      }))
                    }
                  >
                    +{value}
                  </button>
                ))}
              </div>

              <button
                className="reset"
                onClick={() =>
                  update((day) => ({
                    ...day,
                    caffeine: 0,
                  }))
                }
              >
                Сбросить
              </button>
            </article>
          </section>
        </>
      )}

      {tab === 'calendar' && (
        <section className="panel">
          <h2>Последние 35 дней</h2>

          <div className="heatmap">
            {calendar.map((day, i) => (
              <div
                key={i}
                className={`heat ${
                  day.pct >= 88
                    ? 'good'
                    : day.pct > 0
                      ? 'mid'
                      : 'empty'
                } ${day.today ? 'today' : ''}`}
              >
                {day.day}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'stats' && (
        <>
          <section className="stats">
            <div>
              <span>Серия</span>
              <b>{streak}</b>
              <small>дней</small>
            </div>

            <div>
              <span>Вода</span>
              <b>{today.water}</b>
              <small>мл</small>
            </div>

            <div>
              <span>Кофеин</span>
              <b>{today.caffeine}</b>
              <small>мг</small>
            </div>

            <div>
              <span>Сегодня</span>
              <b>{score}</b>
              <small>очков</small>
            </div>
          </section>

          <section className="panel">
            <h2>Последние 7 дней</h2>

            <div className="bars">
              {week.map((day, i) => (
                <div key={i}>
                  <span>{day.pct}%</span>

                  <section>
                    <i
                      style={{
                        height: `${Math.max(4, day.pct)}%`,
                      }}
                    />
                  </section>

                  <small>{day.label}</small>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'settings' && (
        <section className="panel">
          <h2>Habbits v0.2.1</h2>
          <p>Данные сохраняются на этом устройстве.</p>

          <button
            className="danger"
            onClick={() => {
              if (confirm('Удалить всю историю?')) {
                localStorage.removeItem(KEY)
                setState({ days: {} })
              }
            }}
          >
            Удалить все данные
          </button>
        </section>
      )}

      <nav>
        {[
          ['today', '✓', 'Сегодня'],
          ['calendar', '▦', 'Календарь'],
          ['stats', '▥', 'Статистика'],
          ['settings', '⚙', 'Настройки'],
        ].map((item) => (
          <button
            key={item[0]}
            className={tab === item[0] ? 'active' : ''}
            onClick={() => setTab(item[0] as Tab)}
          >
            <b>{item[1]}</b>
            <small>{item[2]}</small>
          </button>
        ))}
      </nav>
    </main>
  )
}