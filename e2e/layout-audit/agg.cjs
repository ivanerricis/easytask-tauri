const r=require("./output/results.json");
const kinds=process.argv[2].split(",");
const m=new Map();
for(const x of r.results){ for(const i of x.issues){ if(!kinds.includes(i.kind))continue;
 const k=i.kind+"|"+i.el.replace(/\s+"[^"]*"$/,"").slice(0,90)+"|"+x.id; 
 if(!m.has(k))m.set(k,{n:0,sizes:new Set(),themes:new Set(),info:i.info,file:x.file,rect:i.rect,txt:i.el.slice(-45)});
 const e=m.get(k);e.n++;e.sizes.add(x.size);e.themes.add(x.theme)}}
for(const [k,e] of m)console.log(k,"\n    ",[...e.sizes].join(","),[...e.themes].join("/"),e.info||"",e.rect?JSON.stringify(e.rect):"",e.file,e.txt)
