import { useApp } from "@/context/AppContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types/task"
import type { Status, Priority } from "@/types/task"
import { CheckCircle2, Clock, AlertTriangle, ListTodo, TrendingUp, Flame } from "lucide-react"
import { ProjectIcon } from "@/components/ProjectIcon"
import { isPast, parseISO, format, isThisWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"

const STATUS_COLORS: Record<Status, string> = {
  backlog: "#94a3b8",
  todo: "#3b82f6",
  "in-progress": "#f59e0b",
  review: "#a855f7",
  done: "#22c55e",
}

const PRIORITY_COLORS: Record<Priority, string> = {
  none: "#94a3b8",
  low: "#60a5fa",
  medium: "#fbbf24",
  high: "#f97316",
  urgent: "#ef4444",
}

export function DashboardPage() {
  const { tasks, projects } = useApp()

  const total = tasks.length
  const done = tasks.filter(t => t.status === "done").length
  const inProgress = tasks.filter(t => t.status === "in-progress").length
  const overdue = tasks.filter(t => t.dueDate && t.status !== "done" && isPast(parseISO(t.dueDate))).length
  const dueThisWeek = tasks.filter(t => t.dueDate && t.status !== "done" && isThisWeek(parseISO(t.dueDate))).length
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

  const byStatus = (Object.keys(STATUS_CONFIG) as Status[]).map(s => ({
    name: STATUS_CONFIG[s].label,
    value: tasks.filter(t => t.status === s).length,
    color: STATUS_COLORS[s],
  })).filter(d => d.value > 0)

  const byPriority = (Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => ({
    name: PRIORITY_CONFIG[p].label,
    value: tasks.filter(t => t.priority === p).length,
    color: PRIORITY_COLORS[p],
  })).filter(d => d.value > 0)

  const byProject = projects.map(p => ({
    name: p.name,
    color: p.color,
    iconKey: p.emoji,
    total: tasks.filter(t => t.projectId === p.id).length,
    done: tasks.filter(t => t.projectId === p.id && t.status === "done").length,
  })).filter(d => d.total > 0)

  const recent = [...tasks]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  const urgent = tasks
    .filter(t => (t.priority === "urgent" || t.priority === "high") && t.status !== "done")
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral das suas tarefas na agência</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ListTodo className="size-5" />} label="Total de tarefas" value={total} sub="tarefas criadas" color="text-foreground" />
        <StatCard icon={<CheckCircle2 className="size-5 text-green-500" />} label="Concluídas" value={done} sub={`${completionRate}% de conclusão`} color="text-green-500" />
        <StatCard icon={<Clock className="size-5 text-yellow-500" />} label="Em andamento" value={inProgress} sub={`${dueThisWeek} vencem esta semana`} color="text-yellow-500" />
        <StatCard icon={<AlertTriangle className="size-5 text-red-500" />} label="Atrasadas" value={overdue} sub="requerem atenção" color="text-red-500" />
      </div>

      {/* Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4" /> Progresso geral
          </CardTitle>
          <CardDescription>{completionRate}% das tarefas concluídas</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={completionRate} className="h-2.5" />
          <div className="flex gap-4 mt-3 flex-wrap">
            {(Object.keys(STATUS_CONFIG) as Status[]).map(s => (
              <div key={s} className="flex items-center gap-1.5 text-xs">
                <div className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                <span className="text-muted-foreground">{STATUS_CONFIG[s].label}:</span>
                <span className="font-medium">{tasks.filter(t => t.status === s).length}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarefas por status</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {byStatus.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarefas por prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byPriority} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {byPriority.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Projects progress + urgent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso por projeto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {byProject.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas</p>}
            {byProject.map(p => {
              const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
              return (
                <div key={p.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm items-center">
                    <span className="flex items-center gap-1.5">
                      <ProjectIcon iconKey={p.iconKey} className="size-3.5" style={{ color: p.color }} />
                      {p.name}
                    </span>
                    <span className="text-muted-foreground text-xs">{p.done}/{p.total} ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="size-4 text-red-500" /> Alta prioridade
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {urgent.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa urgente</p>}
            {urgent.map(task => {
              const status = STATUS_CONFIG[task.status]
              const priority = PRIORITY_CONFIG[task.priority]
              const overdue = task.dueDate && isPast(parseISO(task.dueDate))
              return (
                <div key={task.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.dueDate && (
                      <p className={cn("text-xs", overdue ? "text-red-500" : "text-muted-foreground")}>
                        {overdue ? "Atrasada · " : ""}
                        {format(parseISO(task.dueDate), "dd MMM", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={cn("text-xs", status.color)}>{status.label}</Badge>
                    <Badge variant="outline" className={cn("text-xs", priority.color)}>{priority.label}</Badge>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number; sub: string; color: string
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={color}>{icon}</span>
        </div>
        <div className={cn("text-3xl font-bold", color)}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}
