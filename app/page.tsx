import { MDXRemote } from 'next-mdx-remote/rsc'
import { Desktop } from '@/components/os/Desktop'
import type { OsData } from '@/components/os/types'
import { getDays, getStats } from '@/lib/content'
import { getAllEntries, getPage } from '@/lib/entries'

/**
 * Entry bodies are compiled here, on the server, and handed to the client
 * desktop as already-rendered nodes. That keeps the MDX toolchain server-side
 * while letting the window manager stay interactive.
 */
export default function Page() {
  const entries = getAllEntries()

  const rendered = entries.map(({ body, ...meta }) => ({
    ...meta,
    content: <MDXRemote source={body} />,
  }))

  const pageOf = (name: 'about' | 'roadmap' | 'readme') => {
    const { title, body } = getPage(name)
    return { title, content: <MDXRemote source={body} /> }
  }

  const data: OsData = {
    entries: rendered,
    days: getDays(entries),
    stats: getStats(entries),
    pages: {
      about: pageOf('about'),
      roadmap: pageOf('roadmap'),
      readme: pageOf('readme'),
    },
  }

  return (
    <div className="page-shell">
      <div className="monitor">
        <div className="monitor-screen">
          <Desktop data={data} />
        </div>
      </div>
    </div>
  )
}
