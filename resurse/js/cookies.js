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

document.addEventListener('DOMContentLoaded', () => {
  const bannerId = 'cookie-banner';
  if (!document.getElementById(bannerId)) {
    const div = document.createElement('div');
    div.id = bannerId;
    div.innerHTML = '<p>Acesta este un proiect \u0219colar.<br>Accept\u0103\u021bi cookie-urile de pe site?</p>'
                  + '<button id="cb-ok" class="btn btn-sm btn-light">Ok</button>';
    document.body.appendChild(div);

    const accepted = getCookie('cookie_banner_accepted');
    if (!accepted) {
      // small delay so the animation starts after paint
      setTimeout(() => { div.classList.add('cb-animated'); }, 300);
    }

    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'cb-ok') {
        setCookie('cookie_banner_accepted', '1', 7); // 7 days
        div.style.display = 'none';
      }
    });
  }

  // Cookie: save last filter state when on products page
  if (window.location.pathname === '/produse') {
    const filters = localStorage.getItem('produse_filters');
    if (filters) setCookie('ultimeFiltre', filters, 7);
  }
});

// expose helpers globally
window.myCookies = { setCookie, getCookie, deleteCookie, deleteAllCookies };
