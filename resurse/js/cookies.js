/* Cookie and banner handling, plus helpers to delete cookies */
/**
 * Set a cookie
 * @param {string} name
 * @param {string} value
 * @param {number} days
 */
function setCookie(name, value, days) {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + encodeURIComponent(value || '') + expires + '; path=/';
}

/**
 * Get cookie by name
 * @param {string} name
 * @returns {string|null}
 */
function getCookie(name) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

/**
 * Delete a cookie
 * @param {string} name
 */
function deleteCookie(name) {
  document.cookie = name + '=; Max-Age=0; path=/';
}

/** Delete all cookies for current path */
function deleteAllCookies() {
  document.cookie.split(';').forEach(function(c) {
    const eqPos = c.indexOf('=');
    const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
    document.cookie = name + '=; Max-Age=0; path=/';
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  // cookie banner markup
  const bannerId = 'cookie-banner';
  if (!document.getElementById(bannerId)) {
    const div = document.createElement('div');
    div.id = bannerId;
    div.innerHTML = `<div id="cb-inner" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-color)"><div style="font-size:1.2rem;margin-bottom:0.5rem">Acceptați cookie-uri?</div><button id="cb-ok" class="btn btn-sm btn-primary">Ok</button></div>`;
    // style and positioning
    div.style.position = 'fixed';
    div.style.left = '0';
    div.style.bottom = '0';
    div.style.zIndex = '9999';
    // size: 25% of width
    const width = Math.max(200, Math.floor(window.innerWidth * 0.25));
    div.style.width = width + 'px';
    div.style.height = width + 'px';
    div.style.background = 'rgba(30,58,138,0)';
    div.style.opacity = '0';
    div.style.display = 'none';
    div.style.borderRadius = '6px 0 0 0';
    document.body.appendChild(div);

    // show animation on large screens only
    function showBanner() {
      if (window.matchMedia('(min-width: 992px)').matches) {
        div.style.display = 'block';
        div.animate([
          { transform: 'scale(0)', opacity: 0, background: 'rgba(30,58,138,0)' },
          { transform: 'scale(1)', opacity: 0.75, background: 'rgba(30,58,138,0.75)' }
        ], { duration: 5000, fill: 'forwards', easing: 'ease-out' });
      } else {
        // static on medium/small
        div.style.display = 'block';
        div.style.opacity = '0.75';
        div.style.background = 'rgba(30,58,138,0.75)';
      }
    }

    // check cookie
    const accepted = getCookie('cookie_banner_accepted');
    if (!accepted) {
      // show banner after short delay
      setTimeout(showBanner, 300);
    }

    document.addEventListener('click', (e)=>{
      if (e.target && e.target.id === 'cb-ok') {
        setCookie('cookie_banner_accepted', '1', 7); // 7 days
        const el = document.getElementById(bannerId);
        if (el) el.style.display = 'none';
      }
    });
  }

  // set a cookie for last filters from products page if present in localStorage
  if (window.location.pathname === '/produse') {
    // try to read filters from localStorage
    const filters = localStorage.getItem('produse_filters');
    if (filters) setCookie('ultimeFiltre', filters, 7);
  }
});

// expose helpers
window.myCookies = { setCookie, getCookie, deleteCookie, deleteAllCookies };
