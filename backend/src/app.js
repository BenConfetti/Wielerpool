import cors from "cors";
import express from "express";
import { config } from "./config.js";
export function createApp(repository) {
  const app = express(); app.disable("x-powered-by");
  app.use(cors({ origin: config.frontendOrigin, credentials: true })); app.use(express.json({ limit: "2mb" }));
  app.get("/api/health", async (_q,r,n)=>{try{await repository.health();r.json({status:"ok",database:"connected",release:"team-storage-v1"})}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId", async(q,r,n)=>{try{const x=await repository.getRound(q.params.roundId);x?r.json(x):r.status(404).json({code:"ROUND_NOT_FOUND",message:"Ronde niet gevonden."})}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/participants",async(q,r,n)=>{try{r.json(await repository.listParticipants(q.params.roundId))}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/riders",async(q,r,n)=>{try{r.json(await repository.listRiders(q.params.roundId))}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/teams",async(q,r,n)=>{try{r.json(await repository.listTeams(q.params.roundId))}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/teams/lookup",async(q,r,n)=>{try{const x=await repository.findTeam(q.params.roundId,q.query.participantName||"",q.query.teamName||"");x?r.json(x):r.status(404).json({code:"TEAM_NOT_FOUND",message:"Selectie niet gevonden."})}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/teams/:teamId",async(q,r,n)=>{try{const x=await repository.getTeam(q.params.roundId,q.params.teamId);x?r.json(x):r.status(404).json({code:"TEAM_NOT_FOUND",message:"Selectie niet gevonden."})}catch(e){n(e)}});
  app.post("/api/v1/rounds/:roundId/teams",async(q,r,n)=>{if(!q.body||!String(q.body.name||"").trim()||!String(q.body.teamName||"").trim())return r.status(422).json({code:"INVALID_TEAM",message:"Naam en teamnaam zijn verplicht."});try{r.status(201).json(await repository.saveTeam(q.params.roundId,q.body))}catch(e){n(e)}});
  app.use((e,_q,r,_n)=>{console.error(e);r.status(500).json({code:"INTERNAL_ERROR",message:"Er ging iets mis op de server."})});
  return app;
}