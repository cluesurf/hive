import type { MetaFunction } from '@remix-run/node'
import { Link } from '@remix-run/react'

export const meta: MetaFunction = () => {
  return [
    { title: '@cluesurf/hive Test Site' },
    {
      name: 'description',
      content: 'Visual testing for hyperbolic, spherical, and Euclidean geometry',
    },
  ]
}

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">@cluesurf/hive</h1>
      <p className="text-gray-400 mb-12 max-w-lg text-center">
        Visual testing for hyperbolic, spherical, and Euclidean geometry
        visualizations.
      </p>

      <div className="grid gap-4 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-300">
          Hyperbolic Tilings
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <TilingLink p={7} q={3} />
          <TilingLink p={5} q={4} />
          <TilingLink p={6} q={4} />
          <TilingLink p={8} q={3} />
          <TilingLink p={4} q={5} />
          <TilingLink p={3} q={7} />
        </div>
      </div>
    </div>
  )
}

function TilingLink({ p, q }: { p: number; q: number }) {
  return (
    <Link
      to={`/hyperbolic/2d/{${p},${q}}`}
      className="block p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors text-center"
    >
      <span className="text-lg font-mono">
        {'{'}
        {p},{q}
        {'}'}
      </span>
      <p className="text-sm text-gray-500 mt-1">
        {p}-gons, {q} per vertex
      </p>
    </Link>
  )
}
