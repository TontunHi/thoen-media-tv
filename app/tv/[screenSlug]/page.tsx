import prisma from '@/lib/db'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import TVPlayer from '@/components/tv/TVPlayer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  }
}

export default async function TVDisplayPage({ params }: { params: Promise<{ screenSlug: string }> }) {
  const { screenSlug } = await params

  const screen = await prisma.screen.findUnique({
    where: { slug: screenSlug },
    include: {
      playlist: {
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: { mediaItem: true }
          }
        }
      }
    }
  })

  if (!screen) {
    notFound()
  }

  prisma.screen.update({
    where: { id: screen.id },
    data: { lastPingAt: new Date() }
  }).catch(console.error)

  const rawItems = screen.playlist?.items || []
  
  const formattedItems = rawItems.map(item => ({
    id: item.id,
    duration: item.customDuration || item.mediaItem.defaultDuration || 10,
    media: {
      id: item.mediaItem.id,
      url: `/api/media/${item.mediaItem.filename}`,
      type: item.mediaItem.type.toLowerCase() as 'image' | 'video'
    }
  }))

  return (
    <div className="tv-fullscreen">
      <TVPlayer 
        screenSlug={screenSlug} 
        screenName={screen.name}
        initialItems={formattedItems} 
        isLooping={screen.loop}
      />
    </div>
  )
}
