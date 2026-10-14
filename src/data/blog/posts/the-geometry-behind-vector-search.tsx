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
          <em>3Blue1Brown: Essence of Linear Algebra</em>{" "}(Ch. 1 &amp; 9); Ethayarajh (2019);
          Timkey &amp; van Schijndel (2021).
        </p>
        <p className="mt-2">
          Every number and code block below was run by me: Python 3.9 with NumPy 2.0.2, and PostgreSQL 18.6 with
          pgvector 0.8.7 in Docker on an Apple-silicon Mac. Where I did not measure something, the text says so.
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
        the same ranking under unit normalization, and why vectors that share a large common offset can make every
        pair look alike (the <strong>anisotropy trap</strong>).
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
      <VectorProjectionDiagram cards={<VectorProjectionCards />} />

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
        The shadow length is exactly zero: <strong>no part of <InlineMath math="\mathbf{a}" />{" "}points along{" "}
        <InlineMath math="\mathbf{c}" /></strong>. That is a statement about direction only, not about information.
        Take <InlineMath math="x = (-1, 0, 1)" /> and <InlineMath math="y = x^2 = (1, 0, 1)" />: their dot product
        is 0 and so is their correlation, yet <InlineMath math="y" /> is fully determined by{" "}
        <InlineMath math="x" />.
      </p>

      <p>
        Dimension changes what &quot;nearly orthogonal&quot; means. For two independent random directions the cosine has
        a standard deviation of <InlineMath math="1/\sqrt{d}" />: about <InlineMath math="0.71" /> in 2D, but only{" "}
        <InlineMath math="1/\sqrt{768} \approx 0.036" /> in 768D. Unrelated random vectors therefore sit close to
        cosine 0 in high dimensions. That is the baseline for <em>isotropic random</em> vectors only. Real embedding
        spaces are not isotropic (section 4), so a useful similarity threshold has to be calibrated on your own corpus,
        not read off this baseline.
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
        semantic alignment regardless of length. That holds for raw, unnormalized vectors such as word counts. Once
        both documents are scaled to unit length they become the same point, and Euclidean distance gives 0 as well.
      </p>

      <p>
        Many embedding models return unit-length vectors (check your model&apos;s documentation); if yours does not,
        you can normalize it yourself before indexing. Once the query and the documents all have{" "}
        <InlineMath math="\|\mathbf{u}\| = 1" />, Euclidean distance and cosine similarity are not different metrics:
        one is a <strong>monotonic transform</strong> of the other.
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
        So on unit-length vectors, ranking by smallest Euclidean distance and by largest cosine similarity gives the
        same order in exact arithmetic. I checked this on random data, comparing the full top-10 lists for 50 queries
        against 10,000 documents in 768 dimensions:
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`import numpy as np

rng = np.random.default_rng(1)
D = rng.normal(size=(10_000, 768))   # 10,000 documents
Q = rng.normal(size=(50, 768))       # 50 queries

def top10(scores):                   # higher score = closer
    return np.argsort(-scores, axis=1)[:, :10]

def compare(Q, D, label):
    cos = (Q @ D.T) / np.outer(np.linalg.norm(Q, axis=1), np.linalg.norm(D, axis=1))
    l2 = np.sqrt((Q ** 2).sum(1)[:, None] + (D ** 2).sum(1)[None, :] - 2 * Q @ D.T)
    same = (top10(cos) == top10(-l2)).all(axis=1).sum()
    print(f"{label}: identical top-10 for {same}/50 queries")

compare(Q, D, "raw vectors    ")
Qn = Q / np.linalg.norm(Q, axis=1, keepdims=True)
Dn = D / np.linalg.norm(D, axis=1, keepdims=True)
compare(Qn, Dn, "unit-normalized")`}
      </pre>

      <p>Output:</p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`raw vectors    : identical top-10 for 0/50 queries
unit-normalized: identical top-10 for 50/50 queries`}
      </pre>

      <p>
        Two caveats. Floating-point ties can be ordered differently by different implementations, and approximate
        indexes such as HNSW return an approximation of this ranking, so what you measure there is recall, not identity.
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
        The pgvector README gives the reason: <code>&lt;#&gt;</code> returns the negative inner product because
        Postgres only supports ASC-order index scans on operators. The query therefore has to be{" "}
        <code>ORDER BY embedding &lt;#&gt; q ASC</code>, and the row with the <em>largest</em> inner product must have
        the <em>smallest</em> value. I checked the effect on PostgreSQL 18.6 with pgvector 0.8.7: with the HNSW index
        below, the ASC query uses an index scan, while <code>DESC</code> falls back to a sort over a sequential scan.
        The limit is specific to these operator index scans: a plain B-tree index serves{" "}
        <code>ORDER BY x DESC</code> with a backward scan.
      </p>

      <p>
        With unit-length vectors the cosine denominator <code>||u|| * ||v||</code> is 1, so cosine similarity equals the
        inner product and <code>(embedding &lt;#&gt; q) * -1</code> is the cosine similarity: over 2,000 random unit
        vectors the largest difference from <code>1 - (embedding &lt;=&gt; q)</code> was 6e-8. The flip side is that an
        index built with <code>vector_ip_ops</code> only ranks by cosine if you normalize at write time.
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

      <p>
        The plans for this query on 2,000 random unit vectors (trimmed).{" "}
        <code>Disabled: true</code> means the planner had no index path for <code>DESC</code> and used the only plan left
        even with sequential scans switched off:
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`ORDER BY embedding <#> q ASC LIMIT 10
 Limit
   ->  Index Scan using documents_embedding_hnsw_idx on documents
         Order By: (embedding <#> '[...]'::vector)

ORDER BY embedding <#> q DESC LIMIT 10        -- with enable_seqscan = off
 Limit
   ->  Sort
         ->  Seq Scan on documents
               Disabled: true

-- for comparison, a plain B-tree index on x:  ORDER BY x DESC LIMIT 5
 Limit
   ->  Index Only Scan Backward using t_x_idx on t`}
      </pre>

      <p>
        Does the simpler formula buy speed? On an exact scan I could not see it. With 20,000 rows of 768 dimensions and
        no index, a top-10 query took a median of about 20.4 ms with <code>&lt;#&gt;</code>, 20.9 ms with{" "}
        <code>&lt;=&gt;</code> and 21.2 ms with <code>&lt;-&gt;</code> (5 runs each, one worker, Docker on an
        Apple-silicon Mac). The gaps are inside run-to-run noise because the scan is bound by reading the vectors, not
        by the arithmetic. I did not measure HNSW or other hardware.
      </p>

      <h2 className="font-sans font-bold text-lg text-black pt-4">
        4. The Anisotropy Trap: When Every Pair Looks Similar
      </h2>

      <p>
        In <em>Mathematics for Machine Learning</em> (§6.4.6), inner products are mapped directly to statistics:
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
        This mapping holds <strong>only for centered variables</strong>. Cosine similarity ignores the mean of the data,
        so if every vector shares a large common offset, cosine stops behaving like a correlation and every pair
        looks similar. Ethayarajh (2019) and Timkey &amp; van Schijndel (2021) describe the practical form of this for
        contextual word embeddings in language models, under the names <strong>anisotropy</strong> and{" "}
        <strong>rogue dimensions</strong>: a few coordinates with very large magnitude and variance dominate the cosine. I
        only reproduce the mechanism on synthetic data below. I did not measure a real retrieval model, so I cannot
        tell you what range of cosine values to expect from yours.
      </p>

      <p>
        Take 2,000 independent random vectors in 64 dimensions, then shift one coordinate far from the origin and
        amplify it. This is a constructed example, not a model of any real embedding space:
      </p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`import numpy as np

def pairwise_cosine(E):
    En = E / np.linalg.norm(E, axis=1, keepdims=True)
    C = En @ En.T
    return C[np.triu_indices(len(E), k=1)]

def report(name, E):
    c = pairwise_cosine(E)
    print(f"{name:22s} mean={c.mean():+.4f}  std={c.std():.4f}  min={c.min():+.4f}  >0.90: {(c > 0.90).mean() * 100:.4f}%")

rng = np.random.default_rng(0)
E_clean = rng.normal(size=(2000, 64))          # independent coordinates
E_rogue = E_clean.copy()
E_rogue[:, 0] = (E_rogue[:, 0] + 12.0) * 3.0   # one dimension shifted and amplified

mu = E_rogue.mean(axis=0)
report("clean", E_clean)
report("rogue", E_rogue)
report("rogue, mean-centered", E_rogue - mu)
report("rogue, z-scored", (E_rogue - mu) / E_rogue.std(axis=0))`}
      </pre>

      <p>Output:</p>

      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`clean                  mean=-0.0000  std=0.1251  min=-0.5498  >0.90: 0.0000%
rogue                  mean=+0.9525  std=0.0098  min=+0.8845  >0.90: 99.9961%
rogue, mean-centered   mean=-0.0005  std=0.1527  min=-0.6931  >0.90: 0.0000%
rogue, z-scored        mean=-0.0005  std=0.1250  min=-0.5505  >0.90: 0.0000%`}
      </pre>

      <p>
        Out of 1,999,000 pairs of completely independent vectors, 99.9961% score above 0.90 (the smallest cosine is
        0.8845). The one shifted coordinate dominates every dot product. Subtracting the mean removes the effect in
        this example: no pair exceeds 0.90 and the spread of
        cosines (0.153) returns to the same order as the clean data (0.125). Dividing each coordinate by its standard
        deviation as well recovers the clean spread almost exactly (0.1250 against 0.1251).
      </p>

      <p>
        That is a recipe to <em>try</em> when scores look compressed, not a guarantee. Compute the mean on your own
        corpus, subtract it from <strong>both the documents and every query</strong>, normalize to unit length again,
        and then compare retrieval quality on questions you have labelled. Whether it helps a given model is an
        empirical question I have not tested.
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
assert abs(dot(a, c) - 0.0)  < 1e-9   # Orthogonal: the shadow has zero length
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
          <strong>The dot product measures how far one vector points along another</strong>:{" "}
          <InlineMath math="\mathbf{u} \cdot \mathbf{v} = \|\mathbf{u}\|\,\|\mathbf{v}\|\cos\theta" />.
          Zero means no component along the other vector. It does not mean the two are statistically independent.
        </li>
        <li>
          <strong>On unit-length vectors, Euclidean distance and cosine give the same ranking</strong>:{" "}
          <InlineMath math="\|\mathbf{u} - \mathbf{v}\| = \sqrt{2 - 2\cos(\mathbf{u}, \mathbf{v})}" />. I saw identical
          top-10 lists for 50 of 50 queries, and for 0 of 50 on the same data without normalizing. Approximate indexes
          return an approximation of that ranking.
        </li>
        <li>
          <strong>pgvector&apos;s <code>&lt;#&gt;</code> is negative so that the ASC index scan finds the largest inner product</strong>.
          I could not measure a speed difference between <code>&lt;#&gt;</code>, <code>&lt;=&gt;</code> and{" "}
          <code>&lt;-&gt;</code> on an exact scan; the three were within noise.
        </li>
        <li>
          <strong>Cosine compresses when all vectors share a large offset</strong>. On a synthetic example, subtracting the
          mean (from documents and queries, then re-normalizing) removed the effect. Whether it improves retrieval on a real
          model is something to test on your own labelled queries.
        </li>
      </ul>
    </div>
  ),
};

export default post;
