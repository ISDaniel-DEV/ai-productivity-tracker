package com.isdanieldev.aiproductivitytracker.notebook;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class NotebookDtos {
    private NotebookDtos() {}
    public record GoalInput(@NotBlank @Size(max=180) String title,
        @NotBlank @Pattern(regexp="week|month") String period,
        @NotBlank @Size(max=10) String periodKey, @Size(max=100) String parentId,
        @NotBlank @Pattern(regexp="[a-fA-F0-9-]{36}") String requestKey) {}
    public record TaskInput(@NotBlank @Size(max=240) String title, @NotNull LocalDate dueDate,
        @Size(max=50) String time, @Size(max=100) String weeklyGoalId,
        @NotBlank @Pattern(regexp="[a-fA-F0-9-]{36}") String requestKey) {}
    public record NoteInput(@NotBlank @Pattern(regexp="idea|note") String kind,
        @NotBlank @Size(max=180) String title, @Size(max=6000) String body,
        @NotBlank @Pattern(regexp="topic|project|none") String categoryType,
        @Size(max=80) String category,
        @NotBlank @Pattern(regexp="[a-fA-F0-9-]{36}") String requestKey) {}
    public record TaskEditInput(@NotBlank @Size(max=240) String title, @NotNull LocalDate dueDate,
        @Size(max=50) String time, @Size(max=100) String weeklyGoalId) {}
    public record GoalDeleteInput(@NotBlank @Pattern(regexp="[a-f0-9]{64}") String confirmationToken,
        @NotBlank @Pattern(regexp="Eliminar") String confirmationText) {}
    public record GoalDeletionView(String id, String title, List<String> goalIds, List<Long> taskIds, String confirmationToken) {}
    public record GoalDeletionResult(List<String> goalIds, List<Long> taskIds) {}
    public record DoneInput(@NotNull Boolean done) {}
    public record GoalView(String id, String title, String period, String periodKey, String parentId) {}
    public record TaskView(Long id, String title, String time, String project, String color,
        boolean done, LocalDate dueDate, String weeklyGoalId) {}
    public record NoteView(String id, String kind, String title, String body,
        String categoryType, String category, Instant createdAt) {}
    public record NotebookView(List<TaskView> tasks, List<GoalView> goals, List<NoteView> notes) {}

    public record LegacyGoal(@NotBlank @Size(max=100) String id, @NotBlank @Size(max=180) String title,
        @NotBlank @Pattern(regexp="week|month") String period, @NotBlank @Size(max=10) String periodKey,
        @Size(max=100) String parentId) {}
    public record LegacyTask(@NotNull Long id, @NotBlank @Size(max=240) String title,
        @NotNull LocalDate dueDate, @Size(max=50) String time,
        @Size(max=100) String project, @Size(max=30) String color, boolean done,
        @Size(max=100) String weeklyGoalId) {}
    public record LegacyNote(@NotBlank @Size(max=100) String id,
        @NotBlank @Pattern(regexp="idea|note") String kind, @NotBlank @Size(max=180) String title,
        @Size(max=6000) String body, @NotBlank @Pattern(regexp="topic|project|none") String categoryType,
        @Size(max=80) String category, @NotNull Instant createdAt) {}
    public record ImportInput(@NotBlank @Pattern(regexp="[a-f0-9]{64}") String importKey,
        @NotNull @Size(max=5000) List<@NotNull @Valid LegacyGoal> goals,
        @NotNull @Size(max=10000) List<@NotNull @Valid LegacyTask> tasks,
        @NotNull @Size(max=10000) List<@NotNull @Valid LegacyNote> notes) {}
    public record ImportResult(boolean alreadyImported, int tasks, int goals, int notes) {}
}
