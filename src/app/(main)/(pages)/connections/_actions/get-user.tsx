'use server'

export const getUserData = async (id: string) => {
  const { db } = await import('@/lib/db')

  return db.user.findUnique({
    where: {
      clerkId: id,
    },
    include: {
      connections: true,
    },
  })
}
