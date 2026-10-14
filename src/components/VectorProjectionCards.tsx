import React from "react";
import { InlineMath } from "./Math";

/**
 * Ba thẻ giải thích dưới hình minh hoạ. Là server component: KaTeX chỉ chạy lúc build,
 * nên thư viện không đi vào bundle trình duyệt. VectorProjectionDiagram (client) nhận
 * phần tử này qua props "cards".
 */
export function VectorProjectionCards() {
  return (
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
          Light shining perpendicular produces exactly zero shadow (no component of a along c).
        </p>
      </div>
    </div>
  );
}
