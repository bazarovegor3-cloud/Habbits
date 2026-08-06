import { useState } from 'react'
type Day={habits:Record<string,boolean>;water:number;caffeine:number}
type State={days:Record<string,Day>}
const KEY='habbits-react-v1',WATER=3000,CAFFEINE=400
const habits=[['english','Английский — 10 мин'],['chess','Шахматы — 10 мин'],['journal','Дневник'],['abstinence','Воздержание'],['book','Книга — 20 мин'],['video','Обучающее видео — 15 мин']]
const key=()=>new Date().toISOString().slice(0,10)
const empty=():Day=>({habits:{},water:0,caffeine:0})
const load=():State=>{try{return JSON.parse(localStorage.getItem(KEY)||'{"days":{}}')}catch{return{days:{}}}}
export default function App(){
 const [state,setState]=useState<State>(load),k=key(),day=state.days[k]||empty()
 const update=(fn:(d:Day)=>Day)=>setState(p=>{const n={...p,days:{...p.days,[k]:fn(p.days[k]||empty())}};localStorage.setItem(KEY,JSON.stringify(n));return n})
 const done=habits.filter(([id])=>day.habits[id]).length+(day.water>=WATER?1:0)+(day.caffeine<=CAFFEINE?1:0)
 const score=Math.min(100,Math.round(done/(habits.length+2)*100))
 return <main className="app">
  <header><div><h1>Сегодня</h1><p>{new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</p></div><span className="pill">{done} / {habits.length+2}</span></header>
  <section className="hero"><div className="row"><span>Прогресс дня</span><strong>{score}/100</strong></div><div className="progress"><i style={{width:score+'%'}}/></div></section>
  <section className="list">{habits.map(([id,name])=><button key={id} className={'habit '+(day.habits[id]?'done':'')} onClick={()=>update(d=>({...d,habits:{...d.habits,[id]:!d.habits[id]}}))}><span>{day.habits[id]?'✓':'○'}</span><b>{name}</b></button>)}</section>
  <Tracker title="💧 Вода" value={day.water} limit={WATER} buttons={[700,500,400,300]} onAdd={v=>update(d=>({...d,water:d.water+v}))} onReset={()=>update(d=>({...d,water:0}))}/>
  <Tracker title="☕ Кофеин" value={day.caffeine} limit={CAFFEINE} buttons={[80,100,150]} danger={day.caffeine>CAFFEINE} onAdd={v=>update(d=>({...d,caffeine:d.caffeine+v}))} onReset={()=>update(d=>({...d,caffeine:0}))}/>
 </main>}
function Tracker({title,value,limit,buttons,onAdd,onReset,danger=false}:{title:string;value:number;limit:number;buttons:number[];onAdd:(v:number)=>void;onReset:()=>void;danger?:boolean}){const p=Math.min(100,value/limit*100);return <section className="tracker"><div className="row"><div><h2>{title}</h2><strong>{value} / {limit} {title.includes('Вода')?'мл':'мг'}</strong></div><span className={danger?'danger':''}>{danger?'Лимит превышен':Math.round(p)+'%'}</span></div><div className="progress"><i className={danger?'red':''} style={{width:p+'%'}}/></div><div className="buttons">{buttons.map(v=><button key={v} onClick={()=>onAdd(v)}>+{v}</button>)}</div><button className="reset" onClick={onReset}>Сбросить</button></section>}
