const r=require("./output/results.json");
const filt=process.argv[2]?new RegExp(process.argv[2]):null;
const seen=new Set();
for(const x of r.results){ if(filt&&!filt.test(x.file))continue; if(x.theme!=="light"&&!process.env.ALL)continue;
 const is=x.issues.filter(i=>!["hscroller"].includes(i.kind)&&(process.env.ALL||i.kind!=="ellipsis-no-tooltip"));
 console.log(x.file, is.length?"":"ok");
 for(const i of is)console.log("   ",i.kind,i.el.slice(0,150),i.info||"",i.rect?JSON.stringify(i.rect):"")}
