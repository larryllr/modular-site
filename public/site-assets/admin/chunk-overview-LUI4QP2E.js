var t={id:"overview",name:"\u603B\u89C8",icon:"OV",category:"system",description:"\u96C6\u4E2D\u5C55\u793A\u5F53\u524D\u529F\u80FD\u6A21\u5757\u548C\u8FD0\u884C\u72B6\u6001\u3002",defaultEnabled:!0,mount({state:n}){let l=[...n.enabled.entries()].filter(([,e])=>e).map(([e])=>n.modules.find(i=>i.id===e)?.name).filter(Boolean),s=document.createElement("div");return s.innerHTML=`
      <div class="pill-row">
        ${l.map(e=>`<span class="pill">${e}</span>`).join("")}
      </div>
      <ul class="list">
        <li><strong>${n.modules.length}</strong><span>\u5DF2\u6CE8\u518C\u524D\u7AEF\u6A21\u5757</span></li>
        <li><strong>${l.length}</strong><span>\u5F53\u524D\u542F\u7528\u6A21\u5757</span></li>
      </ul>
    `,s}};export{t as default};
