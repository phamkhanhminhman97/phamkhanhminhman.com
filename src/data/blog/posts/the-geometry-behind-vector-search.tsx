import React from "react";
import type { BlogPost } from "../types";
import { BlockMath, InlineMath } from "@/components/Math";
import { VectorProjectionDiagram } from "@/components/VectorProjectionDiagram";
import { VectorProjectionCards } from "@/components/VectorProjectionCards";

const post: BlogPost = {
  slug: "the-geometry-behind-vector-search",
  date: "2026-10-13",
  section: "notes",
  category: "Mathematics & ML",
  title: "The Geometry Behind Vector Search",
  readTime: "3 min read",
  description:
    "Study notes: the dot product as a projection, why cosine and Euclidean distance rank alike on unit vectors, what pgvector's three operators compute, and what a shared offset does to cosine.",
  content: () => (
    <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed space-y-5">
      <p className="text-xs text-zinc-500">
        Notes from linear algebra (lesson 1) and the embeddings lesson of my Master&apos;s course. Sources: Deisenroth et
        al., <em>Mathematics for Machine Learning</em> §6.4.6; 3Blue1Brown, <em>Essence of Linear Algebra</em> ch. 1 and 9;
        Ethayarajh (2019); Timkey &amp; van Schijndel (2021). Numbers below were re-run with NumPy 2.0.2 and PostgreSQL 18.6
        + pgvector 0.8.7.
      </p>

      <h2 className="font-sans font-bold text-lg text-black pt-2">1. The dot product is a shadow</h2>

      <BlockMath math="\mathbf{a} \cdot \mathbf{b} = \sum_i a_i b_i = \|\mathbf{a}\|\,\|\mathbf{b}\|\cos\theta" />

      <p>
        Dividing by <InlineMath math="\|\mathbf{b}\|" /> gives the signed length of the shadow of{" "}
        <InlineMath math="\mathbf{a}" /> on the line through <InlineMath math="\mathbf{b}" />. Multiplying that length by
        the unit vector <InlineMath math="\mathbf{b}/\|\mathbf{b}\|" /> gives the shadow itself. The{" "}
        <InlineMath math="\|\mathbf{b}\|" /> is divided out twice, which is why the denominator is{" "}
        <InlineMath math="\mathbf{b}\cdot\mathbf{b}" />:
      </p>

      <BlockMath math="\operatorname{proj}_{\mathbf{b}}(\mathbf{a}) = \frac{\mathbf{a}\cdot\mathbf{b}}{\mathbf{b}\cdot\mathbf{b}}\,\mathbf{b}" />

      <VectorProjectionDiagram cards={<VectorProjectionCards />} />

      <p>
        With <InlineMath math="\mathbf{a}=(3,4)" /> and <InlineMath math="\mathbf{b}=(4,3)" />: the dot product is 24,{" "}
        <InlineMath math="\cos\theta = 24/25 = 0.96" />, the shadow has length 4.8 and equals{" "}
        <InlineMath math="(3.84, 2.88)" />. What is left, <InlineMath math="\mathbf{a}-\operatorname{proj}_{\mathbf{b}}(\mathbf{a}) = (-0.84, 1.12)" />
        , is perpendicular to <InlineMath math="\mathbf{b}" />. For <InlineMath math="\mathbf{c}=(-4,3)" /> the dot product
        with <InlineMath math="\mathbf{a}" /> is 0, so the shadow is empty.
      </p>

      <p>
        Orthogonal means no component along the other vector, which is weaker than independent:{" "}
        <InlineMath math="x=(-1,0,1)" /> and <InlineMath math="y=x^2=(1,0,1)" /> have dot product 0 and correlation 0, yet{" "}
        <InlineMath math="y" /> is determined by <InlineMath math="x" />.
      </p>

      <p>
        In <InlineMath math="d" /> dimensions the cosine of two independent random directions has a standard deviation
        of <InlineMath math="1/\sqrt{d}" />: 0.71 in 2D, 0.036 in 768D. So random vectors in high dimensions are nearly
        orthogonal.
      </p>

      <h2 className="font-sans font-bold text-lg text-black pt-2">2. Cosine and Euclidean agree on unit vectors</h2>

      <p>
        If <InlineMath math="\|\mathbf{u}\|=\|\mathbf{v}\|=1" />:
      </p>

      <BlockMath math="\|\mathbf{u}-\mathbf{v}\|^2 = \|\mathbf{u}\|^2 + \|\mathbf{v}\|^2 - 2\,\mathbf{u}\cdot\mathbf{v} = 2 - 2\cos(\mathbf{u},\mathbf{v})" />

      <p>
        Distance is a decreasing function of cosine, so the smallest distance and the largest cosine pick the same
        neighbours. On random data (10,000 documents, 50 queries, 768 dimensions) the top-10 lists were identical for
        50 of 50 queries after normalizing, and for 0 of 50 before. The difference shows up with raw counts: for{" "}
        <InlineMath math="q=(1,0)" /> and a document <InlineMath math="d=(10,0)" /> the Euclidean distance is 9 while the
        cosine is 1. An approximate index such as HNSW returns an approximation of this ranking.
      </p>

      <h2 className="font-sans font-bold text-lg text-black pt-2">3. What pgvector computes</h2>

      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li><code>&lt;=&gt;</code> cosine distance, <InlineMath math="1-\cos(\mathbf{u},\mathbf{v})" /></li>
        <li><code>&lt;-&gt;</code> Euclidean (L2) distance</li>
        <li><code>&lt;#&gt;</code> negative inner product, <InlineMath math="-\,\mathbf{u}\cdot\mathbf{v}" /></li>
      </ul>

      <p>
        <code>&lt;#&gt;</code> is negative because Postgres only supports ascending index scans on operators (pgvector
        README), so the largest inner product has to be the smallest value. On unit vectors{" "}
        <InlineMath math="-(\text{inner product})" /> is the cosine; over 2,000 random unit vectors it matched{" "}
        <code>1 - (embedding &lt;=&gt; q)</code> to 6e-8.
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL   -- L2-normalized at write time
);

CREATE INDEX ON documents USING hnsw (embedding vector_ip_ops);

SELECT id, content, (embedding <#> $1) * -1.0 AS cosine_similarity
FROM documents
ORDER BY embedding <#> $1 ASC
LIMIT 10;`}
      </pre>

      <p>
        The ASC query uses the HNSW index; with <code>DESC</code> the planner falls back to a sort over a sequential scan
        (a B-tree index can still scan backwards). On an exact scan of 20,000 rows, the three operators all took about
        20 ms, so the simpler formula is not a speed argument.
      </p>

      <h2 className="font-sans font-bold text-lg text-black pt-2">4. A shared offset flattens cosine</h2>

      <p>
        For random variables with zero mean, covariance is an inner product: the norm is the standard deviation, cosine
        is the correlation, orthogonal means uncorrelated (MML §6.4.6). Cosine itself ignores the mean, so if all vectors
        share a large offset along one coordinate they all point the same way and every pair scores high. Ethayarajh and
        Timkey &amp; van Schijndel describe this for contextual embeddings as anisotropy and rogue dimensions. Synthetic
        check, 2,000 independent vectors in 64 dimensions with one coordinate shifted and scaled:
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border border-zinc-200">
          <thead className="bg-zinc-100 text-zinc-700">
            <tr>
              <th className="p-2 border border-zinc-200 text-left">Vectors</th>
              <th className="p-2 border border-zinc-200 text-right">mean cosine</th>
              <th className="p-2 border border-zinc-200 text-right">std</th>
              <th className="p-2 border border-zinc-200 text-right">pairs &gt; 0.90</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border border-zinc-200">independent</td>
              <td className="p-2 border border-zinc-200 text-right">0.0000</td>
              <td className="p-2 border border-zinc-200 text-right">0.125</td>
              <td className="p-2 border border-zinc-200 text-right">0%</td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-200">one coordinate shifted</td>
              <td className="p-2 border border-zinc-200 text-right">0.9525</td>
              <td className="p-2 border border-zinc-200 text-right">0.010</td>
              <td className="p-2 border border-zinc-200 text-right">99.996%</td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-200">after subtracting the mean</td>
              <td className="p-2 border border-zinc-200 text-right">-0.0005</td>
              <td className="p-2 border border-zinc-200 text-right">0.153</td>
              <td className="p-2 border border-zinc-200 text-right">0%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Subtracting the mean restores the spread. In practice: subtract the corpus mean from the documents and the
        query, then normalize again. I only checked this on synthetic data, not on a real embedding model.
      </p>
    </div>
  ),
};

export default post;
