var o="cloudflare-modular-site.notes",r={id:"notes",name:"\u4FBF\u7B7E",icon:"NT",category:"tools",description:"\u4FDD\u5B58\u672C\u5730\u8349\u7A3F\u3001\u7075\u611F\u548C\u5F85\u529E\u7247\u6BB5\u3002",defaultEnabled:!0,mount(){let t=document.createElement("div"),n=localStorage.getItem(o)||"";t.innerHTML=`
      <textarea class="textarea" aria-label="\u4FBF\u7B7E\u5185\u5BB9" placeholder="\u5199\u70B9\u4EC0\u4E48..." spellcheck="false">${n}</textarea>
      <div class="module-actions">
        <button class="button primary" type="button">\u4FDD\u5B58</button>
        <button class="button" type="button">\u6E05\u7A7A</button>
      </div>
    `;let a=t.querySelector("textarea"),[e,l]=t.querySelectorAll("button");return e.addEventListener("click",()=>{localStorage.setItem(o,a.value),e.textContent="\u5DF2\u4FDD\u5B58",window.setTimeout(()=>{e.textContent="\u4FDD\u5B58"},1e3)}),l.addEventListener("click",()=>{a.value="",localStorage.removeItem(o)}),t}};export{r as default};
