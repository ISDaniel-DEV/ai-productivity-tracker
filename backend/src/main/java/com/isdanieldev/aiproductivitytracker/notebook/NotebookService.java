package com.isdanieldev.aiproductivitytracker.notebook;

import com.isdanieldev.aiproductivitytracker.goal.*;
import com.isdanieldev.aiproductivitytracker.task.*;
import com.isdanieldev.aiproductivitytracker.note.*;
import com.isdanieldev.aiproductivitytracker.user.UserEntity;
import static com.isdanieldev.aiproductivitytracker.notebook.NotebookDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;

@Service
public class NotebookService {
    private final GoalRepository goals;
    private final TaskRepository tasks;
    private final NoteRepository notes;
    private final CategoryRepository categories;
    private final OwnerProvider owner;
    private final JdbcTemplate jdbc;
    public NotebookService(GoalRepository goals, TaskRepository tasks, NoteRepository notes,
            CategoryRepository categories, OwnerProvider owner, JdbcTemplate jdbc) {
        this.goals=goals; this.tasks=tasks; this.notes=notes; this.categories=categories; this.owner=owner; this.jdbc=jdbc;
    }
    private ResponseStatusException invalid(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró el elemento en este cuaderno."); }
    private Long numericId(String value) {
        try { var id=Long.valueOf(value); if(id<=0) throw new NumberFormatException(); return id; }
        catch (RuntimeException e) { throw invalid("El identificador del objetivo no es válido."); }
    }
    private String text(String value) { return value == null ? "" : value.trim(); }
    private String requestKey(String value) {
        try { return UUID.fromString(value).toString(); } catch (RuntimeException e) { throw invalid("Identificador de petición no válido."); }
    }
    // Serializa escrituras de un mismo propietario, incluida creación de categorías e importación.
    private UserEntity writingOwner() {
        var user=owner.currentOwner();
        jdbc.execute("SELECT pg_advisory_xact_lock(" + user.getId() + ")");
        return user;
    }
    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    public NotebookView read() {
        var id=owner.currentOwner().getId();
        return new NotebookView(tasks.findByUserIdOrderByCreatedAtAsc(id).stream().map(this::taskView).toList(),
            goals.findByUserIdOrderByCreatedAtAsc(id).stream().map(this::goalView).toList(),
            notes.findByUserIdOrderByCreatedAtAsc(id).stream().map(this::noteView).toList());
    }
    private GoalView goalView(GoalEntity entity) {
        String period=entity.getPeriod()==GoalEntity.GoalPeriod.WEEKLY ? "week" : entity.getPeriod()==GoalEntity.GoalPeriod.MONTHLY ? "month" : "day";
        return new GoalView(entity.getId().toString(),entity.getTitle(),period,
            "month".equals(period) ? YearMonth.from(entity.getStartDate()).toString() : entity.getStartDate().toString(),
            entity.getParent()==null ? null : entity.getParent().getId().toString());
    }
    private TaskView taskView(TaskEntity entity) {
        return new TaskView(entity.getId(),entity.getTitle(),entity.getTimeLabel(),entity.getProjectLabel(),entity.getColorLabel(),
            entity.getStatus()==TaskEntity.TaskStatus.COMPLETED,entity.getDueDate(),entity.getGoal()==null ? null : entity.getGoal().getId().toString());
    }
    private NoteView noteView(NoteEntity entity) {
        var category=entity.getCategory();
        return new NoteView(entity.getId().toString(),entity.getKind(),entity.getTitle(),entity.getBody(),
            category==null ? "none" : category.getType(),category==null ? "" : category.getName(),entity.getCreatedAt());
    }
    @Transactional
    public GoalView createGoal(GoalInput input) { return goalView(saveGoal(input,writingOwner())); }
    private GoalEntity saveGoal(GoalInput input, UserEntity user) {
        var key=requestKey(input.requestKey());
        var existing=goals.findByUserIdAndRequestKey(user.getId(),key);
        if(existing.isPresent()) return existing.get();
        var entity=new GoalEntity(); entity.setUser(user); entity.setRequestKey(key); entity.setTitle(text(input.title()));
        try {
            if ("month".equals(input.period())) {
                if (!input.periodKey().matches("\\d{4}-\\d{2}")) throw invalid("El mes debe tener el formato AAAA-MM.");
                var month=YearMonth.parse(input.periodKey());
                entity.setPeriod(GoalEntity.GoalPeriod.MONTHLY); entity.setStartDate(month.atDay(1)); entity.setEndDate(month.atEndOfMonth());
                if(!text(input.parentId()).isEmpty()) throw invalid("Un objetivo mensual no puede tener un objetivo padre.");
            } else if ("week".equals(input.period())) {
                var start=LocalDate.parse(input.periodKey());
                if(start.getDayOfWeek()!=DayOfWeek.MONDAY) throw invalid("La semana debe empezar en lunes.");
                entity.setPeriod(GoalEntity.GoalPeriod.WEEKLY); entity.setStartDate(start); entity.setEndDate(start.plusDays(6));
                if(!text(input.parentId()).isEmpty()) {
                    var parent=goals.findByIdAndUserId(numericId(input.parentId()),user.getId()).orElseThrow(this::missing);
                    if(parent.getPeriod()!=GoalEntity.GoalPeriod.MONTHLY) throw invalid("El objetivo padre debe ser mensual.");
                    if(parent.getStartDate().isAfter(entity.getEndDate()) || parent.getEndDate().isBefore(start)) throw invalid("El objetivo mensual no coincide con la semana.");
                    entity.setParent(parent);
                }
            } else throw invalid("Periodo de objetivo no válido.");
            if(entity.getStartDate().getYear()<1900 || entity.getEndDate().getYear()>9999) throw invalid("Fecha fuera del rango permitido (1900–9999).");
        } catch (java.time.DateTimeException e) { throw invalid("La fecha del objetivo no es válida."); }
        return goals.saveAndFlush(entity);
    }
    @Transactional
    public TaskView createTask(TaskInput input) { return taskView(saveTask(input,writingOwner())); }
    private TaskEntity saveTask(TaskInput input, UserEntity user) {
        var key=requestKey(input.requestKey());
        var existing=tasks.findByUserIdAndRequestKey(user.getId(),key);
        if(existing.isPresent()) return existing.get();
        var entity=new TaskEntity(); entity.setUser(user); entity.setRequestKey(key);
        applyTask(new TaskEditInput(input.title(),input.dueDate(),input.time(),input.weeklyGoalId()),entity,user);
        return tasks.saveAndFlush(entity);
    }
    private void applyTask(TaskEditInput input, TaskEntity entity, UserEntity user) {
        if(input.dueDate()==null || input.dueDate().getYear()<1900 || input.dueDate().getYear()>9999) throw invalid("El día de la tarea no es válido.");
        var time=text(input.time());
        if(time.isEmpty()) time="Sin hora";
        if(!time.equals("Sin hora") && !time.matches("(?:[01]\\d|2[0-3]):[0-5]\\d")) throw invalid("La hora debe tener formato HH:mm o estar vacía.");
        entity.setTitle(text(input.title()));
        entity.setDueDate(input.dueDate()); entity.setPlanningKey(input.dueDate().toString()); entity.setTimeLabel(time);
        entity.setGoal(null);
        entity.setPlanningPeriod(TaskEntity.PlanningPeriod.DAY);
        if(!text(input.weeklyGoalId()).isEmpty()) {
            var goal=goals.findByIdAndUserId(numericId(input.weeklyGoalId()),user.getId()).orElseThrow(this::missing);
            if(goal.getPeriod()!=GoalEntity.GoalPeriod.WEEKLY) throw invalid("La tarea debe vincularse a un objetivo semanal.");
            if(input.dueDate().isBefore(goal.getStartDate()) || input.dueDate().isAfter(goal.getEndDate())) throw invalid("El día de la tarea no pertenece a la semana del objetivo.");
            entity.setGoal(goal);
        }
    }
    @Transactional
    public TaskView editTask(Long id, TaskEditInput input) {
        var user=writingOwner(); var entity=tasks.findByIdAndUserId(id,user.getId()).orElseThrow(this::missing);
        applyTask(input,entity,user);
        return taskView(tasks.saveAndFlush(entity));
    }
    @Transactional
    public TaskView unlinkTask(Long id) {
        var user=writingOwner(); var entity=tasks.findByIdAndUserId(id,user.getId()).orElseThrow(this::missing);
        entity.setGoal(null);
        return taskView(tasks.saveAndFlush(entity));
    }
    private GoalDeletionView deletionPlan(String id, UserEntity user) {
        var root=goals.findByIdAndUserId(numericId(id),user.getId()).orElseThrow(this::missing);
        var all=goals.findByUserIdOrderByCreatedAtAsc(user.getId());
        var ids=new TreeSet<Long>(); ids.add(root.getId());
        boolean changed;
        do { changed=false; for(var goal:all) if(goal.getParent()!=null && ids.contains(goal.getParent().getId())) changed=ids.add(goal.getId()) || changed; } while(changed);
        var taskIds=tasks.findByUserIdOrderByCreatedAtAsc(user.getId()).stream()
            .filter(task -> task.getGoal()!=null && ids.contains(task.getGoal().getId())).map(TaskEntity::getId).sorted().toList();
        var goalIds=ids.stream().map(Object::toString).toList();
        String token;
        try { token=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((user.getId()+":"+root.getId()+":"+goalIds+":"+taskIds).getBytes(StandardCharsets.UTF_8))); }
        catch(java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
        return new GoalDeletionView(root.getId().toString(),root.getTitle(),goalIds,taskIds,token);
    }
    @Transactional
    public GoalDeletionView previewGoalDeletion(String id) { return deletionPlan(id,writingOwner()); }
    @Transactional
    public GoalDeletionResult deleteGoal(String id, GoalDeleteInput input) {
        var plan=deletionPlan(id,writingOwner());
        if(!plan.confirmationToken().equals(input.confirmationToken())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Han cambiado los elementos vinculados. Revisa de nuevo el contenido antes de eliminar.");
        if(!plan.taskIds().isEmpty()) tasks.deleteAllByIdInBatch(plan.taskIds());
        goals.deleteAllByIdInBatch(plan.goalIds().stream().map(Long::valueOf).toList());
        return new GoalDeletionResult(plan.goalIds(),plan.taskIds());
    }
    @Transactional
    public TaskView completeTask(Long id, boolean done) {
        var user=writingOwner(); var entity=tasks.findByIdAndUserId(id,user.getId()).orElseThrow(this::missing);
        entity.setStatus(done ? TaskEntity.TaskStatus.COMPLETED : TaskEntity.TaskStatus.PENDING);
        entity.setCompletedAt(done ? entity.getCompletedAt()==null ? Instant.now() : entity.getCompletedAt() : null);
        return taskView(tasks.saveAndFlush(entity));
    }
    @Transactional
    public void deleteTask(Long id) {
        var user=writingOwner(); var entity=tasks.findByIdAndUserId(id,user.getId()).orElseThrow(this::missing);
        tasks.delete(entity);
    }
    @Transactional
    public NoteView createNote(NoteInput input) { return noteView(saveNote(input,writingOwner())); }
    private NoteEntity saveNote(NoteInput input, UserEntity user) {
        var key=requestKey(input.requestKey());
        var existing=notes.findByUserIdAndRequestKey(user.getId(),key);
        if(existing.isPresent()) return existing.get();
        var entity=new NoteEntity(); entity.setUser(user); entity.setRequestKey(key); entity.setTitle(text(input.title()));
        entity.setKind(input.kind()); entity.setBody(text(input.body()));
        if(!"none".equals(input.categoryType())) {
            var name=text(input.category()).replaceAll("\\s+"," ");
            if(name.isBlank()) throw invalid("Indica la temática o proyecto, o elige Sin clasificar.");
            var normalized=name.toLowerCase(Locale.forLanguageTag("es"));
            var category=categories.findByUserIdAndTypeAndNormalizedName(user.getId(),input.categoryType(),normalized).orElseGet(()->{
                var created=new CategoryEntity(); created.setUser(user); created.setType(input.categoryType());
                created.setName(name); created.setNormalizedName(normalized); return categories.saveAndFlush(created);
            });
            entity.setCategory(category);
        }
        return notes.saveAndFlush(entity);
    }
    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 no disponible"); }
    }
    private String importRequestKey(String importKey, String type, Object id) {
        return UUID.nameUUIDFromBytes((importKey+":"+type+":"+id).getBytes(StandardCharsets.UTF_8)).toString();
    }
    @Transactional
    public ImportResult importLocal(ImportInput input) {
        var user=writingOwner();
        var fingerprint=hash(input.goals().toString()+input.tasks().toString()+input.notes().toString());
        var previous=jdbc.queryForList("SELECT payload_hash,task_count,goal_count,note_count FROM notebook_import WHERE user_id=? AND import_key=?",user.getId(),input.importKey());
        if(!previous.isEmpty()) {
            var row=previous.getFirst();
            if(!fingerprint.equals(row.get("payload_hash"))) throw new ResponseStatusException(HttpStatus.CONFLICT,"Esta importación ya existe con otro contenido.");
            return new ImportResult(true,((Number)row.get("task_count")).intValue(),((Number)row.get("goal_count")).intValue(),((Number)row.get("note_count")).intValue());
        }
        if(input.goals().stream().map(LegacyGoal::id).distinct().count()!=input.goals().size()
            || input.tasks().stream().map(LegacyTask::id).distinct().count()!=input.tasks().size()
            || input.notes().stream().map(LegacyNote::id).distinct().count()!=input.notes().size()) throw invalid("Hay identificadores repetidos en la copia local.");
        var mapping=new HashMap<String,String>();
        for(String period:List.of("month","week")) for(var old:input.goals()) if(period.equals(old.period())) {
            String parent=null;
            if(!text(old.parentId()).isEmpty()) {
                parent=mapping.get(old.parentId());
                if(parent==null) throw invalid("Un objetivo hace referencia a un mensual que no está en la copia.");
            }
            var entity=saveGoal(new GoalInput(old.title(),old.period(),old.periodKey(),parent,importRequestKey(input.importKey(),"goal",old.id())),user);
            mapping.put(old.id(),entity.getId().toString());
        }
        for(var old:input.tasks()) {
            String goal=null;
            if(!text(old.weeklyGoalId()).isEmpty()) {
                goal=mapping.get(old.weeklyGoalId());
                if(goal==null) throw invalid("Una tarea hace referencia a un objetivo que no está en la copia.");
            }
            // Las etiquetas horarias heredadas se conservan aunque no sean horas estructuradas.
            var entity=saveTask(new TaskInput(old.title(),old.dueDate(),"Sin hora",goal,importRequestKey(input.importKey(),"task",old.id())),user);
            entity.setTimeLabel(text(old.time()).isEmpty() ? "Sin hora" : old.time());
            entity.setProjectLabel(text(old.project()).isEmpty() ? "Personal" : old.project());
            entity.setColorLabel(text(old.color()).isEmpty() ? "peach" : old.color());
            entity.setStatus(old.done() ? TaskEntity.TaskStatus.COMPLETED : TaskEntity.TaskStatus.PENDING);
            entity.setCompletedAt(old.done() ? Instant.now() : null);
        }
        for(var old:input.notes()) {
            var entity=saveNote(new NoteInput(old.kind(),old.title(),old.body(),old.categoryType(),old.category(),importRequestKey(input.importKey(),"note",old.id())),user);
            if(old.createdAt().isAfter(Instant.now().plusSeconds(300))) throw invalid("Una nota tiene una fecha de captura futura.");
            entity.setCreatedAt(old.createdAt());
        }
        // created_at no es editable tras INSERT: fijarlo explícitamente dentro de esta transacción de importación.
        for(var old:input.notes()) jdbc.update("UPDATE notebook_note SET created_at=? WHERE user_id=? AND request_key=?",java.sql.Timestamp.from(old.createdAt()),user.getId(),importRequestKey(input.importKey(),"note",old.id()));
        jdbc.update("INSERT INTO notebook_import(user_id,import_key,payload_hash,task_count,goal_count,note_count) VALUES (?,?,?,?,?,?)",
            user.getId(),input.importKey(),fingerprint,input.tasks().size(),input.goals().size(),input.notes().size());
        return new ImportResult(false,input.tasks().size(),input.goals().size(),input.notes().size());
    }
}
