"use client";

import React, { useState } from "react";
import { InlineMath } from "./Math";

/**
 * Geometric Vector Projection Diagram
 *
 * Visually demonstrates:
 * 1. a = (3, 4) and b = (4, 3) both have length 5.
 * 2. Projection shadow proj_b(a) = (3.84, 2.88) with scalar length 4.8.
 * 3. Residual vector r = a - proj_b(a) = (-0.84, 1.12) perpendicular to b (90° right angle).
 * 4. Orthogonal vector c = (-4, 3) with a · c = 0 (zero shadow).
 */
export function VectorProjectionDiagram() {
  const [activeTab, setActiveTab] = useState<"projection" | "orthogonal" | "all">("projection");

  // Coordinate conversion:
  // Mathematical space: x in [-5, 5.5], y in [-1, 5.2]
  // SVG viewBox: 0 0 680 420
  const originX = 270;
  const originY = 320;
  const scale = 50; // 50px per unit

  const toSvgX = (x: number) => originX + x * scale;
  const toSvgY = (y: number) => originY - y * scale;

  // Key coordinates
  const a = { x: 3, y: 4 };
  const b = { x: 4, y: 3 };
  const c = { x: -4, y: 3 };
  const proj = { x: 3.84, y: 2.88 };

  const svgA = { x: toSvgX(a.x), y: toSvgY(a.y) };
  const svgB = { x: toSvgX(b.x), y: toSvgY(b.y) };
  const svgC = { x: toSvgX(c.x), y: toSvgY(c.y) };
  const svgProj = { x: toSvgX(proj.x), y: toSvgY(proj.y) };
  const svgOrigin = { x: originX, y: originY };

  // Right-angle marker at proj (3.84, 2.88)
  // Direction along -b: unit (-0.8, -0.6)
  // Direction along r: unit (-0.6, 0.8)
  const cornerSize = 0.28;
  const rCorner1 = {
    x: toSvgX(proj.x - 0.8 * cornerSize),
    y: toSvgY(proj.y - 0.6 * cornerSize),
  };
  const rCorner2 = {
    x: toSvgX(proj.x - 0.8 * cornerSize - 0.6 * cornerSize),
    y: toSvgY(proj.y - 0.6 * cornerSize + 0.8 * cornerSize),
  };
  const rCorner3 = {
    x: toSvgX(proj.x - 0.6 * cornerSize),
    y: toSvgY(proj.y + 0.8 * cornerSize),
  };

  return (
    <div className="my-6 border border-zinc-200/90 rounded-xl bg-white shadow-sm overflow-hidden not-prose">
      {/* Header with interactive toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-50/90 border-b border-zinc-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-900 uppercase tracking-wider text-[11px] font-sans">
            Geometric Visualizer
          </span>
          <span className="text-zinc-400">•</span>
          <span className="text-zinc-600 font-sans">
            Dot Product as a Perpendicular Shadow
          </span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-200/80 p-0.5 rounded-lg text-[11px] font-medium font-sans">
          <button
            type="button"
            onClick={() => setActiveTab("projection")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "projection"
                ? "bg-white text-zinc-900 shadow-xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Shadow Projection
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("orthogonal")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "orthogonal"
                ? "bg-white text-zinc-900 shadow-xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Orthogonal Zero Shadow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "all"
                ? "bg-white text-zinc-900 shadow-xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Full Space View
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="p-2 sm:p-4 bg-[#fafafa] flex justify-center">
        <svg
          viewBox="0 0 680 400"
          className="w-full h-auto max-w-[680px] select-none"
          style={{ maxHeight: "420px" }}
        >
          <defs>
            {/* Grid pattern */}
            <pattern
              id="grid"
              width={scale}
              height={scale}
              patternUnits="userSpaceOnUse"
              x={originX % scale}
              y={originY % scale}
            >
              <path
                d={`M ${scale} 0 L 0 0 0 ${scale}`}
                fill="none"
                stroke="#e4e4e7"
                strokeWidth="1"
              />
            </pattern>

            {/* Arrowhead markers */}
            <marker
              id="arrow-red"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#dc2626" />
            </marker>
            <marker
              id="arrow-blue"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#2563eb" />
            </marker>
            <marker
              id="arrow-purple"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#7c3aed" />
            </marker>
            <marker
              id="arrow-green"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#059669" />
            </marker>
            <marker
              id="arrow-slate"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#64748b" />
            </marker>
          </defs>

          {/* Grid Background */}
          <rect width="680" height="400" fill="url(#grid)" />

          {/* Cartesian Axes */}
          <line
            x1="20"
            y1={originY}
            x2="660"
            y2={originY}
            stroke="#a1a1aa"
            strokeWidth="1.5"
          />
          <line
            x1={originX}
            y1="380"
            x2={originX}
            y2="20"
            stroke="#a1a1aa"
            strokeWidth="1.5"
          />
          <text
            x="655"
            y={originY - 8}
            className="text-[12px] font-mono fill-zinc-500 font-semibold"
          >
            x
          </text>
          <text
            x={originX + 10}
            y="30"
            className="text-[12px] font-mono fill-zinc-500 font-semibold"
          >
            y
          </text>
          <text
            x={originX - 14}
            y={originY + 16}
            className="text-[11px] font-mono fill-zinc-400"
          >
            0
          </text>

          {/* Ticks on X axis */}
          {[-4, -3, -2, -1, 1, 2, 3, 4, 5].map((val) => (
            <g key={`xtick-${val}`}>
              <line
                x1={toSvgX(val)}
                y1={originY - 4}
                x2={toSvgX(val)}
                y2={originY + 4}
                stroke="#71717a"
                strokeWidth="1"
              />
              <text
                x={toSvgX(val)}
                y={originY + 16}
                textAnchor="middle"
                className="text-[10px] font-mono fill-zinc-400"
              >
                {val}
              </text>
            </g>
          ))}

          {/* Ticks on Y axis */}
          {[1, 2, 3, 4].map((val) => (
            <g key={`ytick-${val}`}>
              <line
                x1={originX - 4}
                y1={toSvgY(val)}
                x2={originX + 4}
                y2={toSvgY(val)}
                stroke="#71717a"
                strokeWidth="1"
              />
              <text
                x={originX - 12}
                y={toSvgY(val) + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-zinc-400"
              >
                {val}
              </text>
            </g>
          ))}

          {/* Line of span(b): extended ray */}
          {(activeTab === "projection" || activeTab === "all") && (
            <line
              x1={toSvgX(-0.5)}
              y1={toSvgY(-0.375)}
              x2={toSvgX(5.2)}
              y2={toSvgY(3.9)}
              stroke="#93c5fd"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          {/* Line of span(c): extended ray if orthogonal view */}
          {(activeTab === "orthogonal" || activeTab === "all") && (
            <line
              x1={toSvgX(1.0)}
              y1={toSvgY(-0.75)}
              x2={toSvgX(-4.8)}
              y2={toSvgY(3.6)}
              stroke="#a7f3d0"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          {/* PROJECTION SHADOW & RESIDUAL (when projection or all) */}
          {(activeTab === "projection" || activeTab === "all") && (
            <>
              {/* Highlighted Shadow Area along b */}
              <line
                x1={svgOrigin.x}
                y1={svgOrigin.y}
                x2={svgProj.x}
                y2={svgProj.y}
                stroke="#7c3aed"
                strokeWidth="6"
                strokeLinecap="round"
                opacity="0.85"
                markerEnd="url(#arrow-purple)"
              />

              {/* Perpendicular drop line (Residual r = a - proj) */}
              <line
                x1={svgA.x}
                y1={svgA.y}
                x2={svgProj.x}
                y2={svgProj.y}
                stroke="#64748b"
                strokeWidth="1.75"
                strokeDasharray="4 4"
                markerEnd="url(#arrow-slate)"
              />

              {/* Right-angle 90° square at (3.84, 2.88) */}
              <polyline
                points={`${rCorner1.x},${rCorner1.y} ${rCorner2.x},${rCorner2.y} ${rCorner3.x},${rCorner3.y}`}
                fill="none"
                stroke="#475569"
                strokeWidth="1.25"
              />

              {/* Angle theta arc between a and b */}
              {/* b angle ~36.87°, a angle ~53.13°, delta = 16.26° */}
              <path
                d={`M ${toSvgX(1.4 * 0.8)} ${toSvgY(1.4 * 0.6)} A 70 70 0 0 0 ${toSvgX(1.4 * 0.6)} ${toSvgY(1.4 * 0.8)}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.75"
              />
              <text
                x={toSvgX(1.5)}
                y={toSvgY(1.2)}
                className="text-[11px] font-sans font-semibold fill-amber-700"
              >
                θ ≈ 16.3°
              </text>

              {/* Label for proj_b(a) */}
              <g transform={`translate(${toSvgX(2.3)}, ${toSvgY(1.25)})`}>
                <rect
                  x="-4"
                  y="-12"
                  width="170"
                  height="22"
                  rx="4"
                  fill="white"
                  fillOpacity="0.92"
                  stroke="#ddd6fe"
                />
                <text
                  x="4"
                  y="2"
                  className="text-[10px] font-mono font-bold fill-purple-900"
                >
                  proj_b(a) = (3.84, 2.88)
                </text>
                <text
                  x="4"
                  y="18"
                  className="text-[9px] font-sans fill-purple-700 font-medium"
                >
                  shadow length = 4.80 (24 / 5)
                </text>
              </g>

              {/* Residual vector annotation */}
              <g transform={`translate(${toSvgX(3.55)}, ${toSvgY(3.7)})`}>
                <text
                  x="0"
                  y="0"
                  className="text-[10px] font-mono fill-slate-700 font-semibold"
                >
                  r = a - proj = (-0.84, 1.12)
                </text>
                <text
                  x="0"
                  y="11"
                  className="text-[9px] font-sans fill-slate-500"
                >
                  r ⟂ b (90° right angle, r · b = 0)
                </text>
              </g>
            </>
          )}

          {/* ORTHOGONAL VECTOR c = (-4, 3) (when orthogonal or all) */}
          {(activeTab === "orthogonal" || activeTab === "all") && (
            <>
              {/* Vector c arrow */}
              <line
                x1={svgOrigin.x}
                y1={svgOrigin.y}
                x2={svgC.x}
                y2={svgC.y}
                stroke="#059669"
                strokeWidth="3"
                markerEnd="url(#arrow-green)"
              />

              {/* 90° angle arc between a = (3, 4) and c = (-4, 3) */}
              <path
                d={`M ${toSvgX(1.1 * 0.6)} ${toSvgY(1.1 * 0.8)} A 55 55 0 0 1 ${toSvgX(-1.1 * 0.8)} ${toSvgY(1.1 * 0.6)}`}
                fill="none"
                stroke="#059669"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={toSvgX(-0.5)}
                y={toSvgY(1.3)}
                className="text-[11px] font-sans font-bold fill-emerald-700"
              >
                90° (a ⟂ c)
              </text>

              {/* Label for vector c */}
              <g transform={`translate(${Math.max(16, svgC.x - 40)}, ${svgC.y - 45})`}>
                <rect
                  x="-4"
                  y="-12"
                  width="165"
                  height="34"
                  rx="4"
                  fill="white"
                  fillOpacity="0.94"
                  stroke="#a7f3d0"
                />
                <text
                  x="4"
                  y="2"
                  className="text-[11px] font-mono font-bold fill-emerald-800"
                >
                  c = (-4, 3) [||c|| = 5]
                </text>
                <text
                  x="4"
                  y="16"
                  className="text-[9.5px] font-sans fill-emerald-700 font-medium"
                >
                  a · c = -12 + 12 = 0 (Zero Shadow)
                </text>
              </g>
            </>
          )}

          {/* PRIMARY VECTOR b = (4, 3) */}
          <line
            x1={svgOrigin.x}
            y1={svgOrigin.y}
            x2={svgB.x}
            y2={svgB.y}
            stroke="#2563eb"
            strokeWidth="3.5"
            markerEnd="url(#arrow-blue)"
          />
          <g transform={`translate(${svgB.x + 8}, ${svgB.y + 4})`}>
            <text
              x="0"
              y="0"
              className="text-[12px] font-mono font-bold fill-blue-700"
            >
              b = (4, 3)
            </text>
            <text
              x="0"
              y="12"
              className="text-[10px] font-sans fill-blue-600 font-medium"
            >
              ||b|| = 5.0 (Base axis)
            </text>
          </g>

          {/* PRIMARY VECTOR a = (3, 4) */}
          <line
            x1={svgOrigin.x}
            y1={svgOrigin.y}
            x2={svgA.x}
            y2={svgA.y}
            stroke="#dc2626"
            strokeWidth="3.5"
            markerEnd="url(#arrow-red)"
          />
          <g transform={`translate(${svgA.x - 30}, ${svgA.y - 12})`}>
            <text
              x="0"
              y="0"
              className="text-[12px] font-mono font-bold fill-red-700"
            >
              a = (3, 4)
            </text>
            <text
              x="0"
              y="12"
              className="text-[10px] font-sans fill-red-600 font-medium"
            >
              ||a|| = 5.0 (Input vector)
            </text>
          </g>

          {/* Origin Dot */}
          <circle cx={originX} cy={originY} r="4" fill="#18181b" />
        </svg>
      </div>

      {/* Explanatory cards underneath */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-zinc-50 border-t border-zinc-200 text-xs">
        <div className="p-2.5 bg-white rounded-lg border border-blue-100 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 font-sans font-bold text-blue-900">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span>Target Axis: <InlineMath math="\mathbf{b} = (4, 3)" /></span>
          </div>
          <p className="text-zinc-600 text-[11px] leading-relaxed">
            Magnitude <InlineMath math="\|\mathbf{b}\| = 5.0" />. Acts as the line onto which
            the shadow is cast. The direction unit is <InlineMath math="\hat{\mathbf{b}} = (0.8, 0.6)" />.
          </p>
        </div>

        <div className="p-2.5 bg-white rounded-lg border border-purple-100 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 font-sans font-bold text-purple-900">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
            <span>Projected Shadow: <InlineMath math="\text{proj}_{\mathbf{b}}(\mathbf{a})" /></span>
          </div>
          <p className="text-zinc-600 text-[11px] leading-relaxed">
            Shadow length is <InlineMath math="\frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{b}\|} = \frac{24}{5} = 4.80" />.
            Vector coordinate is <InlineMath math="(3.84, 2.88)" />.
          </p>
        </div>

        <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 font-sans font-bold text-emerald-900">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span>Orthogonal: <InlineMath math="\mathbf{a} \cdot \mathbf{c} = 0" /></span>
          </div>
          <p className="text-zinc-600 text-[11px] leading-relaxed">
            Vector <InlineMath math="\mathbf{c} = (-4, 3)" /> is at <InlineMath math="90^\circ" /> to <InlineMath math="\mathbf{a}" />.
            Light shining perpendicular produces exactly zero shadow (zero mutual info).
          </p>
        </div>
      </div>
    </div>
  );
}
