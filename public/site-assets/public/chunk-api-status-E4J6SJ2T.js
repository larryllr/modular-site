var u={id:"api-status",name:"API",icon:"AP",category:"tools",description:"\u67E5\u770B Worker API \u7684\u5065\u5EB7\u72B6\u6001\u548C\u670D\u52A1\u7AEF\u6A21\u5757\u3002",defaultEnabled:!0,mount({api:s}){let o=document.createElement("div");o.innerHTML=`
      <div class="module-actions">
        <button class="button primary" type="button">\u5237\u65B0</button>
        <button class="button" type="button">\u6D4B\u8BD5 Echo</button>
      </div>
      <ul class="list" aria-live="polite"></ul>
    `;let i=o.querySelector(".list"),[r,c]=o.querySelectorAll("button"),l=t=>{i.replaceChildren(...t.map(e=>{let n=document.createElement("li");return n.innerHTML=`<strong>${e.title}</strong><span>${e.detail}</span>`,n}))},a=async()=>{l([{title:"\u8BF7\u6C42\u4E2D",detail:"\u6B63\u5728\u8BFB\u53D6 Worker \u72B6\u6001"}]);try{let[t,e]=await Promise.all([s.getJson("/api/health"),s.getJson("/api/modules")]);l([{title:t.service,detail:t.timestamp},{title:`${e.total} \u4E2A\u670D\u52A1\u7AEF\u6A21\u5757`,detail:e.modules.map(n=>n.name).join(" / ")}])}catch(t){l([{title:"\u8BF7\u6C42\u5931\u8D25",detail:t.message}])}};return r.addEventListener("click",a),c.addEventListener("click",async()=>{let t=await s.postJson("/api/echo",{source:"api-status",message:"hello cloudflare"});l([{title:"Echo",detail:JSON.stringify(t.received)}])}),a(),o}};export{u as default};
