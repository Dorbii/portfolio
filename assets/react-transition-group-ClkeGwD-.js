import f,{Children as E,isValidElement as p,cloneElement as h}from"react";import"react-dom";import{b as x,_ as b,a as C,c as M}from"./@babel-6xVxzmvl.js";const m=f.createContext(null);function v(i,r){var a=function(t){return r&&p(t)?r(t):t},o=Object.create(null);return i&&E.map(i,function(e){return e}).forEach(function(e){o[e.key]=a(e)}),o}function F(i,r){i=i||{},r=r||{};function a(d){return d in r?r[d]:i[d]}var o=Object.create(null),e=[];for(var t in i)t in r?e.length&&(o[t]=e,e=[]):e.push(t);var n,u={};for(var l in r){if(o[l])for(n=0;n<o[l].length;n++){var s=o[l][n];u[o[l][n]]=a(s)}u[l]=a(l)}for(n=0;n<e.length;n++)u[e[n]]=a(e[n]);return u}function c(i,r,a){return a[r]!=null?a[r]:i.props[r]}function _(i,r){return v(i.children,function(a){return h(a,{onExited:r.bind(null,a),in:!0,appear:c(a,"appear",i),enter:c(a,"enter",i),exit:c(a,"exit",i)})})}function T(i,r,a){var o=v(i.children),e=F(r,o);return Object.keys(e).forEach(function(t){var n=e[t];if(p(n)){var u=t in r,l=t in o,s=r[t],d=p(s)&&!s.props.in;l&&(!u||d)?e[t]=h(n,{onExited:a.bind(null,n),in:!0,exit:c(n,"exit",i),enter:c(n,"enter",i)}):!l&&u&&!d?e[t]=h(n,{in:!1}):l&&u&&p(s)&&(e[t]=h(n,{onExited:a.bind(null,n),in:s.props.in,exit:c(n,"exit",i),enter:c(n,"enter",i)}))}}),e}var V=Object.values||function(i){return Object.keys(i).map(function(r){return i[r]})},j={component:"div",childFactory:function(r){return r}},g=function(i){x(r,i);function r(o,e){var t;t=i.call(this,o,e)||this;var n=t.handleExited.bind(M(t));return t.state={contextValue:{isMounting:!0},handleExited:n,firstRender:!0},t}var a=r.prototype;return a.componentDidMount=function(){this.mounted=!0,this.setState({contextValue:{isMounting:!1}})},a.componentWillUnmount=function(){this.mounted=!1},r.getDerivedStateFromProps=function(e,t){var n=t.children,u=t.handleExited,l=t.firstRender;return{children:l?_(e,u):T(e,n,u),firstRender:!1}},a.handleExited=function(e,t){var n=v(this.props.children);e.key in n||(e.props.onExited&&e.props.onExited(t),this.mounted&&this.setState(function(u){var l=b({},u.children);return delete l[e.key],{children:l}}))},a.render=function(){var e=this.props,t=e.component,n=e.childFactory,u=C(e,["component","childFactory"]),l=this.state.contextValue,s=V(this.state.children).map(n);return delete u.appear,delete u.enter,delete u.exit,t===null?f.createElement(m.Provider,{value:l},s):f.createElement(m.Provider,{value:l},f.createElement(t,u,s))},r}(f.Component);g.propTypes={};g.defaultProps=j;export{g as T};
