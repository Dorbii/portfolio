import l from"react";var s={exports:{}},n={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var u=l,m=Symbol.for("react.element"),y=Symbol.for("react.fragment"),a=Object.prototype.hasOwnProperty,x=u.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,d={key:!0,ref:!0,__self:!0,__source:!0};function i(t,r,f){var e,o={},_=null,p=null;f!==void 0&&(_=""+f),r.key!==void 0&&(_=""+r.key),r.ref!==void 0&&(p=r.ref);for(e in r)a.call(r,e)&&!d.hasOwnProperty(e)&&(o[e]=r[e]);if(t&&t.defaultProps)for(e in r=t.defaultProps,r)o[e]===void 0&&(o[e]=r[e]);return{$$typeof:m,type:t,key:_,ref:p,props:o,_owner:x.current}}n.Fragment=y;n.jsx=i;n.jsxs=i;s.exports=n;var R=s.exports;export{R as j};
