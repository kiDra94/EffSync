import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const commentsApi = vi.hoisted(() => ({
  taskCommentsApi: {
    getComments: vi.fn(),
    createComment: vi.fn(),
    getGradeRemarks: vi.fn(),
    createGradeRemark: vi.fn(),
  },
}))
vi.mock('@/api/taskComments', () => commentsApi)

import { useTaskCommentStore } from './taskCommentStore'

const api = commentsApi.taskCommentsApi

// T09, T74, decision Q16 (M27): comments and grading remarks of a task
describe('taskCommentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('hands over the comments and a new comment', async () => {
    api.getComments.mockResolvedValue({ data: [{ comment_id: 1, content: 'Hallo' }] })
    api.createComment.mockResolvedValue({ data: { comment_id: 2, content: 'Hi @ffuchs' } })
    const store = useTaskCommentStore()

    expect(await store.fetchComments(7)).toEqual([{ comment_id: 1, content: 'Hallo' }])
    expect(await store.addComment(7, 'Hi @ffuchs')).toEqual({ comment_id: 2, content: 'Hi @ffuchs' })
    expect(api.getComments).toHaveBeenCalledWith(7)
    expect(api.createComment).toHaveBeenCalledWith(7, 'Hi @ffuchs')
  })

  it('hands over the grading remarks and a new remark', async () => {
    api.getGradeRemarks.mockResolvedValue({ data: [{ comment_id: 3, text: 'Gut' }] })
    api.createGradeRemark.mockResolvedValue({ data: { comment_id: 4, text: 'Sehr gut' } })
    const store = useTaskCommentStore()

    expect(await store.fetchGradeRemarks(7)).toEqual([{ comment_id: 3, text: 'Gut' }])
    expect(await store.addGradeRemark(7, 'Sehr gut')).toEqual({ comment_id: 4, text: 'Sehr gut' })
    expect(api.createGradeRemark).toHaveBeenCalledWith(7, 'Sehr gut')
  })
})
