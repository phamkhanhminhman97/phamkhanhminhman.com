import type { BlogPost } from "../types";

const post: BlogPost = {
    slug: "ecommerce-sdk-monorepo",
    date: "2026-03-28",
    category: "Architecture",
    title: "Building an e-commerce SDK monorepo with npm workspaces",
    readTime: "6 min read",
    description: "Managing a multi-package project, keeping versions in sync, and streamlining releases with Changesets.",
    content: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          I maintain three API clients for Vietnamese marketplaces — Shopee, TikTok Shop
          and Lazada — plus a fourth package that bundles all three for people who
          integrate more than one platform. They started life as separate repositories,
          which felt like the tidy choice for about as long as it took to fix the first bug
          in two places.
        </p>
        <p>
          The cost was never dramatic, just constant. The same TypeScript, ESLint and build
          configuration existed three times and slowly drifted apart, so a rule I tightened
          in one client kept quietly failing to apply to the others. Worse, the all-in-one
          package depends on the three clients, and there was no honest way to test a change
          against it without <code>npm link</code> and a lot of hoping. Pulling everything
          into one repository with <strong>npm workspaces</strong> fixed the second problem
          on day one: the wrapper now resolves its dependencies from the same working tree,
          so a change in a client is visible to it immediately. It also created one new
          problem, which is most of what this post is about.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. Declaring the workspaces</h3>
        <p>
          The root <code>package.json</code> is not published. Its only jobs are to point
          npm at the packages directory and to hold the tooling everything shares:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`{
  "name": "shopee-tiktok-lazada-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "devDependencies": {
    "@changesets/cli": "^2.31.0"
  }
}`}
        </pre>
        <p>
          One <code>npm install</code> at the root now installs every package, and the three
          clients get symlinked into the all-in-one package&apos;s{" "}
          <code>node_modules</code> instead of being downloaded from the registry. The tree
          is deliberately flat:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`shopee-tiktok-lazada-monorepo/
├── package.json
├── packages/
│   ├── shopee-api-client/       # Shopee SDK
│   ├── tiktokshops-api-client/  # TikTok Shop SDK
│   ├── lazada-api-client/       # Lazada SDK
│   └── shopee-tiktokshops-lazada-api/ # the all-in-one wrapper
└── scripts/
    └── sync-all-in-one-deps.cjs # keeps the wrapper's dependency ranges honest`}
        </pre>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. The dependency ranges that lie to you locally</h3>
        <p>
          Here is the new problem workspaces introduced. The all-in-one package lists the
          three clients in its <code>dependencies</code> with real semver ranges, but npm
          satisfies them from the local symlinks regardless of what those ranges say. So if
          I bump <code>shopee-api-client</code> to 4.2.0 and forget to update the wrapper,
          everything still builds, every test still passes, and the mistake is invisible to
          me. It only becomes real for someone installing the wrapper from npm, who gets a
          version of the Shopee client that predates the fix they upgraded for.
        </p>
        <p>
          That failure mode — silent locally, broken only for users — is exactly the kind
          that deserves a script rather than discipline. <code>sync-all-in-one-deps.cjs</code>{" "}
          reads the current version out of each client&apos;s <code>package.json</code> and
          writes it back into the wrapper&apos;s dependencies as a caret range:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`# rewrite the wrapper's dependencies, then refresh the lockfile
npm run sync-all-in-one-deps

# same comparison, but exits 1 instead of writing — this is the CI gate
npm run check-all-in-one-deps`}
        </pre>
        <p>
          The <code>--check</code> mode is the half that matters. Running the sync by hand
          is still something I can forget; running it in CI turns &ldquo;the wrapper points
          at stale versions&rdquo; into a failed build on the pull request that caused it.
          The script also takes <code>--bump patch|minor|major</code> so releasing the
          wrapper is one command, and every mode is followed by{" "}
          <code>npm install --package-lock-only</code> so the lockfile never disagrees with
          the manifests it was generated from.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. Releases with Changesets</h3>
        <p>
          Four packages that version independently means every release used to be a small
          act of bookkeeping: decide which packages actually changed, pick a bump for each,
          write the changelog entries from memory, publish in dependency order.{" "}
          <strong>Changesets</strong> moves all of that to the moment I still remember why I
          made the change — while writing the feature, not while releasing it.
        </p>
        <div className="bg-white border border-zinc-200 p-5 rounded-lg shadow-2xs font-sans text-xs space-y-3">
          <p className="font-bold text-zinc-800">The three commands, in the order they get used:</p>
          <ul className="list-disc pl-4 space-y-1 text-zinc-600">
            <li><strong>npx changeset:</strong> run alongside the feature, not after it. The CLI asks which packages changed, what kind of bump each one needs, and for a one-line summary. That answer is committed as a markdown file in the pull request, so the bump is reviewed like any other code.</li>
            <li><strong>npx changeset version:</strong> run at release time. It consumes every pending changeset file, applies the version bumps across the affected <code>package.json</code> files, and appends the summaries to each <code>CHANGELOG.md</code>. Nothing is written by hand.</li>
            <li><strong>changeset publish:</strong> builds first, then pushes only the packages whose versions are ahead of the registry. Publishing a package that has not changed simply cannot happen by accident.</li>
          </ul>
        </div>
        <p>
          The practical difference is that the changelog stopped being an archaeology
          exercise. It is assembled from notes written by the person who made each change,
          at the time they made it.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. What it is actually worth</h3>
        <p>
          The monorepo did not make any individual SDK better. What it changed is the cost
          of a cross-package change: shared configuration lives in one place and cannot
          drift, a fix in a client is testable against the wrapper before it ships, and the
          two things I used to get wrong — stale dependency ranges and hand-written
          changelogs — are now a CI check and a command respectively.
        </p>
        <p>
          The part worth stealing is not the folder layout. It is that npm workspaces
          hides a specific class of mistake from you locally, so anything a workspace
          setup makes invisible needs a check that runs where you cannot ignore it.
        </p>
      </div>
    ),
};

export default post;
