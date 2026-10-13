import React from "react";
import type { BlogPost } from "../types";
import { BlockMath, InlineMath } from "@/components/Math";
import { VectorProjectionDiagram } from "@/components/VectorProjectionDiagram";

const post: BlogPost = {
  slug: "the-geometry-behind-vector-search",
  date: "2026-10-13",
  section: "notes",
  category: "Mathematics & ML",
  title: "The Geometry Behind Vector Search: Dot Products, Projections, and L2 Equivalence",
  readTime: "7 min read",
  description:
    "Why dot products project geometric shadows, why cosine and Euclidean distance rank identically under L2 normalization, and what happens when embedding spaces drift off-center.",
  content: () => (
    <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-serif-body text-zinc-600 leading-relaxed not-italic">
        <p className="font-sans font-bold text-zinc-900 uppercase tracking-wide text-[10px] mb-1">
          Study Note &amp; Sources
        </p>
        <p>
          Distilled from Course 02 (Linear Algebra, §1) and Course 10 (Systems Around Models, §3)
          in my CS Master&apos;s curriculum. Foundational references: Deisenroth et al.,{" "}
          <em>Mathematics for Machine Learning</em> (§6.4.6, pp. 195–197); Grant Sanderson,{" "}
          <em>3Blue1Brown: Essence of Linear Algebra</em> (Ch. 1 &amp; 9); Timkey &amp; van Schijndel (2021).
        </p>
      </div>

      <p>
        In modern backend engineering, vector search is frequently treated as an opaque black box.
        You pass a query string to an embedding API, receive an array of 768 floating-point numbers,
        and issue an <code>ORDER BY embedding &lt;=&gt; query_vector</code> query in PostgreSQL using{" "}
        <code>pgvector</code>.
      </p>

      <p>
        For most tasks, computing <code>cosine_similarity(u, v)</code> feels like invoking a routine library helper.
        However, treating high-dimensional representations purely as flat arrays hides three fundamental properties:
        why the dot product is geometrically a physical shadow, why Euclidean distance and cosine similarity produce
        identical ranking under unit normalization, and why uncentered vector spaces suffer from the common{" "}
        <strong>anisotropy trap</strong>.
      </p>

      <h2 className="font-sans font-bold text-lg text-black pt-4">
        1. Vectors as Directions: The Geometric Shadow
      </h2>

      <p>
        To a software engineer, a vector is typically just an array: <code>a = [3.0, 4.0]</code>.
        Geometrically, it represents an arrow in a coordinate space rooted at the origin with both length
        (magnitude) and direction.
      </p>

      <p>
        The Euclidean length (L2 norm) is derived directly from the Pythagorean theorem:
      </p>

      <BlockMath math="\|\mathbf{a}\| = \sqrt{a_1^2 + a_2^2 + \dots + a_d^2} = \sqrt{\mathbf{a} \cdot \mathbf{a}}" />

      <p>
        When you compute the dot product between two vectors <InlineMath math="\mathbf{a}" />{" "}and{" "}
        <InlineMath math="\mathbf{b}" />:
      </p>

      <BlockMath math="\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^d a_i b_i = \|\mathbf{a}\|\,\|\mathbf{b}\|\cos\theta" />

      <p>
        The algebraic definition (sum of coordinate-wise products) equals the geometric formulation
        (lengths multiplied by the cosine of the enclosed angle <InlineMath math="\theta" />).
        Geometrically, this represents a <strong>projection shadow</strong>:
      </p>

      <blockquote className="border-l-2 border-red-700 pl-4 text-zinc-700 italic my-4">
        Projecting vector <InlineMath math="\mathbf{a}" />{" "}onto vector{" "}
        <InlineMath math="\mathbf{b}" />{" "}is equivalent to dropping a perpendicular
        light source onto the line spanning <InlineMath math="\mathbf{b}" />, and measuring
        the signed length of the shadow.
      </blockquote>

      <p>
        Dividing the dot product by <InlineMath math="\|\mathbf{b}\|" />{" "}isolates the scalar length of the shadow:
      </p>

      <BlockMath math="\text{shadow\_length} = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{b}\|} = \|\mathbf{a}\|\cos\theta" />

      <p>
        To obtain the shadow as a concrete vector in the exact direction of <InlineMath math="\mathbf{b}" />,
        we multiply that length by the unit direction vector{" "}
        <InlineMath math="\hat{\mathbf{b}} = \frac{\mathbf{b}}{\|\mathbf{b}\|}" />:
      </p>

      <BlockMath math="\operatorname{proj}_{\mathbf{b}}(\mathbf{a}) = \left(\frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{b}\|}\right)\left(\frac{\mathbf{b}}{\|\mathbf{b}\|}\right) = \left(\frac{\mathbf{a} \cdot \mathbf{b}}{\mathbf{b} \cdot \mathbf{b}}\right)\mathbf{b}" />

      <p>
        Notice why the denominator is <InlineMath math="\mathbf{b} \cdot \mathbf{b} = \|\mathbf{b}\|^2" />:
        division by <InlineMath math="\|\mathbf{b}\|" />{" "}occurs twice—once
        to isolate the shadow length, and once to normalize <InlineMath math="\mathbf{b}" />{" "}into
        a unit direction vector.
      </p>

      {/* Interactive Geometric Visualization */}
      <VectorProjectionDiagram />

      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-sans space-y-2 my-4">
        <p className="font-bold text-zinc-900 uppercase tracking-wide text-[11px]">
          Concrete Calculation: <InlineMath math="\mathbf{a} = (3, 4)" />{" "}and{" "}
          <InlineMath math="\mathbf{b} = (4, 3)" />
        </p>
        <ul className="space-y-1.5 text-zinc-700">
          <li>
            • <strong>Magnitudes:</strong>{" "}
            <InlineMath math="\|\mathbf{a}\| = \sqrt{3^2 + 4^2} = 5.0" />
            {", "}
            <InlineMath math="\|\mathbf{b}\| = \sqrt{4^2 + 3^2} = 5.0" />
          </li>
          <li>
            • <strong>Dot Product:</strong>{" "}
            <InlineMath math="\mathbf{a} \cdot \mathbf{b} = 3(4) + 4(3) = 24.0" />
          </li>
          <li>
            • <strong>Cosine Similarity:</strong>{" "}
            <InlineMath math="\cos\theta = \frac{24.0}{5.0 \times 5.0} = 0.96 \implies \theta \approx 16.3^\circ" />
          </li>
          <li>
            • <strong>Shadow Length:</strong>{" "}
            <InlineMath math="\frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{b}\|} = \frac{24.0}{5.0} = 4.80" />
            {" (Cross-check: "}
            <InlineMath math="\|\mathbf{a}\|\cos\theta = 5.0 \times 0.96 = 4.80" />
            {")"}
          </li>
          <li>
            • <strong>Projected Vector:</strong>{" "}
            <InlineMath math="\operatorname{proj}_{\mathbf{b}}(\mathbf{a}) = \frac{24}{25}(4, 3) = (3.84, 2.88)" />
          </li>
          <li>
            • <strong>Residual Vector:</strong>{" "}
            <InlineMath math="\mathbf{r} = \mathbf{a} - \operatorname{proj}_{\mathbf{b}}(\mathbf{a}) = (3, 4) - (3.84, 2.88) = (-0.84, 1.12)" />
          </li>
          <li>
            • <strong>Orthogonality Verification:</strong>{" "}
            <InlineMath math="\mathbf{r} \cdot \mathbf{b} = (-0.84)(4) + (1.12)(3) = -3.36 + 3.36 = 0.00" />
          </li>
        </ul>
      </div>

      <p>
        When two vectors are orthogonal (such as <InlineMath math="\mathbf{a} = (3, 4)" />{" "}and{" "}
        <InlineMath math="\mathbf{c} = (-4, 3)" />, where{" "}
        <InlineMath math="\mathbf{a} \cdot \mathbf{c} = -12 + 12 = 0" />), the projection produces{" "}
        <InlineMath math="\operatorname{proj}_{\mathbf{c}}(\mathbf{a}) = (0, 0)" />.
        The shadow length is exactly zero. In geometric information theory,{" "}
        <strong>orthogonality means zero shared information</strong>.
      </p>

      <p>
        This geometric property explains why semantic search works in high dimensions. In 2D, two random vectors
        have broad cosine dispersion (standard deviation <InlineMath math="\approx 0.71" />). However, in 768 dimensions, the concentration of
        measure dictates that random vectors have a standard deviation of approximately{" "}
        <InlineMath math="1 / \sqrt{768} \approx 0.0361" />. Almost all random pairs in 768D are naturally near-orthogonal
        (cosine between <InlineMath math="-0.07" />{" "}and <InlineMath math="+0.07" />). Consequently, two dense embeddings sharing a cosine above 0.70 is an
        astronomical statistical anomaly unless they share real semantic alignment.
      </p>

      <h2 className="font-sans font-bold text-lg text-black pt-4">
        2. Cosine Similarity vs. Euclidean Distance: The L2 Equivalence
      </h2>

      <p>
        Introductory machine learning tutorials often explain why retrieval uses cosine similarity rather
        than Euclidean distance with the following classic example:
      </p>

      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li>Query <InlineMath math="\mathbf{q} = (1, 0)" />{" "}(short search for &quot;database&quot;)</li>
        <li>Document 1 <InlineMath math="\mathbf{d}_1 = (1, 0)" />{" "}(short article matching &quot;database&quot;)</li>
        <li>Document 2 <InlineMath math="\mathbf{d}_2 = (10, 0)" />{" "}(long article mentioning &quot;database&quot; ten times)</li>
      </ul>

      <p>
        Under Euclidean distance, <InlineMath math="\|\mathbf{q} - \mathbf{d}_2\| = 9.0" />{" "}appears distant, penalizing the longer article
        solely due to word repetition. Meanwhile, cosine similarity yields <code>1.0</code>{" "}for both, preserving
        semantic alignment regardless of length.
      </p>

      <p>
        However, in modern dense retrieval systems, <strong>every document and query embedding is normalized
        to unit length (L2 norm = 1.0)</strong> before indexing. Under unit normalization, Euclidean distance
        and cosine similarity are not different metrics—they are <strong>mathematically monotonic transforms</strong>:
      </p>

      <BlockMath
        math={`\\begin{aligned}
\\|\\mathbf{u} - \\mathbf{v}\\|^2 &= (\\mathbf{u} - \\mathbf{v}) \\cdot (\\mathbf{u} - \\mathbf{v}) \\\\
&= \\|\\mathbf{u}\\|^2 + \\|\\mathbf{v}\\|^2 - 2(\\mathbf{u} \\cdot \\mathbf{v}) \\\\
&= 1.0 + 1.0 - 2\\cos(\\mathbf{u}, \\mathbf{v}) \\\\
&= 2 - 2\\cos(\\mathbf{u}, \\mathbf{v})
\\end{aligned}`}
      />

      <p>
        Taking the square root yields the exact distance relation:
      </p>

      <BlockMath math="\|\mathbf{u} - \mathbf{v}\| = \sqrt{2 - 2\cos(\mathbf{u}, \mathbf{v})}" />

      <p>
        Because <InlineMath math="f(x) = \sqrt{2 - 2x}" />{" "}is strictly monotonically decreasing for{" "}
        <InlineMath math="x \in [-1, 1]" />, minimizing Euclidean distance is strictly equivalent to maximizing
        cosine similarity:
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border border-zinc-200 my-2">
          <thead className="bg-zinc-100 text-zinc-700">
            <tr>
              <th className="p-2 border border-zinc-200 text-left">Angle <InlineMath math="\theta" /></th>
              <th className="p-2 border border-zinc-200 text-right">Cosine Similarity <InlineMath math="\cos\theta" /></th>
              <th className="p-2 border border-zinc-200 text-right">Euclidean Distance <InlineMath math="\|\mathbf{u} - \mathbf{v}\|" /></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border border-zinc-200"><InlineMath math="0^\circ" />{" "}(identical)</td>
              <td className="p-2 border border-zinc-200 text-right font-bold text-green-700">1.0000</td>
              <td className="p-2 border border-zinc-200 text-right font-bold text-green-700">0.0000</td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-200"><InlineMath math="60^\circ" /></td>
              <td className="p-2 border border-zinc-200 text-right">0.5000</td>
              <td className="p-2 border border-zinc-200 text-right">1.0000</td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-200"><InlineMath math="90^\circ" />{" "}(orthogonal)</td>
              <td className="p-2 border border-zinc-200 text-right text-zinc-600">0.0000</td>
              <td className="p-2 border border-zinc-200 text-right text-zinc-600"><InlineMath math="\sqrt{2} \approx 1.4142" /></td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-200"><InlineMath math="180^\circ" />{" "}(opposite)</td>
              <td className="p-2 border border-zinc-200 text-right text-red-700">-1.0000</td>
              <td className="p-2 border border-zinc-200 text-right text-red-700">2.0000</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        On normalized vectors, <strong>nearest-neighbor rankings under Euclidean distance and cosine similarity
        are 100% identical</strong>, right down to the tie-breakers.
      </p>

      <h2 className="font-sans font-bold text-lg text-black pt-4">
        3. Real-world Postgres: Why pgvector Uses Negative Inner Product
      </h2>

      <p>
        In PostgreSQL with the <code>pgvector</code>{" "}extension, three distance operators are exposed:
      </p>

      <ul className="list-disc pl-5 space-y-1 text-xs font-mono">
        <li><code>&lt;=&gt;</code>: Cosine distance, defined as <code>1.0 - cosine(u, v)</code></li>
        <li><code>&lt;-&gt;</code>: Euclidean distance (L2), <code>||u - v||</code></li>
        <li><code>&lt;#&gt;</code>: Negative inner product, <code>-(u · v)</code></li>
      </ul>

      <p>
        A frequent question from backend developers is: <em>Why does <code>&lt;#&gt;</code>{" "}return a negative value?</em>
      </p>

      <p>
        The reason lies in PostgreSQL query execution internals. Standard index scans (including B-tree, GiST,
        IVFFlat, and HNSW) only support ordering by expressions in <strong>ascending order (ASC)</strong>.
        When searching for the closest semantic match, you want the <em>largest</em> dot product.
        By negating the dot product (<code>-(u · v)</code>), the greatest similarity becomes the smallest numerical
        value, allowing PostgreSQL index scans to evaluate <code>ORDER BY embedding &lt;#&gt; query ASC LIMIT 10</code>{" "}
        without requiring descending index scans.
      </p>

      <p>
        When embeddings are pre-normalized to unit length (<code>||v|| = 1.0</code>), the cosine denominator
        <code>||u|| * ||v||</code>{" "}equals <code>1.0</code>. Consequently, calculating cosine similarity collapses
        into a raw inner product. Executing <code>&lt;#&gt;</code>{" "}avoids square root and norm operations
        entirely, significantly improving throughput on exact scans and index traversals.
      </p>

      <p>
        Here is the standard schema and index pattern in PostgreSQL using <code>vector_ip_ops</code>:
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`-- 1. Create table with dense 768-dimensional embeddings
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL
);

-- 2. Build HNSW index using inner product on pre-normalized vectors
CREATE INDEX documents_embedding_hnsw_idx 
ON documents USING hnsw (embedding vector_ip_ops);

-- 3. Top-10 semantic retrieval using negative inner product (<#>)
-- Multiplying by -1.0 restores the true positive cosine score
SELECT 
  id, 
  content, 
  (embedding <#> $1) * -1.0 AS cosine_similarity
FROM documents
ORDER BY embedding <#> $1 ASC
LIMIT 10;`}
      </pre>

      <h2 className="font-sans font-bold text-lg text-black pt-4">
        4. The Anisotropy Trap: When Cosine Always Returns 0.90
      </h2>

      <p>
        In <em>Mathematics for Machine Learning</em> (§6.4.6, p. 196), inner products are mapped directly to statistics:
        for random variables with zero expectation, the inner product <InlineMath math="\langle X, Y \rangle := \text{Cov}[X, Y]" />{" "}satisfies
        all inner product axioms. Under zero-mean centering:
      </p>

      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li>Vector norm <InlineMath math="\|\mathbf{a}\|" />{" "}corresponds to standard deviation <InlineMath math="\sigma" /></li>
        <li>Cosine similarity corresponds to Pearson correlation <InlineMath math="\text{corr}(X, Y)" /></li>
        <li>Orthogonality corresponds to zero covariance (<InlineMath math="\text{Cov}[X, Y] = 0" />)</li>
        <li>Pythagorean theorem <InlineMath math="\|\mathbf{a} + \mathbf{b}\|^2 = \|\mathbf{a}\|^2 + \|\mathbf{b}\|^2" />{" "}corresponds to variance summation <InlineMath math="\mathbb{V}[X+Y] = \mathbb{V}[X] + \mathbb{V}[Y]" /></li>
      </ul>

      <p>
        Crucially, this equivalence holds <strong>only if vectors are centered around zero</strong>.
        In uncentered representations, cosine similarity exhibits a severe pathological behavior known as{" "}
        <strong>anisotropy</strong> (Ethayarajh, 2019; Timkey &amp; van Schijndel, 2021).
      </p>

      <p>
        When an embedding space drifts away from the origin along even a single &quot;rogue dimension&quot;,
        all vectors point into a narrow high-dimensional cone. Consider this reproduction:
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`import numpy as np

def pairwise_cosine(E):
    En = E / np.linalg.norm(E, axis=1, keepdims=True)
    C  = En @ En.T
    return C[np.triu_indices(len(E), k=1)]

rng = np.random.default_rng(0)
# 2,000 completely independent vectors in 64 dimensions
E_clean = rng.normal(size=(2000, 64))
c_clean = pairwise_cosine(E_clean)
print(f"Clean:   mean={c_clean.mean():+.4f}  std={c_clean.std():.4f}  >0.90: {(c_clean > 0.90).mean()*100:.1f}%")

# Introduce a single shifted dominant dimension
E_rogue = E_clean.copy()
E_rogue[:, 0] = (E_rogue[:, 0] + 12.0) * 3.0
c_rogue = pairwise_cosine(E_rogue)
print(f"Rogue:   mean={c_rogue.mean():+.4f}  std={c_rogue.std():.4f}  >0.90: {(c_rogue > 0.90).mean()*100:.1f}%")`}
      </pre>

      <p>Output:</p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`Clean:   mean=-0.0000  std=0.1251  >0.90: 0.0%
Rogue:   mean=+0.9525  std=0.0098  >0.90: 100.0%`}
      </pre>

      <p>
        In the simulated rogue space, <strong>100% of completely independent pairs score a cosine similarity above 0.90</strong>,
        with a tiny standard deviation of <code>0.0098</code>.
        The single dominant dimension accounts for 100% of the dot product, suffocating the remaining 63 informative dimensions.
      </p>

      <p>
        If your production search system displays uniformly high similarity scores (e.g. every pair scoring between
        0.87 and 0.93 regardless of relevance), adjusting your threshold is rarely the fix.
        Applying <strong>mean centering across the corpus</strong> (and re-normalizing unit length) restores isotropic
        contrast across the manifold.
      </p>

      <h2 className="font-sans font-bold text-lg text-black pt-4">
        5. Verification: Pure NumPy Implementation
      </h2>

      <p>
        To cement the geometric foundation without high-level library abstractions, here is the self-contained
        implementation verifying projection, orthogonality, and cosine consistency:
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`import numpy as np

def dot(u, v):
    return float(np.sum(u * v))

def norm(u):
    return float(np.sqrt(dot(u, u)))

def cosine(u, v):
    return dot(u, v) / (norm(u) * norm(v))

def proj(u, v):
    """Vector projection of u onto v."""
    return (dot(u, v) / dot(v, v)) * v

# Benchmark vectors with equal norm = 5.0
a = np.array([3.0, 4.0])
b = np.array([4.0, 3.0])
c = np.array([-4.0, 3.0])

# 1. Dot product and cosine verification
assert abs(dot(a, b) - 24.0) < 1e-9
assert abs(dot(a, c) - 0.0)  < 1e-9   # Orthogonal: zero shared information
assert abs(dot(b, c) - (-7.0)) < 1e-9

assert abs(cosine(a, b) - 0.96)  < 1e-9
assert abs(cosine(a, c) - 0.00)  < 1e-9
assert abs(cosine(b, c) - (-0.28)) < 1e-9

# 2. Geometric projection verification
# Shadow of a onto b
assert np.allclose(proj(a, b), [3.84, 2.88])
assert abs(norm(proj(a, b)) - 4.8) < 1e-9        # Length of shadow: 24 / 5 = 4.8

# Orthogonal projection onto c produces zero vector
assert np.allclose(proj(a, c), [0.0, 0.0])

# Residual vector (a - proj) is strictly orthogonal to b
residual = a - proj(a, b)
assert abs(dot(residual, b)) < 1e-9

print("All geometric assertions verified successfully.")`}
      </pre>

      <h2 className="font-sans font-bold text-lg text-black pt-4">
        Summary Takeaways
      </h2>

      <ul className="list-disc pl-5 space-y-2 text-sm">
        <li>
          <strong>Dot product is a physical shadow</strong>:{" "}
          <InlineMath math="\mathbf{u} \cdot \mathbf{v} = \|\mathbf{u}\|\,\|\mathbf{v}\|\cos\theta" />.
          Orthogonal vectors (<InlineMath math="\mathbf{u} \cdot \mathbf{v} = 0" />) cast zero shadow and share zero mutual information.
        </li>
        <li>
          <strong>Unit normalization guarantees equivalence</strong>: Under L2 normalization,{" "}
          <InlineMath math="\|\mathbf{u} - \mathbf{v}\| = \sqrt{2 - 2\cos(\mathbf{u}, \mathbf{v})}" />.
          Ranking by minimum Euclidean distance and maximum cosine similarity produces identical results.
        </li>
        <li>
          <strong>PostgreSQL index scans require ASC</strong>: <code>pgvector</code>&apos;s{" "}<code>&lt;#&gt;</code>{" "}
          operator returns <InlineMath math="-(\mathbf{u} \cdot \mathbf{v})" />{" "}to enable index traversal for maximum similarity using ascending scans.
        </li>
        <li>
          <strong>Watch for anisotropy</strong>: Cosine matches statistical correlation only when centered at zero.
          Uncentered manifolds cause similarity scores to cluster artificially near 1.0, which can be diagnosed and
          rectified by corpus mean-centering.
        </li>
      </ul>
    </div>
  ),
};

export default post;
