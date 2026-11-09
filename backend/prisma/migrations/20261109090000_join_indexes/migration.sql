-- M30 (T87, 06_…:170, decision Q8h): indexes for the columns the main
-- queries join or filter on, chosen with EXPLAIN ANALYZE (PROGRESS.md M30).
-- Index-only: no table or data changes.

-- CreateIndex
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");

-- CreateIndex
CREATE INDEX "tasks_created_by_idx" ON "tasks"("created_by");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_idx" ON "tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "task_members_user_id_idx" ON "task_members"("user_id");

-- CreateIndex
CREATE INDEX "chat_messages_room_id_created_at_idx" ON "chat_messages"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "task_activity_log_task_id_idx" ON "task_activity_log"("task_id");

-- CreateIndex
CREATE INDEX "chat_room_users_user_id_idx" ON "chat_room_users"("user_id");
