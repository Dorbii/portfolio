import h from"react";import{P as e}from"./prop-types-Fd71st4p.js";import{S as z}from"./split.js-CPyVEc61.js";function v(a,n){var f={};for(var r in a)Object.prototype.hasOwnProperty.call(a,r)&&n.indexOf(r)===-1&&(f[r]=a[r]);return f}var O=function(a){function n(){a.apply(this,arguments)}return a&&(n.__proto__=a),n.prototype=Object.create(a&&a.prototype),n.prototype.constructor=n,n.prototype.componentDidMount=function(){var r=this.props;r.children;var t=r.gutter,s=v(r,["children","gutter"]),o=s;o.gutter=function(d,u){var p;return t?p=t(d,u):(p=document.createElement("div"),p.className="gutter gutter-"+u),p.__isSplitGutter=!0,p},this.split=z(this.parent.children,o)},n.prototype.componentDidUpdate=function(r){var t=this,s=this.props;s.children;var o=s.minSize,d=s.sizes,u=s.collapsed,p=v(s,["children","minSize","sizes","collapsed"]),g=p,m=r.minSize,D=r.sizes,b=r.collapsed,A=["maxSize","expandToMin","gutterSize","gutterAlign","snapOffset","dragInterval","direction","cursor"],l=A.map(function(i){return t.props[i]!==r[i]}).reduce(function(i,c){return i||c},!1);if(Array.isArray(o)&&Array.isArray(m)){var S=!1;o.forEach(function(i,c){S=S||i!==m[c]}),l=l||S}else Array.isArray(o)||Array.isArray(m)?l=!0:l=l||o!==m;if(l)g.minSize=o,g.sizes=d||this.split.getSizes(),this.split.destroy(!0,!0),g.gutter=function(i,c,x){return x.previousSibling},this.split=z(Array.from(this.parent.children).filter(function(i){return!i.__isSplitGutter}),g);else if(d){var y=!1;d.forEach(function(i,c){y=y||i!==D[c]}),y&&this.split.setSizes(this.props.sizes)}Number.isInteger(u)&&(u!==b||l)&&this.split.collapse(u)},n.prototype.componentWillUnmount=function(){this.split.destroy(),delete this.split},n.prototype.render=function(){var r=this,t=this.props;t.sizes,t.minSize,t.maxSize,t.expandToMin,t.gutterSize,t.gutterAlign,t.snapOffset,t.dragInterval,t.direction,t.cursor,t.gutter,t.elementStyle,t.gutterStyle,t.onDrag,t.onDragStart,t.onDragEnd,t.collapsed;var s=t.children,o=v(t,["sizes","minSize","maxSize","expandToMin","gutterSize","gutterAlign","snapOffset","dragInterval","direction","cursor","gutter","elementStyle","gutterStyle","onDrag","onDragStart","onDragEnd","collapsed","children"]),d=o;return h.createElement("div",Object.assign({},{ref:function(u){r.parent=u}},d),s)},n}(h.Component);O.propTypes={sizes:e.arrayOf(e.number),minSize:e.oneOfType([e.number,e.arrayOf(e.number)]),maxSize:e.oneOfType([e.number,e.arrayOf(e.number)]),expandToMin:e.bool,gutterSize:e.number,gutterAlign:e.string,snapOffset:e.oneOfType([e.number,e.arrayOf(e.number)]),dragInterval:e.number,direction:e.string,cursor:e.string,gutter:e.func,elementStyle:e.func,gutterStyle:e.func,onDrag:e.func,onDragStart:e.func,onDragEnd:e.func,collapsed:e.number,children:e.arrayOf(e.element)};O.defaultProps={sizes:void 0,minSize:void 0,maxSize:void 0,expandToMin:void 0,gutterSize:void 0,gutterAlign:void 0,snapOffset:void 0,dragInterval:void 0,direction:void 0,cursor:void 0,gutter:void 0,elementStyle:void 0,gutterStyle:void 0,onDrag:void 0,onDragStart:void 0,onDragEnd:void 0,collapsed:void 0,children:void 0};export{O as S};
