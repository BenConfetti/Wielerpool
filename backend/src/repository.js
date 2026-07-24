import { query } from "./db.js";
export const repository={
 health:()=>query("SELECT 1"),
 async getRound(id){const x=await query(`SELECT r.id,r.name,r.competition,r.year,r.status,r.currency,r.config,jsonb_build_object('stake',s.stake,'budget',s.budget,'stageCount',s.stage_count,'starterCount',s.starter_count,'reserveCount',s.reserve_count,'scoringDepth',s.scoring_depth,'prizeWeights',s.prize_weights,'prizePotSplit',jsonb_build_object('final',s.final_prize_percentage,'daily',s.daily_prize_percentage)) settings FROM rounds r JOIN round_settings s ON s.round_id=r.id WHERE r.id=$1`,[id]);return x.rows[0]||null},
 async listParticipants(id){return (await query(`SELECT id,round_id "roundId",display_name "displayName",team_name "teamName",color_primary "colorPrimary",color_secondary "colorSecondary" FROM participants WHERE round_id=$1 ORDER BY display_name`,[id])).rows},
 async listRiders(id){return (await query(`SELECT r.id,r.round_id "roundId",r.name,r.display_name "displayName",r.cycling_team "cyclingTeam",COALESCE(p.price,0) price,r.metadata FROM riders r LEFT JOIN rider_prices p ON p.round_id=r.round_id AND p.rider_id=r.id WHERE r.round_id=$1 ORDER BY r.display_name`,[id])).rows}
};