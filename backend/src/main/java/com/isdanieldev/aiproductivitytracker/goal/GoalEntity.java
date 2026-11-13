package com.isdanieldev.aiproductivitytracker.goal;

import com.isdanieldev.aiproductivitytracker.user.UserEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @Entity @Table(name = "goal")
public class GoalEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private UserEntity user;
    @Column(nullable = false, length = 180) private String title;
    @Column(columnDefinition = "TEXT") private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private GoalPeriod period;
    @Column(name = "start_date", nullable = false) private LocalDate startDate;
    @Column(name = "end_date", nullable = false) private LocalDate endDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private GoalStatus status = GoalStatus.ACTIVE;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "parent_goal_id") private GoalEntity parent;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();
    @Column(name = "request_key", length = 36, updatable = false) private String requestKey;
    public enum GoalPeriod { DAILY, WEEKLY, MONTHLY }
    public enum GoalStatus { ACTIVE, COMPLETED, MISSED }
}
