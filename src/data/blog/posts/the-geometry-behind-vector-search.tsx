import React from "react";
import type { BlogPost } from "../types";

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

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`||a|| = sqrt(a_1^2 + a_2^2 + ... + a_d^2) = sqrt(dot(a, a))`}
      </pre>

      <p>
        When you compute the dot product between two vectors <code>u</code>{" "}and <code>v</code>:
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`u · v = u_1*v_1 + u_2*v_2 + ... + u_d*v_d = ||u|| * ||v|| * cos(theta)`}
      </pre>

      <p>
        The algebraic definition (sum of coordinate-wise products) equals the geometric formulation
        (lengths multiplied by the cosine of the enclosed angle <code>theta</code>).
        Geometrically, this represents a <strong>projection shadow</strong>:
      </p>

      <blockquote className="border-l-2 border-red-700 pl-4 text-zinc-700 italic my-4">
        Projecting vector <code>a</code>{" "}onto vector <code>b</code>{" "}is equivalent to dropping a perpendicular
        light source onto the line spanning <code>b</code>, and measuring the signed length of the shadow.
      </blockquote>

      <p>
        Dividing the dot product by <code>||b||</code> isolates the scalar length of the shadow:
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`scalar_shadow_length = (a · b) / ||b|| = ||a|| * cos(theta)`}
      </pre>

      <p>
        To obtain the shadow as a concrete vector in the exact direction of <code>b</code>,
        we multiply that length by the unit vector <code>b / ||b||</code>:
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`proj_b(a) = ((a · b) / ||b||) * (b / ||b||) = ( (a · b) / (b · b) ) * b`}
      </pre>

      <p>
        Notice why the denominator is <code>b · b = ||b||^2</code>: division by <code>||b||</code>{" "}occurs twice—once
        to isolate the shadow length, and once to normalize <code>b</code>{" "}into a unit vector.
      </p>

      <p>
        When two vectors are orthogonal (<code>a · b = 0</code>), the shadow length is exactly zero.
        In information theory and retrieval, <strong>orthogonality means zero shared information</strong>.
        Furthermore, the residual vector <code>r = a - proj_b(a)</code>{" "}is guaranteed to be strictly orthogonal
        to <code>b</code>: <code>dot(a - proj_b(a), b) = 0</code>.
      </p>

      <h2 className="font-sans font-bold text-lg text-black pt-4">
        2. Cosine Similarity vs. Euclidean Distance: The L2 Equivalence
      </h2>

      <p>
        Introductory machine learning tutorials often explain why retrieval uses cosine similarity rather
        than Euclidean distance with the following classic example:
      </p>

      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li>Query <code>q = (1, 0)</code>{" "}(short search for &quot;database&quot;)</li>
        <li>Document 1 <code>d1 = (1, 0)</code>{" "}(short article matching &quot;database&quot;)</li>
        <li>Document 2 <code>d2 = (10, 0)</code>{" "}(long article mentioning &quot;database&quot; ten times)</li>
      </ul>

      <p>
        Under Euclidean distance, <code>||q - d2|| = 9.0</code>{" "}appears distant, penalizing the longer article
        solely due to word repetition. Meanwhile, cosine similarity yields <code>1.0</code>{" "}for both, preserving
        semantic alignment regardless of length.
      </p>

      <p>
        However, in modern dense retrieval systems, <strong>every document and query embedding is normalized
        to unit length (L2 norm = 1.0)</strong> before indexing. Under unit normalization, Euclidean distance
        and cosine similarity are not different metrics—they are <strong>mathematically monotonic transforms</strong>:
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`||u - v||^2 = (u - v) · (u - v)
            = ||u||^2 + ||v||^2 - 2 * (u · v)
            = 1.0 + 1.0 - 2 * cos(u, v)
            = 2 - 2 * cos(u, v)`}
      </pre>

      <p>
        Because <code>||u - v|| = sqrt(2 - 2 * cos(u, v))</code>, minimizing Euclidean distance is strictly
        equivalent to maximizing cosine similarity:
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border border-zinc-200 my-2">
          <thead className="bg-zinc-100 text-zinc-700">
            <tr>
              <th className="p-2 border border-zinc-200 text-left">Angle theta</th>
              <th className="p-2 border border-zinc-200 text-right">Cosine Similarity</th>
              <th className="p-2 border border-zinc-200 text-right">Euclidean Distance ||u - v||</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border border-zinc-200">0° (identical)</td>
              <td className="p-2 border border-zinc-200 text-right font-bold text-green-700">1.0000</td>
              <td className="p-2 border border-zinc-200 text-right font-bold text-green-700">0.0000</td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-200">60°</td>
              <td className="p-2 border border-zinc-200 text-right">0.5000</td>
              <td className="p-2 border border-zinc-200 text-right">1.0000</td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-200">90° (orthogonal)</td>
              <td className="p-2 border border-zinc-200 text-right text-zinc-600">0.0000</td>
              <td className="p-2 border border-zinc-200 text-right text-zinc-600">1.4142 (sqrt(2))</td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-200">180° (opposite)</td>
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

      <h2 className="font-sans font-bold text-lg text-black pt-4">
        4. The Anisotropy Trap: When Cosine Always Returns 0.90
      </h2>

      <p>
        In <em>Mathematics for Machine Learning</em> (§6.4.6, p. 196), inner products are mapped directly to statistics:
        for random variables with zero expectation, the inner product <code>&lang;X, Y&rang; := Cov[X, Y]</code>{" "}satisfies
        all inner product axioms. Under zero-mean centering:
      </p>

      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li>Vector norm <code>||a||</code>{" "}corresponds to standard deviation <code>sigma</code></li>
        <li>Cosine similarity corresponds to Pearson correlation <code>corr(X, Y)</code></li>
        <li>Orthogonality corresponds to zero correlation (uncorrelated)</li>
        <li>Pythagorean theorem <code>||a + b||^2 = ||a||^2 + ||b||^2</code>{" "}corresponds to variance summation <code>V[X+Y] = V[X] + V[Y]</code></li>
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
          <strong>Dot product is a physical shadow</strong>: <code>u · v = ||u|| * ||v|| * cos(theta)</code>.
          Orthogonal vectors (<code>dot = 0</code>) cast zero shadow and share zero mutual information.
        </li>
        <li>
          <strong>Unit normalization guarantees equivalence</strong>: Under L2 normalization,
          <code>||u - v|| = sqrt(2 - 2 * cos(u, v))</code>. Ranking by minimum Euclidean distance and maximum
          cosine similarity produces identical results.
        </li>
        <li>
          <strong>PostgreSQL index scans require ASC</strong>: <code>pgvector</code>&apos;s{" "}<code>&lt;#&gt;</code>{" "}
          operator returns <code>-(u · v)</code>{" "}to enable index traversal for maximum similarity using ascending scans.
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
