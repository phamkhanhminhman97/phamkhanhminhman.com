import { copy } from "@/content/copy";

export default function TransformationSketch() {
  return <figure className="sy-sketch">
    <svg viewBox="0 0 620 220" role="img" aria-labelledby="transformation-title">
      <title id="transformation-title">{copy.syllabus.sketchAlt}</title>
      <defs><marker id="sy-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity=".12">
        {[0, 1, 2, 3, 4].map((n) => <g key={n}><path d={`M ${35 + n * 40} 20 V 180 M 35 ${20 + n * 40} H 195`} /><path d={`M ${385 + n * 40} 180 l 80 -160 M ${385 + n * 20} ${180 - n * 40} h 160`} /></g>)}
      </g>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 35 180 H 195 M 35 180 V 20 M 385 180 H 565 M 385 180 L 465 20" opacity=".4" />
        <path d="M 35 180 L 115 60 M 385 180 L 525 60" strokeWidth="3" markerEnd="url(#sy-arrow)" />
        <path d="M 245 105 Q 282 80 325 105" strokeWidth="1.5" markerEnd="url(#sy-arrow)" />
        <path d="M 35 100 H 115 V 180 M 425 100 H 505 L 465 180" strokeDasharray="4 5" opacity=".5" />
      </g>
      <g fill="currentColor" fontFamily="Georgia, serif" fontStyle="italic" fontSize="21"><text x="120" y="58">v</text><text x="530" y="58">Av</text><text x="279" y="75">A</text></g>
    </svg>
    <figcaption>{copy.syllabus.sketchCaption}</figcaption>
  </figure>;
}
