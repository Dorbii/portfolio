import{j as e,a as f,F as y}from"./@emotion-xujv5_fU.js";import{c as $}from"./react-dom-x3GTDx-d.js";import{r as i}from"./react-Bp4MZrME.js";import{R as F,v as H}from"./@uiw-c5FSPCNK.js";import{S as I}from"./react-split-IEM1DrOI.js";import{A as W}from"./react-icons-B8R87VFt.js";import{G as B}from"./@codemirror-1bzRgD1b.js";import{G as N,B as T}from"./@mui-CjPE6vD_.js";import{d as V}from"./styled-components-D2jghxD_.js";import"./hoist-non-react-statics-D5aJipOz.js";import"./@babel-6xVxzmvl.js";import"./stylis-YPZU7XtI.js";import"./scheduler-CzFDRTuY.js";import"./@lezer-CCSus8NM.js";import"./prop-types-DA_l7Oc5.js";import"./split.js-CPyVEc61.js";import"./crelt-C8TCjufn.js";import"./style-mod-Bc2inJdb.js";import"./w3c-keyname-Vcq4gwWv.js";import"./clsx-B-dksMZM.js";import"./react-transition-group-B5-RboGz.js";import"./tslib-CGNu0TuM.js";(function(){const l=document.createElement("link").relList;if(l&&l.supports&&l.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const d of a.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&o(d)}).observe(document,{childList:!0,subtree:!0});function s(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(r){if(r.ep)return;r.ep=!0;const a=s(r);fetch(r.href,a)}})();const X=n=>{const l={left:`${n.dot[0]}%`,top:`${n.dot[1]}%`};return e("div",{className:"food",style:l})},Y=({onUp:n,onDown:l,onLeft:s,onRight:o})=>f("div",{className:"button-container",children:[e("div",{className:"upwards",children:e("input",{type:"button",value:"UP",onClick:n,className:"up"})}),f("div",{className:"left-right",children:[e("input",{type:"button",value:"LEFT",onClick:s,className:"left"}),e("input",{type:"button",value:"RIGHT",onClick:o,className:"right"})]}),e("div",{className:"downwards",children:e("input",{type:"button",value:"DOWN",onClick:l,className:"down"})})]}),j=n=>e("div",{children:n.snakeDots.map((l,s)=>{const o={left:`${l[0]}%`,top:`${l[1]}%`};return e("div",{className:"snake",style:o},s)})});function q({gameOver:n,score:l,children:s}){const o=i.useRef();return i.useEffect(()=>{if(!n)return;const r=o.current;return r.showModal(),()=>r.close()},[n]),f("dialog",{ref:o,children:[e("h1",{children:"Game Over"}),f("p",{children:["Your score is ",l]}),s]})}const M=()=>Array.from({length:2},()=>Math.floor(Math.random()*100/2)*2);function _(){const[n,l]=i.useState(!1),[s,o]=i.useState([[0,0],[0,2]]),[r,a]=i.useState(M()),[d,m]=i.useState(200),[h,v]=i.useState("RIGHT"),[u,p]=i.useState("menu"),w=()=>{l(!1),o([[0,0],[0,2]]),a(M()),m(200),v("RIGHT"),p("menu")},b=i.useCallback(()=>{let t=[...s];t.unshift([]),o(t)},[s]),S=i.useCallback(()=>{d>10&&m(d-10)},[d]),D=i.useCallback(()=>{let t=[...s],c=t[t.length-1];if(u==="game"&&!n)switch(h){case"RIGHT":c=[c[0]+2,c[1]];break;case"LEFT":c=[c[0]-2,c[1]];break;case"DOWN":c=[c[0],c[1]+2];break;case"UP":c=[c[0],c[1]-2];break}t.push(c),t.shift(),o(t)},[h,n,u,s]),k=i.useCallback(()=>{if(h==="UP")return;let t=[...s],c=t[t.length-1];c=[c[0],c[1]+2],t.push(c),t.shift(),v("DOWN"),o(t)},[s,h]),P=i.useCallback(()=>{if(h==="DOWN")return;let t=[...s],c=t[t.length-1];c=[c[0],c[1]-2],t.push(c),t.shift(),v("UP"),o(t)},[s,h]),R=i.useCallback(()=>{if(h==="LEFT")return;let t=[...s],c=t[t.length-1];c=[c[0]+2,c[1]],t.push(c),t.shift(),v("RIGHT"),o(t)},[s,h]),g=i.useCallback(()=>{if(h==="RIGHT")return;let t=[...s],c=t[t.length-1];c=[c[0]-2,c[1]],t.push(c),t.shift(),v("LEFT"),o(t)},[s,h]);return i.useEffect(()=>{let t=s[s.length-1];if(u==="game"&&(t[0]>=100||t[1]>=100||t[0]<0||t[1]<0))return()=>l(!0)},[s,u]),i.useEffect(()=>{let t=[...s],c=t[t.length-1];t.pop(),t.some(A=>c[0]===A[0]&&c[1]===A[1])&&u==="game"&&s.length>2&&l(!0)},[s,h,u]),i.useEffect(()=>{u==="menu"&&w()},[u]),i.useEffect(()=>{const t=setInterval(()=>{D()},d);return()=>clearInterval(t)},[s,d,u,D]),i.useEffect(()=>{function t(c){switch(c.key){case"a":case"ArrowLeft":g();break;case"w":case"ArrowUp":P();break;case"d":case"ArrowRight":R();break;case"s":case"ArrowDown":k();break}}return window.addEventListener("keydown",t),()=>window.removeEventListener("keydown",t)},[k,g,R,P,s]),i.useEffect(()=>{let t=s[s.length-1];t[0]===r[0]&&t[1]===r[1]&&(a(M()),b(),S())},[r,b,S,s]),e(y,{children:f("div",{children:[f(q,{gameOver:n,score:s.length-2,children:[e("button",{onClick:()=>{p("menu")},children:"Play Again"})," "]}),u==="menu"?e("div",{className:"wrapper",children:e("div",{children:e("input",{className:"start",type:"button",value:"Start",onClick:()=>p("game")})})}):f("div",{children:[f("div",{className:"snake-container",children:[e(j,{snakeDots:s}),e(X,{dot:r})]}),e(Y,{onDown:k,onLeft:g,onRight:R,onUp:P})]})]})})}function K(){return e(y,{children:f("div",{className:"preference-nav",children:[e("div",{className:"preference-nav-item",children:e("button",{className:"preference-nav-item-lang",children:"Python"})}),e("div",{className:"preference-nav-item",children:e("button",{className:"preference-nav-item-settings",children:e(W,{})})})]})})}const x=i.createContext({ds:" ",updateDS:()=>{}}),Q=({children:n})=>{const[l,s]=i.useState(null),o=a=>{const d=[...a];s({...l,input:d})},r=a=>{s(a==="TP"?{ds:"TP",code:`def isPalindrome(self, s: str) -> bool:
	left = 0
	right = len(s) - 1
	while left < right:
		while left < right and not s[left].isalnum():
			left += 1
		while left < right and not s[right].isalnum():
			right -= 1
		if s[left].lower() != s[right].lower():
			return False
		left += 1
		right -= 1
	return True`,input:[]}:{ds:"",code:"",input:[]})};return e(x.Provider,{value:{ds:l,updateDS:r,updateParams:o},children:n})};function J({handleSubmit:n}){return e("div",{className:"playground-footer",children:f("div",{className:"playground-footer-inner",children:[e("div",{className:"playground-footer-left"}),e("div",{className:"playground-footer-right",children:e("button",{className:"playground-footer-button-submit",onClick:n,children:"Submit"})})]})})}function Z(){const{updateDS:n,updateParams:l}=i.useContext(x),[s,o]=i.useState("TP"),[r,a]=i.useState(""),d=v=>{a(v.target.value)},m=()=>{l(r)},h=v=>{o(v),n(s)};return f(y,{children:[e("div",{className:"data-structure-header-container",children:f("div",{className:"data-structure-header-items",children:[e("div",{className:"data-structure-header-content",children:"Data Structure"}),e("hr",{className:"data-structure-header-hr"})]})}),e("div",{className:"data-structure-case-container",children:f("div",{className:"data-structure-case",children:[f("div",{className:"data-structure-case-selection",children:[e("button",{className:"data-structure-case-selection-title",onClick:()=>h("TP"),children:"Two Pointers"}),e("button",{className:"data-structure-case-selection-title",onClick:()=>h(""),children:"DS 2"}),e("button",{className:"data-structure-case-selection-title",onClick:()=>h(""),children:"DS 3"})]}),f("div",{className:"data-structure-case-content",children:[e("p",{className:"data-structure-case-content-section",children:"String:"}),e("input",{className:"data-structure-case-content-section-content",type:"text",placeholder:"racecar",onChange:d})]})]})}),e(J,{handleSubmit:m})]})}function ee(){const{ds:n}=i.useContext(x);return e(y,{children:f("div",{className:"playground-container",children:[e(K,{}),f(I,{className:"split",direction:"vertical",sizes:[60,40],minSize:60,children:[e("div",{className:"playground-editor",children:e(F,{value:n?n.code:"",theme:H,extensions:[B()],style:{fontSize:16},editable:!1})}),e("div",{className:"data-structure",children:e(Z,{})})]})]})})}function te({dataArray:n,arrowArray:l}){return e(y,{children:f(N,{container:!0,rowSpacing:1,columnSpacing:1,direction:"column",className:"data-structure-visualizer-content",children:[e(N,{children:e(N,{container:!0,spacing:1,direction:"row",flexWrap:"nowrap",children:n.map((s,o)=>e(N,{children:e("div",{className:"square",children:e("div",{className:"square-content",children:n[o]})})},`square-${o}`))})}),e(N,{children:e(N,{container:!0,spacing:1,direction:"row",flexWrap:"nowrap",children:l.map((s,o)=>e(N,{visibility:s,children:e("div",{className:"pointer",children:e("i",{className:"material-symbols-outlined",children:"arrow_upward"})})},`pointer-${o}`))})})]})})}const z=n=>/^[a-z0-9]+$/i.test(n);function ne(){const{ds:n}=i.useContext(x),[l,s]=i.useState([]),[o,r]=i.useState([]),[a,d]=i.useState(1),[m,h]=i.useState(0),[v,u]=i.useState(1),[p,w]=i.useState(0),[b,S]=i.useState(),[D,k]=i.useState(!0);return i.useEffect(()=>{if(n&&n.input){r(n.input);const g=[...n.input];for(let t=0;t<n.input.length-1;t++)t===0||t===n.input.length-1?g[t]="visible":g[t]="hidden";s(g),d(0),h(n.input.length-1)}},[n]),i.useEffect(()=>{if(a<m){let g=a,t=m,c=v,L=p;if(g<t&&!z(o[g])&&(g+=1),g<t&&!z(o[t])&&(t-=1),o[a].toLowerCase()!==o[m].toLowerCase()){k(!1),S(!0);return}d(g),h(t),s(A=>{const C=[...A];return C[c]="hidden",C[L]="hidden",C[g]="visible",C[t]="visible",C})}else a===m&&S(!0)},[o,a,v,p,m]),f(y,{children:[e(T,{onClick:()=>{let g=a+1,t=m-1;d(g),u(a),h(t),w(m)},children:"Play"}),e(te,{dataArray:o,arrowArray:l}),b&&e(T,{onClick:()=>{d(0),h(n.input.length-1),u(0),w(n.input.length-1);const g=[...n.input];for(let t=0;t<n.input.length-1;t++)t===0||t===n.input.length-1?g[t]="visible":g[t]="hidden";s(g),S(!1)},children:"Reset"}),b&&(D?e("div",{children:"It is a palindrome"}):e("div",{children:"It is not a palindrome"}))]})}function se(){return e("div",{className:"viewer",children:e(ne,{})})}function G(){return e(y,{children:e(Q,{children:e("div",{className:"algo-visualizer",children:f(I,{className:"split-v",minSize:0,children:[e("div",{className:"flex h-11 w-full",children:e(se,{})}),e(ee,{})]})})})})}const O=""+new URL("snake_game_icon-C-l1HX4Q.png",import.meta.url).href,U=""+new URL("dsa_icon-BgkcePux.png",import.meta.url).href;function re(){return e(y,{children:e("footer",{className:"taskbar"})})}function ae({icon:n,name:l,handleDoubleClick:s}){const[o,r]=i.useState(!1),[a,d]=i.useState({x:0,y:0}),m=i.useRef(null);return e(y,{children:e("div",{className:"shortcut",ref:m,style:{cursor:o?"grabbing":"context-menu"},onMouseDown:p=>{r(!0);const w=m.current.getBoundingClientRect();d({x:p.clientX-w.left,y:p.clientY-w.top})},onMouseMove:p=>{o&&(m.current.style.left=`${p.clientX-a.x}px`,m.current.style.top=`${p.clientY-a.y}px`)},onMouseUp:()=>{r(!1)},onDoubleClick:s,children:f("div",{className:"shortcut",children:[e("img",{src:n}),e("p",{children:l})]})})})}function ie(n,l){var o,r;let s;switch(l.type){case"LAUNCH_APP":return s=(o=n.apps)==null?void 0:o.map(a=>a.component===l.payload.component?{...a,status:{...a.status,isRunning:!0}}:a),{...n,apps:s};case"CLOSE_APP":return s=(r=n.apps)==null?void 0:r.map(a=>a.component===l.payload.component?{...a,status:{...a.status,isRunning:!1}}:a),{...n,apps:s};default:return n}}let oe=-1;const E=()=>oe++,ce=[{component:_,data:{icon:O,name:"Snake Game",id:E()},viewer:{width:800,height:600,resizable:!1},status:{isRunning:!1,isMinimized:!1,isMaximized:!1}},{component:G,data:{icon:U,name:"Algo Visualizer",id:E()},viewer:{width:800,height:600,resizable:!1},status:{isRunning:!1,isMinimized:!1,isMaximized:!1}}],le={"Snake Game":{component:_,data:{icon:O,name:"Snake Game"},default_size:{width:800,height:600}},"Algo Visualizer":{component:G,data:{icon:U,name:"Algo Visualizer"},default_size:{width:800,height:600}}};function de({apps:n,onMouseDown:l,onClose:s}){const[o,r]=i.useState(!1),[a,d]=i.useState({x:0,y:0}),m=(u,p)=>{r(!0);const w=p.current.getBoundingClientRect();d({x:u.clientX-w.left,y:u.clientY-w.top})},h=(u,p)=>{o&&(p.current.style.left=`${u.clientX-a.x}px`,p.current.style.top=`${u.clientY-a.y}px`)},v=()=>{r(!1)};return e("div",{children:n.map(u=>{const p=i.useRef(null);return e(he,{ref:p,onMouseDown:w=>m(w,p),onMouseMove:w=>h(w,p),onClose:()=>s(u.component),onMouseUp:v,show:u.status.isRunning,...u},u.data.id)})})}const ue=i.memo(i.forwardRef(function({data:n,onMouseDown:l,onMouseMove:s,onMouseUp:o,onClose:r,component:a,className:d},m){return e(y,{children:f("div",{className:d,onMouseDown:l,ref:m,onMouseMove:s,onMouseUp:o,children:[e("div",{children:e(fe,{onClose:r})}),e("div",{className:"app_window_content",children:a({...n})})]})})})),he=V(ue)`
    display: ${({show:n})=>n?"flex":"none"};
    flex-direction: column;
    width: 900px;
    height: 900px;
    background-color: grey;
    position: absolute;
    
    .app_window_content {
        flex: 1;
        position: relative;
        width: 100%;
        height: 100%;
    }
`;function fe({onClose:n}){return e("div",{className:"header_btn_close",children:e("button",{onClick:n,children:"Close"})},"close_btn")}const me={apps:ce};function pe(){const[n,l]=i.useReducer(ie,me),s=r=>{const a=Object.values(le).find(d=>d.component===r);l({type:"LAUNCH_APP",payload:a})},o=r=>{l({type:"CLOSE_APP",payload:{component:r}})};return f("div",{className:"app-container",children:[e("div",{className:"shortcut-container",children:n.apps.map(r=>e("div",{className:"shortcut-item",children:e(ae,{icon:r.data.icon,name:r.data.name,handleDoubleClick:()=>s(r.component)})},r.data.id))}),e(de,{apps:n.apps,onMouseDown:()=>{},onClose:o}),e(re,{})]})}function ge(){const n=document.getElementById("root");$(n).render(e(pe,{}))}ge();
