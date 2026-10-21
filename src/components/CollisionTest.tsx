import React, { useEffect, useRef, useState } from 'react';
import { X, ShieldAlert, Download, RotateCcw, Activity, Layers, Cpu, Zap, Box, FileText, Check } from 'lucide-react';
import { GameWorld, Player, Vehicle } from '../types';

interface CollisionTestProps {
  worldRef: React.MutableRefObject<GameWorld | null>;
  playerRef: React.MutableRefObject<Player | null>;
  onClose: () => void;
}

interface CollisionEventRecord {
  id: string;
  timeSec: number;
  actorA: string;
  actorB: string;
  impactForceKj: number;
  relativeSpeedKmh: number;
  plasticDeformationPx: number;
  description: string;
}

export const CollisionTest: React.FC<CollisionTestProps> = ({ worldRef, playerRef, onClose }) => {
  const [stats, setStats] = useState<{
    totalVehicles: number;
    totalProps: number;
    activeVehicleName: string;
    nodesCount: number;
    beamsCount: number;
    brokenBeamsCount: number;
    maxPlasticStrain: number;
    avgStress: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // Live telemetry polling and softbody history recording & body rendering
  useEffect(() => {
    const iv = window.setInterval(() => {
      const world = worldRef.current;
      const player = playerRef.current;
      if (!world) return;

      const veh = player && player.isInVehicle && player.currentVehicleId
        ? world.vehicles.find(v => v.id === player.currentVehicleId)
        : world.vehicles[0] || null;

      const nb = veh?.damage?.nodeBeam;
      const defVerts = veh?.damage?.deformedVertices;
      const nodesCount = nb?.nodes?.length || 0;
      const beamsCount = nb?.beams?.length || 0;
      const brokenBeamsCount = nb?.brokenBeamCount || nb?.beams?.filter(b => b.broken).length || 0;
      
      let maxStrain = 0;
      let totalStress = 0;
      if (nb && nb.nodes) {
        for (const n of nb.nodes) {
          if ((n.plasticStrain || 0) > maxStrain) maxStrain = n.plasticStrain;
        }
      }
      if (nb && nb.beams) {
        for (const b of nb.beams) {
          totalStress += (b.currentStress || 0);
        }
      }
      const avgStress = beamsCount > 0 ? totalStress / beamsCount : 0;

      setStats({
        totalVehicles: world.vehicles.length,
        totalProps: world.props?.length || 0,
        activeVehicleName: veh ? (veh.nameRu || veh.type) : 'Нет автомобиля',
        nodesCount,
        beamsCount,
        brokenBeamsCount,
        maxPlasticStrain: maxStrain,
        avgStress
      });

      // Render Car Body Silhouette + Deformed Panels + Node-Beam FEM Wireframe on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const scale = 5.2;

          // Background
          ctx.fillStyle = '#060911';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Grid
          ctx.strokeStyle = '#111827';
          ctx.lineWidth = 1;
          for (let x = 0; x < canvas.width; x += 35) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
          }
          for (let y = 0; y < canvas.height; y += 35) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
          }

          if (veh) {
            // 1. Render Car Body Skin & Deformed Panels from deformedVertices
            if (Array.isArray(defVerts) && defVerts.length >= 16) {
              // Draw outer perimeter outline (nodes 0 to 15)
              ctx.beginPath();
              for (let i = 0; i < 16; i++) {
                const v = defVerts[i];
                if (!v) continue;
                const px = cx + (v.localX + (v.offsetX || 0)) * scale;
                const py = cy + (v.localY + (v.offsetY || 0)) * scale;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
              ctx.fill();
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = '#38bdf8';
              ctx.stroke();

              // Draw individual structural panels (bumpers, doors, roof, hood, trunk) with deformation heatmaps
              for (const v of defVerts) {
                const px = cx + (v.localX + (v.offsetX || 0)) * scale;
                const py = cy + (v.localY + (v.offsetY || 0)) * scale;
                const strain = v.plasticStrain || 0;

                ctx.beginPath();
                ctx.arc(px, py, strain > 0.1 ? 4.5 : 3, 0, Math.PI * 2);
                if (strain > 0.2) ctx.fillStyle = '#ef4444';
                else if (strain > 0.08) ctx.fillStyle = '#f97316';
                else if (strain > 0.02) ctx.fillStyle = '#eab308';
                else ctx.fillStyle = '#06b6d4';
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
              }
            }

            // 2. Render Node-Beam FEM Wireframe Overlay if available
            if (nb && nb.beams && nb.nodes) {
              for (const b of nb.beams) {
                const nA = nb.nodes[b.nodeA];
                const nB = nb.nodes[b.nodeB];
                if (!nA || !nB) continue;
                const x1 = cx + nA.x * scale;
                const y1 = cy + nA.y * scale;
                const x2 = cx + nB.x * scale;
                const y2 = cy + nB.y * scale;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);

                if (b.broken) {
                  ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                  ctx.setLineDash([2, 2]);
                  ctx.lineWidth = 1;
                } else {
                  const stress = b.currentStress || 0;
                  if (stress > 0.15) ctx.strokeStyle = '#ef4444';
                  else if (stress > 0.07) ctx.strokeStyle = '#f97316';
                  else if (stress > 0.02) ctx.strokeStyle = '#eab308';
                  else ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
                  ctx.lineWidth = 1.2;
                  ctx.setLineDash([]);
                }
                ctx.stroke();
                ctx.setLineDash([]);
              }
            }
          } else {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Нет активного транспортного средства для рендеринга', canvas.width / 2, canvas.height / 2);
          }
        }
      }

    }, 100);
    return () => window.clearInterval(iv);
  }, []);

  const exportReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      stats,
      worldSnapshot: {
        vehicles: worldRef.current?.vehicles.map(v => ({
          type: v.type,
          nameRu: v.nameRu,
          x: v.x,
          y: v.y,
          speed: v.speed,
          mass: v.mass,
          damage: v.damage
        })),
        propsCount: worldRef.current?.props?.length || 0
      }
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collision_telemetry_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Замер столкновений и мягких тел (Soft-Body & Vehicle Body Telemetry)
              </h2>
              <p className="text-xs text-slate-400">
                Рендеринг формы кузова, панелей деформации и узлов (Nodes) / балок (Beams) в реальном времени
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportReport}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Экспорт отчета телеметрии в JSON"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Экспорт JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-cyan-400" /> Активный объект
              </div>
              <div className="text-sm font-bold text-cyan-300 font-mono mt-1 truncate">
                {stats?.activeVehicleName || 'Нет'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Автомобилей в мире: {stats?.totalVehicles || 0}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Узлы и Балки (Nodes / Beams)
              </div>
              <div className="text-sm font-bold text-emerald-300 font-mono mt-1">
                {stats?.nodesCount || 0} N / {stats?.beamsCount || 0} B
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Разорвано связей: <span className="text-rose-400 font-bold">{stats?.brokenBeamsCount || 0}</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Пластическая деформация
              </div>
              <div className="text-sm font-bold text-amber-300 font-mono mt-1">
                {((stats?.maxPlasticStrain || 0) * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Макс. деформация металла
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-400" /> Нагрузка на пропы
              </div>
              <div className="text-sm font-bold text-purple-300 font-mono mt-1">
                {stats?.totalProps || 0} шт.
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Статические и динамические объекты
              </div>
            </div>
          </div>

          {/* Vehicle Body Skin & FEM Mesh Preview Canvas */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                Рендеринг кузова автомобиля и сетки мягкого тела (Vehicle Body & Soft-Body FEM Mesh)
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Частота обновления: 10 Гц
              </span>
            </div>
            <canvas
              ref={canvasRef}
              width={720}
              height={300}
              className="w-full max-w-[720px] h-[300px] rounded-xl shadow-inner bg-slate-950"
            />
            <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-400 mt-3 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Контур кузова (Панели)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Вмятина / Деформация
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Критический излом / Разрыв
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-rose-500" /> Сломанная балка
              </span>
            </div>
          </div>

          {/* Detailed Physics Explanation */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Физический анализ формы и деформаций кузова
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Инспектор теперь рендерит полную форму кузова автомобиля (периметр панелей, бамперов, крыши, капота и дверей на основе `deformedVertices`) в сочетании с сеткой упругопластических балок (Soft-Body Node-Beam FEM). Каждая точка отображает текущее смещение от ударов и пластическую деформацию в реальном времени.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Запись телеметрии кузова и балок активна
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-semibold cursor-pointer"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
