import cors from "cors";
import express from "express";
export function createApp(repository, options = {}) {
  const app = express(); app.disable("x-powered-by");
  const adminPassword = options.adminPassword || "koers";
  const requireAdmin=(q,r,n)=>String(q.get("x-admin-password")||"")===adminPassword?n():r.status(403).json({code:"ADMIN_REQUIRED",message:"Adminrechten vereist."});
  const selectionAllowed=async(q)=>{
    if(String(q.get("x-admin-password")||"")===adminPassword)return true;
    const round=await repository.getRound(q.params.roundId);const runtime=await repository.getRuntimeState(q.params.roundId);const deadlineValue=runtime?.state?.settings?.selectionDeadline||round?.config?.selectionDeadline;const deadline=deadlineValue?new Date(deadlineValue):null;
    if(!deadline||Number.isNaN(deadline.getTime())||new Date()<=deadline)return true;
    if(q.get("x-selection-mode")!=="game-change")return false;
    return (round?.config?.exchangeWindows||[]).some(w=>{const from=new Date(w.from);const until=new Date(w.until);const now=new Date();return !Number.isNaN(from.getTime())&&!Number.isNaN(until.getTime())&&now>=from&&now<=until});
  };
  app.use(cors({ origin: true, credentials: true })); app.use(express.json({ limit: "2mb" }));
  app.get("/api/health", async (_q,r,n)=>{try{await repository.health();r.json({status:"ok",database:"connected",release:"team-admin-v2"})}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId", async(q,r,n)=>{try{const x=await repository.getRound(q.params.roundId);x?r.json(x):r.status(404).json({code:"ROUND_NOT_FOUND",message:"Ronde niet gevonden."})}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/participants",async(q,r,n)=>{try{r.json(await repository.listParticipants(q.params.roundId))}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/riders",async(q,r,n)=>{try{r.json(await repository.listRiders(q.params.roundId))}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/teams",async(q,r,n)=>{try{r.json(await repository.listTeams(q.params.roundId))}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/runtime-state",async(q,r,n)=>{try{r.json(await repository.getRuntimeState(q.params.roundId))}catch(e){n(e)}});
  app.put("/api/v1/rounds/:roundId/runtime-state",requireAdmin,async(q,r,n)=>{try{r.json(await repository.saveRuntimeState(q.params.roundId,q.body||{}))}catch(e){n(e)}});
  app.post("/api/v1/rounds/:roundId/runtime-state/feedback",async(q,r,n)=>{try{r.status(201).json(await repository.appendFeedback(q.params.roundId,q.body||{}))}catch(e){n(e)}});
  app.delete("/api/v1/rounds/:roundId/runtime-state/feedback",requireAdmin,async(q,r,n)=>{try{r.json(await repository.clearFeedback(q.params.roundId))}catch(e){n(e)}});
  app.post("/api/v1/rounds/:roundId/runtime-state/admin-log",requireAdmin,async(q,r,n)=>{try{r.status(201).json(await repository.appendAdminLog(q.params.roundId,q.body||{}))}catch(e){n(e)}});
  app.delete("/api/v1/rounds/:roundId/runtime-state/admin-log",requireAdmin,async(q,r,n)=>{try{r.json(await repository.clearAdminLog(q.params.roundId))}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/client-state/:clientId",async(q,r,n)=>{try{r.json(await repository.getClientState(q.params.roundId,q.params.clientId))}catch(e){n(e)}});
  app.put("/api/v1/rounds/:roundId/client-state/:clientId",async(q,r,n)=>{try{r.json(await repository.saveClientState(q.params.roundId,q.params.clientId,q.body||{}))}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/teams/lookup",async(q,r,n)=>{try{const x=await repository.findTeam(q.params.roundId,q.query.participantName||"",q.query.teamName||"");x?r.json(x):r.status(404).json({code:"TEAM_NOT_FOUND",message:"Selectie niet gevonden."})}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/teams/:teamId",async(q,r,n)=>{try{const x=await repository.getTeam(q.params.roundId,q.params.teamId);x?r.json(x):r.status(404).json({code:"TEAM_NOT_FOUND",message:"Selectie niet gevonden."})}catch(e){n(e)}});
  app.delete("/api/v1/rounds/:roundId/teams/:teamId",requireAdmin,async(q,r,n)=>{try{const x=await repository.deleteTeam(q.params.roundId,q.params.teamId);x?r.json(x):r.status(404).json({code:"TEAM_NOT_FOUND",message:"Selectie niet gevonden."})}catch(e){n(e)}});
  app.post("/api/v1/rounds/:roundId/teams",async(q,r,n)=>{if(!q.body||!String(q.body.name||"").trim()||!String(q.body.teamName||"").trim())return r.status(422).json({code:"INVALID_TEAM",message:"Naam en teamnaam zijn verplicht."});try{if(!await selectionAllowed(q))return r.status(403).json({code:"SELECTION_CLOSED",message:"De deadline voor vrije selectiewijzigingen is verstreken."});r.status(201).json(await repository.saveTeam(q.params.roundId,q.body))}catch(e){n(e)}});
  app.use((e,_q,r,_n)=>{if(e.code==="RUNTIME_CONFLICT")return r.status(409).json({code:e.code,message:e.message});if(e.code==="23505")return r.status(409).json({code:"TEAM_NAME_CONFLICT",message:"Deze combinatie van deelnemersnaam en teamnaam bestaat al."});console.error(e);r.status(500).json({code:"INTERNAL_ERROR",message:"Er ging iets mis op de server."})});
  return app;
}
