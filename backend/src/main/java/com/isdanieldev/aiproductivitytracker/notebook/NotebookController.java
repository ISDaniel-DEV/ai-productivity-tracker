package com.isdanieldev.aiproductivitytracker.notebook;
import static com.isdanieldev.aiproductivitytracker.notebook.NotebookDtos.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.List;

@RestController @RequestMapping("/api")
public class NotebookController {
    private final NotebookService service;
    public NotebookController(NotebookService service) { this.service=service; }
    @GetMapping("/notebook") public NotebookView notebook() { return service.read(); }
    @GetMapping("/tasks") public List<TaskView> tasks() { return service.read().tasks(); }
    @GetMapping("/goals") public List<GoalView> goals() { return service.read().goals(); }
    @GetMapping("/notes") public List<NoteView> notes() { return service.read().notes(); }
    @PostMapping(value="/tasks", consumes="application/json") @ResponseStatus(HttpStatus.CREATED)
    public TaskView task(@Valid @RequestBody TaskInput input) { return service.createTask(input); }
    @PatchMapping(value="/tasks/{id}", consumes="application/json")
    public TaskView complete(@PathVariable Long id, @Valid @RequestBody DoneInput input) { return service.completeTask(id,input.done()); }
    @PutMapping(value="/tasks/{id}", consumes="application/json")
    public TaskView edit(@PathVariable Long id, @Valid @RequestBody TaskEditInput input) { return service.editTask(id,input); }
    @DeleteMapping("/tasks/{id}/goal")
    public TaskView unlink(@PathVariable Long id) { return service.unlinkTask(id); }
    @GetMapping("/goals/{id}/deletion-preview")
    public GoalDeletionView preview(@PathVariable String id) { return service.previewGoalDeletion(id); }
    @DeleteMapping(value="/goals/{id}", consumes="application/json")
    public GoalDeletionResult deleteGoal(@PathVariable String id,@Valid @RequestBody GoalDeleteInput input) { return service.deleteGoal(id,input); }
    @DeleteMapping("/tasks/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.deleteTask(id); }
    @PostMapping(value="/goals", consumes="application/json") @ResponseStatus(HttpStatus.CREATED)
    public GoalView goal(@Valid @RequestBody GoalInput input) { return service.createGoal(input); }
    @PostMapping(value="/notes", consumes="application/json") @ResponseStatus(HttpStatus.CREATED)
    public NoteView note(@Valid @RequestBody NoteInput input) { return service.createNote(input); }
    @PostMapping(value="/imports/local", consumes="application/json")
    public ImportResult importLocal(@Valid @RequestBody ImportInput input) { return service.importLocal(input); }
}
