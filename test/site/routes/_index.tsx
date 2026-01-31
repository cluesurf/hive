import type { MetaFunction } from '@remix-run/node'
import { Link } from '@remix-run/react'

export const meta: MetaFunction = () => {
  return [
    { title: '@cluesurf/hive Test Site' },
    {
      name: 'description',
      content:
        'Visual testing for hyperbolic, spherical, and Euclidean geometry',
    },
  ]
}

export default function Index() {
  return (
    <div className="min-h-screen p-8">
      <header className="max-w-4xl mx-auto mb-12">
        <h1 className="text-4xl font-bold mb-4">@cluesurf/hive</h1>
        <p className="text-gray-400">
          Visual testing for hyperbolic, spherical, and Euclidean geometry
          visualizations.
        </p>
      </header>

      <main className="max-w-4xl mx-auto space-y-12">
        <section>
          <h2 className="text-2xl font-semibold text-gray-200 mb-4">
            Hyperbolic 2D Tilings
          </h2>
          <p className="text-gray-500 mb-6">
            Regular tilings {'{p,q}'} where (p-2)(q-2) {'>'} 4
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <TilingLink p={7} q={3} label="Heptagonal" />
            <TilingLink p={5} q={4} label="Pentagonal" />
            <TilingLink p={6} q={4} label="Hexagonal" />
            <TilingLink p={8} q={3} label="Octagonal" />
            <TilingLink p={4} q={5} label="Square" />
            <TilingLink p={3} q={7} label="Triangular" />
            <TilingLink p={5} q={5} label="Order-5 pentagonal" />
            <TilingLink p={4} q={6} label="Order-6 square" />
            <TilingLink p={3} q={8} label="Order-8 triangular" />
            <TilingLink p={7} q={4} label="Order-4 heptagonal" />
            <TilingLink p={6} q={6} label="Order-6 hexagonal" />
            <TilingLink p={8} q={4} label="Order-4 octagonal" />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-200 mb-4">
            Coming Soon
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ComingSoonCard title="Spherical 2D" description="Platonic solids projected to sphere" />
            <ComingSoonCard title="Euclidean 2D" description="Regular plane tilings" />
            <ComingSoonCard title="Hyperbolic 3D" description="Honeycomb structures" />
            <ComingSoonCard title="Kaleidoscopes" description="Triangle group patterns" />
            <ComingSoonCard title="Fractals" description="Limit sets and IFS" />
          </div>
        </section>
      </main>
    </div>
  )
}

function TilingLink({
  p,
  q,
  label,
}: {
  p: number
  q: number
  label: string
}) {
  return (
    <Link
      to={`/hyperbolic/2d/${p}/${q}`}
      className="block p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-600 hover:bg-gray-800 transition-colors"
    >
      <span className="text-xl font-mono text-blue-400">
        {'{'}
        {p},{q}
        {'}'}
      </span>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </Link>
  )
}

function ComingSoonCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800 opacity-50">
      <span className="text-lg text-gray-400">{title}</span>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </div>
  )
}
