import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import type { DocumentModel } from '../document'

export type CollabMember = { id: string; name: string; role: 'owner' | 'editor' }
export type CollabPendingReview = {
  id: string
  fromSocketId: string
  fromName: string
  workspaceId: string
  submittedAt: string
  workingDocument: DocumentModel
}

export type CollabSnapshot = {
  official: DocumentModel
  pendingReviews: CollabPendingReview[]
  members: CollabMember[]
}

export function useCollaboration(opts: {
  serverUrl: string
  /** Fires when the shared official version changes (remote owner merge or room snapshot). */
  onOfficialUpdated?: (official: DocumentModel) => void
  /** First payload after joining as an editor — replace local docs with the room’s official. */
  onJoinedAsEditor?: (snap: CollabSnapshot & { roomId: string }) => void
  onRoomClosed?: (reason: string) => void
}) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  const [status, setStatus] = useState<'idle' | 'connecting' | 'in_room'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [role, setRole] = useState<'owner' | 'editor' | null>(null)
  const [members, setMembers] = useState<CollabMember[]>([])
  const [pendingReviews, setPendingReviews] = useState<CollabPendingReview[]>([])

  const socketRef = useRef<Socket | null>(null)

  const tearDownSocket = useCallback(() => {
    const s = socketRef.current
    if (s) {
      s.removeAllListeners()
      s.disconnect()
      socketRef.current = null
    }
  }, [])

  const disconnectCollab = useCallback(() => {
    tearDownSocket()
    setStatus('idle')
    setRoomId(null)
    setRole(null)
    setMembers([])
    setPendingReviews([])
    setError(null)
  }, [tearDownSocket])

  const attachCoreListeners = useCallback(
    (socket: Socket) => {
      socket.on('connect_error', (err) => {
        setError(err.message || 'Could not connect')
        setStatus('idle')
        tearDownSocket()
      })
      socket.on('room_error', (p: { message: string }) => {
        setError(p.message)
        setStatus('idle')
        tearDownSocket()
      })
      socket.on('official_updated', (p: { official: DocumentModel }) => {
        optsRef.current.onOfficialUpdated?.(p.official)
      })
      socket.on('pending_reviews', (p: { reviews: CollabPendingReview[] }) => {
        setPendingReviews(p.reviews)
      })
      socket.on('room_snapshot', (snap: CollabSnapshot) => {
        setMembers(snap.members)
        setPendingReviews(snap.pendingReviews)
        optsRef.current.onOfficialUpdated?.(snap.official)
      })
      socket.on('room_closed', (p: { reason: string }) => {
        optsRef.current.onRoomClosed?.(p.reason)
        tearDownSocket()
        setStatus('idle')
        setRoomId(null)
        setRole(null)
        setMembers([])
        setPendingReviews([])
      })
    },
    [tearDownSocket],
  )

  const createRoom = useCallback(
    (displayName: string, official: DocumentModel) => {
      tearDownSocket()
      setError(null)
      setStatus('connecting')
      const socket = io(optsRef.current.serverUrl, { transports: ['websocket', 'polling'] })
      socketRef.current = socket
      attachCoreListeners(socket)

      socket.once('room_created', (p: CollabSnapshot & { roomId: string }) => {
        setRoomId(p.roomId)
        setRole('owner')
        setMembers(p.members)
        setPendingReviews(p.pendingReviews)
        setStatus('in_room')
      })

      socket.once('connect', () => {
        socket.emit('create_room', { displayName, official })
      })
      socket.connect()
    },
    [attachCoreListeners, tearDownSocket],
  )

  const joinRoom = useCallback(
    (code: string, displayName: string) => {
      tearDownSocket()
      setError(null)
      setStatus('connecting')
      const socket = io(optsRef.current.serverUrl, { transports: ['websocket', 'polling'] })
      socketRef.current = socket
      attachCoreListeners(socket)

      socket.once('room_joined', (p: CollabSnapshot & { roomId: string }) => {
        setRoomId(p.roomId)
        setRole('editor')
        setMembers(p.members)
        setPendingReviews(p.pendingReviews)
        setStatus('in_room')
        optsRef.current.onJoinedAsEditor?.({ ...p, roomId: p.roomId })
      })

      socket.once('connect', () => {
        socket.emit('join_room', { roomId: code, displayName })
      })
      socket.connect()
    },
    [attachCoreListeners, tearDownSocket],
  )

  const pushOfficial = useCallback((official: DocumentModel) => {
    socketRef.current?.emit('official_push', { official })
  }, [])

  const submitReview = useCallback((workspaceId: string, workingDocument: DocumentModel) => {
    socketRef.current?.emit('submit_collab_review', { workspaceId, workingDocument })
  }, [])

  const resolveReview = useCallback((reviewId: string, mergedOfficial: DocumentModel) => {
    socketRef.current?.emit('owner_resolve_review', { reviewId, mergedOfficial })
  }, [])

  useEffect(() => () => tearDownSocket(), [tearDownSocket])

  return {
    status,
    error,
    roomId,
    role,
    members,
    pendingReviews,
    createRoom,
    joinRoom,
    disconnectCollab,
    pushOfficial,
    submitReview,
    resolveReview,
    clearError: () => setError(null),
  }
}
