'use client'

import { createContext, useContext } from 'react'

export interface WorkspaceCtx {
  workspaceId: string
  orgId: string
}

export const WorkspaceContext = createContext<WorkspaceCtx>({
  workspaceId: process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? '',
  orgId: process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? '',
})

export function useWorkspace(): WorkspaceCtx {
  return useContext(WorkspaceContext)
}
