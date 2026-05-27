'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  CheckSquare, Square, Plus, Trash2, Flag, Calendar, Tag,
  ChevronDown, X, Search, Filter, Clock, CheckCircle2,
  AlertCircle, Edit2, Check, Zap, Package, Warehouse,
  BookOpen, Users, ShoppingBag
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ──────────────────────────────────────────────────────────────────────

type Priority = 'acil' | 'yüksek' | 'normal' | 'düşük'
type Category = 'genel' | 'sipariş' | 'stok' | 'muhasebe' | 'personel' | 'diğer'
type FilterStatus = 'tümü' | 'aktif' | 'tamamlandı'

interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  category: Category
  dueDate: string        // ISO date YYYY-MM-DD or ''
  completed: boolean
  completedAt: string    // ISO or ''
  createdAt: string      // ISO
  linkedHref?: string    // optional dashboard link
}

const TASKS_KEY = 'crm-gorevler'

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string; badge: string; order: number }> = {
  acil:    { label: 'Acil',   dot: 'bg-red-500',    badge: 'text-red-400 bg-red-500/10 border-red-500/20',    order: 0 },
  yüksek:  { label: 'Yüksek', dot: 'bg-amber-500',  badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20', order: 1 },
  normal:  { label: 'Normal', dot: 'bg-primary',     badge: 'text-primary bg-primary/10 border-primary/20',    order: 2 },
  düşük:   { label: 'Düşük',  dot: 'bg-slate-500',  badge: 'text-slate-400 bg-slate-800 border-border/80',    order: 3 },
}

const CATEGORY_CONFIG: Record<Category, { label: string; icon: React.ElementType; href?: string }> = {
  genel:      { label: 'Genel',     icon: CheckSquare },
  sipariş:    { label: 'Sipariş',   icon: ShoppingBag, href: '/dashboard/marketplace-orders' },
  stok:       { label: 'Stok',      icon: Warehouse,   href: '/dashboard/wms' },
  muhasebe:   { label: 'Muhasebe',  icon: BookOpen,    href: '/dashboard/accounting' },
  personel:   { label: 'Personel',  icon: Users,       href: '/dashboard/hr' },
  diğer:      { label: 'Diğer',     icon: Tag },
}

const EMPTY_FORM = {
  title: '', description: '', priority: 'normal' as Priority,
  category: 'genel' as Category, dueDate: '', linkedHref: '',
}

function generateId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function dueDateLabel(iso: string): { text: string; cls: string } {
  if (!iso) return { text: '', cls: '' }
  const today = todayISO()
  if (iso < today) return { text: 'Gecikti', cls: 'text-red-400' }
  if (iso === today) return { text: 'Bugün', cls: 'text-amber-400 font-black' }
  const diff = Math.round((new Date(iso).getTime() - new Date(today).getTime()) / 86400000)
  if (diff === 1) return { text: 'Yarın', cls: 'text-cyan-400' }
  return { text: new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }), cls: 'text-slate-400' }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function GorevlerPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('aktif')
  const [filterPriority, setFilterPriority] = useState<Priority | 'tümü'>('tümü')
  const [filterCategory, setFilterCategory] = useState<Category | 'tümü'>('tümü')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [quickTitle, setQuickTitle] = useState('')
  const quickRef = useRef<HTMLInputElement>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TASKS_KEY)
      if (raw) setTasks(JSON.parse(raw) as Task[])
    } catch {}
  }, [])

  const saveTasks = useCallback((next: Task[]) => {
    setTasks(next)
    localStorage.setItem(TASKS_KEY, JSON.stringify(next))
  }, [])

  // Quick add (just press Enter in the top input)
  const handleQuickAdd = useCallback(() => {
    const title = quickTitle.trim()
    if (!title) return
    const task: Task = {
      id: generateId(), title, description: '', priority: 'normal',
      category: 'genel', dueDate: '', completed: false,
      completedAt: '', createdAt: new Date().toISOString(),
    }
    saveTasks([task, ...tasks])
    setQuickTitle('')
    quickRef.current?.focus()
  }, [quickTitle, tasks, saveTasks])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (t: Task) => {
    setForm({
      title: t.title, description: t.description,
      priority: t.priority, category: t.category,
      dueDate: t.dueDate, linkedHref: t.linkedHref ?? '',
    })
    setEditId(t.id)
    setShowForm(true)
  }

  const handleSave = useCallback(() => {
    if (!form.title.trim()) return
    if (editId) {
      saveTasks(tasks.map(t => t.id === editId
        ? { ...t, title: form.title.trim(), description: form.description.trim(),
            priority: form.priority, category: form.category,
            dueDate: form.dueDate, linkedHref: form.linkedHref || undefined }
        : t
      ))
    } else {
      const task: Task = {
        id: generateId(), title: form.title.trim(), description: form.description.trim(),
        priority: form.priority, category: form.category, dueDate: form.dueDate,
        completed: false, completedAt: '', createdAt: new Date().toISOString(),
        linkedHref: form.linkedHref || undefined,
      }
      saveTasks([task, ...tasks])
    }
    setShowForm(false)
    setEditId(null)
  }, [form, editId, tasks, saveTasks])

  const toggleComplete = useCallback((id: string) => {
    saveTasks(tasks.map(t => t.id === id
      ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : '' }
      : t
    ))
  }, [tasks, saveTasks])

  const deleteTask = useCallback((id: string) => {
    saveTasks(tasks.filter(t => t.id !== id))
  }, [tasks, saveTasks])

  // Stats
  const stats = useMemo(() => {
    const today = todayISO()
    return {
      total:     tasks.length,
      active:    tasks.filter(t => !t.completed).length,
      done:      tasks.filter(t => t.completed).length,
      overdue:   tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today).length,
      dueToday:  tasks.filter(t => !t.completed && t.dueDate === today).length,
    }
  }, [tasks])

  // Filtered + sorted tasks
  const displayed = useMemo(() => {
    const today = todayISO()
    let list = [...tasks]

    if (filterStatus === 'aktif') list = list.filter(t => !t.completed)
    else if (filterStatus === 'tamamlandı') list = list.filter(t => t.completed)

    if (filterPriority !== 'tümü') list = list.filter(t => t.priority === filterPriority)
    if (filterCategory !== 'tümü') list = list.filter(t => t.category === filterCategory)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      )
    }

    // Sort: overdue first, then by priority, then by due date
    list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const aOverdue = a.dueDate && a.dueDate < today && !a.completed
      const bOverdue = b.dueDate && b.dueDate < today && !b.completed
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
      const aToday = a.dueDate === today
      const bToday = b.dueDate === today
      if (aToday !== bToday) return aToday ? -1 : 1
      const pa = PRIORITY_CONFIG[a.priority].order
      const pb = PRIORITY_CONFIG[b.priority].order
      if (pa !== pb) return pa - pb
      return a.dueDate && b.dueDate
        ? a.dueDate.localeCompare(b.dueDate)
        : a.createdAt.localeCompare(b.createdAt)
    })

    return list
  }, [tasks, filterStatus, filterPriority, filterCategory, search])

  const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-600'
  const today = todayISO()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-primary" /> Görevler
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">Günlük görevler, hatırlatıcılar ve aksiyonlar</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all hover:-translate-y-0.5 shadow-md shadow-primary/20 w-fit"
        >
          <Plus className="w-4 h-4" /> Yeni Görev
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Toplam', value: stats.total, icon: CheckSquare, color: 'text-slate-400', bg: 'bg-slate-800/60', filter: 'tümü' as FilterStatus },
          { label: 'Aktif', value: stats.active, icon: Clock, color: 'text-primary', bg: 'bg-primary/10', filter: 'aktif' as FilterStatus },
          { label: 'Tamamlandı', value: stats.done, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', filter: 'tamamlandı' as FilterStatus },
          { label: 'Gecikmiş', value: stats.overdue, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', filter: 'aktif' as FilterStatus },
          { label: 'Bugün', value: stats.dueToday, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', filter: 'aktif' as FilterStatus },
        ].map(({ label, value, icon: Icon, color, bg, filter }) => (
          <button
            key={label}
            onClick={() => setFilterStatus(filter)}
            className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40 hover:-translate-y-0.5 hover:border-slate-700/80 transition-all text-left"
          >
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-lg font-black ${color} leading-none`}>{value}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wide mt-0.5 truncate">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Plus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            ref={quickRef}
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
            placeholder="Hızlı görev ekle… (Enter ile kaydet)"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/30 border border-border/70 border-dashed text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold placeholder:text-slate-600 focus:border-primary/40"
          />
        </div>
        {quickTitle.trim() && (
          <button onClick={handleQuickAdd} className="px-4 py-3 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all text-xs font-bold flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Ekle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status */}
        <div className="flex gap-1 p-1 bg-slate-900/40 border border-border/80 rounded-xl">
          {(['tümü', 'aktif', 'tamamlandı'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                filterStatus === f ? 'bg-slate-800 text-foreground border border-border/60 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'tümü' ? 'Tümü' : f === 'aktif' ? 'Aktif' : 'Tamamlandı'}
            </button>
          ))}
        </div>

        {/* Priority */}
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value as Priority | 'tümü')}
          className="px-3 py-1.5 rounded-xl bg-slate-950/30 border border-border/80 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
        >
          <option value="tümü">Tüm Öncelikler</option>
          {(['acil', 'yüksek', 'normal', 'düşük'] as Priority[]).map(p => (
            <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
          ))}
        </select>

        {/* Category */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as Category | 'tümü')}
          className="px-3 py-1.5 rounded-xl bg-slate-950/30 border border-border/80 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
        >
          <option value="tümü">Tüm Kategoriler</option>
          {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Görev ara…"
            className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-slate-950/30 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Task list */}
      {displayed.length === 0 ? (
        <div className="premium-card p-16 text-center border border-border/80">
          <CheckCircle2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-bold">
            {filterStatus === 'tamamlandı' ? 'Henüz tamamlanmış görev yok.' :
             filterStatus === 'aktif' && tasks.length > 0 ? 'Tüm görevler tamamlandı! 🎉' :
             'Henüz görev eklenmedi.'}
          </p>
          <p className="text-slate-600 text-xs mt-1 font-semibold">Yukarıdaki hızlı ekle alanına yazıp Enter'a basın.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {displayed.map((task) => {
              const prCfg = PRIORITY_CONFIG[task.priority]
              const catCfg = CATEGORY_CONFIG[task.category]
              const CatIcon = catCfg.icon
              const due = dueDateLabel(task.dueDate)
              const isOverdue = !task.completed && task.dueDate && task.dueDate < today
              const isDueToday = !task.completed && task.dueDate === today

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`premium-card px-4 py-3.5 flex items-start gap-3 border transition-all ${
                    task.completed
                      ? 'border-border/40 bg-slate-900/20 opacity-60'
                      : isOverdue
                      ? 'border-red-500/20 bg-red-500/3'
                      : isDueToday
                      ? 'border-amber-500/20 bg-amber-500/3'
                      : 'border-border/70 bg-slate-900/40 hover:border-slate-700/80'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleComplete(task.id)}
                    className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                    aria-label={task.completed ? 'Geri al' : 'Tamamla'}
                  >
                    {task.completed
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      : <Square className={`w-5 h-5 ${isOverdue ? 'text-red-400' : 'text-slate-500 hover:text-primary'}`} />
                    }
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold transition-all ${task.completed ? 'line-through text-slate-500' : 'text-foreground'}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className={`text-xs mt-0.5 font-medium ${task.completed ? 'text-slate-600' : 'text-slate-400'}`}>
                            {task.description}
                          </p>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!task.completed && (
                          <button
                            onClick={() => openEdit(task)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
                            aria-label="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          aria-label="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Priority dot */}
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${prCfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${prCfg.dot}`} />
                        {prCfg.label}
                      </span>

                      {/* Category */}
                      <span className="inline-flex items-center gap-1 text-[9px] text-slate-500 font-bold">
                        <CatIcon className="w-3 h-3" />
                        {catCfg.label}
                      </span>

                      {/* Due date */}
                      {task.dueDate && !task.completed && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${due.cls}`}>
                          <Calendar className="w-3 h-3" />
                          {due.text}
                        </span>
                      )}

                      {/* Completed date */}
                      {task.completed && task.completedAt && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          {new Date(task.completedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}

                      {/* Category link */}
                      {catCfg.href && !task.completed && (
                        <Link
                          href={catCfg.href}
                          className="inline-flex items-center gap-0.5 text-[9px] text-primary hover:underline font-bold ml-auto shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          Git →
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Count footer */}
      {displayed.length > 0 && (
        <p className="text-[10px] text-slate-600 font-semibold text-right">
          {displayed.length} görev gösteriliyor
          {stats.overdue > 0 && <span className="text-red-500 ml-2">· {stats.overdue} gecikmiş</span>}
        </p>
      )}

      {/* ── Create / Edit Form Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              key="task-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              key="task-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-slate-900 border border-border/80 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-foreground text-sm flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    {editId ? 'Görevi Düzenle' : 'Yeni Görev'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Görev Başlığı *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && form.title.trim() && handleSave()}
                    placeholder="Ne yapılacak?"
                    autoFocus
                    className={inputCls}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Açıklama</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="İsteğe bağlı detay…"
                    rows={2}
                    className={inputCls + ' resize-none'}
                  />
                </div>

                {/* Priority + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Öncelik</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                      className={inputCls + ' cursor-pointer'}
                    >
                      {(['acil', 'yüksek', 'normal', 'düşük'] as Priority[]).map(p => (
                        <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Kategori</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                      className={inputCls + ' cursor-pointer'}
                    >
                      {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Due date */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                    <Calendar className="w-3 h-3 inline mr-1" />Son Tarih
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    min={today}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className={inputCls + ' cursor-pointer'}
                  />
                </div>

                {/* Quick date shortcuts */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: 'Bugün', val: today },
                    { label: 'Yarın', val: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
                    { label: '3 Gün', val: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) },
                    { label: '1 Hafta', val: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) },
                  ].map(({ label, val }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, dueDate: val }))}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        form.dueDate === val
                          ? 'bg-primary/15 text-primary border-primary/25'
                          : 'bg-transparent text-slate-500 border-border/60 hover:border-border hover:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  {form.dueDate && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, dueDate: '' }))}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-border/60 text-slate-500 hover:text-red-400 hover:border-red-500/25 transition-all"
                    >
                      Temizle
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border/80 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!form.title.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all disabled:opacity-50 shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {editId ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
