import { useEffect, useMemo, useRef, useState } from 'react'
import {
  loadCloudKey,
  saveCloudKey,
  syncCloudData,
} from './cloud/habbitsCloud'
import { DailyOverview } from './components/DailyOverview'
import { NutritionEditor } from './components/NutritionEditor'
import {
  createDailyRecord,
  createHabbitsData,
  type DailyRecord,
  type HabbitsData,
} from './domain/dailyRecord'
import { getDayMetrics } from './domain/dayMetrics'
import {
  getGoogleHealthDaily,
  getGoogleHealthStatus,
  startGoogleHealthConnection,
} from './health/googleHealth'
import {
  clearHabbitsData,
  loadHabbitsData,
  saveHabbitsData,
  serializeBackup,
} from './storage/habbitsStorage'

type Tab = 'today' | 'calendar' | 'stats' | 'settings'
type CloudStatus = 'off' | 'syncing' | 'synced' | 'error'

type FatSecretDailyNutrition = {
  date: string
  entries: number
  caloriesKcal: number
  proteinG: number
  fatG: number
  carbsG: number
}

const WATER = 3000
const CAFFEINE = 400

const habits = [
  { id: 'english', name: 'Английский', sub: '10 минут', icon: 'A' },
  { id: 'chess', name: 'Шахматы', sub: '10 минут', icon: '♞' },
  { id: 'journal', name: 'Дневник', sub: 'Запись за день', icon: '▣' },
  { id: 'abstinence', name: 'Воздержание', sub: 'Каждый день', icon: '◎' },
  { id: 'book', name: 'Книга', sub: '20 минут', icon: '▤' },
  { id: 'video', name: 'Обучающее видео', sub: '15 минут', icon: '▶' },
]

const dkey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`

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
  const [state, setState] = useState<HabbitsData>(loadHabbitsData)
  const [tab, setTab] = useState<Tab>('today')
  const [editingNutrition, setEditingNutrition] = useState(false)
  const [nutritionSyncing, setNutritionSyncing] = useState(false)
  const [nutritionSyncMessage, setNutritionSyncMessage] = useState<
    string | null
  >(null)
  const [nutritionSyncError, setNutritionSyncError] = useState(false)
  const [cloudKey, setCloudKey] = useState(loadCloudKey)
  const [cloudKeyDraft, setCloudKeyDraft] = useState(loadCloudKey)
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(
    cloudKey ? 'syncing' : 'off',
  )
  const [cloudMessage, setCloudMessage] = useState(
    cloudKey ? 'Подключаем облако…' : 'Облако не подключено',
  )
  const [googleHealthConnected, setGoogleHealthConnected] = useState(false)
  const [googleHealthSyncing, setGoogleHealthSyncing] = useState(false)
  const [googleHealthMessage, setGoogleHealthMessage] = useState(
    'Проверяем подключение…',
  )
  const stateRef = useRef(state)
  const cloudRequestRef = useRef(0)

  const tk = dkey()
  const today = state.days[tk] ?? createDailyRecord(tk)

  useEffect(() => {
    stateRef.current = state
    saveHabbitsData(state)
  }, [state])

  const applyCloudResult = (data: HabbitsData) => {
    setState((current) => {
      if (JSON.stringify(current) === JSON.stringify(data)) return current
      return data
    })
  }

  const runCloudSync = async (data: HabbitsData, key: string) => {
    const requestId = ++cloudRequestRef.current
    setCloudStatus('syncing')
    setCloudMessage('Синхронизация…')

    try {
      const merged = await syncCloudData(data, key)
      if (requestId !== cloudRequestRef.current) return
      applyCloudResult(merged)
      setCloudStatus('synced')
      setCloudMessage('Все устройства синхронизированы')
    } catch (error) {
      if (requestId !== cloudRequestRef.current) return
      setCloudStatus('error')
      setCloudMessage(
        error instanceof Error ? error.message : 'Ошибка синхронизации',
      )
    }
  }

  useEffect(() => {
    if (!cloudKey) return

    const timer = window.setTimeout(() => {
      void runCloudSync(state, cloudKey)
    }, 800)

    return () => window.clearTimeout(timer)
  }, [state, cloudKey])

  useEffect(() => {
    if (!cloudKey) return

    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void runCloudSync(stateRef.current, cloudKey)
      }
    }

    window.addEventListener('focus', syncWhenVisible)
    document.addEventListener('visibilitychange', syncWhenVisible)

    return () => {
      window.removeEventListener('focus', syncWhenVisible)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [cloudKey])

  useEffect(() => {
    if (!cloudKey) {
      setGoogleHealthConnected(false)
      setGoogleHealthMessage('Сначала подключите приватное облако')
      return
    }

    let active = true
    void getGoogleHealthStatus(cloudKey)
      .then(({ connected }) => {
        if (!active) return
        setGoogleHealthConnected(connected)
        setGoogleHealthMessage(
          connected ? 'Fitbit подключён через Google Health' : 'Не подключён',
        )
      })
      .catch((error) => {
        if (!active) return
        setGoogleHealthMessage(
          error instanceof Error ? error.message : 'Не удалось проверить подключение',
        )
      })

    if (new URLSearchParams(window.location.search).get('googleHealth') === 'connected') {
      setTab('settings')
      window.history.replaceState({}, '', window.location.pathname)
    }

    return () => {
      active = false
    }
  }, [cloudKey])

  useEffect(() => {
    if (!cloudKey) return

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void runCloudSync(stateRef.current, cloudKey)
      }
    }, 5000)

    return () => window.clearInterval(interval)
  }, [cloudKey])

  const update = (fn: (d: DailyRecord) => DailyRecord) =>
    setState((previous) => {
      const next = {
        ...previous,
        days: {
          ...previous.days,
          [tk]: {
            ...fn(previous.days[tk] ?? createDailyRecord(tk)),
            date: tk,
            updatedAt: new Date().toISOString(),
          },
        },
      }
      return next
    })

  const stats = (key: string) => {
    const day = state.days[key] ?? createDailyRecord(key)
    return getDayMetrics(
      day,
      habits.map((habit) => habit.id),
      WATER,
    )
  }

  const todayStats = stats(tk)

  const score = todayStats.score

  const connectGoogleHealth = async () => {
    if (!cloudKey) return
    setGoogleHealthSyncing(true)
    setGoogleHealthMessage('Открываем вход Google…')
    try {
      const { url } = await startGoogleHealthConnection(cloudKey)
      window.location.assign(url)
    } catch (error) {
      setGoogleHealthMessage(
        error instanceof Error ? error.message : 'Не удалось начать подключение',
      )
      setGoogleHealthSyncing(false)
    }
  }

  const syncGoogleHealth = async () => {
    if (!cloudKey) return
    setGoogleHealthSyncing(true)
    setGoogleHealthMessage('Получаем сон и активность…')
    try {
      const daily = await getGoogleHealthDaily(tk, cloudKey)
      update((day) => ({ ...day, sleep: daily.sleep, activity: daily.activity }))
      setGoogleHealthConnected(true)
      const hasSleep = Boolean(daily.sleep.durationMinutes)
      const hasActivity = Boolean(
        daily.activity.steps || daily.activity.caloriesBurnedKcal,
      )
      setGoogleHealthMessage(
        hasSleep && hasActivity
          ? 'Сон и активность обновлены'
          : hasSleep
            ? 'Сон обновлён, активности пока нет'
            : hasActivity
              ? 'Активность обновлена, сон ещё не пришёл из Fitbit'
              : 'Подключено, данных за сегодня пока нет',
      )
    } catch (error) {
      setGoogleHealthMessage(
        error instanceof Error ? error.message : 'Ошибка Google Health',
      )
    } finally {
      setGoogleHealthSyncing(false)
    }
  }

  const syncNutrition = async () => {
    setNutritionSyncing(true)
    setNutritionSyncMessage(null)
    setNutritionSyncError(false)

    try {
      const response = await fetch(
        `/api/fatsecret/daily?date=${encodeURIComponent(tk)}`,
        { cache: 'no-store' },
      )
      const payload = (await response.json()) as
        | FatSecretDailyNutrition
        | { error?: string }

      if (!response.ok || 'error' in payload) {
        throw new Error(
          'error' in payload && payload.error
            ? payload.error
            : 'Не удалось получить данные FatSecret',
        )
      }

      const nutrition = payload as FatSecretDailyNutrition

      update((day) => ({
        ...day,
        nutrition: {
          caloriesKcal: nutrition.caloriesKcal,
          proteinG: nutrition.proteinG,
          fatG: nutrition.fatG,
          carbsG: nutrition.carbsG,
          source: {
            provider: 'fatsecret',
            syncedAt: new Date().toISOString(),
          },
        },
      }))
      setNutritionSyncMessage(
        `FatSecret обновлён: ${nutrition.entries} записи`,
      )
    } catch (error) {
      setNutritionSyncError(true)
      setNutritionSyncMessage(
        error instanceof Error ? error.message : 'Ошибка синхронизации',
      )
    } finally {
      setNutritionSyncing(false)
    }
  }

  const streak = useMemo(() => {
    let current = 0
    const date = new Date()

    while (stats(dkey(date)).complete) {
      current++
      date.setDate(date.getDate() - 1)
    }

    return current
  }, [state])

  const habitStreak = (id: string) => {
    let current = 0
    const date = new Date()

    while (
      (state.days[dkey(date)] ?? createDailyRecord(dkey(date))).habits[id]
    ) {
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
      pct: dayStats.checklistPercent,
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
      pct: dayStats.checklistPercent,
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
          {todayStats.checklistDone}/{todayStats.checklistTotal}
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

          <h2 className="sectionTitle">Сводка дня</h2>
          <DailyOverview
            day={today}
            onEditNutrition={() => setEditingNutrition(true)}
            onSyncNutrition={syncNutrition}
            syncingNutrition={nutritionSyncing}
          />

          {nutritionSyncMessage && (
            <p
              className={`syncMessage ${nutritionSyncError ? 'syncError' : ''}`}
              role={nutritionSyncError ? 'alert' : 'status'}
            >
              {nutritionSyncMessage}
            </p>
          )}

          {editingNutrition && (
            <NutritionEditor
              initial={today.nutrition}
              onCancel={() => setEditingNutrition(false)}
              onClear={() => {
                update((day) => ({ ...day, nutrition: undefined }))
                setEditingNutrition(false)
              }}
              onSave={(nutrition) => {
                update((day) => ({
                  ...day,
                  nutrition: {
                    ...nutrition,
                    source: {
                      provider: 'manual',
                      syncedAt: new Date().toISOString(),
                    },
                  },
                }))
                setEditingNutrition(false)
              }}
            />
          )}

          <h2 className="sectionTitle">Привычки</h2>

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
                value={today.hydration.waterMl}
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
                        hydration: {
                          ...day.hydration,
                          waterMl: day.hydration.waterMl + value,
                        },
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
                    hydration: {
                      ...day.hydration,
                      waterMl: 0,
                    },
                  }))
                }
              >
                Сбросить
              </button>
            </article>

            <article className="tracker">
              <h2>☕ Кофеин</h2>

              <Ring
                value={today.stimulants.caffeineMg}
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
                        stimulants: {
                          ...day.stimulants,
                          caffeineMg: day.stimulants.caffeineMg + value,
                        },
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
                    stimulants: {
                      ...day.stimulants,
                      caffeineMg: 0,
                    },
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
              <b>{today.hydration.waterMl}</b>
              <small>мл</small>
            </div>

            <div>
              <span>Кофеин</span>
              <b>{today.stimulants.caffeineMg}</b>
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
          <p>
            {cloudKey
              ? 'Данные сохраняются на устройстве и в приватном облаке.'
              : 'Данные сохраняются только на этом устройстве.'}
          </p>

          <section className={`cloudCard ${cloudStatus}`}>
            <div className="cloudHeading">
              <div>
                <small>☁️ Облачная синхронизация</small>
                <b>{cloudMessage}</b>
              </div>
              <span aria-hidden="true" />
            </div>

            {!cloudKey ? (
              <form
                className="cloudConnect"
                onSubmit={(event) => {
                  event.preventDefault()
                  const nextKey = cloudKeyDraft.trim()
                  if (nextKey.length < 10) {
                    setCloudStatus('error')
                    setCloudMessage('Код должен быть не короче 10 символов')
                    return
                  }

                  saveCloudKey(nextKey)
                  setCloudKey(nextKey)
                  setCloudStatus('syncing')
                  setCloudMessage('Подключаем облако…')
                }}
              >
                <label htmlFor="cloud-key">Код облака</label>
                <div>
                  <input
                    id="cloud-key"
                    type="password"
                    value={cloudKeyDraft}
                    onChange={(event) => setCloudKeyDraft(event.target.value)}
                    placeholder="Введите общий код"
                    autoComplete="off"
                  />
                  <button type="submit">Подключить</button>
                </div>
                <small>Один и тот же код вводится на Mac и iPhone.</small>
              </form>
            ) : (
              <div className="cloudActions">
                <button
                  type="button"
                  onClick={() => void runCloudSync(stateRef.current, cloudKey)}
                  disabled={cloudStatus === 'syncing'}
                >
                  Синхронизировать сейчас
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveCloudKey('')
                    setCloudKey('')
                    setCloudKeyDraft('')
                    setCloudStatus('off')
                    setCloudMessage('Облако не подключено')
                  }}
                >
                  Отключить на этом устройстве
                </button>
              </div>
            )}
          </section>

          <section className="googleHealthCard">
            <div>
              <small>⌁ Google Health · Fitbit</small>
              <b>{googleHealthMessage}</b>
              <span>Сон · шаги · активные калории</span>
            </div>
            <button
              type="button"
              onClick={() =>
                void (googleHealthConnected
                  ? syncGoogleHealth()
                  : connectGoogleHealth())
              }
              disabled={!cloudKey || googleHealthSyncing}
            >
              {googleHealthSyncing
                ? 'Подождите…'
                : googleHealthConnected
                  ? 'Обновить'
                  : 'Подключить'}
            </button>
          </section>

          <button
            className="backup"
            onClick={() => {
              const blob = new Blob([serializeBackup(state)], {
                type: 'application/json',
              })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `habbits-backup-${tk}.json`
              document.body.appendChild(link)
              link.click()
              link.remove()
              window.setTimeout(() => URL.revokeObjectURL(url), 0)
            }}
          >
            Скачать резервную копию
          </button>

          <button
            className="danger"
            onClick={() => {
              if (confirm('Удалить всю историю?')) {
                clearHabbitsData()
                setState(createHabbitsData())
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
