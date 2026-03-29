import { useState } from 'react'

import type { CollabPendingReview } from '../realtime/useCollaboration'

type CollabPanelProps = {
  serverUrl: string
  onServerUrlChange: (url: string) => void
  canCreateRoom: boolean
  officialForRoom: { workspaceId?: string; documentTitle?: string } | null
  status: 'idle' | 'connecting' | 'in_room'
  error: string | null
  onClearError: () => void
  roomId: string | null
  role: 'owner' | 'editor' | null
  members: { id: string; name: string; role: string }[]
  pendingReviews: CollabPendingReview[]
  onCreateRoom: (displayName: string) => void
  onJoinRoom: (code: string, displayName: string) => void
  onDisconnect: () => void
  onStartReview: (review: CollabPendingReview) => void
  activeRemoteReviewId: string | null
  onCancelRemoteReview: () => void
  /** Editors: submit working copy so the official owner can review (same action as “Submit to owner” in Next steps). */
  onSubmitToOwner?: () => void
  editorSubmitToOwnerEnabled?: boolean
}

export function CollabPanel({
  serverUrl,
  onServerUrlChange,
  canCreateRoom,
  officialForRoom,
  status,
  error,
  onClearError,
  roomId,
  role,
  members,
  pendingReviews,
  onCreateRoom,
  onJoinRoom,
  onDisconnect,
  onStartReview,
  activeRemoteReviewId,
  onCancelRemoteReview,
  onSubmitToOwner,
  editorSubmitToOwnerEnabled = false,
}: CollabPanelProps) {
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const inRoom = status === 'in_room'

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live collaboration</h3>
        <p className="mt-1 text-[11px] leading-snug text-gray-500">
          MVP: up to 3 people per room. The host owns the official document; editors can branch, then send for review.
          Run the server with <code className="rounded bg-gray-100 px-0.5">npm run collab</code>.
        </p>
      </div>

      <label className="block text-[11px] font-medium text-gray-600">
        Server URL
        <input
          type="url"
          value={serverUrl}
          onChange={(e) => onServerUrlChange(e.target.value)}
          disabled={inRoom}
          className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900 disabled:bg-gray-100"
        />
      </label>

      {!inRoom ? (
        <>
          <label className="block text-[11px] font-medium text-gray-600">
            Your name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900"
            />
          </label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={!canCreateRoom || !name.trim() || status === 'connecting'}
              title={!canCreateRoom ? 'Open a document first' : undefined}
              onClick={() => onCreateRoom(name.trim())}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-left text-xs font-semibold text-white shadow-sm hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Create session (you = official owner)
            </button>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Room code"
                maxLength={8}
                className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1.5 font-mono text-xs uppercase"
              />
              <button
                type="button"
                disabled={!joinCode.trim() || !name.trim() || status === 'connecting'}
                onClick={() => onJoinRoom(joinCode.trim(), name.trim())}
                className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
          {officialForRoom ? (
            <p className="text-[10px] text-gray-400">
              Host syncs: {officialForRoom.documentTitle ?? 'Document'} · workspace {officialForRoom.workspaceId?.slice(0, 8)}…
            </p>
          ) : null}
        </>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
          <p className="font-semibold text-emerald-950">
            Connected · {role === 'owner' ? 'Official owner' : 'Editor'}
          </p>
          <p className="mt-1 font-mono text-sm font-bold tracking-wider text-emerald-900">{roomId}</p>
          <p className="mt-1 text-[11px] text-emerald-800">Share this code with up to two collaborators.</p>
          <button
            type="button"
            onClick={() => {
              if (roomId) void navigator.clipboard.writeText(roomId)
            }}
            className="mt-2 text-[11px] font-semibold text-emerald-900 underline"
          >
            Copy code
          </button>
          <ul className="mt-2 space-y-1 border-t border-emerald-200/80 pt-2 text-[11px] text-emerald-900">
            {members.map((m) => (
              <li key={m.id}>
                {m.name} <span className="text-emerald-700">({m.role})</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onDisconnect}
            className="mt-3 w-full rounded-md border border-red-200 bg-white py-1.5 text-[11px] font-semibold text-red-800 hover:bg-red-50"
          >
            Leave session
          </button>
        </div>
      )}

      {inRoom && role === 'editor' && onSubmitToOwner ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-950">Send to official owner</p>
          <p className="mt-1 text-[10px] leading-snug text-indigo-900">
            Submit your <strong>working copy</strong> for review. The official owner sees it under Incoming reviews and decides
            which changes become the new official document.
          </p>
          <button
            type="button"
            onClick={onSubmitToOwner}
            disabled={!editorSubmitToOwnerEnabled}
            className="mt-3 w-full rounded-lg bg-indigo-700 px-3 py-2.5 text-left text-xs font-bold text-white shadow-sm hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            Submit working copy to owner
          </button>
          {!editorSubmitToOwnerEnabled ? (
            <p className="mt-2 text-[10px] text-indigo-800">
              Use <strong>Start working</strong> below, edit the contract, then submit here.
            </p>
          ) : null}
        </div>
      ) : null}

      {role === 'owner' && inRoom && pendingReviews.length > 0 ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-900">Incoming reviews</p>
          <ul className="mt-2 space-y-2">
            {pendingReviews.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-violet-100 bg-white px-2 py-2">
                <div>
                  <p className="text-xs font-medium text-gray-900">{r.fromName}</p>
                  <p className="text-[10px] text-gray-500">{new Date(r.submittedAt).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onStartReview(r)}
                  className="rounded-md bg-violet-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-800"
                >
                  {activeRemoteReviewId === r.id ? 'Reviewing…' : 'Review'}
                </button>
              </li>
            ))}
          </ul>
          {activeRemoteReviewId ? (
            <button
              type="button"
              onClick={onCancelRemoteReview}
              className="mt-2 text-[11px] font-semibold text-violet-900 underline"
            >
              Cancel review mode
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-2 py-2 text-[11px] text-red-900">
          {error}
          <button type="button" onClick={onClearError} className="ml-2 font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  )
}
