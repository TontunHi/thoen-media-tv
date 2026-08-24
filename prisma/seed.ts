import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'signage.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
    },
  })

  console.log('Admin user created:', admin.username)

  // Check if default playlist exists
  const existingPlaylist = await prisma.playlist.findFirst({
    where: { isDefault: true },
  })

  if (!existingPlaylist) {
    const defaultPlaylist = await prisma.playlist.create({
      data: {
        name: 'Playlist เริ่มต้น',
        isDefault: true,
        description: 'Default system playlist',
      },
    })
    console.log('Default playlist created:', defaultPlaylist.name)
  } else {
    console.log('Default playlist already exists:', existingPlaylist.name)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
