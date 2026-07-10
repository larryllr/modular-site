var r="cloudflare-modular-site.checklist",s=["\u5B89\u88C5\u4F9D\u8D56","\u8FD0\u884C\u672C\u5730\u5F00\u53D1","\u751F\u6210 Worker \u7C7B\u578B","\u90E8\u7F72\u5230 Cloudflare","\u63A5\u5165\u81EA\u5B9A\u4E49\u57DF\u540D"],d={id:"checklist",name:"\u53D1\u5E03",icon:"DP",category:"workflow",description:"\u8DDF\u8E2A\u4ECE\u672C\u5730\u5F00\u53D1\u5230 Cloudflare \u4E0A\u7EBF\u7684\u5173\u952E\u6B65\u9AA4\u3002",defaultEnabled:!0,mount(){let e=JSON.parse(localStorage.getItem(r)||"{}"),c=document.createElement("div"),t=document.createElement("ul");t.className="list";for(let l of s){let o=document.createElement("li"),n=l.toLowerCase().replace(/\s+/g,"-");o.innerHTML=`
        <label>
          <input type="checkbox" ${e[n]?"checked":""} />
          <strong>${l}</strong>
        </label>
      `,o.querySelector("input").addEventListener("change",a=>{e[n]=a.currentTarget.checked,localStorage.setItem(r,JSON.stringify(e))}),t.append(o)}return c.append(t),c}};export{d as default};
