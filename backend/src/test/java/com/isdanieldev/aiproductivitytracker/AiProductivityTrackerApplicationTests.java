package com.isdanieldev.aiproductivitytracker;

import com.isdanieldev.aiproductivitytracker.notebook.OwnerProvider;
import com.isdanieldev.aiproductivitytracker.user.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.RestClient;
import org.springframework.test.context.ActiveProfiles;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@SuppressWarnings({"unchecked","rawtypes"})
class AiProductivityTrackerApplicationTests {
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;
    RestClient client;
    final String OWNER="integration-"+UUID.randomUUID()+"@cuaderno.invalid";
    static final String PASSWORD="Synthetic test password 2026";
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwords;
    String cookie="";
    record Reply(int status, Map body) {}
    @BeforeEach void isolatedDatabaseOnly() throws Exception {
        try(var connection=jdbc.getDataSource().getConnection()) {
            assertEquals("cuaderno_test",connection.getCatalog(),"Las pruebas nunca deben borrar datos fuera de la base aislada.");
            assertTrue(connection.getMetaData().getURL().contains("//db-test:5432/") || connection.getMetaData().getURL().contains("127.0.0.1:55439/"));
        }
        jdbc.update("DELETE FROM notebook_import"); jdbc.update("DELETE FROM notebook_note");
        jdbc.update("DELETE FROM task"); jdbc.update("UPDATE goal SET parent_goal_id=NULL");
        jdbc.update("DELETE FROM goal"); jdbc.update("DELETE FROM note_category"); jdbc.update("DELETE FROM app_user");
        users.saveAndFlush(new UserEntity(OWNER,passwords.encode(PASSWORD),"Integration test"));
        client=RestClient.create("http://127.0.0.1:"+port+"/api");cookie="";
        assertEquals(200,request("POST","/auth/login",Map.of("email",OWNER,"password",PASSWORD)).status());
    }
    Reply request(String method,String path,Object body) { return request(method,path,body,true); }
    Reply request(String method,String path,Object body,boolean header) {
        String token=null;
        if(!Set.of("GET","HEAD","OPTIONS").contains(method)) token=(String)request("GET","/auth/csrf",null).body().get("token");
        var request=client.method(HttpMethod.valueOf(method)).uri(path);
        if(!cookie.isEmpty())request.header("Cookie",cookie);
        if(token!=null)request.header("X-CSRF-TOKEN",token);
        users.findByEmail(OWNER).ifPresent(user -> request.header("X-Cuaderno-Account",user.getId().toString()));
        if(header) request.header("X-Cuaderno-Request","1");
        if(body!=null) request.contentType(org.springframework.http.MediaType.APPLICATION_JSON).body(body);
        return request.exchange((req,res)->{
            var cookies=res.getHeaders().get("Set-Cookie");
            if(cookies!=null)for(String value:cookies)if(value.startsWith("CUADERNO_SESSION="))cookie=value.split(";",2)[0];
            return new Reply(res.getStatusCode().value(),res.bodyTo(Map.class));
        });
    }
    Map<String,Object> goal(String title,String period,String key,String parent) {
        var input=new HashMap<String,Object>(); input.put("title",title);input.put("period",period);input.put("periodKey",key);
        input.put("requestKey",UUID.randomUUID().toString());if(parent!=null)input.put("parentId",parent);return input;
    }
    Map<String,Object> task(String title,String goal) {
        var input=new HashMap<String,Object>();input.put("title",title);input.put("dueDate","2026-11-12");input.put("time","10:30");
        input.put("requestKey",UUID.randomUUID().toString());if(goal!=null)input.put("weeklyGoalId",goal);return input;
    }
    Map<String,Object> note(String type,String category) { return Map.of("kind","idea","title","An idea","body","Some details","categoryType",type,"category",category,"requestKey",UUID.randomUUID().toString()); }
    String createGoal(Map input) { var reply=request("POST","/goals",input);assertEquals(201,reply.status(),String.valueOf(reply.body()));return (String)reply.body().get("id"); }
    @Test void healthAndEmptySnapshot() {
        assertEquals(200,request("GET","/health",null).status());
        var reply=request("GET","/notebook",null);assertEquals(200,reply.status());
        assertEquals(List.of(),reply.body().get("tasks"));assertEquals(List.of(),reply.body().get("goals"));assertEquals(List.of(),reply.body().get("notes"));
        assertEquals(3,jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE success=true AND version IN ('1','2','3')",Integer.class));
    }
    @Test void savesOptionalHierarchyAndIndependentTasks() {
        var month=createGoal(goal("Monthly","month","2026-11",null));
        var week=createGoal(goal("Weekly","week","2026-11-09",month));
        createGoal(goal("Independent week","week","2026-11-09",null));
        var linked=request("POST","/tasks",task("Linked",week));assertEquals(201,linked.status());assertEquals(week,linked.body().get("weeklyGoalId"));
        assertEquals(201,request("POST","/tasks",task("Independent",null)).status());
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM task",Integer.class));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM task WHERE goal_id IS NULL",Integer.class));
        assertEquals(3,((List)request("GET","/notebook",null).body().get("goals")).size());
    }
    @Test void weekCanLinkToEitherMonthWhenItCrossesMonthBoundary() {
        var month=createGoal(goal("April","month","2026-04",null));
        assertNotNull(createGoal(goal("Cross-month","week","2026-03-30",month)));
    }
    @Test void validatesPeriodsAndReferences() {
        assertEquals(400,request("POST","/goals",goal("Bad week","week","2026-11-10",null)).status());
        assertEquals(400,request("POST","/goals",goal("Bad month","month","2026-13",null)).status());
        var month=createGoal(goal("Different month","month","2026-12",null));
        assertEquals(400,request("POST","/goals",goal("Wrong month","week","2026-11-09",month)).status());
        var week=createGoal(goal("Different week","week","2026-11-16",null));
        assertEquals(400,request("POST","/tasks",task("Wrong week",week)).status());
        assertEquals(404,request("POST","/tasks",task("Missing goal","999999")).status());
        assertEquals(400,request("POST","/tasks",task("Monthly link",month)).status());
        assertEquals(400,request("POST","/tasks",task(" ",null)).status());
    }
    @Test void completeDeleteAndRequestReplay() {
        var input=task("Replay",null);var created=request("POST","/tasks",input);assertEquals(201,created.status());
        var replay=request("POST","/tasks",input);assertEquals(created.body().get("id"),replay.body().get("id"));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM task",Integer.class));
        var id=created.body().get("id");
        assertEquals(true,request("PATCH","/tasks/"+id,Map.of("done",true)).body().get("done"));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM task WHERE completed_at IS NOT NULL",Integer.class));
        assertEquals(false,request("PATCH","/tasks/"+id,Map.of("done",false)).body().get("done"));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM task WHERE completed_at IS NOT NULL",Integer.class));
        assertEquals(204,request("DELETE","/tasks/"+id,null).status());assertEquals(404,request("DELETE","/tasks/"+id,null).status());
    }
    @Test void notesNormalizeCategoriesAndStaySeparateFromTasks() {
        assertEquals(201,request("POST","/notes",note("project","  Cuaderno  ")).status());
        var second=request("POST","/notes",note("project","cuaderno"));assertEquals("Cuaderno",second.body().get("category"));
        assertEquals(201,request("POST","/notes",note("topic","Cuaderno")).status());
        assertEquals(201,request("POST","/notes",note("none","")).status());
        assertEquals(400,request("POST","/notes",note("project"," ")).status());
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM note_category",Integer.class));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM task",Integer.class));
    }
    @Test void anotherOwnersGoalIsNotVisibleOrLinkable() {
        var other=users.saveAndFlush(new UserEntity("other@cuaderno.invalid","unused","Other"));
        Long otherGoal=jdbc.queryForObject("INSERT INTO goal(user_id,title,period,status,start_date,end_date) VALUES (?,'Other','WEEKLY','ACTIVE','2026-11-09','2026-11-15') RETURNING id",Long.class,other.getId());
        assertEquals(404,request("POST","/tasks",task("Cross owner",otherGoal.toString())).status());
        assertEquals(0,((List)request("GET","/notebook",null).body().get("goals")).size());
    }
    @Test void importsAtomicallyAndIdempotentlyPreservingNoteCaptureTime() {
        var importKey="a".repeat(64);
        var month=Map.of("id","local-month","title","Monthly","period","month","periodKey","2026-11");
        var week=Map.of("id","local-week","title","Weekly","period","week","periodKey","2026-11-09","parentId","local-month");
        var task=Map.of("id",99,"title","Local task","dueDate","2026-11-12","time","A tu ritmo","project","Original","color","blue","done",true,"weeklyGoalId","local-week");
        var capture="2025-02-01T12:30:00Z";
        var note=Map.of("id","local-note","kind","note","title","Local note","body","Original body","categoryType","project","category","Cuaderno","createdAt",capture);
        var payload=Map.of("importKey",importKey,"goals",List.of(week,month),"tasks",List.of(task),"notes",List.of(note));
        var imported=request("POST","/imports/local",payload);assertEquals(200,imported.status(),String.valueOf(imported.body()));assertEquals(false,imported.body().get("alreadyImported"));
        assertEquals(true,request("POST","/imports/local",payload).body().get("alreadyImported"));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM task",Integer.class));
        assertEquals("Original",jdbc.queryForObject("SELECT project_label FROM task",String.class));
        assertEquals("A tu ritmo",jdbc.queryForObject("SELECT time_label FROM task",String.class));
        assertEquals(Instant.parse(capture),jdbc.queryForObject("SELECT created_at FROM notebook_note",(rs,row)->rs.getTimestamp(1).toInstant()));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM notebook_import",Integer.class));
        assertEquals(409,request("POST","/imports/local",Map.of("importKey",importKey,"goals",List.of(),"tasks",List.of(),"notes",List.of())).status());
    }
    @Test void invalidImportRollsBackEveryNewRecord() {
        var payload=Map.of("importKey","b".repeat(64),"goals",List.of(Map.of("id","new","title","New","period","month","periodKey","2026-11")),
            "tasks",List.of(Map.of("id",1,"title","Orphan","dueDate","2026-11-12","weeklyGoalId","missing")),"notes",List.of());
        assertEquals(400,request("POST","/imports/local",payload).status());
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM goal",Integer.class));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM notebook_import",Integer.class));
    }
    @Test void mutationRequiresApplicationHeaderAndRejectsMalformedFields() {
        assertEquals(403,request("POST","/tasks",task("No header",null),false).status());
        assertEquals(400,request("POST","/tasks",Map.of("title","Missing date","requestKey",UUID.randomUUID().toString())).status());
        assertEquals(400,request("POST","/notes",Map.of("kind","other","title","Bad kind","categoryType","none","requestKey",UUID.randomUUID().toString())).status());
    }
    @Test void anonymousCannotReadAndLogoutInvalidatesSession() {
        String prior=cookie;
        assertEquals(204,request("POST","/auth/logout",Map.of()).status());
        cookie=prior;
        assertEquals(401,request("GET","/notebook",null).status());
        assertNull(request("GET","/auth/session",null).body().get("user"));
    }
    @Test void registrationHashesPasswordsAndNormalizesEmail() {
        request("POST","/auth/logout",Map.of());cookie="";
        String email="New-"+UUID.randomUUID()+"@cuaderno.invalid";
        var reply=request("POST","/auth/register",Map.of("name","New account","email",email,"password",PASSWORD));
        assertEquals(201,reply.status(),String.valueOf(reply.body()));
        var saved=users.findByEmail(email.toLowerCase(Locale.ROOT)).orElseThrow();
        assertNotEquals(PASSWORD,saved.getPasswordHash());assertTrue(passwords.matches(PASSWORD,saved.getPasswordHash()));
        assertFalse(reply.body().toString().contains("password"));
        assertEquals(200,request("GET","/auth/session",null).status());
        request("POST","/auth/logout",Map.of());cookie="";
        assertEquals(409,request("POST","/auth/register",Map.of("name","Duplicate","email",email.toUpperCase(Locale.ROOT),"password",PASSWORD)).status());
        assertEquals(400,request("POST","/auth/register",Map.of("name","Short","email","short@cuaderno.invalid","password","tiny")).status());
    }
    @Test void loginRotatesSessionAndRejectsWrongPassword() {
        request("POST","/auth/logout",Map.of());cookie="";
        assertEquals(401,request("POST","/auth/login",Map.of("email",OWNER,"password","wrong password")).status());
        String anonymousCookie=cookie;
        assertEquals(200,request("POST","/auth/login",Map.of("email",OWNER.toUpperCase(Locale.ROOT),"password",PASSWORD)).status());
        assertNotEquals(anonymousCookie,cookie);
    }
    @Test void csrfRequiredEvenForLoginAndForeignAccountHeaderRejected() {
        var denied=client.post().uri("/tasks").header("Cookie",cookie).header("X-Cuaderno-Request","1").contentType(org.springframework.http.MediaType.APPLICATION_JSON).body(task("CSRF",null)).exchange((req,res)->res.getStatusCode().value());
        assertEquals(403,denied);
        var mismatch=client.get().uri("/notebook").header("Cookie",cookie).header("X-Cuaderno-Account","999999").exchange((req,res)->res.getStatusCode().value());
        assertEquals(401,mismatch);
    }
    @Test void twoRealSessionsCannotAccessEachOthersTasksOrGoals() {
        var month=createGoal(goal("Private month","month","2026-11",null));
        var week=createGoal(goal("Private week","week","2026-11-09",month));
        var created=request("POST","/tasks",task("Private",week));var id=created.body().get("id");
        String firstCookie=cookie;
        String otherEmail="other-"+UUID.randomUUID()+"@cuaderno.invalid";
        var other=users.saveAndFlush(new UserEntity(otherEmail,passwords.encode(PASSWORD),"Other"));
        cookie="";assertEquals(200,request("POST","/auth/login",Map.of("email",otherEmail,"password",PASSWORD)).status());
        var snapshot=client.get().uri("/notebook").header("Cookie",cookie).header("X-Cuaderno-Account",other.getId().toString()).exchange((req,res)->res.bodyTo(Map.class));
        assertEquals(List.of(),snapshot.get("tasks"));assertEquals(List.of(),snapshot.get("goals"));
        var csrf=(String)request("GET","/auth/csrf",null).body().get("token");
        var denied=client.delete().uri("/tasks/"+id).header("Cookie",cookie).header("X-CSRF-TOKEN",csrf).header("X-Cuaderno-Request","1").header("X-Cuaderno-Account",other.getId().toString()).exchange((req,res)->res.getStatusCode().value());
        assertEquals(404,denied);cookie=firstCookie;
        assertEquals(1,((List)request("GET","/notebook",null).body().get("tasks")).size());
    }

    Map edit(String title,String date,String weeklyGoalId) {
        var input=new HashMap<String,Object>();input.put("title",title);input.put("dueDate",date);input.put("time","18:45");input.put("weeklyGoalId",weeklyGoalId);return input;
    }
    Map plan(String id) { var reply=request("GET","/goals/"+id+"/deletion-preview",null);assertEquals(200,reply.status(),String.valueOf(reply.body()));return reply.body(); }
    Reply removeGoal(String id,Map plan) { return request("DELETE","/goals/"+id,Map.of("confirmationToken",plan.get("confirmationToken"),"confirmationText","Eliminar")); }
    @Test void editTaskPreservesCompletionAndAllowsMoveOrUnlink() {
        var week=createGoal(goal("Current week","week","2026-11-09",null));
        var next=createGoal(goal("Next week","week","2026-11-16",null));
        var created=request("POST","/tasks",task("Before",week));var id=created.body().get("id");
        request("PATCH","/tasks/"+id,Map.of("done",true));
        var changed=request("PUT","/tasks/"+id,edit("After","2026-11-17",next));
        assertEquals(200,changed.status(),String.valueOf(changed.body()));assertEquals("After",changed.body().get("title"));assertEquals(next,changed.body().get("weeklyGoalId"));assertEquals(true,changed.body().get("done"));assertEquals("18:45",changed.body().get("time"));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM task WHERE completed_at IS NOT NULL AND planning_key='2026-11-17'",Integer.class));
        var unlinked=request("PUT","/tasks/"+id,edit("Independent","2026-11-17",null));assertEquals(200,unlinked.status());assertNull(unlinked.body().get("weeklyGoalId"));
        var invalid=request("PUT","/tasks/"+id,edit("Invalid","2026-11-17",week));assertEquals(400,invalid.status());
        assertEquals("Independent",((List<Map>)request("GET","/notebook",null).body().get("tasks")).getFirst().get("title"));
    }
    @Test void unlinkEndpointChangesOnlyRelationAndSurvivesGoalDeletion() {
        var week=createGoal(goal("Week","week","2026-11-09",null));
        var created=request("POST","/tasks",task("Keep me",week));var id=created.body().get("id");
        var unlinked=request("DELETE","/tasks/"+id+"/goal",null);assertEquals(200,unlinked.status());assertNull(unlinked.body().get("weeklyGoalId"));assertEquals("Keep me",unlinked.body().get("title"));assertEquals("10:30",unlinked.body().get("time"));
        assertEquals(200,request("DELETE","/tasks/"+id+"/goal",null).status());
        assertEquals(200,removeGoal(week,plan(week)).status());assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM task",Integer.class));
    }
    @Test void deletingWeeklyGoalRemovesOnlyItsTasksAndKeepsMonthlyParent() {
        var month=createGoal(goal("Month","month","2026-11",null));
        var week=createGoal(goal("Week","week","2026-11-09",month));
        var sibling=createGoal(goal("Sibling","week","2026-11-09",month));
        request("POST","/tasks",task("Removed",week));request("POST","/tasks",task("Sibling task",sibling));request("POST","/tasks",task("Independent",null));
        var preview=plan(week);assertEquals(1,((List)preview.get("goalIds")).size());assertEquals(1,((List)preview.get("taskIds")).size());
        assertEquals(200,removeGoal(week,preview).status());assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM goal",Integer.class));assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM task",Integer.class));
        assertEquals(404,request("GET","/goals/"+week+"/deletion-preview",null).status());
    }
    @Test void deletingMonthlyGoalRemovesWholeTreeAcrossWeeksButNotOtherData() {
        var month=createGoal(goal("Month","month","2026-11",null));
        var week=createGoal(goal("Week","week","2026-11-09",month));
        var next=createGoal(goal("Next week","week","2026-11-16",month));
        var separate=createGoal(goal("Separate","week","2026-11-09",null));
        request("POST","/tasks",task("Linked",week));var later=task("Later",next);later.put("dueDate","2026-11-17");request("POST","/tasks",later);
        request("POST","/tasks",task("Separate",separate));request("POST","/tasks",task("Independent",null));request("POST","/notes",note("project","Keep notes"));
        var preview=plan(month);assertEquals(3,((List)preview.get("goalIds")).size());assertEquals(2,((List)preview.get("taskIds")).size());
        var removed=removeGoal(month,preview);assertEquals(200,removed.status(),String.valueOf(removed.body()));assertEquals(3,((List)removed.body().get("goalIds")).size());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM goal",Integer.class));assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM task",Integer.class));assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM notebook_note",Integer.class));
    }
    @Test void cascadeRequiresFreshConfirmationAndRollsBackOnChangedMembership() {
        var week=createGoal(goal("Week","week","2026-11-09",null));var preview=plan(week);
        request("POST","/tasks",task("Added after preview",week));
        assertEquals(409,removeGoal(week,preview).status());assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM goal",Integer.class));assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM task",Integer.class));
        assertEquals(400,request("DELETE","/goals/"+week,Map.of()).status());
        assertEquals(200,removeGoal(week,plan(week)).status());assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM task",Integer.class));
    }
    @Test void cannotEditUnlinkPreviewOrDeleteAnotherAccountsElements() {
        var other=users.saveAndFlush(new UserEntity("foreign-"+UUID.randomUUID()+"@cuaderno.invalid","unusable","Foreign"));
        var goalId=jdbc.queryForObject("INSERT INTO goal(user_id,title,period,status,start_date,end_date) VALUES(?, 'Foreign', 'WEEKLY', 'ACTIVE', '2026-11-09', '2026-11-15') RETURNING id",Long.class,other.getId());
        var taskId=jdbc.queryForObject("INSERT INTO task(user_id,goal_id,title,status,due_date,planning_key) VALUES(?,?,'Foreign','PENDING','2026-11-12','2026-11-12') RETURNING id",Long.class,other.getId(),goalId);
        assertEquals(404,request("PUT","/tasks/"+taskId,edit("Stolen","2026-11-12",null)).status());assertEquals(404,request("DELETE","/tasks/"+taskId+"/goal",null).status());
        assertEquals(404,request("GET","/goals/"+goalId+"/deletion-preview",null).status());assertEquals(404,request("DELETE","/goals/"+goalId,Map.of("confirmationToken","f".repeat(64),"confirmationText","Eliminar")).status());
        var own=request("POST","/tasks",task("Own",null));assertEquals(404,request("PUT","/tasks/"+own.body().get("id"),edit("Cross-account link","2026-11-12",goalId.toString())).status());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM task WHERE user_id=?",Integer.class,other.getId()));
    }

    @Test void goalDeletionRequiresExactWrittenConfirmationButTaskDeletionDoesNot() {
        var week=createGoal(goal("Protected","week","2026-11-09",null));
        var task=request("POST","/tasks",task("Linked",week));var preview=plan(week);
        assertEquals(400,request("DELETE","/goals/"+week,Map.of("confirmationToken",preview.get("confirmationToken"))).status());
        for(String word:List.of("", "eliminar", "ELIMINAR", "Eliminar ", "Otro")) {
            assertEquals(400,request("DELETE","/goals/"+week,Map.of("confirmationToken",preview.get("confirmationToken"),"confirmationText",word)).status());
        }
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM goal",Integer.class));assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM task",Integer.class));
        assertEquals(204,request("DELETE","/tasks/"+task.body().get("id"),null).status());
        assertEquals(200,removeGoal(week,plan(week)).status());assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM goal",Integer.class));
    }

}
