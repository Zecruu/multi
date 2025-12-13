"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  Search,
  Package,
  ShoppingCart,
  Users,
  UserCog,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface ActivityLog {
  _id: string;
  action: string;
  category: "order" | "product" | "client" | "user" | "settings" | "system";
  description: string;
  userName: string;
  userRole: string;
  targetId?: string;
  targetType?: string;
  targetName?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

const categoryConfig: Record<string, { icon: any; color: string; label: string }> = {
  order: { icon: ShoppingCart, color: "bg-blue-500/10 text-blue-500", label: "Pedidos" },
  product: { icon: Package, color: "bg-green-500/10 text-green-500", label: "Productos" },
  client: { icon: Users, color: "bg-purple-500/10 text-purple-500", label: "Clientes" },
  user: { icon: UserCog, color: "bg-orange-500/10 text-orange-500", label: "Usuarios" },
  settings: { icon: Settings, color: "bg-gray-500/10 text-gray-500", label: "Configuración" },
  system: { icon: Activity, color: "bg-red-500/10 text-red-500", label: "Sistema" },
};

const actionConfig: Record<string, { icon: any; color: string }> = {
  created: { icon: Plus, color: "text-green-500" },
  updated: { icon: Edit, color: "text-blue-500" },
  deleted: { icon: Trash2, color: "text-red-500" },
  status_changed: { icon: RefreshCw, color: "text-orange-500" },
};

export default function HistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchLogs();
  }, [currentPage, categoryFilter, actionFilter]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });
      
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/admin/activity?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      toast.error("Error al cargar el historial");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return formatDate(dateString);
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: "bg-red-500/10 text-red-500",
      manager: "bg-blue-500/10 text-blue-500",
      staff: "bg-green-500/10 text-green-500",
    };
    const roleLabels: Record<string, string> = {
      admin: "Admin",
      manager: "Gerente",
      staff: "Empleado",
    };
    return (
      <Badge className={roleColors[role] || "bg-gray-500/10 text-gray-500"}>
        {roleLabels[role] || role}
      </Badge>
    );
  };

  const totalActivities = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <History className="h-8 w-8" />
          Historial de Actividad
        </h1>
        <p className="text-muted-foreground mt-1">
          Registro de todas las acciones realizadas en el sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActivities}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {Object.entries(categoryConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color.split(" ")[0]}`}>
                    <Icon className={`h-5 w-5 ${config.color.split(" ")[1]}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats[key] || 0}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en historial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="order">Pedidos</SelectItem>
                <SelectItem value="product">Productos</SelectItem>
                <SelectItem value="client">Clientes</SelectItem>
                <SelectItem value="user">Usuarios</SelectItem>
                <SelectItem value="settings">Configuración</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="created">Creado</SelectItem>
                <SelectItem value="updated">Actualizado</SelectItem>
                <SelectItem value="deleted">Eliminado</SelectItem>
                <SelectItem value="status_changed">Estado Cambiado</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Historial de interacciones de los empleados con el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No hay actividad registrada
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const catConfig = categoryConfig[log.category];
                  const actConfig = actionConfig[log.action] || { icon: Activity, color: "text-gray-500" };
                  const CatIcon = catConfig?.icon || Activity;
                  const ActIcon = actConfig.icon;
                  
                  return (
                    <TableRow key={log._id}>
                      <TableCell>
                        <div className={`p-2 rounded-full ${catConfig?.color.split(" ")[0] || "bg-gray-500/10"}`}>
                          <CatIcon className={`h-4 w-4 ${catConfig?.color.split(" ")[1] || "text-gray-500"}`} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <ActIcon className={`h-4 w-4 mt-0.5 ${actConfig.color}`} />
                          <div>
                            <p className="font-medium text-foreground">{log.description}</p>
                            {log.targetName && (
                              <p className="text-sm text-muted-foreground">
                                {log.targetType}: {log.targetName}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{log.userName}</span>
                          {getRoleBadge(log.userRole)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={catConfig?.color || "bg-gray-500/10 text-gray-500"}>
                          {catConfig?.label || log.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{formatTimeAgo(log.createdAt)}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

