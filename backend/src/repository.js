import { pool, query } from "./db.js";
const teamSelect='SELECT t.id,t.version,t.selection,t.updated_at "updatedAt",p.display_name "displayName",p.team_name "teamName",p.color_primary "colorPrimary",p.color_secondary "colorSecondary" FROM teams t JOIN participants p ON p.id=t.participant_id';
function mapTeam(row){
 if(!row)return null;
 return {
  ...(row.selection||{}),
  id:row.id,
  version:row.version,
  name:row.displayName,
  teamName:row.teamName,
  color1:row.colorPrimary,
  color2:row.colorSecondary,
  updatedAt:row.updatedAt
 };
}
export const repository={
 health:()=>query("SELECT 1"),
 async getRound(id){const x=await query(`SELECT r.id,r.name,r.competition,r.year,r.status,r.currency,r.config,jsonb_build_object('stake',s.stake,'budget',s.budget,'stageCount',s.stage_count,'starterCount',s.starter_count,'reserveCount',s.reserve_count,'scoringDepth',s.scoring_depth,'prizeWeights',s.prize_weights,'prizePotSplit',jsonb_build_object('final',s.final_prize_percentage,'daily',s.daily_prize_percentage)) settings FROM rounds r JOIN round_settings s ON s.round_id=r.id WHERE r.id=$1`,[id]);return x.rows[0]||null},
 async getRuntimeState(roundId){const x=await query('SELECT state,feedback,admin_log "adminLog",revision,updated_at "updatedAt" FROM round_runtime_state WHERE round_id=$1',[roundId]);return x.rows[0]||null},
 async saveRuntimeState(roundId,payload){
  const expected=Number(payload.revision||0);
  const x=await query(`INSERT INTO round_runtime_state(round_id,state,feedback,admin_log,revision) VALUES($1,$2,$3,$4,1) ON CONFLICT(round_id) DO UPDATE SET state=EXCLUDED.state,feedback=EXCLUDED.feedback,admin_log=EXCLUDED.admin_log,revision=round_runtime_state.revision+1,updated_at=now() WHERE round_runtime_state.revision=$5 RETURNING state,feedback,admin_log "adminLog",revision,updated_at "updatedAt"`,[roundId,payload.state||{},payload.feedback||[],payload.adminLog||[],expected]);
  if(!x.rows[0]){const error=new Error("Rondegegevens zijn intussen gewijzigd.");error.code="RUNTIME_CONFLICT";throw error}
  return x.rows[0]
 },
 async appendFeedback(roundId,item){const x=await query(`INSERT INTO round_runtime_state(round_id,state,feedback,admin_log,revision) VALUES($1,'{}'::jsonb,jsonb_build_array($2::jsonb),'[]'::jsonb,1) ON CONFLICT(round_id) DO UPDATE SET feedback=round_runtime_state.feedback||jsonb_build_array($2::jsonb),revision=round_runtime_state.revision+1,updated_at=now() RETURNING revision`,[roundId,JSON.stringify(item)]);return x.rows[0]},
 async getClientState(roundId,clientId){const x=await query('SELECT participant_access "participantAccess",ui_state "uiState",updated_at "updatedAt" FROM round_client_state WHERE round_id=$1 AND client_id=$2',[roundId,clientId]);return x.rows[0]||null},
 async saveClientState(roundId,clientId,payload){const x=await query(`INSERT INTO round_client_state(round_id,client_id,participant_access,ui_state) VALUES($1,$2,$3,$4) ON CONFLICT(round_id,client_id) DO UPDATE SET participant_access=EXCLUDED.participant_access,ui_state=EXCLUDED.ui_state,updated_at=now() RETURNING participant_access "participantAccess",ui_state "uiState",updated_at "updatedAt"`,[roundId,clientId,payload.participantAccess||null,payload.uiState||{}]);return x.rows[0]},
 async listParticipants(id){return (await query(`SELECT id,round_id "roundId",display_name "displayName",team_name "teamName",color_primary "colorPrimary",color_secondary "colorSecondary" FROM participants WHERE round_id=$1 ORDER BY display_name`,[id])).rows},
 async listRiders(id){return (await query(`SELECT r.id,r.round_id "roundId",r.name,r.display_name "displayName",r.cycling_team "cyclingTeam",COALESCE(p.price,0) price,r.metadata FROM riders r LEFT JOIN rider_prices p ON p.round_id=r.round_id AND p.rider_id=r.id WHERE r.round_id=$1 ORDER BY r.display_name`,[id])).rows}
 ,async listTeams(roundId){const x=await query(teamSelect+" WHERE t.round_id=$1 ORDER BY p.display_name,p.team_name",[roundId]);return x.rows.map(mapTeam)}
 ,async findTeam(roundId,participantName,teamName){const x=await query(teamSelect+" WHERE t.round_id=$1 AND lower(btrim(p.display_name))=lower(btrim($2)) AND lower(btrim(p.team_name))=lower(btrim($3))",[roundId,participantName,teamName]);return mapTeam(x.rows[0])}
 ,async getTeam(roundId,teamId){const x=await query(teamSelect+" WHERE t.round_id=$1 AND t.id=$2",[roundId,teamId]);return mapTeam(x.rows[0])}
 ,async saveTeam(roundId,team){
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const participant=await client.query(
    "INSERT INTO participants(round_id,display_name,team_name,color_primary,color_secondary) VALUES($1,btrim($2),btrim($3),$4,$5) ON CONFLICT (round_id,lower(btrim(display_name)),lower(btrim(team_name))) DO UPDATE SET display_name=EXCLUDED.display_name,team_name=EXCLUDED.team_name,color_primary=EXCLUDED.color_primary,color_secondary=EXCLUDED.color_secondary RETURNING id",
    [roundId,team.name,team.teamName,team.color1||"#1d4ed8",team.color2||"#ffffff"]
   );
   const selection={
    riders:String(team.riders||""),
    reserves:String(team.reserves||""),
    initialRiders:String(team.initialRiders||team.riders||""),
    initialReserves:String(team.initialReserves||team.reserves||""),
    manualSwaps:Array.isArray(team.manualSwaps)?team.manualSwaps:[]
   };
   const saved=await client.query(
    "INSERT INTO teams(round_id,participant_id,selection) VALUES($1,$2,$3) ON CONFLICT(round_id,participant_id) DO UPDATE SET selection=EXCLUDED.selection,version=teams.version+1,updated_at=now() RETURNING id",
    [roundId,participant.rows[0].id,selection]
   );
   await client.query("COMMIT");
   return await this.getTeam(roundId,saved.rows[0].id);
  }catch(error){
   await client.query("ROLLBACK");
   throw error;
  }finally{
   client.release();
  }
 }
};
