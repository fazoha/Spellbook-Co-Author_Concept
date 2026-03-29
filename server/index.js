import http from 'http'
import { randomUUID } from 'crypto'
import { Server } from 'socket.io'

const PORT = Number(process.env.PORT) || 3030
const MAX_MEMBERS = 3

/** @typedef {{ socketId: string, displayName: string, role: 'owner' | 'editor' }} Member */
/** @typedef {{ id: string, fromSocketId: string, fromName: string, workspaceId: string, submittedAt: string, workingDocument: object }} PendingReview */

/** @type {Map<string, { id: string, official: object, ownerSocketId: string, members: Member[], pendingReviews: PendingReview[] }>} */
const rooms = new Map()

function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function publicMembers(room) {
  return room.members.map((m) => ({
    id: m.socketId,
    name: m.displayName,
    role: m.role,
  }))
}

function cloneDoc(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function snapshot(room) {
  return {
    official: room.official,
    pendingReviews: room.pendingReviews,
    members: publicMembers(room),
  }
}

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Spellbook collaboration server')
})

const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
})

io.on('connection', (socket) => {
  socket.on('create_room', ({ displayName, official }) => {
    if (!displayName || typeof displayName !== 'string') {
      socket.emit('room_error', { message: 'Enter your name' })
      return
    }
    if (!official?.workspaceId) {
      socket.emit('room_error', { message: 'Invalid document' })
      return
    }
    let roomId = genRoomCode()
    while (rooms.has(roomId)) roomId = genRoomCode()

    const room = {
      id: roomId,
      official: cloneDoc(official),
      ownerSocketId: socket.id,
      members: [{ socketId: socket.id, displayName: displayName.trim().slice(0, 60), role: 'owner' }],
      pendingReviews: [],
    }
    rooms.set(roomId, room)
    socket.join(roomId)
    socket.data.roomId = roomId
    socket.data.role = 'owner'

    socket.emit('room_created', {
      roomId,
      role: 'owner',
      ...snapshot(room),
    })
  })

  socket.on('join_room', ({ roomId: rawCode, displayName }) => {
    const roomId = String(rawCode ?? '')
      .trim()
      .toUpperCase()
    if (!displayName || typeof displayName !== 'string') {
      socket.emit('room_error', { message: 'Enter your name' })
      return
    }
    const room = rooms.get(roomId)
    if (!room) {
      socket.emit('room_error', { message: 'Unknown room code' })
      return
    }
    if (room.members.length >= MAX_MEMBERS) {
      socket.emit('room_error', { message: 'Room is full (max 3 people for this MVP)' })
      return
    }
    if (room.members.some((m) => m.socketId === socket.id)) return

    room.members.push({
      socketId: socket.id,
      displayName: displayName.trim().slice(0, 60),
      role: 'editor',
    })
    socket.join(roomId)
    socket.data.roomId = roomId
    socket.data.role = 'editor'

    socket.emit('room_joined', {
      roomId,
      role: 'editor',
      ...snapshot(room),
    })
    io.to(roomId).emit('room_snapshot', snapshot(room))
  })

  socket.on('official_push', ({ official }) => {
    const roomId = socket.data.roomId
    const room = roomId ? rooms.get(roomId) : null
    if (!room || socket.id !== room.ownerSocketId) return
    if (!official?.workspaceId) return
    room.official = cloneDoc(official)
    socket.to(roomId).emit('official_updated', { official: room.official })
  })

  socket.on('submit_collab_review', ({ workspaceId, workingDocument }) => {
    const roomId = socket.data.roomId
    const room = roomId ? rooms.get(roomId) : null
    if (!room || socket.id === room.ownerSocketId) return
    if (!workspaceId || !workingDocument?.sections) return

    const member = room.members.find((m) => m.socketId === socket.id)
    if (!member) return

    const review = {
      id: randomUUID(),
      fromSocketId: socket.id,
      fromName: member.displayName,
      workspaceId,
      submittedAt: new Date().toISOString(),
      workingDocument: cloneDoc(workingDocument),
    }
    // One pending review per editor per workspace (avoids duplicate client emits, e.g. React Strict Mode).
    room.pendingReviews = room.pendingReviews.filter(
      (r) => !(r.fromSocketId === socket.id && r.workspaceId === workspaceId),
    )
    room.pendingReviews.push(review)
    io.to(roomId).emit('pending_reviews', { reviews: room.pendingReviews })
  })

  socket.on('owner_resolve_review', ({ reviewId, mergedOfficial }) => {
    const roomId = socket.data.roomId
    const room = roomId ? rooms.get(roomId) : null
    if (!room || socket.id !== room.ownerSocketId) return
    room.pendingReviews = room.pendingReviews.filter((r) => r.id !== reviewId)
    if (mergedOfficial?.workspaceId) {
      room.official = cloneDoc(mergedOfficial)
    }
    io.to(roomId).emit('room_snapshot', snapshot(room))
  })

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room) return

    const wasOwner = socket.id === room.ownerSocketId
    room.members = room.members.filter((m) => m.socketId !== socket.id)
    room.pendingReviews = room.pendingReviews.filter((r) => r.fromSocketId !== socket.id)

    if (wasOwner || room.members.length === 0) {
      rooms.delete(roomId)
      io.to(roomId).emit('room_closed', { reason: wasOwner ? 'owner_left' : 'empty' })
      return
    }

    io.to(roomId).emit('room_snapshot', snapshot(room))
  })
})

httpServer.listen(PORT, () => {
  console.log(`[spellbook-collab] listening on :${PORT}`)
})
