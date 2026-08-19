import fs from "node:fs/promises";
import path from "node:path";
import { Workbook, SpreadsheetFile } from "file:///C:/Users/kejes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const root = process.cwd();
const modelInspect = "C:/Users/kejes/Documents/Codex/2026-07-24/we-werken-aan-mijn-wielerpool-project-2/outputs/wielerpool_prijslijst/Wielerpool_prijslijst_model.xlsx.inspect.ndjson";
const outDir = path.join(root, "outputs", "vuelta-2026-20260818");

// [oneday, gc, tt, sprint, climber] from the linked PCS rider profiles.
const additions = {
  "BILBAO Pello":[2019,5098,1187,92,5391], "GOVEKAR Matevž":[320,70,132,363,84],
  "OMRZEL Jakob":[90,332,23,0,256], "PAASSCHENS Mathijs":[219,223,6,56,40], "VALTER Attila":[795,1229,332,30,1233],
  "BENNETT George":[904,3681,276,26,3070], "HOFSTETTER Hugo":[3408,175,0,2388,29],
  "KRETSCHY Moritz":[31,197,65,20,60], "MARTÍ Pau":[143,69,44,20,136], "SCHULTZ Nick":[466,877,53,16,938],
  "VAN TRICHT Floris":[167,0,1,107,1], "VAN DEN BOSSCHE Fabio":[197,219,17,46,44],
  "GAROFOLI Gianmarco":[206,204,24,35,454], "CAMPRUBÍ Marcel":[215,111,1,0,182],
  "DUNBAR Eddie":[352,1559,301,66,1188], "GLOAG Thomas":[80,411,1,14,332],
  "AZPARREN Xabier Mikel":[44,195,440,26,16], "GONZÁLEZ David":[129,111,5,229,126],
  "DEBRUYNE Ramses":[168,102,17,48,374], "GROVES Kaden":[531,291,359,1575,225], "GOGL Michael":[626,501,76,36,340],
  "BUSATTO Francesco":[601,113,2,29,224], "SENTJENS Sente":[136,11,2,242,10], "DE VYLDER Lindsay":[163,5,0,130,15],
  "CHAMBERLAIN Oscar":[54,25,137,24,2], "DE PESTEL Sander":[246,86,236,94,4], "LABROSSE Jordan":[243,56,71,48,96],
  "MÜHLBERGER Gregor":[863,1212,214,74,1205], "SCOTSON Callum":[47,513,127,48,208], "ALBANESE Vincenzo":[1446,511,28,613,618],
  "BELOKI Markel":[47,310,58,0,245], "MACKELLAR Alastair":[34,43,48,2,38], "RAFFERTY Darren":[133,177,181,1,117],
  "STEINHAUSER Georg":[264,451,121,0,608], "RODRIGUEZ Juan Felipe":[27,65,2,0,60], "LE GAC Olivier":[708,415,4,120,88],
  "TRONCHON Bastien":[461,296,14,119,173], "PALENI Enzo":[47,178,163,36,46], "MADOUAS Valentin":[3406,1386,93,196,1676],
  "ROCHAS Rémy":[278,812,88,8,556], "BERNARD Julien":[317,822,43,22,432], "KÄMNA Lennard":[269,1182,848,26,1870],
  "KONRAD Patrick":[1541,2685,458,108,2710], "MOSCA Jacopo":[345,609,75,164,247], "AULAR Orluis":[860,499,633,950,351],
  "CANAL Carlos":[615,570,115,162,260], "FISHER-BLACK Finn":[200,1013,773,30,551], "MEEUS Jordi":[2861,121,61,2250,32],
  "MOSCON Gianni":[1928,1012,606,240,886], "THORNLEY Callum":[47,30,201,57,37], "WANDAHL Frederik":[374,239,1,7,206],
  "ARMIRAIL Bruno":[127,818,2181,5,462], "KUSS Sepp":[247,3232,331,36,4108], "JOHANNESSEN Tobias Halland":[986,2063,105,30,2430],
  "TILLER Rasmus":[2027,376,118,758,116], "DALBY Simon":[54,166,0,0,108], "TJØTTA Martin":[61,189,0,16,178],
  "BARTA Will":[76,645,801,22,328], "KLUCKERS Arthur":[85,159,466,47,20], "THALMANN Roland":[195,367,56,26,328],
  "WARBASSE Larry":[372,909,397,24,580], "WEISS Fabian":[74,16,92,22,10], "WILKSCH Hannes":[84,97,4,0,39],
  "LAPORTE Christophe":[4815,1135,989,2456,403], "DE SCHUYTENEER Steffen":[431,171,76,614,0],
  "FEDOROV Yevgeniy":[961,213,565,365,38], "BRAET Vito":[568,76,8,280,76],
  "ROMELE Alessandro":[158,134,15,136,28], "ALLENO Clément":[134,212,6,89,38],
  "CHUMIL Sergio Geovani":[176,173,145,105,278], "HAMILTON Chris":[270,984,74,13,621],
  "SÜTTERLIN Jasha":[395,755,1158,119,96], "PICKERING Finlay":[12,200,58,0,274],
  "ROULAND Louis":[59,154,0,19,133], "VAN BOVEN Luca":[355,184,2,64,64],
  "GAFFURI Mattia":[31,93,8,2,95], "COVI Alessandro":[1038,366,6,60,713],
  "RENARD-HAQUIN Henri-François":[37,15,0,19,55], "ROTA Lorenzo":[1901,849,23,164,1120],
  "APARICIO Mario":[18,401,29,9,158], "BOUWMAN Koen":[161,1032,445,48,728],
  "KIRSCH Alex":[654,529,776,373,130], "CRAPS Lars":[50,186,4,26,138],
  "LEEMREIZE Gijs":[62,362,40,0,506], "FAURA José Luis":[12,88,5,0,44],
  "VAN BEKKUM Darren":[19,104,27,26,102], "PORTER Rudy":[56,147,1,20,89],
  "HELLEMOSE Asbjørn":[62,162,0,2,112], "THOMPSON Reuben":[85,244,25,2,154],
  "PEACE Oliver":[6,27,0,11,28], "VAN SINTMAARTENSDIJK Roel":[84,130,56,52,10],
  "MONIQUET Sylvain":[336,711,68,9,602], "OURSELIN Paul":[224,231,34,32,112],
  "SAMITIER Sergio":[128,360,0,0,164], "MCKENZIE Hamish":[55,5,44,8,25],
  "FERNÁNDEZ Sinuhé":[0,32,0,3,23], "DE JONG Timo":[90,43,41,278,4],
  "ROOSEN Timo":[1030,452,200,390,146], "MACÍAS César":[0,0,0,0,0]
};

const lines = (await fs.readFile(modelInspect, "utf8")).trim().split(/\r?\n/).map(JSON.parse);
const oldTable = lines.find(x => x.kind === "table" && x.sheet === "Renners").values;
const oldStats = new Map(oldTable.slice(5).filter(r => r[0]).map(r => [r[0], {gc:+r[4], points:+r[5], climb:+r[6], tt:+r[7]}]));
const startText = await fs.readFile(path.join(root,"frontend/data/vuelta-2026-startlist.csv"),"utf8");
const parseCsv = text => text.trim().split(/\r?\n/).map(line => line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g).map(v=>v.replace(/^,/,"").replace(/^"|"$/g,"").replace(/""/g,'"')));
const startRows = parseCsv(startText); const headers=startRows.shift();
let riders = startRows.map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
const removed=new Set(["RIESEBEEK Oscar","VERGALLITO Luca","VAN DEN BERG Marijn","QUINTANA Nairo","HAJEK Alexander","PITHIE Laurence","HUISING Menno","TRÆEN Torstein","LAURANCE Axel"]);
riders=riders.filter(r=>!removed.has(r.Rider));
riders=[...new Map(riders.map(r=>[r.Rider,r])).values()];
const meta=[
 ["BILBAO Pello","Bahrain - Victorious",0,"pello-bilbao"],["GOVEKAR Matevž","Bahrain - Victorious",0,"matevz-govekar"],["OMRZEL Jakob","Bahrain - Victorious",1,"jakob-omrzel"],["PAASSCHENS Mathijs","Bahrain - Victorious",0,"mathijs-paasschens"],["VALTER Attila","Bahrain - Victorious",0,"attila-valter"],
 ["BENNETT George","NSN Cycling Team",0,"george-bennett"],["HOFSTETTER Hugo","NSN Cycling Team",0,"hugo-hofstetter"],["KRETSCHY Moritz","NSN Cycling Team",1,"moritz-kretschy"],["MARTÍ Pau","NSN Cycling Team",1,"pau-marti-soriano"],["SCHULTZ Nick","NSN Cycling Team",0,"nick-schultz"],["VAN TRICHT Floris","NSN Cycling Team",1,"floris-van-tricht"],
 ["VAN DEN BOSSCHE Fabio","Soudal Quick-Step",0,"fabio-van-den-bossche"],["GAROFOLI Gianmarco","Soudal Quick-Step",1,"gianmarco-garofoli"],
 ["CAMPRUBÍ Marcel","Pinarello Q36.5 Pro Cycling Team",1,"marcel-camprubi"],["DUNBAR Eddie","Pinarello Q36.5 Pro Cycling Team",0,"edward-irl-dunbar"],["GLOAG Thomas","Pinarello Q36.5 Pro Cycling Team",1,"thomas-gloag"],["AZPARREN Xabier Mikel","Pinarello Q36.5 Pro Cycling Team",0,"xabier-mikel-azparren-irurzun"],["GONZÁLEZ David","Pinarello Q36.5 Pro Cycling Team",0,"david-gonzalez-lopez"],
 ["DEBRUYNE Ramses","Alpecin - Premier Tech",1,"ramses-debruyne"],["GROVES Kaden","Alpecin - Premier Tech",0,"kaden-groves"],["GOGL Michael","Alpecin - Premier Tech",0,"michael-gogl"],["BUSATTO Francesco","Alpecin - Premier Tech",1,"francesco-busatto"],["SENTJENS Sente","Alpecin - Premier Tech",1,"sente-sentjens"],["DE VYLDER Lindsay","Alpecin - Premier Tech",0,"lindsay-de-vylder"],
 ["CHAMBERLAIN Oscar","Decathlon CMA CGM Team",1,"oscar-chamberlain"],["DE PESTEL Sander","Decathlon CMA CGM Team",0,"sander-de-pestel"],["LABROSSE Jordan","Decathlon CMA CGM Team",1,"jordan-labrosse"],["MÜHLBERGER Gregor","Decathlon CMA CGM Team",0,"gregor-muhlberger"],["SCOTSON Callum","Decathlon CMA CGM Team",0,"callum-scotson"],
 ["ALBANESE Vincenzo","EF Education - EasyPost",0,"vincenzo-albanese"],["BELOKI Markel","EF Education - EasyPost",1,"markel-beloki"],["MACKELLAR Alastair","EF Education - EasyPost",1,"alastair-mackellar"],["RAFFERTY Darren","EF Education - EasyPost",1,"darren-rafferty"],["STEINHAUSER Georg","EF Education - EasyPost",1,"georg-steinhauser"],["RODRIGUEZ Juan Felipe","EF Education - EasyPost",1,"juan-felipe-rodriguez"],
 ["LE GAC Olivier","Groupama - FDJ United",0,"olivier-le-gac"],["TRONCHON Bastien","Groupama - FDJ United",1,"bastien-tronchon"],["PALENI Enzo","Groupama - FDJ United",1,"enzo-paleni"],["MADOUAS Valentin","Groupama - FDJ United",0,"valentin-madouas"],["ROCHAS Rémy","Groupama - FDJ United",0,"remy-rochas"],
 ["BERNARD Julien","Lidl - Trek",0,"julien-bernard"],["KÄMNA Lennard","Lidl - Trek",0,"lennard-kamna"],["KONRAD Patrick","Lidl - Trek",0,"patrick-konrad"],["MOSCA Jacopo","Lidl - Trek",0,"jacopo-mosca"],
 ["AULAR Orluis","Movistar Team",0,"orluis-aular"],["CANAL Carlos","Movistar Team",1,"carlos-canal"],
 ["FISHER-BLACK Finn","Red Bull - BORA - hansgrohe",1,"finn-fisher-black"],["MEEUS Jordi","Red Bull - BORA - hansgrohe",0,"jordi-meeus"],["MOSCON Gianni","Red Bull - BORA - hansgrohe",0,"gianni-moscon"],["THORNLEY Callum","Red Bull - BORA - hansgrohe",1,"callum-thornley"],["WANDAHL Frederik","Red Bull - BORA - hansgrohe",1,"frederik-wandahl"],
 ["ARMIRAIL Bruno","Team Visma | Lease a Bike",0,"bruno-armirail"],["KUSS Sepp","Team Visma | Lease a Bike",0,"sepp-kuss"],
 ["JOHANNESSEN Tobias Halland","Uno-X Mobility",0,"tobias-halland-johannessen"],["TILLER Rasmus","Uno-X Mobility",0,"rasmus-tiller"],["DALBY Simon","Uno-X Mobility",1,"simon-dalby"],["TJØTTA Martin","Uno-X Mobility",1,"martin-tjotta"],
 ["BARTA Will","Tudor Pro Cycling Team",0,"william-barta"],["KLUCKERS Arthur","Tudor Pro Cycling Team",0,"arthur-kluckers"],["THALMANN Roland","Tudor Pro Cycling Team",0,"roland-thalmann"],["WARBASSE Larry","Tudor Pro Cycling Team",0,"lawrence-warbasse"],["WEISS Fabian","Tudor Pro Cycling Team",1,"fabian-weiss"],["WILKSCH Hannes","Tudor Pro Cycling Team",1,"hannes-wilksch"]
];
for(const [Rider,Team,Youth,slug] of meta) {
  if (!riders.some(r => r.Rider === Rider)) riders.push({BIB:"",Rider,Nation:"",Team,Youth:String(Youth),PCS_URL:`https://www.procyclingstats.com/rider/${slug}`});
}
riders.forEach((r,i)=>r.BIB=String(i+1));
for (const rider of riders) {
  if (!oldStats.has(rider.Rider) && additions[rider.Rider]) {
    const [oneday,gc,tt,sprint,climb]=additions[rider.Rider];
    oldStats.set(rider.Rider,{gc,points:oneday+sprint,climb,tt});
  }
}
oldStats.set("RODRÍGUEZ Carlos", {gc:2693, points:529, climb:2638, tt:497});
oldStats.set("MACÍAS César", {gc:0, points:528, climb:32, tt:0});
for (const rider of riders) {
  if (rider.Rider === "RODRÍGUEZ Carlos") rider.PCS_URL = "https://www.procyclingstats.com/rider/carlos-rodriguez-cano";
  if (rider.Rider === "MACÍAS César") rider.PCS_URL = "https://www.procyclingstats.com/rider/cesar-macias-estrada";
}
const max = {gc:0,points:0,climb:0,tt:0};
for (const r of riders) { const s=oldStats.get(r.Rider)||{gc:0,points:0,climb:0,tt:0}; for(const k of Object.keys(max)) max[k]=Math.max(max[k],s[k]); }
const roleScore={"Kopman AK":100,"Kopman punten":90,"Kopman berg":85,"Sprinter":80,"Vrijbuiter":65,"Meesterknecht":55,"Lead-out":45,"Knecht":30,"Onzeker":20};
function role(s){
  if(s.gc>=2000 || s.climb>=2500) return "Kopman AK";
  if(s.points>=3000) return "Kopman punten";
  if(s.points>=1000 && s.points>1.5*Math.max(s.gc,s.climb)) return "Sprinter";
  if(Math.max(s.gc,s.points,s.climb,s.tt)>=1500) return "Vrijbuiter";
  if(Math.max(s.gc,s.points,s.climb,s.tt)>=700) return "Meesterknecht";
  if(s.points>=350 && s.points>Math.max(s.gc,s.climb)) return "Lead-out";
  if(Math.max(s.gc,s.points,s.climb,s.tt)>=150) return "Knecht";
  return "Onzeker";
}
function priceFor(s, youth, roleName){
  const weighted=(roleScore[roleName]*15+(youth?100:0)*10+(s.gc/max.gc*100)*35+(s.points/max.points*100)*20+(s.climb/max.climb*100)*15+(s.tt/max.tt*100)*5)/100;
  return Math.max(300,Math.min(4500,Math.round(300+4200*Math.pow(weighted/100,1.35))));
}
const calculated=riders.map(r=>{const s=oldStats.get(r.Rider)||{gc:0,points:0,climb:0,tt:0}; const roleName=role(s); const youth=/^(1|true|yes|ja)$/i.test(r.Youth); return {...r,...s,role:roleName,price:priceFor(s,youth,roleName)};});
calculated.sort((a,b)=>b.price-a.price||a.Rider.localeCompare(b.Rider)); calculated.forEach((r,i)=>r.rank=i+1);
const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"';
const bc=[['renner','bc','rank','team','pcs_url'].map(quote).join(';'),...calculated.map(r=>[r.Rider,r.price,r.rank,r.Team,r.PCS_URL].map(quote).join(';'))].join('\r\n')+'\r\n';
await fs.writeFile(path.join(root,"frontend/data/vuelta-2026-bc.csv"),bc,"utf8");
const startOut=[headers.join(','),...riders.map(r=>headers.map(h=>quote(r[h])).join(','))].join('\r\n')+'\r\n';
await fs.writeFile(path.join(root,"frontend/data/vuelta-2026-startlist.csv"),startOut,"utf8");

const wb=Workbook.create(); const sh=wb.worksheets.add("Renners"); const settings=wb.worksheets.add("Instellingen");
const settingsValues=lines.find(x=>x.kind==='table'&&x.sheet==='Instellingen').values;
settingsValues[16][1]=4500;
settingsValues[18][1]=1;
settings.getRange("A1:E26").values=settingsValues;
const title=[["Wielerpool - PCS-prijsmodel"],["Bijgewerkt op 19-08-2026 met de actuele Vuelta-startlijst en PCS-profielscores."]]; sh.getRange("A1:A2").values=title;
const cols=["Renner","Ploeg","Jongere?","Verwachte rol","Algemeen (GC)","Punten (Sprint + Oneday)","Berg (Climber)","TT","Rolscore","Jongerenscore","Gewogen score","Modelprijs","Handmatige correctie","Definitieve BC-prijs","Prijsklasse","Invoercontrole","PCS-profiel"];
sh.getRange("A5:Q5").values=[cols];
const byStart=[...calculated].sort((a,b)=>+a.BIB-+b.BIB);
sh.getRange(`A6:H${5+byStart.length}`).values=byStart.map(r=>[r.Rider,r.Team,/^(1|true|yes|ja)$/i.test(r.Youth)?"Ja":"Nee",r.role,r.gc,r.points,r.climb,r.tt]);
sh.getRange(`M6:M${5+byStart.length}`).values=byStart.map(()=>[null]); sh.getRange(`Q6:Q${5+byStart.length}`).values=byStart.map(r=>[r.PCS_URL]);
sh.getRange("I6").formulas=[["=IF(D6=\"\",\"\",IFERROR(VLOOKUP(D6,'Instellingen'!$D$5:$E$13,2,FALSE),\"\"))"]]; sh.getRange(`I6:I${5+byStart.length}`).fillDown();
sh.getRange("J6").formulas=[["=IF(C6=\"\",\"\",IF(C6=\"Ja\",100,0))"]]; sh.getRange(`J6:J${5+byStart.length}`).fillDown();
sh.getRange("K6").formulas=[[`=IF(D6=\"\",\"\",SUM(I6*'Instellingen'!$B$5,J6*'Instellingen'!$B$6,IFERROR(E6/MAX($E$6:$E$${5+byStart.length})*100,0)*'Instellingen'!$B$7,IFERROR(F6/MAX($F$6:$F$${5+byStart.length})*100,0)*'Instellingen'!$B$8,IFERROR(G6/MAX($G$6:$G$${5+byStart.length})*100,0)*'Instellingen'!$B$9,IFERROR(H6/MAX($H$6:$H$${5+byStart.length})*100,0)*'Instellingen'!$B$10)/SUM('Instellingen'!$B$5:$B$10))`]]; sh.getRange(`K6:K${5+byStart.length}`).fillDown();
sh.getRange("L6").formulas=[["=IF(K6=\"\",\"\",ROUND(('Instellingen'!$B$16+('Instellingen'!$B$17-'Instellingen'!$B$16)*POWER(K6/100,'Instellingen'!$B$18))/'Instellingen'!$B$19,0)*'Instellingen'!$B$19)"]]; sh.getRange(`L6:L${5+byStart.length}`).fillDown();
sh.getRange("N6").formulas=[["=IF(L6=\"\",\"\",MAX('Instellingen'!$B$16,MIN('Instellingen'!$B$17,L6+IF(M6=\"\",0,M6))))"]]; sh.getRange(`N6:N${5+byStart.length}`).fillDown();
sh.getRange("O6").formulas=[["=IF(N6=\"\",\"\",IF(N6>='Instellingen'!$B$22,\"Absolute top\",IF(N6>='Instellingen'!$B$23,\"Kopman\",IF(N6>='Instellingen'!$B$24,\"Sterke keuze\",IF(N6>='Instellingen'!$B$25,\"Bruikbaar\",\"Gok\")))))"]]; sh.getRange(`O6:O${5+byStart.length}`).fillDown();
sh.getRange("P6").formulas=[["=IF(A6=\"\",\"\",IF(D6=\"\",\"Rol invullen\",\"Compleet\"))"]]; sh.getRange(`P6:P${5+byStart.length}`).fillDown();
sh.getRange("A1:Q1").format={fill:"#C8102E",font:{bold:true,color:"#FFFFFF",size:16}}; sh.getRange("A5:Q5").format={fill:"#1F4E78",font:{bold:true,color:"#FFFFFF"}}; sh.getRange("A:Q").format.wrapText=false; sh.getRange("A:Q").format.autofitColumns(); sh.freezePanes.freezeRows(5);
settings.getRange("A1:E1").format={fill:"#1F4E78",font:{bold:true,color:"#FFFFFF"}}; settings.getRange("A:E").format.autofitColumns();
await fs.mkdir(outDir,{recursive:true}); const file=await SpreadsheetFile.exportXlsx(wb); await file.save(path.join(outDir,"Wielerpool_prijslijst_vuelta_2026.xlsx"));
const preview=await wb.render({sheetName:"Renners",range:"A1:Q25",scale:1,format:"png"}); await fs.writeFile(path.join(outDir,"preview.png"),new Uint8Array(await preview.arrayBuffer()));
const errors=await wb.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",options:{useRegex:true,maxResults:100}}); console.log(JSON.stringify({riders:calculated.length,min:Math.min(...calculated.map(r=>r.price)),max:Math.max(...calculated.map(r=>r.price)),errors:errors.ndjson,newPrices:calculated.filter(r=>additions[r.Rider]).map(r=>[r.Rider,r.price,r.role])}));
