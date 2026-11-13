package com.isdanieldev.aiproductivitytracker.task;

import com.isdanieldev.aiproductivitytracker.goal.GoalEntity;
import com.isdanieldev.aiproductivitytracker.user.UserEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @Entity @Table(name = "task")
public class TaskEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private UserEntity user;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "goal_id") private GoalEntity goal;
    @Column(nullable = false, length = 240) private String title;
    @Column(columnDefinition = "TEXT") private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TaskStatus status = TaskStatus.PENDING;
    @Column(name = "due_date") private LocalDate dueDate;
    @Column(name = "time_label", nullable = false, length = 50) private String timeLabel = "Sin hora";
    @Column(name = "project_label", nullable = false, length = 100) private String projectLabel = "Personal";
    @Column(name = "color_label", nullable = false, length = 30) private String colorLabel = "peach";
    @Column(name = "completed_at") private Instant completedAt;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();
    @Column(name = "request_key", length = 36, updatable = false) private String requestKey;
    // Periodos sin día: contrato preparado; la interfaz actual sigue creando tareas diarias.
    @Enumerated(EnumType.STRING) @Column(name = "planning_period", nullable = false, length = 10) private PlanningPeriod planningPeriod = PlanningPeriod.DAY;
    @Column(name = "planning_key", length = 10) private String planningKey;
    public enum TaskStatus { PENDING, IN_PROGRESS, COMPLETED }
    public enum PlanningPeriod { DAY, WEEK, MONTH, NONE }
}
