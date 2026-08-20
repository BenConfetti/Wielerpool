import assert from "node:assert/strict";import {test} from "node:test";import {createApp} from "../src/app.js";
test("read-only API",async()=>{const repo={health:async()=>{},getRound:async id=>id==="vuelta-2026"?{id}:null,listParticipants:async()=>[],listRiders:async()=>[],getRuntimeState:async()=>null,getClientState:async()=>null};const server=createApp(repo).listen(0);const base=`http://127.0.0.1:${server.address().port}`;assert.equal((await fetch(`${base}/api/health`)).status,200);assert.equal((await (await fetch(`${base}/api/v1/rounds/vuelta-2026`)).json()).id,"vuelta-2026");assert.equal((await fetch(`${base}/api/v1/rounds/giro-2026`)).status,404);await new Promise(r=>server.close(r))});
test("teams can be listed, found and saved",async()=>{
 const saved={id:"team-1",name:"Keje",teamName:"Rood",riders:"A",reserves:"B"};
 const repo={
  health:async()=>{},
  getRound:async()=>({id:"vuelta-2026"}),
  listParticipants:async()=>[],
  listRiders:async()=>[],
  listTeams:async()=>[saved],
  findTeam:async(_round,name,teamName)=>name==="Keje"&&teamName==="Rood"?saved:null,
  getTeam:async()=>saved,
  saveTeam:async(_round,team)=>({...saved,...team})
 };
 const server=createApp(repo).listen(0);
 const base=`http://127.0.0.1:${server.address().port}/api/v1/rounds/vuelta-2026/teams`;
 assert.equal((await (await fetch(base)).json()).length,1);
 assert.equal((await (await fetch(base+"/lookup?participantName=Keje&teamName=Rood")).json()).id,"team-1");
 assert.equal((await fetch(base,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Keje",teamName:"Rood"})})).status,201);
 assert.equal((await fetch(base,{method:"POST",headers:{"content-type":"application/json"},body:"{}"})).status,422);
 await new Promise(r=>server.close(r));
});
test("runtime and browser state can be saved",async()=>{
 let runtime=null; let clientState=null;
 const repo={health:async()=>{},getRound:async()=>({id:"vuelta-2026"}),listParticipants:async()=>[],listRiders:async()=>[],listTeams:async()=>[],getRuntimeState:async()=>runtime,saveRuntimeState:async(_round,payload)=>(runtime=payload),getClientState:async()=>clientState,saveClientState:async(_round,_client,payload)=>(clientState=payload)};
 const server=createApp(repo).listen(0);
 const base=`http://127.0.0.1:${server.address().port}/api/v1/rounds/vuelta-2026`;
 const runtimePayload={state:{settings:{stake:12}},feedback:[{text:"Test"}],adminLog:[{action:"Gewijzigd"}]};
 assert.equal((await fetch(base+"/runtime-state",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(runtimePayload)})).status,200);
 assert.deepEqual(await (await fetch(base+"/runtime-state")).json(),runtimePayload);
 const access={participantAccess:{name:"Keje",teamName:"Team"},uiState:{tab:"admin"}};
 assert.equal((await fetch(base+"/client-state/11111111-1111-4111-8111-111111111111",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(access)})).status,200);
 assert.deepEqual(await (await fetch(base+"/client-state/11111111-1111-4111-8111-111111111111")).json(),access);
 await new Promise(r=>server.close(r));
});
