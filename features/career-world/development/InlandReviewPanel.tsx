"use client";
import {useState} from "react";
import fields from "../../../public/career-world/layers/water/fields-r1/manifest.json";
import type {CameraView} from "../shared/camera";

export function InlandReviewPanel({enabled,onFrame}:{readonly enabled:boolean;readonly onFrame:(camera:CameraView,id:string)=>void}){
  const [index,setIndex]=useState(0);
  if(!enabled)return null;
  const feature=fields.features[index];
  const frame=(next:number)=>{
    const i=(next+fields.features.length)%fields.features.length,f=fields.features[i];setIndex(i);
    const xs=f.points.map(p=>p[0]),ys=f.points.map(p=>p[1]);
    const x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2;
    const span=Math.max(.035,(Math.max(...xs)-Math.min(...xs))*1.4,(Math.max(...ys)-Math.min(...ys))*1.4);
    onFrame({origin:[x-span/2,y-span/2],span:[span,span]},f.id);
  };
  return <details data-layer-inspector className="career-world__inland-review" style={{position:"absolute",right:12,bottom:12,zIndex:50,width:"min(340px,44vw)",padding:8,background:"rgba(8,24,29,.94)",border:"1px solid #758578",fontSize:12,color:"#d5d4b5"}}>
    <summary>Inland review · {fields.features.length} features</summary>
    <label style={{display:"block",marginTop:8}}>Water feature
      <select aria-label="Inland water feature" value={index} onChange={event=>frame(Number(event.target.value))} style={{display:"block",width:"100%",margin:"6px 0",background:"#14272d",color:"inherit"}}>
        {fields.features.map((f,i)=><option key={f.id} value={i}>{f.kind} · {f.id.replaceAll("-"," ")}</option>)}
      </select>
    </label>
    <div style={{display:"flex",gap:8}}>
      <button type="button" onClick={()=>frame(index-1)}>Previous</button>
      <button type="button" onClick={()=>frame(index)}>Frame feature</button>
      <button type="button" onClick={()=>frame(index+1)}>Next</button>
    </div>
    <p style={{margin:"6px 0 0"}}>{feature.kind} · {index+1}/{fields.features.length}</p>
  </details>;
}
