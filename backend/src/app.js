import cors from "cors";
import express from "express";
import { config } from "./config.js";
export function createApp(repository) {
  const app = express(); app.disable("x-powered-by");
  app.use(cors({ origin: config.frontendOrigin, credentials: true })); app.use(express.json({ limit: "2mb" }));
  app.get("/api/health", async (_q,r,n)=>{try{await repository.health();r.json({status:"ok",database:"connected"})}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId", async(q,r,n)=>{try{const x=await repository.getRound(q.params.roundId);x?r.json(x):r.status(404).json({code:"ROUND_NOT_FOUND",message:"Ronde niet gevonden."})}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/participants",async(q,r,n)=>{try{r.json(await repository.listParticipants(q.params.roundId))}catch(e){n(e)}});
  app.get("/api/v1/rounds/:roundId/riders",async(q,r,n)=>{try{r.json(await repository.listRiders(q.params.roundId))}catch(e){n(e)}});
  app.use((e,_q,r,_n)=>{console.error(e);r.status(500).json({code:"INTERNAL_ERROR",message:"Er ging iets mis op de server."})});
  return app;
}